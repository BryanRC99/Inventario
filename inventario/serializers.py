import re
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from usuarios.alcance import resolver_empresa_para_crear

from .models import Activo, Categoria, Ubicacion


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'prefijo', 'requiere_custodio_unico']

    def validate_prefijo(self, value):
        return value.strip().upper()


class UbicacionSerializer(serializers.ModelSerializer):
    ubicacion_padre_nombre = serializers.CharField(
        source='ubicacion_padre.nombre', read_only=True, default=None
    )

    class Meta:
        model = Ubicacion
        fields = ['id', 'nombre', 'tipo', 'ubicacion_padre', 'ubicacion_padre_nombre']

    def validate_ubicacion_padre(self, value):
        if self.instance and value and value.id == self.instance.id:
            raise serializers.ValidationError('Una ubicación no puede ser su propio padre.')
        return value


class ActivoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    ubicacion_nombre = serializers.CharField(source='ubicacion.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(
        source='proveedor.nombre', read_only=True, default=None
    )
    area_creador_nombre = serializers.CharField(
        source='area_creador.nombre', read_only=True, default=None
    )
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True, default=None)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Activo
        fields = [
            'id',
            'codigo_interno',
            'categoria',
            'categoria_nombre',
            'nombre',
            'numero_serie',
            'marca',
            'modelo',
            'fecha_adquisicion',
            'valor_adquisicion',
            'proveedor',
            'proveedor_nombre',
            'fecha_fin_garantia',
            'estado',
            'estado_display',
            'motivo_baja',
            'fecha_baja',
            'ubicacion',
            'ubicacion_nombre',
            'especificaciones',
            'area_creador',
            'area_creador_nombre',
            'empresa',
            'empresa_nombre',
            'creado_por',
            'fecha_creacion',
        ]
        read_only_fields = [
            'codigo_interno',
            'creado_por',
            'fecha_creacion',
            'motivo_baja',
            'fecha_baja',
            'area_creador',
        ]
        extra_kwargs = {'valor_adquisicion': {'min_value': Decimal('0')}}

    # ------------------------------------------------------------------
    # Reglas de integridad. El estado "dado de baja", el cambio de ubicación y la
    # categoría no son campos libres: tienen su propio flujo para que el historial
    # (movimientos, custodias, etiquetas) siempre cuadre con la realidad.
    # ------------------------------------------------------------------
    def validate_estado(self, value):
        ya_de_baja = self.instance is not None and self.instance.estado == Activo.Estado.DADO_DE_BAJA
        if value == Activo.Estado.DADO_DE_BAJA and not ya_de_baja:
            raise serializers.ValidationError(
                'Para dar de baja un activo usa la opción "Dar de baja": así se registra el motivo '
                'y se cierran sus custodias.'
            )
        return value

    def validate_numero_serie(self, value):
        value = (value or '').strip()
        if not value:
            return value
        if self.instance is not None and self.instance.numero_serie.lower() == value.lower():
            return value  # sin cambios: no se vuelve a comprobar
        repetido = Activo.objects.filter(numero_serie__iexact=value)
        if self.instance is not None:
            repetido = repetido.exclude(pk=self.instance.pk)
        if repetido.exists():
            raise serializers.ValidationError('Ya existe un activo con ese número de serie.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instancia = self.instance

        if instancia is not None:
            if instancia.estado == Activo.Estado.DADO_DE_BAJA:
                raise serializers.ValidationError('Un activo dado de baja no se puede modificar.')

            categoria = attrs.get('categoria')
            if categoria is not None and categoria.pk != instancia.categoria_id:
                raise serializers.ValidationError({
                    'categoria': (
                        'La categoría no se puede cambiar una vez creado el activo, porque define su código '
                        f'({instancia.codigo_interno}) y su etiqueta. Si te equivocaste, da de baja este activo '
                        'y créalo de nuevo.'
                    )
                })

            usuario = self.context['request'].user
            empresa = attrs.get('empresa')
            if (
                (usuario.is_superuser or usuario.rol == 'admin')
                and empresa is not None
                and empresa.pk != instancia.empresa_id
                and instancia.custodias.filter(fecha_fin__isnull=True).exists()
            ):
                raise serializers.ValidationError({
                    'empresa': 'No se puede cambiar la empresa de un activo con custodias activas. '
                               'Finaliza primero sus custodias.'
                })

        adquisicion = attrs.get('fecha_adquisicion', instancia.fecha_adquisicion if instancia else None)
        garantia = attrs.get('fecha_fin_garantia', instancia.fecha_fin_garantia if instancia else None)
        if adquisicion and garantia and garantia < adquisicion:
            raise serializers.ValidationError({
                'fecha_fin_garantia': 'La garantía no puede terminar antes de la fecha de adquisición.'
            })
        return attrs

    def generar_codigo_interno(self, categoria):
        prefijo = categoria.prefijo
        patron = re.compile(rf'^{re.escape(prefijo)}-(\d+)$')
        codigos = Activo.objects.filter(
            codigo_interno__startswith=f'{prefijo}-'
        ).values_list('codigo_interno', flat=True)
        numeros = [int(m.group(1)) for c in codigos if (m := patron.match(c))]
        return f'{prefijo}-{max(numeros, default=0) + 1:03d}'

    @transaction.atomic
    def create(self, validated_data):
        from trazabilidad.utils import registrar_movimiento

        usuario = self.context['request'].user
        validated_data['creado_por'] = usuario
        validated_data['area_creador'] = usuario.area

        validated_data['empresa'] = resolver_empresa_para_crear(usuario, validated_data.get('empresa'))

        # Bloquea la fila de la categoría: dos creaciones simultáneas
        # de la misma categoría se ponen en fila y no repiten código.
        categoria = Categoria.objects.select_for_update().get(pk=validated_data['categoria'].pk)
        validated_data['codigo_interno'] = self.generar_codigo_interno(categoria)

        activo = super().create(validated_data)

        registrar_movimiento(
            activo=activo,
            tipo_evento='creacion',
            usuario=usuario,
            ubicacion_destino=activo.ubicacion,
            observaciones='Registro inicial del activo en el sistema.',
        )

        return activo

    @transaction.atomic
    def update(self, instance, validated_data):
        from trazabilidad.utils import registrar_movimiento

        usuario = self.context['request'].user
        if not (usuario.is_superuser or usuario.rol == 'admin'):
            # Un no-Admin no puede cambiar la empresa de un activo.
            validated_data.pop('empresa', None)

        ubicacion_anterior = instance.ubicacion
        activo = super().update(instance, validated_data)

        if activo.ubicacion_id != ubicacion_anterior.pk:
            registrar_movimiento(
                activo=activo,
                tipo_evento='traslado',
                usuario=usuario,
                ubicacion_origen=ubicacion_anterior,
                ubicacion_destino=activo.ubicacion,
                observaciones='Cambio de ubicación al editar el activo.',
            )
        return activo