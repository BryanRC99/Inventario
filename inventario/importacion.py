from datetime import datetime
from io import BytesIO

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

from .models import Activo, Categoria, Ubicacion
from proveedores.models import Proveedor

def _limpiar(valor):
    if valor is None:
        return ''
    return str(valor).strip()

def _normalizar(texto):
    import unicodedata

    texto = _limpiar(texto).lower()
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    return ' '.join(texto.split())  # colapsa espacios múltiples

COLUMNAS = [
    'Nombre',
    'Categoria',
    'Ubicacion',
    'Marca',
    'Modelo',
    'Numero de serie',
    'Estado',
    'Proveedor',
    'Fecha adquisicion (AAAA-MM-DD)',
    'Valor adquisicion',
    'Fecha fin garantia (AAAA-MM-DD)',
]

ESTADOS_VALIDOS = dict(Activo.Estado.choices)


def generar_plantilla_excel():
    wb = Workbook()

    # --- Hoja 1: plantilla para llenar ---
    hoja = wb.active
    hoja.title = 'Activos'
    hoja.append(COLUMNAS)

    for celda in hoja[1]:
        celda.font = Font(bold=True, color='FFFFFF')
        celda.fill = PatternFill('solid', fgColor='111827')

    # Fila de ejemplo, se puede borrar antes de llenar
    hoja.append(
        [
            'Laptop Dell Latitude 5440', 'Laptop', 'Oficina Sistemas', 'Dell', 'Latitude 5440',
            'SN123456', 'activo', 'TechSupply S.A.', '2026-01-15', '950.00', '2028-01-15',
        ]
    )

    for columna in hoja.columns:
        max_len = max(len(str(c.value)) for c in columna if c.value)
        hoja.column_dimensions[columna[0].column_letter].width = max(14, max_len + 2)

    # Validación desplegable para la columna Estado (columna G)
    dv_estado = DataValidation(
        type='list', formula1=f'"{",".join(ESTADOS_VALIDOS.keys())}"', allow_blank=False
    )
    hoja.add_data_validation(dv_estado)
    dv_estado.add('G2:G1000')

    # --- Hoja 2: instrucciones ---
    instrucciones = wb.create_sheet('Instrucciones')
    instrucciones.append(['Instrucciones para llenar la plantilla'])
    instrucciones['A1'].font = Font(bold=True, size=13)
    filas_instrucciones = [
        '',
        '1. No modifiques los encabezados de la hoja "Activos".',
        '2. Borra la fila de ejemplo antes de subir el archivo.',
        '3. "Nombre", "Categoria" y "Ubicacion" son obligatorios. Los demás son opcionales.',
        '4. "Categoria" y "Ubicacion" deben escribirse EXACTAMENTE como aparecen en las listas de abajo.',
        '5. El código interno del activo se genera automáticamente, no lo incluyas.',
        '6. Las fechas van en formato AAAA-MM-DD, ej. 2026-03-20.',
        '7. "Valor adquisicion" solo números, sin símbolo de moneda, ej. 950.00.',
        '',
        'Valores válidos para "Estado":',
    ]
    for linea in filas_instrucciones:
        instrucciones.append([linea])

    for estado_valor, estado_label in ESTADOS_VALIDOS.items():
        instrucciones.append([f'  - {estado_valor}  ({estado_label})'])

    instrucciones.append([''])
    instrucciones.append(['Categorías existentes:'])
    for cat in Categoria.objects.order_by('nombre'):
        instrucciones.append([f'  - {cat.nombre}'])

    instrucciones.append([''])
    instrucciones.append(['Ubicaciones existentes:'])
    for ub in Ubicacion.objects.order_by('nombre'):
        instrucciones.append([f'  - {ub.nombre}'])

    instrucciones.append([''])
    instrucciones.append(['Proveedores existentes (opcional):'])
    for prov in Proveedor.objects.order_by('nombre'):
        instrucciones.append([f'  - {prov.nombre}'])

    instrucciones.column_dimensions['A'].width = 60

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _limpiar(valor):
    if valor is None:
        return ''
    return str(valor).strip()


def _parsear_fecha(valor):
    if not valor:
        return None, None
    if isinstance(valor, datetime):
        return valor.date(), None
    texto = _limpiar(valor)
    try:
        return datetime.strptime(texto, '%Y-%m-%d').date(), None
    except ValueError:
        return None, f'Fecha inválida "{texto}", usa el formato AAAA-MM-DD'


def validar_archivo(archivo):
    """
    Lee el Excel y devuelve una lista de dicts, uno por fila, cada uno con
    sus datos originales, si es válida, y la lista de errores si no.
    No toca la base de datos todavía.
    """
    wb = load_workbook(archivo, data_only=True)
    hoja = wb['Activos'] if 'Activos' in wb.sheetnames else wb.active

    categorias = {_normalizar(c.nombre): c for c in Categoria.objects.all()}
    ubicaciones = {_normalizar(u.nombre): u for u in Ubicacion.objects.all()}
    proveedores = {_normalizar(p.nombre): p for p in Proveedor.objects.all()}

    filas_resultado = []

    for idx, fila in enumerate(hoja.iter_rows(min_row=2, values_only=True), start=2):
        if fila is None or all(c is None or _limpiar(c) == '' for c in fila):
            continue  # fila vacía, se ignora silenciosamente

        (
            nombre, categoria_nombre, ubicacion_nombre, marca, modelo, numero_serie,
            estado, proveedor_nombre, fecha_adq, valor_adq, fecha_garantia,
        ) = (list(fila) + [None] * 11)[:11]

        errores = []
        datos = {
            'nombre': _limpiar(nombre),
            'marca': _limpiar(marca),
            'modelo': _limpiar(modelo),
            'numero_serie': _limpiar(numero_serie),
            'estado': _limpiar(estado) or 'activo',
        }

        if not datos['nombre']:
            errores.append('El nombre es obligatorio')

        cat_key = _normalizar(categoria_nombre)
        if not cat_key:
            errores.append('La categoría es obligatoria')
        elif cat_key not in categorias:
            errores.append(f'La categoría "{categoria_nombre}" no existe')
        else:
            datos['categoria'] = categorias[cat_key]

        ubi_key = _normalizar(ubicacion_nombre)
        if not ubi_key:
            errores.append('La ubicación es obligatoria')
        elif ubi_key not in ubicaciones:
            errores.append(f'La ubicación "{ubicacion_nombre}" no existe')
        else:
            datos['ubicacion'] = ubicaciones[ubi_key]

        if datos['estado'] not in ESTADOS_VALIDOS:
            errores.append(f'Estado "{datos["estado"]}" no es válido')

        prov_key = _normalizar(proveedor_nombre)
        if prov_key:
            if prov_key not in proveedores:
                errores.append(f'El proveedor "{proveedor_nombre}" no existe')
            else:
                datos['proveedor'] = proveedores[prov_key]

        fecha_adq_parseada, error_fecha1 = _parsear_fecha(fecha_adq)
        if error_fecha1:
            errores.append(f'Fecha de adquisición: {error_fecha1}')
        datos['fecha_adquisicion'] = fecha_adq_parseada

        fecha_gar_parseada, error_fecha2 = _parsear_fecha(fecha_garantia)
        if error_fecha2:
            errores.append(f'Fecha de garantía: {error_fecha2}')
        datos['fecha_fin_garantia'] = fecha_gar_parseada

        if _limpiar(valor_adq):
            try:
                datos['valor_adquisicion'] = float(str(valor_adq).replace(',', '.'))
            except ValueError:
                errores.append(f'Valor de adquisición "{valor_adq}" no es un número válido')

        filas_resultado.append(
            {
                'fila': idx,
                'valido': len(errores) == 0,
                'errores': errores,
                'datos_mostrar': {
                    'nombre': datos['nombre'],
                    'categoria': _limpiar(categoria_nombre),
                    'ubicacion': _limpiar(ubicacion_nombre),
                    'marca': datos['marca'],
                    'modelo': datos['modelo'],
                },
                'datos': datos,
            }
        )

    return filas_resultado