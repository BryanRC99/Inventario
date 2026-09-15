import uuid

from django.db import models


class RegistroAuditoria(models.Model):
    class Accion(models.TextChoices):
        CREAR = 'crear', 'Creación'
        EDITAR = 'editar', 'Edición'
        ELIMINAR = 'eliminar', 'Eliminación'
        LOGIN = 'login', 'Inicio de sesión'
        LOGIN_FALLIDO = 'login_fallido', 'Inicio de sesión fallido'
        LOGOUT = 'logout', 'Cierre de sesión'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(    
        'usuarios.Usuario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_auditoria',
    )
    usuario_username = models.CharField(max_length=150, blank=True)
    accion = models.CharField(max_length=20, choices=Accion.choices)
    modelo = models.CharField(max_length=100, blank=True)
    objeto_id = models.CharField(max_length=100, blank=True)
    objeto_repr = models.CharField(max_length=255, blank=True)
    cambios = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_hora']
        verbose_name = 'Registro de auditoría'
        verbose_name_plural = 'Registros de auditoría'

    def __str__(self):
        return f'{self.get_accion_display()} - {self.modelo} - {self.fecha_hora}'