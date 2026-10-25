import datetime

from rest_framework.test import APITestCase

from custodia.models import Custodia
from empresas.models import Empresa
from inventario.models import Activo, Categoria, Ubicacion
from personas.models import Persona
from trazabilidad.models import Movimiento
from usuarios.models import Usuario

URL = '/api/inventario/activos/'


class IntegridadActivosTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.e1 = Empresa.objects.create(nombre='Antoisafood')
        cls.e2 = Empresa.objects.create(nombre='Jasafood')
        cls.cat = Categoria.objects.create(nombre='Laptop', prefijo='LAP')
        cls.cat2 = Categoria.objects.create(nombre='Monitor', prefijo='MON')
        cls.ub1 = Ubicacion.objects.create(nombre='Oficina', tipo='oficina')
        cls.ub2 = Ubicacion.objects.create(nombre='Bodega', tipo='bodega')
        cls.admin = Usuario.objects.create_user('adm', password='x', rol='admin')
        cls.operador = Usuario.objects.create_user('op', password='x', rol='operador', empresa=cls.e1)

    def setUp(self):
        self.client.force_authenticate(self.admin)
        self.activo = Activo.objects.create(
            codigo_interno='LAP-001', categoria=self.cat, nombre='Laptop', ubicacion=self.ub1,
            empresa=self.e1, creado_por=self.admin, numero_serie='SN-1',
        )

    def payload(self, **extra):
        datos = {
            'categoria': str(self.cat.id), 'nombre': 'Laptop', 'ubicacion': str(self.ub1.id),
            'empresa': str(self.e1.id), 'estado': 'activo', 'numero_serie': 'SN-1',
        }
        datos.update(extra)
        return datos

    # ------------------------------------------------------------------ estado / baja
    def test_no_se_puede_crear_un_activo_ya_dado_de_baja(self):
        r = self.client.post(URL, self.payload(numero_serie='', estado='dado_de_baja'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('estado', r.json())

    def test_no_se_puede_dar_de_baja_editando_el_estado(self):
        r = self.client.put(f'{URL}{self.activo.id}/', self.payload(estado='dado_de_baja'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Dar de baja', str(r.json()['estado']))
        self.activo.refresh_from_db()
        self.assertEqual(self.activo.estado, 'activo')
        self.assertFalse(Movimiento.objects.filter(tipo_evento='baja').exists())

    def test_cambios_de_estado_normales_siguen_permitidos(self):
        for estado in ('en_mantenimiento', 'extraviado', 'activo'):
            r = self.client.patch(f'{URL}{self.activo.id}/', {'estado': estado}, format='json')
            self.assertEqual(r.status_code, 200, estado)

    def test_activo_dado_de_baja_no_se_modifica_ni_se_reactiva(self):
        r = self.client.post(f'{URL}{self.activo.id}/dar_de_baja/', {'motivo': 'Equipo obsoleto'}, format='json')
        self.assertEqual(r.status_code, 200)
        for datos in ({'nombre': 'Otro'}, {'estado': 'activo'}, {'ubicacion': str(self.ub2.id)}):
            r = self.client.patch(f'{URL}{self.activo.id}/', datos, format='json')
            self.assertEqual(r.status_code, 400, datos)
            self.assertIn('dado de baja', str(r.json()))
        self.activo.refresh_from_db()
        self.assertEqual((self.activo.estado, self.activo.nombre), ('dado_de_baja', 'Laptop'))

    def test_dar_de_baja_motivo_invalido_no_da_error_500(self):
        base = f'{URL}{self.activo.id}/dar_de_baja/'
        self.assertEqual(self.client.post(base, {'motivo': 12345}, format='json').status_code, 400)
        self.assertEqual(self.client.post(base, {'motivo': 'x' * 256}, format='json').status_code, 400)
        self.assertEqual(self.client.post(base, {'motivo': '   '}, format='json').status_code, 400)
        self.activo.refresh_from_db()
        self.assertEqual(self.activo.estado, 'activo')

    # ------------------------------------------------------------------ ubicación -> traslado
    def test_cambiar_la_ubicacion_registra_un_traslado(self):
        r = self.client.patch(f'{URL}{self.activo.id}/', {'ubicacion': str(self.ub2.id)}, format='json')
        self.assertEqual(r.status_code, 200)
        m = Movimiento.objects.get(activo=self.activo, tipo_evento='traslado')
        self.assertEqual((m.ubicacion_origen, m.ubicacion_destino, m.usuario), (self.ub1, self.ub2, self.admin))

    def test_editar_sin_cambiar_la_ubicacion_no_registra_traslado(self):
        r = self.client.put(f'{URL}{self.activo.id}/', self.payload(nombre='Laptop renombrada'), format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(Movimiento.objects.filter(tipo_evento='traslado').exists())

    # ------------------------------------------------------------------ categoría
    def test_la_categoria_no_se_puede_cambiar_pero_enviar_la_misma_si(self):
        r = self.client.patch(f'{URL}{self.activo.id}/', {'categoria': str(self.cat2.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('categoria', r.json())
        self.activo.refresh_from_db()
        self.assertEqual((self.activo.categoria, self.activo.codigo_interno), (self.cat, 'LAP-001'))
        r = self.client.put(f'{URL}{self.activo.id}/', self.payload(), format='json')
        self.assertEqual(r.status_code, 200, r.content)

    # ------------------------------------------------------------------ empresa
    def test_admin_no_cambia_la_empresa_con_custodias_activas(self):
        persona = Persona.objects.create(nombres='A', apellidos='B', documento='1', empresa=self.e1)
        custodia = Custodia.objects.create(activo=self.activo, persona=persona, fecha_inicio=datetime.date(2026, 1, 1))
        r = self.client.patch(f'{URL}{self.activo.id}/', {'empresa': str(self.e2.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('empresa', r.json())
        custodia.fecha_fin = datetime.date(2026, 2, 1)
        custodia.save()
        r = self.client.patch(f'{URL}{self.activo.id}/', {'empresa': str(self.e2.id)}, format='json')
        self.assertEqual(r.status_code, 200, r.content)

    # ------------------------------------------------------------------ valores y fechas
    def test_valor_negativo_y_garantia_anterior_a_la_adquisicion(self):
        r = self.client.patch(f'{URL}{self.activo.id}/', {'valor_adquisicion': '-1'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f'{URL}{self.activo.id}/', {'valor_adquisicion': '0'}, format='json')
        self.assertEqual(r.status_code, 200)
        r = self.client.patch(
            f'{URL}{self.activo.id}/',
            {'fecha_adquisicion': '2026-05-01', 'fecha_fin_garantia': '2026-01-01'}, format='json',
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn('fecha_fin_garantia', r.json())
        # También cuenta lo ya guardado: mover solo la garantía a antes de la adquisición guardada.
        self.activo.fecha_adquisicion = datetime.date(2026, 5, 1)
        self.activo.save()
        r = self.client.patch(f'{URL}{self.activo.id}/', {'fecha_fin_garantia': '2026-04-30'}, format='json')
        self.assertEqual(r.status_code, 400)

    # ------------------------------------------------------------------ número de serie
    def test_numero_de_serie_repetido_se_rechaza_sin_importar_mayusculas(self):
        r = self.client.post(URL, self.payload(numero_serie='sn-1'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('numero_serie', r.json())
        r = self.client.post(URL, self.payload(numero_serie='SN-2'), format='json')
        self.assertEqual(r.status_code, 201, r.content)
        otro = Activo.objects.get(numero_serie='SN-2')
        r = self.client.patch(f'{URL}{otro.id}/', {'numero_serie': 'Sn-1'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_editar_un_activo_sin_cambiar_su_serie_no_la_toma_por_repetida(self):
        r = self.client.put(f'{URL}{self.activo.id}/', self.payload(nombre='Otro nombre'), format='json')
        self.assertEqual(r.status_code, 200, r.content)

    def test_varios_activos_sin_serie_son_validos(self):
        for _ in range(2):
            r = self.client.post(URL, self.payload(numero_serie=''), format='json')
            self.assertEqual(r.status_code, 201, r.content)
