import hashlib
import io
import os
import sys
import shutil
import tempfile
import zipfile
from datetime import date
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from PIL import Image, ImageFile
from rest_framework.test import APITestCase

from actas.models import ActaEntrega, ActaEscaneo
from areas.models import Area
from auditoria.models import RegistroAuditoria
from empresas.models import Empresa
from inventario.models import Activo, Categoria, Ubicacion
from personas.models import Persona
from usuarios.models import Usuario


def imagen(formato='JPEG', color=(200, 30, 30), tam=(64, 48)):
    b = io.BytesIO()
    Image.new('RGB', tam, color).save(b, formato)
    return b.getvalue()


def pdf(marca='a'):
    return f'%PDF-1.4\n1 0 obj<</Marca ({marca})>>endobj\ntrailer<<>>\n%%EOF\n'.encode()


def subir(nombre, contenido, tipo='application/octet-stream'):
    return SimpleUploadedFile(nombre, contenido, content_type=tipo)


class EscaneosBase(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.tmp = tempfile.mkdtemp(prefix='escaneos_test_')
        cls.addClassCleanup(shutil.rmtree, cls.tmp, ignore_errors=True)
        ov = override_settings(PRIVATE_MEDIA_ROOT=cls.tmp)
        ov.enable()
        cls.addClassCleanup(ov.disable)

    @classmethod
    def setUpTestData(cls):
        cls.A, cls.B = Empresa.objects.create(nombre='A'), Empresa.objects.create(nombre='B')
        cls.area1, cls.area2 = Area.objects.create(nombre='Sistemas'), Area.objects.create(nombre='Contabilidad')
        cat = Categoria.objects.create(nombre='Laptop', prefijo='LAP')
        ub = Ubicacion.objects.create(nombre='Sede', tipo='sede')

        cls.admin = Usuario.objects.create_user('admin', password='x', rol='admin')
        cls.op = Usuario.objects.create_user('op', password='x', rol='operador', empresa=cls.A, area=cls.area1)
        cls.op_b = Usuario.objects.create_user('op_b', password='x', rol='operador', empresa=cls.B, area=cls.area1)
        cls.op_multi = Usuario.objects.create_user(
            'op_multi', password='x', rol='operador', empresa=cls.B, area=cls.area2, sin_restriccion_area=True)
        cls.op_multi.empresas_adicionales.set([cls.A])
        cls.consulta = Usuario.objects.create_user('consulta', password='x', rol='consulta', empresa=cls.A)
        cls.consulta2 = Usuario.objects.create_user('consulta2', password='x', rol='consulta', empresa=cls.A)

        cls.persona = Persona.objects.create(nombres='Ana', apellidos='Mora', documento='1', empresa=cls.A, usuario=cls.consulta)
        cls.persona2 = Persona.objects.create(nombres='Luis', apellidos='Paz', documento='2', empresa=cls.A, usuario=cls.consulta2)

        def activo(n, empresa):
            return Activo.objects.create(codigo_interno=f'LAP-{n:03d}', categoria=cat, nombre=f'Laptop {n}',
                                         ubicacion=ub, empresa=empresa, creado_por=cls.op, area_creador=cls.area1)
        cls.acta = ActaEntrega.objects.create(activo=activo(1, cls.A), persona=cls.persona, fecha=date.today(),
                                              tipo='entrega', generado_por=cls.op)
        cls.acta2 = ActaEntrega.objects.create(activo=activo(2, cls.A), persona=cls.persona2, fecha=date.today(),
                                               tipo='entrega', generado_por=cls.op)

    def setUp(self):
        # Los archivos no se revierten con la transacción: carpeta limpia en cada prueba.
        for hijo in Path(self.tmp).iterdir():
            shutil.rmtree(hijo, ignore_errors=True) if hijo.is_dir() else hijo.unlink()

    # utilidades
    def url(self, acta=None, *partes):
        acta = acta or self.acta
        return f'/api/actas/actas/{acta.id}/escaneos/' + ''.join(f'{p}/' for p in partes)

    def como(self, usuario):
        self.client.force_authenticate(usuario)
        return self.client

    def subir(self, usuario, archivos, acta=None):
        return self.como(usuario).post(self.url(acta), {'archivos': archivos}, format='multipart')

    def pedir_archivo(self, usuario, escaneo_id, acta=None):
        """GET del archivo; si responde con el contenido, lo consume para cerrar el archivo
        (no usar response.close(): cierra la conexión de la prueba)."""
        r = self.como(usuario).get(self.url(acta, escaneo_id, 'archivo'))
        if r.streaming:
            b''.join(r.streaming_content)
        return r

    def archivos_en_disco(self):
        return [p for p in Path(self.tmp).rglob('*') if p.is_file()]

    def crear_escaneo(self, usuario=None, marca='x', acta=None):
        r = self.subir(usuario or self.op, [subir('acta.pdf', pdf(marca))], acta)
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()[0]


class SubidaYValidacionTests(EscaneosBase):
    def test_subir_varios_formatos_a_la_vez(self):
        r = self.subir(self.op, [subir('a.pdf', pdf()), subir('b.jpg', imagen('JPEG')), subir('c.png', imagen('PNG'))])
        self.assertEqual(r.status_code, 201, r.content)
        datos = r.json()
        self.assertEqual({d['tipo_contenido'] for d in datos}, {'application/pdf', 'image/jpeg', 'image/png'})
        self.assertEqual(len(self.archivos_en_disco()), 3)
        for d in datos:
            e = ActaEscaneo.objects.get(pk=d['id'])
            self.assertEqual(e.sha256, hashlib.sha256(Path(self.tmp, e.archivo.name).read_bytes()).hexdigest())
            self.assertEqual(e.subido_por, self.op)
        lista = self.como(self.op).get('/api/actas/actas/').json()
        self.assertEqual(next(a for a in lista if a['id'] == str(self.acta.id))['escaneos_count'], 3)

    def test_los_archivos_son_privados(self):
        self.crear_escaneo()
        escaneo = ActaEscaneo.objects.get()
        raiz_publica = Path(settings.MEDIA_ROOT).resolve()
        self.assertFalse(Path(self.tmp).resolve().is_relative_to(raiz_publica))
        with self.assertRaises(ValueError):
            escaneo.archivo.url  # sin URL pública
        for d in self.como(self.op).get(self.url()).json():
            self.assertNotIn('archivo', d)
            self.assertNotIn('url', d)
        # nombre en disco aleatorio: no contiene el nombre original ni datos del acta
        nombre_disco = Path(escaneo.archivo.name).name
        self.assertRegex(nombre_disco, r'^[0-9a-f]{32}\.pdf$')

    def test_rechaza_texto_disfrazado_de_pdf(self):
        r = self.subir(self.op, [subir('acta.pdf', b'esto no es un pdf', 'application/pdf')])
        self.assertEqual(r.status_code, 400)
        self.assertIn('Formato no permitido', r.json()['archivos'][0])
        self.assertEqual(ActaEscaneo.objects.count(), 0)

    def test_rechaza_ejecutable_con_extension_de_imagen(self):
        r = self.subir(self.op, [subir('foto.jpg', b'MZ\x90\x00' + b'\x00' * 100, 'image/jpeg')])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.archivos_en_disco(), [])

    def test_rechaza_archivo_vacio(self):
        r = self.subir(self.op, [subir('vacio.pdf', b'')])
        self.assertEqual(r.status_code, 400)

    def test_rechaza_pdf_incompleto(self):
        r = self.subir(self.op, [subir('cortado.pdf', b'%PDF-1.4\n1 0 obj<<>>endobj\n')])
        self.assertEqual(r.status_code, 400)
        self.assertIn('incompleto', r.json()['archivos'][0])

    def test_rechaza_imagen_truncada(self):
        ruido = io.BytesIO()
        Image.effect_noise((300, 300), 60).convert('RGB').save(ruido, 'JPEG', quality=95)
        datos = ruido.getvalue()
        r = self.subir(self.op, [subir('rota.jpg', datos[: len(datos) // 2])])
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn('dañada', r.json()['archivos'][0])

    def test_rechaza_imagen_truncada_aunque_weasyprint_tolere_truncadas(self):
        # WeasyPrint activa LOAD_TRUNCATED_IMAGES globalmente; la validación no debe depender de eso.
        ruido = io.BytesIO()
        Image.effect_noise((300, 300), 60).convert('RGB').save(ruido, 'JPEG', quality=95)
        datos = ruido.getvalue()
        with mock.patch.object(ImageFile, 'LOAD_TRUNCATED_IMAGES', True):
            r = self.subir(self.op, [subir('rota.jpg', datos[: len(datos) // 2])])
            self.assertEqual(r.status_code, 400, r.content)
            self.assertIn('dañada', r.json()['archivos'][0])
            self.assertTrue(ImageFile.LOAD_TRUNCATED_IMAGES, 'el valor global debe quedar como estaba')
        self.assertEqual(self.archivos_en_disco(), [])

    def test_rechaza_png_truncado(self):
        ruido = io.BytesIO()
        Image.effect_noise((200, 200), 60).convert('RGB').save(ruido, 'PNG')
        datos = ruido.getvalue()
        r = self.subir(self.op, [subir('rota.png', datos[: len(datos) // 2])])
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn('dañada', r.json()['archivos'][0])

    def test_rechaza_demasiado_grande(self):
        with override_settings(ACTAS_ESCANEO_MAX_BYTES=500):
            r = self.subir(self.op, [subir('grande.pdf', pdf('x' * 1000))])
        self.assertEqual(r.status_code, 400)
        self.assertIn('tamaño máximo', r.json()['archivos'][0])

    def test_rechaza_imagen_con_demasiados_pixeles(self):
        with mock.patch('actas.escaneos.MAX_PIXELES', 100):
            r = self.subir(self.op, [subir('enorme.png', imagen('PNG'))])
        self.assertEqual(r.status_code, 400)
        self.assertIn('demasiado grande', r.json()['archivos'][0])

    def test_todo_o_nada(self):
        r = self.subir(self.op, [subir('bien.pdf', pdf('1')), subir('mal.pdf', b'basura')])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ActaEscaneo.objects.count(), 0)
        self.assertEqual(self.archivos_en_disco(), [])
        self.assertIn('No se guardó ningún archivo.', r.json()['archivos'])

    def test_no_permite_el_mismo_archivo_dos_veces(self):
        self.crear_escaneo(marca='uno')
        r = self.subir(self.op, [subir('otra-copia.pdf', pdf('uno'))])
        self.assertEqual(r.status_code, 400)
        self.assertIn('ya fue subido', r.json()['archivos'][0])
        r = self.subir(self.op, [subir('x.pdf', pdf('dos')), subir('y.pdf', pdf('dos'))])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ActaEscaneo.objects.count(), 1)

    def test_mismo_archivo_si_puede_estar_en_otra_acta(self):
        self.crear_escaneo(marca='igual')
        r = self.subir(self.op, [subir('a.pdf', pdf('igual'))], acta=self.acta2)
        self.assertEqual(r.status_code, 201, r.content)

    def test_limite_de_archivos_por_acta(self):
        with override_settings(ACTAS_ESCANEO_MAX_ARCHIVOS=3):
            r = self.subir(self.op, [subir(f'{i}.pdf', pdf(str(i))) for i in range(4)])
            self.assertEqual(r.status_code, 400)  # 4 en una sola petición
            r = self.subir(self.op, [subir(f'{i}.pdf', pdf(str(i))) for i in range(3)])
            self.assertEqual(r.status_code, 201)
            r = self.subir(self.op, [subir('extra.pdf', pdf('extra'))])
            self.assertEqual(r.status_code, 400)
            self.assertIn('máximo', r.json()['archivos'][0])
        self.assertEqual(ActaEscaneo.objects.count(), 3)

    def test_sin_archivos(self):
        r = self.como(self.op).post(self.url(), {}, format='multipart')
        self.assertEqual(r.status_code, 400)

    def test_nombre_malicioso_se_limpia_y_extension_refleja_el_formato(self):
        r = self.subir(self.op, [subir('../../etc/passwd.pdf', pdf('1')), subir('foto.jpg', pdf('2'))])
        self.assertEqual(r.status_code, 201, r.content)
        nombres = sorted(d['nombre_original'] for d in r.json())
        self.assertEqual(nombres, ['foto.pdf', 'passwd.pdf'])
        for p in self.archivos_en_disco():
            self.assertTrue(p.resolve().is_relative_to(Path(self.tmp).resolve()))


class PermisosTests(EscaneosBase):
    def test_sin_sesion(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url()).status_code, 401)
        self.assertEqual(self.client.post(self.url(), {}, format='multipart').status_code, 401)

    def test_consulta_ve_sus_escaneos_pero_no_sube_ni_ve_ajenos(self):
        e = self.crear_escaneo()
        # no puede subir
        self.assertEqual(self.subir(self.consulta, [subir('a.pdf', pdf('z'))]).status_code, 403)
        # ve y abre los de SU acta
        self.assertEqual(len(self.como(self.consulta).get(self.url()).json()), 1)
        self.assertEqual(self.pedir_archivo(self.consulta, e['id']).status_code, 200)
        # no ve el acta de otra persona
        self.assertEqual(self.como(self.consulta).get(self.url(self.acta2)).status_code, 404)
        self.assertEqual(self.como(self.consulta2).get(self.url()).status_code, 404)

    def test_operador_de_otra_empresa_no_ve_nada(self):
        e = self.crear_escaneo()
        self.assertEqual(self.como(self.op_b).get(self.url()).status_code, 404)
        self.assertEqual(self.como(self.op_b).get(self.url(None, e['id'], 'archivo')).status_code, 404)
        self.assertEqual(self.subir(self.op_b, [subir('a.pdf', pdf('q'))]).status_code, 404)

    def test_operador_multiempresa_si_ve_las_de_sus_empresas(self):
        e = self.crear_escaneo()
        self.assertEqual(self.como(self.op_multi).get(self.url()).status_code, 200)
        self.assertEqual(self.pedir_archivo(self.op_multi, e['id']).status_code, 200)

    def test_solo_admin_elimina_y_restaura(self):
        e = self.crear_escaneo()
        borrar = self.url(None, e['id'])
        self.assertEqual(self.como(self.op).delete(borrar, {'motivo': 'foto borrosa'}, format='json').status_code, 403)
        self.assertEqual(self.como(self.op).post(self.url(None, e['id'], 'restaurar')).status_code, 403)
        self.assertEqual(self.como(self.consulta).delete(borrar, {'motivo': 'foto borrosa'}, format='json').status_code, 403)

    def test_eliminar_exige_motivo(self):
        e = self.crear_escaneo()
        for cuerpo in ({}, {'motivo': '  '}, {'motivo': 'abc'}, {'motivo': 'x' * 300}):
            r = self.como(self.admin).delete(self.url(None, e['id']), cuerpo, format='json')
            self.assertEqual(r.status_code, 400, cuerpo)
        self.assertFalse(ActaEscaneo.objects.get().eliminado)

    def test_borrado_logico_y_restauracion(self):
        e = self.crear_escaneo()
        r = self.como(self.admin).delete(self.url(None, e['id']), {'motivo': 'Foto borrosa, se vuelve a escanear'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        escaneo = ActaEscaneo.objects.get()
        self.assertTrue(escaneo.eliminado)
        self.assertEqual(escaneo.eliminado_por, self.admin)
        self.assertEqual(len(self.archivos_en_disco()), 1, 'el archivo NO se borra del disco')
        # para el operador "no existe"; el admin lo ve solo si lo pide
        self.assertEqual(self.como(self.op).get(self.url()).json(), [])
        self.assertEqual(self.como(self.op).get(self.url(None, e['id'], 'archivo')).status_code, 404)
        self.assertEqual(self.como(self.admin).get(self.url()).json(), [])
        self.assertEqual(len(self.como(self.admin).get(self.url() + '?incluir_eliminados=1').json()), 1)
        self.assertEqual(self.como(self.op).get(self.url() + '?incluir_eliminados=1').json(), [])
        lista = self.como(self.op).get('/api/actas/actas/').json()
        self.assertEqual(next(a for a in lista if a['id'] == str(self.acta.id))['escaneos_count'], 0)
        # restaurar
        r = self.como(self.admin).post(self.url(None, e['id'], 'restaurar'))
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(ActaEscaneo.objects.get().eliminado)
        self.assertEqual(len(self.como(self.op).get(self.url()).json()), 1)

    def test_no_se_puede_restaurar_si_ya_hay_uno_identico_activo(self):
        e = self.crear_escaneo(marca='igual')
        self.como(self.admin).delete(self.url(None, e['id']), {'motivo': 'por error de carga'}, format='json')
        self.crear_escaneo(marca='igual')  # mismo contenido, ahora sí permitido
        r = self.como(self.admin).post(self.url(None, e['id'], 'restaurar'))
        self.assertEqual(r.status_code, 400)

    def test_id_invalido_o_inexistente(self):
        self.crear_escaneo()
        c = self.como(self.admin)
        self.assertEqual(c.get(f'/api/actas/actas/{self.acta.id}/escaneos/no-es-un-uuid-pero-largo-0000000000000/archivo/').status_code, 404)
        self.assertEqual(c.get(self.url(None, '11111111-1111-1111-1111-111111111111', 'archivo')).status_code, 404)

    def test_escaneo_de_otra_acta_no_se_puede_pedir_por_esta(self):
        e = self.crear_escaneo(acta=self.acta2)
        self.assertEqual(self.como(self.admin).get(self.url(self.acta, e['id'], 'archivo')).status_code, 404)


class DescargaTests(EscaneosBase):
    def test_entrega_el_archivo_con_cabeceras_seguras(self):
        contenido = pdf('contenido-real')
        r = self.subir(self.op, [subir('Acta firmada ñandú.pdf', contenido)])
        e = r.json()[0]
        r = self.como(self.op).get(self.url(None, e['id'], 'archivo'))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(b''.join(r.streaming_content), contenido)
        self.assertEqual(r['Content-Type'], 'application/pdf')
        self.assertEqual(r['X-Content-Type-Options'], 'nosniff')
        self.assertIn('no-store', r['Cache-Control'])
        self.assertIn('inline', r['Content-Disposition'])
        self.assertEqual(r['Content-Length'], str(len(contenido)))
        r = self.como(self.op).get(self.url(None, e['id'], 'archivo') + '?descargar=1')
        self.assertIn('attachment', r['Content-Disposition'])
        b''.join(r.streaming_content)  # consumirla cierra el archivo sin tocar la conexión de la prueba

    def test_archivo_faltante_en_disco_da_mensaje_claro(self):
        e = self.crear_escaneo()
        for p in self.archivos_en_disco():
            p.unlink()
        r = self.como(self.op).get(self.url(None, e['id'], 'archivo'))
        self.assertEqual(r.status_code, 404)
        self.assertIn('respaldo', r.json()['detail'])


class AuditoriaYDashboardTests(EscaneosBase):
    def test_acciones_quedan_en_auditoria(self):
        e = self.crear_escaneo()
        r = self.como(self.op).get(self.url(None, e['id'], 'archivo'))
        b''.join(r.streaming_content)  # no usar r.close(): cierra la conexión de la prueba
        self.como(self.admin).delete(self.url(None, e['id']), {'motivo': 'subido por error'}, format='json')
        acciones = list(RegistroAuditoria.objects.filter(modelo='ActaEscaneo').order_by('fecha_hora').values_list('accion', 'usuario_username'))
        self.assertEqual(acciones, [('crear', 'op'), ('ver_escaneo', 'op'), ('eliminar', 'admin')])
        eliminar = RegistroAuditoria.objects.get(accion='eliminar')
        self.assertEqual(eliminar.cambios['motivo']['despues'], 'subido por error')

    def test_dashboard_cuenta_actas_sin_escaneo(self):
        def pendientes(usuario):
            return self.como(usuario).get('/api/inventario/dashboard/').json()['actas_sin_escaneo']

        self.assertEqual(pendientes(self.admin), 2)
        e = self.crear_escaneo()
        self.assertEqual(pendientes(self.admin), 1)
        self.como(self.admin).delete(self.url(None, e['id']), {'motivo': 'por error de carga'}, format='json')
        self.assertEqual(pendientes(self.admin), 2)  # un escaneo eliminado no cuenta como respaldo
        # cada usuario solo cuenta las actas que puede ver
        self.assertEqual(pendientes(self.op_b), 0)
        self.assertEqual(pendientes(self.consulta), 1)


class ComandosTests(EscaneosBase):
    def correr(self, nombre, *args):
        out, err = io.StringIO(), io.StringIO()
        call_command(nombre, *args, stdout=out, stderr=err)
        return out.getvalue(), err.getvalue()

    def test_verificar_ok_y_detecta_problemas(self):
        self.crear_escaneo(marca='a')
        self.crear_escaneo(marca='b', acta=self.acta2)
        salida, _ = self.correr('verificar_actas')
        self.assertIn('Todo correcto', salida)

        primero = ActaEscaneo.objects.order_by('fecha_subida').first()
        ruta = Path(self.tmp, primero.archivo.name)
        contenido = ruta.read_bytes()
        ruta.write_bytes(contenido[:-1] + b'X')  # mismo tamaño, otro contenido
        with self.assertRaises(CommandError) as cm:
            self.correr('verificar_actas')
        self.assertIn('1 problema', str(cm.exception))
        self.correr('verificar_actas', '--rapido')  # solo tamaño/existencia: no lo ve

        ruta.unlink()
        with self.assertRaises(CommandError):
            self.correr('verificar_actas', '--rapido')

    def test_verificar_avisa_de_archivos_huerfanos(self):
        self.crear_escaneo()
        (Path(self.tmp) / 'suelto.pdf').write_bytes(b'x')
        salida, _ = self.correr('verificar_actas')
        self.assertIn('HUÉRFANO', salida)

    def test_respaldo_incluye_todo_y_un_manifiesto(self):
        e1 = self.crear_escaneo(marca='a')
        self.crear_escaneo(marca='b', acta=self.acta2)
        self.como(self.admin).delete(self.url(None, e1['id']), {'motivo': 'por error de carga'}, format='json')
        destino = Path(self.tmp) / '_respaldos'
        self.correr('respaldar_actas', '--destino', str(destino))
        zips = list(destino.glob('respaldo_actas_*.zip'))
        self.assertEqual(len(zips), 1)
        if sys.platform != 'win32':  # Windows no maneja permisos tipo Unix
          self.assertEqual(oct(zips[0].stat().st_mode & 0o777), '0o600')
        with zipfile.ZipFile(zips[0]) as z:
            nombres = z.namelist()
            self.assertEqual(len([n for n in nombres if n.startswith('archivos/')]), 2)  # incluye el eliminado
            manifiesto = z.read('manifiesto.csv').decode('utf-8-sig')
            self.assertIn('sha256', manifiesto)
            self.assertIn(e1['sha256'], manifiesto)
            self.assertIsNone(z.testzip())

    def test_respaldo_avisa_si_falta_un_archivo(self):
        self.crear_escaneo()
        for p in self.archivos_en_disco():
            p.unlink()
        destino = Path(self.tmp) / '_respaldos2'
        with self.assertRaises(CommandError):
            self.correr('respaldar_actas', '--destino', str(destino))
        self.assertEqual(len(list(destino.glob('respaldo_actas_*.zip'))), 1)  # igual deja el .zip
        self.assertEqual(list(destino.glob('*.tmp')), [])

    def test_respaldo_rota_los_antiguos(self):
        self.crear_escaneo()
        destino = Path(self.tmp) / '_rotar'
        destino.mkdir()
        for i in range(5):
            (destino / f'respaldo_actas_2020010{i}_000000.zip').write_bytes(b'x')
        self.correr('respaldar_actas', '--destino', str(destino), '--mantener', '3')
        restantes = sorted(p.name for p in destino.glob('respaldo_actas_*.zip'))
        self.assertEqual(len(restantes), 3)
        self.assertTrue(restantes[-1] > 'respaldo_actas_2026')  # se conservó el recién creado
