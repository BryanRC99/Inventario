from datetime import datetime
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from weasyprint import HTML

from custodia.models import Custodia

# Mismas columnas para Excel y PDF, así los dos reportes siempre coinciden.
COLUMNAS = [
    'Código',
    'Nombre',
    'Categoría',
    'Marca',
    'Modelo',
    'N° Serie',
    'Ubicación',
    'Estado',
    'Custodio actual',
]


def _custodios_actuales(activos):
    """Un solo query para todos los activos, evita N+1."""
    ids = [a.id for a in activos]
    custodias = Custodia.objects.filter(
        activo_id__in=ids, fecha_fin__isnull=True
    ).select_related('persona', 'area')

    mapa = {}
    for c in custodias:
        titular = c.persona.nombre_completo if c.persona else (c.area.nombre if c.area else '—')
        mapa[c.activo_id] = titular
    return mapa


def _fila_activo(activo, custodios_por_id):
    return [
        activo.codigo_interno,
        activo.nombre,
        activo.categoria.nombre if activo.categoria else '—',
        activo.marca or '—',
        activo.modelo or '—',
        activo.numero_serie or '—',
        activo.ubicacion.nombre if activo.ubicacion else '—',
        activo.get_estado_display(),
        custodios_por_id.get(activo.id, 'Sin asignar'),
    ]


def generar_reporte_excel(activos):
    custodios_por_id = _custodios_actuales(activos)
    filas = [_fila_activo(a, custodios_por_id) for a in activos]

    wb = Workbook()
    hoja = wb.active
    hoja.title = 'Activos'

    # Encabezado en la fila 1: tabla limpia, lista para filtrar u ordenar.
    for col_idx, titulo in enumerate(COLUMNAS, start=1):
        celda = hoja.cell(row=1, column=col_idx, value=titulo)
        celda.font = Font(bold=True, color='FFFFFF')
        celda.fill = PatternFill('solid', fgColor='111827')
        celda.alignment = Alignment(horizontal='center', vertical='center')
    hoja.row_dimensions[1].height = 22
    
    for fila_idx, fila in enumerate(filas, start=2):
        relleno = (
            PatternFill('solid', fgColor='F9FAFB')
            if fila_idx % 2 == 1
            else PatternFill(fill_type=None)
        )
        for col_idx, valor in enumerate(fila, start=1):
            celda = hoja.cell(row=fila_idx, column=col_idx, value=valor)
            celda.fill = relleno
            celda.alignment = Alignment(vertical='center')

    # Ancho de cada columna según su contenido real (con un tope razonable).
    for col_idx, titulo in enumerate(COLUMNAS, start=1):
        largo_max = max([len(titulo)] + [len(str(f[col_idx - 1])) for f in filas])
        hoja.column_dimensions[get_column_letter(col_idx)].width = min(max(largo_max + 3, 12), 40)

    hoja.freeze_panes = 'A2'
    hoja.auto_filter.ref = f'A1:{get_column_letter(len(COLUMNAS))}{max(len(filas) + 1, 2)}'

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def generar_reporte_pdf(activos):
    custodios_por_id = _custodios_actuales(activos)
    logo_path = Path(settings.BASE_DIR) / 'static' / 'logovyv.png'
    logo_uri = logo_path.as_uri() if logo_path.exists() else None

    filas = [
        {
            'codigo': a.codigo_interno,
            'nombre': a.nombre,
            'categoria': a.categoria.nombre if a.categoria else '—',
            'marca': a.marca or '—',
            'modelo': a.modelo or '—',
            'numero_serie': a.numero_serie or '—',
            'ubicacion': a.ubicacion.nombre if a.ubicacion else '—',
            'estado': a.get_estado_display(),
            'custodio': custodios_por_id.get(a.id, 'Sin asignar'),
        }
        for a in activos
    ]

    html_string = render_to_string(
        'inventario/reporte_activos_pdf.html',
        {
            'filas': filas,
            'logo_uri': logo_uri,
            'total': len(activos),
            'fecha_generacion': datetime.now().strftime('%d/%m/%Y %H:%M'),
        },
    )
    return HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()