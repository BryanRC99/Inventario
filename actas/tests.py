import io
import shutil
import tempfile
import zipfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from actas.models import ActaEntrega, ActaEscaneo
from areas.models import Area
from empresas.models import Empresa
from inventario.models import Activo, Categoria, Ubicacion
from personas.models import Persona
from usuarios.models import Usuario

TMP = tempfile.mkdtemp(prefix='actas_test_')


def png_bytes(size=(20, 20)):
    b = io.BytesIO()
    Image.new('RGB', size, 'white').save(b, 'PNG')
    return b.getvalue()


def pdf_bytes():
    return b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'


@override_settings(PRIVATE_MEDIA_ROOT=TMP)
class EscaneosActaTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    @classmethod
    def setUpTestData(cls):
        cls.a, cls.b = Empresa.objects.create(nombre='A'), Empresa.objects.create(nombre='B')
        area = Area.objects.create(nombre='Sistemas')
        cat = Categoria.objects.create(nombre='Laptop', prefijo='LAP')
        ub = Ubicacion.objects.create(nombre='Sede', tipo='sede')
        cls.admin = Usuario.objects.create_user('admin', password='x', rol='admin')
        cls.op_a = Usuario.objects.create_user('opa', password='x', rol='operador', empresa=cls.a, area=area, sin_restriccion_area=True)
        cls.op_b = Usuario.objects.create_user('opb', password='x', rol='operador', empresa=cls.b, area=area, sin_restriccion_area=True)
        cls.p_a = Persona.objects.create(nombres='P', apellidos='A', documento='111', empresa=cls.a)
        cls.consulta = Usuario.objects.create_user('111', password='x', rol='consulta', empresa=cls.a)
        cls.p_a.usuario = cls.consulta
        cls.p_a.save()
        cls.p_otro = Persona.objects.create(nombres='P', apellidos='O', documento='222', empresa=cls.a)
        act = Activo.objects.create(codigo_interno='L-1', categoria=cat, nombre='x', ubicacion=ub, empresa=cls.a)
        cls.acta = ActaEntrega.objects.create(activo=act, persona=cls.p_a, fecha='2026-01-01', tipo='entrega')
        cls.acta_otro = ActaEntrega.objects.create(activo=act, persona=cls.p_otro, fecha='2026-01-01', tipo='entrega')

    def url(self, sufijo='', acta=None):
        return f'/api/actas/actas/{(acta or self.acta).id}/escaneos/{sufijo}'

    def subir(self, user, *archivos, acta=None):
        self.client.force_authenticate(user)
        return self.client.post(self.url(acta=acta), {'archivos': list(archivos)}, format='multipart')

    def png(self, nombre='a.png'):
        return SimpleUploadedFile(nombre, png_bytes(), content_type='image/png')

    def test_subir_varios_y_listar(self):
        r = self.subir(self.op_a, self.png('1.png'), SimpleUploadedFile('2.pdf', pdf_bytes(), content_type='application/pdf'))
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(len(r.json()), 2)
        self.assertNotIn('archivo', r.json()[0])  # nunca se expone ruta ni URL
        r = self.client.get(self.url())
        self.assertEqual(len(r.json()), 2)
        r = self.client.get('/api/actas/actas/?escaneada=true')
        self.assertEqual([x['id'] for x in r.json()], [str(self.acta.id)])
        self.assertEqual(r.json()[0]['escaneos_activos'], 2)
        r = self.client.get('/api/actas/actas/?escaneada=false')
        self.assertEqual([x['id'] for x in r.json()], [str(self.acta_otro.id)])

    def test_validacion_contenido_real(self):
        mala = SimpleUploadedFile('falso.png', b'esto no es una imagen', content_type='image/png')
        r = self.subir(self.op_a, mala)
        self.assertEqual(r.status_code, 400)
        self.assertIn('falso.png', r.json()['archivos'][0])
        gif = io.BytesIO(); Image.new('RGB', (5, 5)).save(gif, 'GIF')
        self.assertEqual(self.subir(self.op_a, SimpleUploadedFile('x.gif', gif.getvalue())).status_code, 400)
        self.assertEqual(self.subir(self.op_a, SimpleUploadedFile('v.pdf', b'')).status_code, 400)
        self.assertEqual(self.subir(self.op_a, SimpleUploadedFile('trunc.pdf', b'%PDF-1.4 sin cierre')).status_code, 400)
        self.assertEqual(ActaEscaneo.objects.count(), 0)

    def test_si_un_archivo_falla_no_se_guarda_ninguno(self):
        r = self.subir(self.op_a, self.png(), SimpleUploadedFile('mal.pdf', b'nada'))
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ActaEscaneo.objects.count(), 0)

    @override_settings(ACTA_ESCANEO_MAX_BYTES=10)
    def test_limite_de_tamano(self):
        r = self.subir(self.op_a, self.png())
        self.assertEqual(r.status_code, 400)
        self.assertIn('máximo', r.json()['archivos'][0])

    @override_settings(ACTA_ESCANEO_MAX_ARCHIVOS=2)
    def test_limite_de_archivos(self):
        self.assertEqual(self.subir(self.op_a, self.png(), self.png()).status_code, 201)
        r = self.subir(self.op_a, self.png())
        self.assertEqual(r.status_code, 400)
        self.assertIn('máximo 2', r.json()['archivos'][0])

    def test_aislamiento_entre_empresas(self):
        self.assertEqual(self.subir(self.op_b, self.png()).status_code, 404)
        self.subir(self.op_a, self.png())
        self.client.force_authenticate(self.op_b)
        self.assertEqual(self.client.get(self.url()).status_code, 404)
        esc = ActaEscaneo.objects.get()
        self.assertEqual(self.client.get(self.url(f'{esc.id}/archivo/')).status_code, 404)

    def test_consulta_solo_ve_lo_suyo_y_no_modifica(self):
        self.subir(self.op_a, self.png())
        esc = ActaEscaneo.objects.get()
        self.client.force_authenticate(self.consulta)
        self.assertEqual(self.client.get(self.url()).status_code, 200)
        self.assertEqual(self.client.get(self.url(f'{esc.id}/archivo/')).status_code, 200)
        self.assertEqual(self.subir(self.consulta, self.png()).status_code, 403)
        self.assertEqual(self.client.delete(self.url(f'{esc.id}/'), {'motivo': 'quiero borrar'}).status_code, 403)
        self.assertEqual(self.client.get(self.url(acta=self.acta_otro)).status_code, 404)  # acta de otra persona

    def test_descarga_autenticada(self):
        self.subir(self.op_a, self.png('foto.png'))
        esc = ActaEscaneo.objects.get()
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url(f'{esc.id}/archivo/')).status_code, 401)
        self.client.force_authenticate(self.op_a)
        r = self.client.get(self.url(f'{esc.id}/archivo/'))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'image/png')
        self.assertEqual(r['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(b''.join(r.streaming_content), png_bytes())
        self.assertIn('attachment', self.client.get(self.url(f'{esc.id}/archivo/?descargar=1'))['Content-Disposition'])

    def test_borrado_logico_solo_admin_con_motivo(self):
        self.subir(self.op_a, self.png())
        esc = ActaEscaneo.objects.get()
        self.client.force_authenticate(self.op_a)
        self.assertEqual(self.client.delete(self.url(f'{esc.id}/'), {'motivo': 'duplicado'}).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(self.url(f'{esc.id}/'), {}).status_code, 400)
        self.assertEqual(self.client.delete(self.url(f'{esc.id}/'), {'motivo': 'duplicado'}, format='json').status_code, 204)
        esc.refresh_from_db()
        self.assertTrue(esc.eliminado)
        self.assertTrue(esc.archivo.storage.exists(esc.archivo.name))  # el archivo sigue en disco
        self.assertEqual(self.client.get(self.url()).json(), [])
        from auditoria.models import RegistroAuditoria
        self.assertTrue(RegistroAuditoria.objects.filter(accion='eliminar', modelo='ActaEscaneo').exists())
        self.assertTrue(RegistroAuditoria.objects.filter(accion='crear', modelo='ActaEscaneo').exists())

    def test_dashboard_cuenta_pendientes(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/inventario/dashboard/').json()['actas_sin_escaneo'], 2)
        self.subir(self.op_a, self.png())
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/inventario/dashboard/').json()['actas_sin_escaneo'], 1)

    def test_comandos_verificar_y_respaldar(self):
        self.subir(self.op_a, self.png(), SimpleUploadedFile('d.pdf', pdf_bytes(), content_type='application/pdf'))
        call_command('verificar_actas', stdout=io.StringIO())
        destino = tempfile.mkdtemp()
        call_command('respaldar_actas', destino=destino, stdout=io.StringIO())
        import glob
        z = zipfile.ZipFile(glob.glob(f'{destino}/*.zip')[0])
        self.assertIn('MANIFIESTO.csv', z.namelist())
        self.assertEqual(len(z.namelist()), 3)
        # alterar y borrar archivos -> debe detectarse
        esc = ActaEscaneo.objects.order_by('fecha_subida').first()
        with open(esc.archivo.path, 'ab') as f:
            f.write(b'x')
        with self.assertRaises(CommandError):
            call_command('verificar_actas', stdout=io.StringIO())
        esc.archivo.delete(save=False)
        out = io.StringIO()
        with self.assertRaises(CommandError):
            call_command('verificar_actas', stdout=out)
        self.assertIn('FALTA EN DISCO', out.getvalue())
        shutil.rmtree(destino, ignore_errors=True)
