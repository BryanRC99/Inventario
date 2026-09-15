from django.apps import AppConfig


class AuditoriaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auditoria'

    def ready(self):
        from actas.models import ActaEntrega
        from areas.models import Area
        from custodia.models import Custodia
        from inventario.models import Activo, Categoria, Ubicacion
        from personas.models import Persona
        from proveedores.models import Proveedor
        from trazabilidad.models import Mantenimiento
        from usuarios.models import Usuario

        from .signals import conectar_auditoria

        conectar_auditoria(
            [
                Activo,
                Categoria,
                Ubicacion,
                Custodia,
                Persona,
                Usuario,
                Proveedor,
                Area,
                ActaEntrega,
                Mantenimiento,
            ]
        )