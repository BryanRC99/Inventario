import base64
import io
from pathlib import Path

import qrcode
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML


def generar_qr_base64(data):
    qr = qrcode.QRCode(box_size=8, border=1)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()


def _logo_uri_para_empresa(empresa):
    """
    Resuelve el logo a usar en este orden:
    1. Si la empresa tiene 'logo_filename' configurado manualmente, se usa ese.
    2. Si no, se busca automáticamente por convención: logo_<nombre>.png/.jpg/.jpeg
    3. Si nada de eso existe, se usa el logo por defecto del sistema.
    """
    from empresas.utils import logo_path_por_convencion

    static_dir = Path(settings.BASE_DIR) / 'static'

    if empresa and empresa.logo_filename:
        ruta_manual = static_dir / empresa.logo_filename
        if ruta_manual.exists():
            return ruta_manual.as_uri()

    ruta_automatica = logo_path_por_convencion(empresa)
    if ruta_automatica:
        return ruta_automatica.as_uri()

    ruta_default = static_dir / 'logovyv.png'
    return ruta_default.as_uri() if ruta_default.exists() else None


def generar_pdf_etiqueta(activo, tamano='normal'):
    qr_base64 = generar_qr_base64(activo.codigo_interno)
    template = 'inventario/etiqueta_pdf.html' if tamano == 'normal' else 'inventario/etiqueta_pequena_pdf.html'

    html_string = render_to_string(
        template,
        {'activo': activo, 'qr_base64': qr_base64, 'logo_uri': _logo_uri_para_empresa(activo.empresa)},
    )
    return HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()


def generar_pdf_etiquetas_lote(activos, tamano='normal'):
    # Cada activo puede ser de una empresa distinta (si Admin selecciona
    # varios de distintas compañías), así que el logo se resuelve por
    # cada uno individualmente, no uno solo para todo el lote.
    items = [
        {
            'activo': a,
            'qr_base64': generar_qr_base64(a.codigo_interno),
            'logo_uri': _logo_uri_para_empresa(a.empresa),
        }
        for a in activos
    ]

    html_string = render_to_string(
        'inventario/etiquetas_lote_pdf.html',
        {'activos': items, 'tamano': tamano},
    )
    return HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()