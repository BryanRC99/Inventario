import datetime

from rest_framework.test import APITestCase

from areas.models import Area
from custodia.models import Custodia
from empresas.models import Empresa
from inventario.models import Activo, Categoria, Ubicacion
from personas.models import Persona
from usuarios.models import Usuario


class ConsultaActivosTests(APITestCase):
    """El rol consulta ve solo lo que tiene a su cargo y no puede hacer nada más sobre activos."""

    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(nombre='Antoisafood')
        cls.area = Area.objects.create(nombre='Sistemas')
        cat = Categoria.objects.create(nombre='Laptop', prefijo='LAP')
        ub = Ubicacion.objects.create(nombre='Oficina', tipo='oficina')
        cls.operador = Usuario.objects.create_user('op', password='x', rol='operador', empresa=cls.empresa, area=cls.area)
        cls.consulta = Usuario.objects.create_user('1700000001', password='x', rol='consulta', empresa=cls.empresa)
        cls.yo = Persona.objects.create(nombres='Juan', apellidos='Perez', documento='1700000001',
                                        empresa=cls.empresa, usuario=cls.consulta)
        otra = Persona.objects.create(nombres='Ana', apellidos='Mora', documento='1700000002', empresa=cls.empresa)
        mio = Activo.objects.create(codigo_interno='LAP-001', categoria=cat, nombre='Mi laptop', ubicacion=ub,
                                    empresa=cls.empresa, creado_por=cls.operador)
        ajeno = Activo.objects.create(codigo_interno='LAP-002', categoria=cat, nombre='Laptop de Ana', ubicacion=ub,
                                      empresa=cls.empresa, creado_por=cls.operador)
        cls.mio, cls.ajeno = mio, ajeno
        Custodia.objects.create(activo=mio, persona=cls.yo, fecha_inicio=datetime.date(2026, 10, 1))
        Custodia.objects.create(activo=ajeno, persona=otra, fecha_inicio=datetime.date(2026, 10, 1))

    def setUp(self):
        self.client.force_authenticate(self.consulta)

    def test_lista_solo_sus_activos(self):
        r = self.client.get('/api/inventario/activos/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual([a['codigo_interno'] for a in r.json()], ['LAP-001'])

    def test_detalle_propio_si_ajeno_no(self):
        self.assertEqual(self.client.get(f'/api/inventario/activos/{self.mio.id}/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/inventario/activos/{self.ajeno.id}/').status_code, 404)

    def test_no_puede_crear_editar_ni_usar_acciones(self):
        base = '/api/inventario/activos/'
        self.assertEqual(self.client.post(base, {'nombre': 'x'}).status_code, 403)
        self.assertEqual(self.client.patch(f'{base}{self.mio.id}/', {'nombre': 'x'}).status_code, 403)
        self.assertEqual(self.client.post(f'{base}{self.mio.id}/dar_de_baja/', {'motivo': 'xxxxx'}).status_code, 403)
        for accion in ('reporte_excel', 'reporte_pdf', 'plantilla_importacion'):
            self.assertEqual(self.client.get(f'{base}{accion}/').status_code, 403, accion)
        self.assertEqual(self.client.get(f'{base}{self.mio.id}/etiqueta/').status_code, 403)

    def test_sin_sesion_sigue_bloqueado(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/inventario/activos/').status_code, 401)
