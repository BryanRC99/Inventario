import datetime

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, APITestCase

from areas.models import Area
from custodia.models import Custodia
from custodia.serializers import CustodiaSerializer
from empresas.models import Empresa
from inventario.models import Activo, Categoria, Ubicacion
from personas.models import Persona
from trazabilidad.models import Movimiento
from usuarios.models import Usuario

URL = '/api/custodia/custodias/'


class IntegridadCustodiasTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.e1 = Empresa.objects.create(nombre='Antoisafood')
        cls.area = Area.objects.create(nombre='Sistemas')
        cls.area2 = Area.objects.create(nombre='Ventas')
        cls.cat = Categoria.objects.create(nombre='Laptop', prefijo='LAP', requiere_custodio_unico=True)
        cls.cat_multi = Categoria.objects.create(nombre='Proyector', prefijo='PRO', requiere_custodio_unico=False)
        cls.ub = Ubicacion.objects.create(nombre='Oficina', tipo='oficina')
        cls.admin = Usuario.objects.create_user('adm', password='x', rol='admin')
        cls.ana = Persona.objects.create(nombres='Ana', apellidos='Mora', documento='1', empresa=cls.e1)
        cls.luis = Persona.objects.create(nombres='Luis', apellidos='Paz', documento='2', empresa=cls.e1)

    def setUp(self):
        self.client.force_authenticate(self.admin)
        self.hoy = timezone.localdate()
        self.activo = Activo.objects.create(
            codigo_interno='LAP-001', categoria=self.cat, nombre='Laptop', ubicacion=self.ub, empresa=self.e1,
        )
        self.otro = Activo.objects.create(
            codigo_interno='LAP-002', categoria=self.cat, nombre='Laptop 2', ubicacion=self.ub, empresa=self.e1,
        )

    def crear(self, **extra):
        datos = {'activo': str(self.activo.id), 'persona': str(self.ana.id), 'fecha_inicio': str(self.hoy)}
        datos.update(extra)
        return self.client.post(URL, datos, format='json')

    # ------------------------------------------------------------------ inmutables
    def test_no_se_puede_cambiar_activo_persona_o_area_de_una_custodia(self):
        c = self.crear().json()
        for campo, valor in (
            ('activo', str(self.otro.id)),
            ('persona', str(self.luis.id)),
        ):
            r = self.client.patch(f'{URL}{c["id"]}/', {campo: valor}, format='json')
            self.assertEqual(r.status_code, 400, campo)
            self.assertIn('Finaliza esta custodia', str(r.json()))
        r = self.client.patch(f'{URL}{c["id"]}/', {'persona': None, 'area': str(self.area.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        custodia = Custodia.objects.get(pk=c['id'])
        self.assertEqual((custodia.activo, custodia.persona, custodia.area), (self.activo, self.ana, None))

    def test_enviar_el_formulario_sin_cambiar_custodio_ni_activo_si_se_acepta(self):
        c = self.crear().json()
        r = self.client.put(
            f'{URL}{c["id"]}/',
            {'activo': str(self.activo.id), 'persona': str(self.ana.id), 'area': None,
             'fecha_inicio': str(self.hoy), 'tipo': 'secundario'},
            format='json',
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Custodia.objects.get(pk=c['id']).tipo, 'secundario')

    # ------------------------------------------------------------------ fechas
    def test_fechas_futuras_o_incoherentes(self):
        manana = str(self.hoy + datetime.timedelta(days=1))
        self.assertEqual(self.crear(fecha_inicio=manana).status_code, 400)
        r = self.crear(fecha_inicio=str(self.hoy), fecha_fin=manana)
        self.assertEqual(r.status_code, 400)
        r = self.crear(fecha_inicio=str(self.hoy), fecha_fin=str(self.hoy - datetime.timedelta(days=1)))
        self.assertEqual(r.status_code, 400)
        self.assertIn('anterior', str(r.json()))
        self.assertEqual(Custodia.objects.count(), 0)

    def test_custodia_retroactiva_valida(self):
        r = self.crear(fecha_inicio='2026-01-10', fecha_fin='2026-02-10')
        self.assertEqual(r.status_code, 201, r.content)

    def test_finalizar_y_el_historial(self):
        c = self.crear().json()
        r = self.client.patch(f'{URL}{c["id"]}/', {'fecha_fin': str(self.hoy)}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(Movimiento.objects.filter(activo=self.activo, tipo_evento='devolucion').exists())
        # ya finalizada: no se toca
        r = self.client.patch(f'{URL}{c["id"]}/', {'tipo': 'secundario'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_fin_anterior_al_inicio_al_finalizar(self):
        c = self.crear(fecha_inicio=str(self.hoy)).json()
        ayer = str(self.hoy - datetime.timedelta(days=1))
        r = self.client.patch(f'{URL}{c["id"]}/', {'fecha_fin': ayer}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIsNone(Custodia.objects.get(pk=c['id']).fecha_fin)

    # ------------------------------------------------------------------ custodio único
    def test_custodio_unico_en_secuencia(self):
        self.assertEqual(self.crear().status_code, 201)
        r = self.crear(persona=str(self.luis.id))
        self.assertEqual(r.status_code, 400)
        self.assertIn('custodio único', str(r.json()))

    def test_custodio_unico_aunque_las_dos_validaciones_pasen_antes_de_guardar(self):
        """Simula la carrera: dos solicitudes validan cuando todavía no hay custodia y recién
        después guardan. La segunda debe fallar al guardar (comprobación dentro del bloqueo)."""
        peticion = APIRequestFactory().post('/')
        peticion.user = self.admin

        def serializador(persona):
            s = CustodiaSerializer(
                data={'activo': str(self.activo.id), 'persona': str(persona.id), 'fecha_inicio': str(self.hoy)},
                context={'request': peticion},
            )
            self.assertTrue(s.is_valid(), s.errors)
            return s

        primero, segundo = serializador(self.ana), serializador(self.luis)
        primero.save()
        with self.assertRaises(ValidationError):
            segundo.save()
        self.assertEqual(Custodia.objects.filter(activo=self.activo, fecha_fin__isnull=True).count(), 1)

    def test_categoria_sin_custodio_unico_admite_varios(self):
        proyector = Activo.objects.create(
            codigo_interno='PRO-001', categoria=self.cat_multi, nombre='Proyector', ubicacion=self.ub, empresa=self.e1,
        )
        for persona in (self.ana, self.luis):
            r = self.crear(activo=str(proyector.id), persona=str(persona.id))
            self.assertEqual(r.status_code, 201, r.content)

    def test_no_se_asigna_un_activo_dado_de_baja(self):
        self.activo.estado = 'dado_de_baja'
        self.activo.save()
        self.assertEqual(self.crear().status_code, 400)

    def test_crear_con_ubicacion_destino_no_rompe(self):
        r = self.crear(ubicacion_destino=str(self.ub.id))
        self.assertEqual(r.status_code, 201, r.content)
