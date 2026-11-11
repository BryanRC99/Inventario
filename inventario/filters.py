import django_filters
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import uuid

from empresas.models import Empresa

from .models import Activo, Categoria, Ubicacion

MAX_VALORES = 50
MAX_BUSQUEDA = 100


class ActivoFilter(django_filters.FilterSet):
    """Filtros multi-valor de activos: ?estado=a&estado=b&categoria=<uuid>...

    Se aplica SIEMPRE sobre el queryset ya restringido por rol/empresa
    (activos_visibles), así un filtro nunca ensancha lo que el usuario puede ver.
    Valores inválidos (UUID mal formado, estado inexistente) devuelven 400 con
    el detalle por campo.
    """

    empresa = django_filters.ModelMultipleChoiceFilter(queryset=Empresa.objects.all())
    categoria = django_filters.ModelMultipleChoiceFilter(queryset=Categoria.objects.all())
    ubicacion = django_filters.ModelMultipleChoiceFilter(queryset=Ubicacion.objects.all())
    estado = django_filters.MultipleChoiceFilter(choices=Activo.Estado.choices)
    creador = django_filters.CharFilter(method='filtrar_creador', max_length=50)
    search = django_filters.CharFilter(method='filtrar_busqueda', max_length=MAX_BUSQUEDA)

    class Meta:
        model = Activo
        fields = ['empresa', 'categoria', 'ubicacion', 'estado', 'creador', 'search']

    def filtrar_creador(self, queryset, name, value):
        """Solo administradores pueden elegir el usuario que registró el activo."""
        request = getattr(self, 'request', None)
        user = getattr(request, 'user', None)
        value = (value or '').strip()
        if not value:
            return queryset
        if not user or not user.is_authenticated or user.rol != 'admin':
            raise ValidationError(_('No tienes permiso para filtrar activos por creador.'))
        if value in ('admin', 'operador', 'consulta'):
            return queryset.filter(creado_por__rol=value)
        if value == 'sin_creador':
            return queryset.filter(creado_por__isnull=True)
        if value.startswith('usuario:'):
            try:
                user_id = uuid.UUID(value.removeprefix('usuario:'))
            except ValueError:
                raise ValidationError(_('El creador seleccionado no es válido.'))
            return queryset.filter(creado_por_id=user_id)
        raise ValidationError(_('El filtro de creador no es válido.'))

    def filtrar_busqueda(self, queryset, name, value):
        value = (value or '').strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(codigo_interno__icontains=value)
            | Q(nombre__icontains=value)
            | Q(marca__icontains=value)
            | Q(modelo__icontains=value)
            | Q(numero_serie__icontains=value)
            | Q(categoria__nombre__icontains=value)
        )

    def is_valid(self):
        # Tope de valores por filtro: evita queries gigantes por URL manipulada.
        for campo in ('empresa', 'categoria', 'ubicacion', 'estado'):
            if len(self.data.getlist(campo)) > MAX_VALORES:
                self.errors  # fuerza full_clean
                self._errors[campo] = self.form.error_class(
                    [f'Máximo {MAX_VALORES} valores permitidos en este filtro.']
                )
                return False
        return super().is_valid()


def describir_filtros(filtro):
    """Lista de (etiqueta, texto) con los filtros aplicados, para Excel/PDF."""
    if filtro is None or not filtro.is_valid():
        return []
    datos = filtro.form.cleaned_data
    resultado = []
    for clave, etiqueta in (('empresa', 'Empresa'), ('categoria', 'Categoría'), ('ubicacion', 'Ubicación')):
        valores = datos.get(clave)
        if valores:
            resultado.append((etiqueta, ', '.join(str(v) for v in valores)))
    estados = datos.get('estado')
    if estados:
        nombres = dict(Activo.Estado.choices)
        resultado.append(('Estado', ', '.join(nombres.get(e, e) for e in estados)))
    creador = datos.get('creador')
    if creador:
        user = getattr(filtro, 'request', None)
        user = getattr(user, 'user', None)
        etiquetas = {'admin': 'Administradores (Sistemas)', 'operador': 'Operadores',
                     'consulta': 'Usuarios de consulta', 'sin_creador': 'Sin creador'}
        if creador.startswith('usuario:'):
            try:
                creador_id = uuid.UUID(creador.removeprefix('usuario:'))
                account = user.__class__.objects.filter(pk=creador_id).first() if user else None
                creador = account.get_username() if account else 'Usuario seleccionado'
            except (ValueError, AttributeError):
                creador = 'Usuario seleccionado'
        else:
            creador = etiquetas.get(creador, creador)
        resultado.append(('Creador', creador))
    busqueda = (datos.get('search') or '').strip()
    if busqueda:
        resultado.append(('Búsqueda', busqueda))
    return resultado
