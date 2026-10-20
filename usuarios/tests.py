from rest_framework.test import APITestCase

from areas.models import Area
from empresas.models import Empresa
from inventario.models import Activo, Categoria, Ubicacion
from personas.models import Persona
from usuarios.alcance import empresas_ids
from usuarios.models import Usuario


class MultiEmpresaTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a, cls.b, cls.c = (Empresa.objects.create(nombre=n) for n in 'ABC')
        cls.area1 = Area.objects.create(nombre='Sistemas')
        cls.area2 = Area.objects.create(nombre='Contabilidad')
        cls.cat = Categoria.objects.create(nombre='Laptop', prefijo='LAP')
        cls.ub = Ubicacion.objects.create(nombre='Sede', tipo='sede')
        cls.admin = Usuario.objects.create_user('admin', password='x', rol='admin')
        cls.otro = Usuario.objects.create_user('otro', password='x', rol='operador', empresa=cls.a, area=cls.area2)
        for i, emp in enumerate((cls.a, cls.b, cls.c)):
            Activo.objects.create(
                codigo_interno=f'X-{i}', categoria=cls.cat, nombre=f'act{emp.nombre}',
                ubicacion=cls.ub, empresa=emp, creado_por=cls.otro, area_creador=cls.area2,
            )

    def nuevo_operador(self, empresa, extra=(), area=None, sin_restr=False, rol='operador'):
        u = Usuario.objects.create_user(
            f'op{Usuario.objects.count()}', password='x', rol=rol, empresa=empresa,
            area=area or self.area1, sin_restriccion_area=sin_restr,
        )
        u.empresas_adicionales.set(extra)
        return u

    def nombres(self, user, url='/api/inventario/activos/'):
        self.client.force_authenticate(user)
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        return sorted(x['nombre'] for x in r.json())

    # --- aislamiento ---
    def test_operador_una_empresa_sin_area_no_ve_ajenos(self):
        u = self.nuevo_operador(self.a)
        self.assertEqual(self.nombres(u), [])  # ve su empresa pero no lo de otra área/creador

    def test_sin_restriccion_ve_todo_de_sus_empresas_y_solo_esas(self):
        u = self.nuevo_operador(self.a, extra=[self.b], sin_restr=True)
        self.assertEqual(self.nombres(u), ['actA', 'actB'])  # nunca C

    def test_con_restriccion_area_multiempresa_respeta_area(self):
        u = self.nuevo_operador(self.a, extra=[self.b], area=self.area2)
        self.assertEqual(self.nombres(u), ['actA', 'actB'])  # mismo área del creador, solo A y B

    def test_consulta_ignora_adicionales(self):
        u = self.nuevo_operador(self.a, extra=[self.b], rol='consulta')
        self.assertEqual(empresas_ids(u), [self.a.id])

    def test_admin_ve_todo(self):
        self.assertEqual(self.nombres(self.admin), ['actA', 'actB', 'actC'])

    def test_filtro_empresa_no_ensancha_acceso(self):
        u = self.nuevo_operador(self.a, extra=[self.b], sin_restr=True)
        self.assertEqual(self.nombres(u, f'/api/inventario/activos/?empresa={self.c.id}'), [])

    # --- creación ---
    def crear_activo(self, user, empresa=None):
        self.client.force_authenticate(user)
        data = {'categoria': str(self.cat.id), 'nombre': 'nuevo', 'ubicacion': str(self.ub.id), 'estado': 'activo'}
        if empresa:
            data['empresa'] = str(empresa.id)
        return self.client.post('/api/inventario/activos/', data, format='json')

    def test_crear_en_empresa_permitida(self):
        u = self.nuevo_operador(self.a, extra=[self.b])
        r = self.crear_activo(u, self.b)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['empresa'], str(self.b.id))

    def test_crear_en_empresa_no_permitida(self):
        u = self.nuevo_operador(self.a, extra=[self.b])
        r = self.crear_activo(u, self.c)
        self.assertEqual(r.status_code, 400)
        self.assertIn('permiso', r.json()['empresa'][0])

    def test_multiempresa_debe_elegir(self):
        u = self.nuevo_operador(self.a, extra=[self.b])
        self.assertEqual(self.crear_activo(u).status_code, 400)

    def test_una_empresa_se_asigna_sola(self):
        u = self.nuevo_operador(self.a)
        r = self.crear_activo(u)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['empresa'], str(self.a.id))

    def test_persona_multiempresa(self):
        u = self.nuevo_operador(self.a, extra=[self.b])
        self.client.force_authenticate(u)
        base = {'nombres': 'P', 'apellidos': 'Q', 'documento': '1'}
        self.assertEqual(self.client.post('/api/personas/personas/', base).status_code, 400)
        r = self.client.post('/api/personas/personas/', {**base, 'empresa': str(self.c.id)})
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/personas/personas/', {**base, 'empresa': str(self.b.id)})
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Persona.objects.get().empresa_id, self.b.id)

    # --- gestión de usuarios ---
    def crear_usuario(self, **extra):
        self.client.force_authenticate(self.admin)
        data = {'username': 'nuevo', 'rol': 'operador', 'empresa': str(self.a.id), **extra}
        return self.client.post('/api/auth/usuarios/', data, format='json')

    def test_admin_crea_operador_multiempresa(self):
        r = self.crear_usuario(empresas_adicionales=[str(self.b.id), str(self.c.id)], sin_restriccion_area=True)
        self.assertEqual(r.status_code, 201, r.content)
        u = Usuario.objects.get(username='nuevo')
        self.assertEqual(set(empresas_ids(u)), {self.a.id, self.b.id, self.c.id})
        self.assertTrue(u.sin_restriccion_area)

    def test_principal_no_se_duplica_en_adicionales(self):
        r = self.crear_usuario(empresas_adicionales=[str(self.a.id), str(self.b.id)])
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Usuario.objects.get(username='nuevo').empresas_adicionales.count(), 1)

    def test_consulta_no_puede_tener_adicionales(self):
        r = self.crear_usuario(rol='consulta', empresas_adicionales=[str(self.b.id)])
        self.assertEqual(r.status_code, 400)
        self.assertIn('empresas_adicionales', r.json())

    def test_consulta_no_puede_sin_restriccion(self):
        self.assertEqual(self.crear_usuario(rol='consulta', sin_restriccion_area=True).status_code, 400)

    def test_adicionales_requieren_principal(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post(
            '/api/auth/usuarios/',
            {'username': 'n2', 'rol': 'operador', 'empresas_adicionales': [str(self.b.id)]},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_cambiar_a_admin_limpia_alcance(self):
        u = self.nuevo_operador(self.a, extra=[self.b], sin_restr=True)
        self.client.force_authenticate(self.admin)
        r = self.client.patch(f'/api/auth/usuarios/{u.id}/', {'rol': 'admin'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        u.refresh_from_db()
        self.assertEqual(u.empresas_adicionales.count(), 0)
        self.assertFalse(u.sin_restriccion_area)

    def test_quitar_empresa_revoca_acceso_de_inmediato(self):
        u = self.nuevo_operador(self.a, extra=[self.b], sin_restr=True)
        self.assertEqual(self.nombres(u), ['actA', 'actB'])
        self.client.force_authenticate(self.admin)
        self.client.patch(f'/api/auth/usuarios/{u.id}/', {'empresas_adicionales': []}, format='json')
        self.assertEqual(self.nombres(u), ['actA'])

    def test_operador_no_gestiona_usuarios(self):
        self.client.force_authenticate(self.nuevo_operador(self.a))
        self.assertEqual(self.client.post('/api/auth/usuarios/', {'username': 'x'}).status_code, 403)

    def test_me_devuelve_empresas(self):
        u = self.nuevo_operador(self.a, extra=[self.b])
        self.client.force_authenticate(u)
        nombres = [e['nombre'] for e in self.client.get('/api/auth/me/').json()['empresas']]
        self.assertEqual(nombres, ['A', 'B'])
