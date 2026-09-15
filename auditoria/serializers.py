from rest_framework import serializers

from .models import RegistroAuditoria


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model = RegistroAuditoria
        fields = [
            'id',
            'usuario',
            'usuario_username',
            'accion',
            'accion_display',
            'modelo',
            'objeto_id',
            'objeto_repr',
            'cambios',
            'ip_address',
            'user_agent',
            'fecha_hora',
        ]