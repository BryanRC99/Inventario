from django.db.models import ProtectedError
from rest_framework.response import Response
from rest_framework.views import exception_handler


def manejador_excepciones(exc, context):
    if isinstance(exc, ProtectedError):
        return Response(
            {'detail': 'No se puede eliminar: tiene registros asociados (historial).'},
            status=409,
        )
    return exception_handler(exc, context)
