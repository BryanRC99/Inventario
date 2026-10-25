import datetime
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from openpyxl import Workbook
from rest_framework.test import APITestCase

from empresas.models import Empresa
from inventario.importacion import COLUMNAS
from inventario.models import Activo, Categoria, Ubicacion
from proveedores.models import Proveedor
from usuarios.models import Usuario

URL = '/api/inventario/activos/'


def excel(filas, encabezado=None, nombre='activos.xlsx'):
    """Arma un .xlsx en memoria con la hoja 'Activos'."""
    wb = Workbook()
    hoja = wb.active
    hoja.title = 'Activos'
    hoja.append(encabezado if encabezado is not None else COLUMNAS)
    for fila in filas:
        hoja.append(fila)
    buffer = BytesIO()
    wb.save(buffer)
    return SimpleUploadedFile(
        nombre, buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )


def fila(nombre='Laptop Dell', categoria='Laptop', ubicacion='Oficina Sistemas', marca='Dell', modelo='5440',
         serie=None, estado=None, proveedor=None, f_adq=None, valor=None, f_gar=None):
    return [nombre, categoria, ubicacion, marca, modelo, serie, estado, proveedor, f_adq, valor, f_gar]


class ImportacionActivosTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.e1 = Empresa.objects.create(nombre='Antoisafood')
        cls.e2 = Empresa.objects.create(nombre='Jasafood')
        cls.e3 = Empresa.objects.create(nombre='Fabrifood')
        Categoria.objects.create(nombre='Laptop', prefijo='LAP')
        Ubicacion.objects.create(nombre='Oficina Sistemas', tipo='oficina')
        Proveedor.objects.create(nombre='TechSupply S.A.', ruc='1790012345001', contacto='x')
        cls.admin = Usuario.objects.create_user('adm', password='x', rol='admin')
        cls.op_uno = Usuario.objects.create_user('op1', password='x', rol='operador', empresa=cls.e1)
        cls.op_varias = Usuario.objects.create_user('op2', password='x', rol='operador', empresa=cls.e1)
        cls.op_varias.empresas_adicionales.set([cls.e2])
        cls.consulta = Usuario.objects.create_user('con', password='x', rol='consulta', empresa=cls.e1)

    def validar(self, archivo):
        return self.client.post(f'{URL}validar_importacion/', {'archivo': archivo}, format='multipart')

    def confirmar(self, archivo, empresa=None):
        datos = {'archivo': archivo}
        if empresa is not None:
            datos['empresa'] = str(empresa.id)
        return self.client.post(f'{URL}confirmar_importacion/', datos, format='multipart')

    # ------------------------------------------------------------------ flujo feliz
    def test_admin_importa_eligiendo_empresa(self):
        self.client.force_authenticate(self.admin)
        archivo = excel([
            fila('Laptop A', serie='SN-1', estado='activo', proveedor='techsupply s.a.',
                 f_adq=datetime.datetime(2026, 1, 15), valor='950,50', f_gar='2028-01-15'),
            fila('Laptop B', estado='En mantenimiento'),
        ])
        r = self.confirmar(archivo, self.e2)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['creados'], 2)
        self.assertEqual(r.json()['errores'], [])
        a = Activo.objects.get(nombre='Laptop A')
        self.assertEqual(a.empresa, self.e2)
        self.assertEqual(str(a.valor_adquisicion), '950.50')
        self.assertEqual(a.fecha_adquisicion, datetime.date(2026, 1, 15))
        self.assertEqual(a.proveedor.nombre, 'TechSupply S.A.')
        self.assertTrue(a.codigo_interno.startswith('LAP-'))
        self.assertEqual(Activo.objects.get(nombre='Laptop B').estado, 'en_mantenimiento')
        self.assertEqual(Activo.objects.get(nombre='Laptop B').empresa, self.e2)

    def test_numero_de_serie_numerico_de_excel_no_queda_con_punto_cero(self):
        self.client.force_authenticate(self.admin)
        r = self.confirmar(excel([fila('Con serie', serie=123456.0)]), self.e1)
        self.assertEqual(r.json()['creados'], 1, r.content)
        self.assertEqual(Activo.objects.get(nombre='Con serie').numero_serie, '123456')

    def test_validar_no_crea_nada(self):
        self.client.force_authenticate(self.admin)
        r = self.validar(excel([fila(), fila('Otra')]))
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.json()['total'], r.json()['validas'], r.json()['invalidas']), (2, 2, 0))
        self.assertEqual(Activo.objects.count(), 0)

    # ------------------------------------------------------------------ empresa
    def test_admin_sin_empresa_recibe_error_claro_y_no_se_crea_nada(self):
        self.client.force_authenticate(self.admin)
        r = self.confirmar(excel([fila()]))
        self.assertEqual(r.status_code, 400)
        self.assertIn('empresa', r.json())
        self.assertEqual(Activo.objects.count(), 0)

    def test_empresa_inexistente_o_mal_formada(self):
        self.client.force_authenticate(self.admin)
        for valor in ('no-es-un-uuid', '11111111-1111-1111-1111-111111111111'):
            r = self.client.post(f'{URL}confirmar_importacion/',
                                 {'archivo': excel([fila()]), 'empresa': valor}, format='multipart')
            self.assertEqual(r.status_code, 400, valor)
            self.assertIn('empresa', r.json())
        self.assertEqual(Activo.objects.count(), 0)

    def test_operador_de_una_empresa_no_necesita_elegir(self):
        self.client.force_authenticate(self.op_uno)
        r = self.confirmar(excel([fila()]))
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Activo.objects.get().empresa, self.e1)

    def test_operador_con_varias_empresas_debe_elegir_una_suya(self):
        self.client.force_authenticate(self.op_varias)
        self.assertEqual(self.confirmar(excel([fila()])).status_code, 400)
        r = self.confirmar(excel([fila()]), self.e3)  # no es suya
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Activo.objects.count(), 0)
        r = self.confirmar(excel([fila()]), self.e2)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Activo.objects.get().empresa, self.e2)

    def test_consulta_no_puede_importar(self):
        self.client.force_authenticate(self.consulta)
        self.assertEqual(self.validar(excel([fila()])).status_code, 403)
        self.assertEqual(self.confirmar(excel([fila()]), self.e1).status_code, 403)

    # ------------------------------------------------------------------ archivo inválido (nunca 500)
    def test_archivo_ausente_extension_incorrecta_o_corrupto(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(f'{URL}validar_importacion/', {}, format='multipart').status_code, 400)
        txt = SimpleUploadedFile('x.txt', b'hola', content_type='text/plain')
        self.assertEqual(self.validar(txt).status_code, 400)
        roto = SimpleUploadedFile('roto.xlsx', b'esto no es un excel')
        self.assertEqual(self.validar(roto).status_code, 400)
        roto = SimpleUploadedFile('roto.xlsx', b'esto no es un excel')
        r = self.confirmar(roto, self.e1)
        self.assertEqual(r.status_code, 400)
        self.assertIn('detail', r.json())

    def test_encabezados_distintos_a_la_plantilla(self):
        self.client.force_authenticate(self.admin)
        cambiados = list(COLUMNAS)
        cambiados[0], cambiados[1] = cambiados[1], cambiados[0]
        r = self.validar(excel([fila()], encabezado=cambiados))
        self.assertEqual(r.status_code, 400)
        self.assertIn('plantilla', r.json()['detail'])

    def test_archivo_sin_filas_con_datos(self):
        self.client.force_authenticate(self.admin)
        r = self.validar(excel([]))
        self.assertEqual(r.status_code, 400)

    @override_settings(IMPORTACION_MAX_FILAS=3)
    def test_limite_de_filas(self):
        self.client.force_authenticate(self.admin)
        r = self.validar(excel([fila(f'A{i}') for i in range(4)]))
        self.assertEqual(r.status_code, 400)
        self.assertIn('3', r.json()['detail'])
        self.assertEqual(self.validar(excel([fila(f'A{i}') for i in range(3)])).status_code, 200)

    @override_settings(IMPORTACION_MAX_BYTES=100)
    def test_limite_de_tamano(self):
        self.client.force_authenticate(self.admin)
        r = self.validar(excel([fila()]))
        self.assertEqual(r.status_code, 400)
        self.assertIn('tamaño', r.json()['detail'])

    # ------------------------------------------------------------------ validación por fila
    def errores_de(self, *filas_excel):
        self.client.force_authenticate(self.admin)
        r = self.validar(excel(list(filas_excel)))
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['filas']

    def test_dado_de_baja_no_se_puede_importar(self):
        (f,) = self.errores_de(fila(estado='dado_de_baja'))
        self.assertFalse(f['valido'])
        self.assertIn('Dar de baja', ' '.join(f['errores']))

    def test_estado_invalido(self):
        (f,) = self.errores_de(fila(estado='roto'))
        self.assertFalse(f['valido'])

    def test_valores_numericos_y_fechas(self):
        filas = self.errores_de(
            fila('neg', valor='-5'),
            fila('letras', valor='abc'),
            fila('miles', valor='1.250,50'),
            fila('enorme', valor='99999999999'),
            fila('fecha', f_adq='15/01/2026'),
            fila('garantia', f_adq='2026-05-01', f_gar='2026-01-01'),
            fila('ok', valor='1250.505', f_adq='2026-05-01', f_gar='2027-05-01'),
        )
        self.assertEqual([x['valido'] for x in filas], [False] * 6 + [True])

    def test_largos_maximos(self):
        (f,) = self.errores_de(fila('x' * 151))
        self.assertFalse(f['valido'])
        self.assertIn('150', ' '.join(f['errores']))

    def test_obligatorios_y_catalogos_inexistentes(self):
        filas = self.errores_de(
            fila(nombre=''),
            fila(categoria='Inexistente'),
            fila(ubicacion='Inexistente'),
            fila(proveedor='Inexistente'),
        )
        self.assertEqual([x['valido'] for x in filas], [False] * 4)

    def test_numero_de_serie_repetido_en_el_archivo_y_en_el_sistema(self):
        Activo.objects.create(
            codigo_interno='LAP-900', categoria=Categoria.objects.get(), nombre='Existente',
            ubicacion=Ubicacion.objects.get(), numero_serie='SN-EXISTE', empresa=self.e1,
        )
        filas = self.errores_de(
            fila('a', serie='sn-existe'),
            fila('b', serie='SN-NUEVO'),
            fila('c', serie='sn-nuevo'),
        )
        self.assertEqual([x['valido'] for x in filas], [False, True, False])
        self.assertIn('ya está registrado', ' '.join(filas[0]['errores']))
        self.assertIn('repetido', ' '.join(filas[2]['errores']))

    def test_las_filas_buenas_se_importan_aunque_otras_fallen(self):
        self.client.force_authenticate(self.admin)
        r = self.confirmar(excel([fila('buena 1'), fila('mala', categoria='Inexistente'), fila('buena 2')]), self.e1)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['creados'], 2)
        self.assertEqual([e['fila'] for e in r.json()['errores']], [3])
        self.assertTrue(all(isinstance(m, str) for m in r.json()['errores'][0]['errores']))
        self.assertEqual(sorted(Activo.objects.values_list('nombre', flat=True)), ['buena 1', 'buena 2'])

    def test_codigos_consecutivos_sin_repetirse(self):
        self.client.force_authenticate(self.admin)
        self.confirmar(excel([fila(f'N{i}') for i in range(5)]), self.e1)
        codigos = sorted(Activo.objects.values_list('codigo_interno', flat=True))
        self.assertEqual(codigos, [f'LAP-00{i}' for i in range(1, 6)])

    def test_volver_a_subir_el_mismo_archivo_no_duplica_con_numero_de_serie(self):
        self.client.force_authenticate(self.admin)
        datos = [fila('uno', serie='SN-A'), fila('dos', serie='SN-B')]
        self.assertEqual(self.confirmar(excel(datos), self.e1).json()['creados'], 2)
        r = self.confirmar(excel(datos), self.e1)
        self.assertEqual(r.json()['creados'], 0)
        self.assertEqual(len(r.json()['errores']), 2)
        self.assertEqual(Activo.objects.count(), 2)

    # ------------------------------------------------------------------ plantilla
    def test_plantilla_se_descarga_y_su_encabezado_es_aceptado(self):
        self.client.force_authenticate(self.admin)
        r = self.client.get(f'{URL}plantilla_importacion/')
        self.assertEqual(r.status_code, 200)
        archivo = SimpleUploadedFile('plantilla.xlsx', r.content)
        r = self.validar(archivo)
        self.assertEqual(r.status_code, 200, r.content)  # estructura aceptada (la fila de ejemplo trae datos de muestra)
        self.assertEqual(r.json()['total'], 1)
