from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from inventario.models import Activo, Ubicacion

from .models import Custodia
import copy


class CustodiaSerializer(serializers.ModelSerializer):
    activo_nombre = serializers.CharField(source='activo.nombre', read_only=True)
    activo_codigo = serializers.CharField(source='activo.codigo_interno', read_only=True)
    persona_nombre = serializers.CharField(
        source='persona.nombre_completo', read_only=True, default=None
    )
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default=None)
    activa = serializers.SerializerMethodField()
    ubicacion_destino = serializers.PrimaryKeyRelatedField(
        queryset=Ubicacion.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Custodia
        fields = [
            'id',
            'activo',
            'activo_nombre',
            'activo_codigo',
            'persona',
            'persona_nombre',
            'area',
            'area_nombre',
            'fecha_inicio',
            'fecha_fin',
            'tipo',
            'activa',
            'ubicacion_destino',
        ]

    def get_activa(self, obj):
        return obj.fecha_fin is None

    CAMPOS_NO_MODELO = {'ubicacion_destino'}
    # Quién tiene el activo no se "edita": se finaliza la custodia y se crea otra. Así el
    # historial, las actas y los movimientos siempre cuentan lo que realmente pasó.
    CAMPOS_INMUTABLES = (
        ('activo', 'el activo'),
        ('persona', 'la persona'),
        ('area', 'el área'),
    )

    def validate(self, attrs):
        instancia = self.instance

        # Bloquear la edición si la custodia ya está finalizada
        if instancia and instancia.fecha_fin is not None:
            raise serializers.ValidationError(
                'Esta custodia ya está finalizada y no se puede modificar.'
            )

        if instancia:
            for campo, nombre in self.CAMPOS_INMUTABLES:
                if campo in attrs and attrs[campo] != getattr(instancia, campo):
                    raise serializers.ValidationError({
                        campo: f'No se puede cambiar {nombre} de una custodia existente. '
                               'Finaliza esta custodia y crea una nueva.'
                    })

        from usuarios.alcance import validar_acceso
        user = self.context['request'].user
        validar_acceso(
            user,
            attrs.get('activo') or (instancia.activo if instancia else None),
            attrs.get('persona') or (instancia.persona if instancia else None),
        )

        self._validar_fechas(attrs)

        activo = attrs.get('activo') or (instancia.activo if instancia else None)
        if activo and activo.estado == Activo.Estado.DADO_DE_BAJA and not attrs.get('fecha_fin'):
            raise serializers.ValidationError(
                'No se puede asignar una custodia activa a un activo dado de baja.'
            )

        self._comprobar_modelo(attrs)
        return attrs

    def _validar_fechas(self, attrs):
        instancia = self.instance
        hoy = timezone.localdate()
        inicio = attrs.get('fecha_inicio', instancia.fecha_inicio if instancia else None)
        fin = attrs.get('fecha_fin', instancia.fecha_fin if instancia else None)

        if 'fecha_inicio' in attrs and inicio and inicio > hoy:
            raise serializers.ValidationError({'fecha_inicio': 'La fecha de inicio no puede ser futura.'})
        if 'fecha_fin' in attrs and fin and fin > hoy:
            raise serializers.ValidationError({'fecha_fin': 'La fecha de fin no puede ser futura.'})
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError(
                {'fecha_fin': 'La fecha de fin no puede ser anterior a la fecha de inicio.'}
            )

    def _comprobar_modelo(self, attrs):
        """Reglas del modelo (persona o área, custodio único). Se llama también dentro del
        bloqueo del activo al guardar, porque entre validar y guardar otra persona pudo
        crear una custodia sobre el mismo activo."""
        datos = {k: v for k, v in attrs.items() if k not in self.CAMPOS_NO_MODELO}
        if self.instance:
            # Al editar: parte de una copia real del objeto existente y solo le aplica
            # los campos que sí cambiaron.
            candidata = copy.copy(self.instance)
            for campo, valor in datos.items():
                setattr(candidata, campo, valor)
        else:
            candidata = Custodia(**datos)
        try:
            candidata.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(e.messages)

    @transaction.atomic
    def create(self, validated_data):
        from trazabilidad.utils import registrar_movimiento

        # Bloquea la fila del activo: si dos personas asignan a la vez el mismo activo,
        # la segunda espera, vuelve a comprobar y recibe el error de custodio único.
        Activo.objects.select_for_update().get(pk=validated_data['activo'].pk)
        self._comprobar_modelo(validated_data)
        validated_data.pop('ubicacion_destino', None)  # solo aplica al finalizar

        custodia = super().create(validated_data)
        activo = custodia.activo

        # Determina la ubicación por defecto del área del custodio
        # (ya sea directamente el área, o el área de la persona).
        area_referencia = custodia.area or (custodia.persona.area if custodia.persona else None)
        nueva_ubicacion = area_referencia.ubicacion if area_referencia else None

        titular = custodia.persona.nombre_completo if custodia.persona else custodia.area.nombre

        if nueva_ubicacion and nueva_ubicacion != activo.ubicacion:
            ubicacion_anterior = activo.ubicacion
            activo.ubicacion = nueva_ubicacion
            activo.save(update_fields=['ubicacion'])

            registrar_movimiento(
                activo=activo,
                tipo_evento='asignacion',
                usuario=self.context['request'].user,
                ubicacion_origen=ubicacion_anterior,
                ubicacion_destino=nueva_ubicacion,
                observaciones=f'Custodia asignada a {titular}. Ubicación actualizada automáticamente.',
            )
        else:
            registrar_movimiento(
                activo=activo,
                tipo_evento='asignacion',
                usuario=self.context['request'].user,
                observaciones=f'Custodia asignada a {titular}.',
            )

        return custodia

    @transaction.atomic
    def update(self, instance, validated_data):
        from trazabilidad.utils import registrar_movimiento

        # 'ubicacion_destino' no es un campo del modelo Custodia, así que
        # lo sacamos antes de que super().update() intente guardarlo.
        ubicacion_destino = validated_data.pop('ubicacion_destino', None)

        tenia_fecha_fin_antes = instance.fecha_fin is not None
        custodia = super().update(instance, validated_data)

        if not tenia_fecha_fin_antes and custodia.fecha_fin is not None:
            titular = (
                custodia.persona.nombre_completo if custodia.persona else custodia.area.nombre
            )
            activo = custodia.activo
            ubicacion_anterior = activo.ubicacion

            if ubicacion_destino and ubicacion_destino != activo.ubicacion:
                activo.ubicacion = ubicacion_destino
                activo.save(update_fields=['ubicacion'])

            registrar_movimiento(
                activo=activo,
                tipo_evento='devolucion',
                usuario=self.context['request'].user,
                ubicacion_origen=ubicacion_anterior,
                ubicacion_destino=ubicacion_destino or ubicacion_anterior,
                observaciones=f'Custodia finalizada, devuelto por {titular}.',
            )

        return custodia