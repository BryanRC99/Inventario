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


def _logo_uri():
    logo_path = Path(settings.BASE_DIR) / 'static' / 'logovyv.png'
    return logo_path.as_uri() if logo_path.exists() else None


def generar_pdf_etiqueta(activo, tamano='normal'):
    qr_base64 = generar_qr_base64(activo.codigo_interno)
    template = 'inventario/etiqueta_pdf.html' if tamano == 'normal' else 'inventario/etiqueta_pequena_pdf.html'

    html_string = render_to_string(
        template, {'activo': activo, 'qr_base64': qr_base64, 'logo_uri': _logo_uri()}
    )
    return HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()


def generar_pdf_etiquetas_lote(activos, tamano='normal'):
    items = [{'activo': a, 'qr_base64': generar_qr_base64(a.codigo_interno)} for a in activos]

    html_string = render_to_string(
        'inventario/etiquetas_lote_pdf.html',
        {'activos': items, 'logo_uri': _logo_uri(), 'tamano': tamano},
    )
    return HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()