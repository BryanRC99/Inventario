from django.test import override_settings
from rest_framework.test import APITestCase


class ErroresJsonTests(APITestCase):
    def test_url_inexistente_devuelve_json(self):
        with override_settings(DEBUG=False):
            r = self.client.get('/api/no-existe/')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r['Content-Type'], 'application/json')
        self.assertIn('detail', r.json())
