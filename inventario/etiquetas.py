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


def generar_pdf_etiqueta(activo):
    qr_base64 = generar_qr_base64(activo.codigo_interno)

    logo_path = Path(settings.BASE_DIR) / 'static' / 'logovyv.png'
    logo_uri = logo_path.as_uri() if logo_path.exists() else None

    html_string = render_to_string(
        'inventario/etiqueta_pdf.html',
        {'activo': activo, 'qr_base64': qr_base64, 'logo_uri': logo_uri},
    )
    return HTML(string=html_string, base_url=str(settings.BASE_DIR)).write_pdf()