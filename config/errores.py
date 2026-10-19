from django.http import JsonResponse


def error_404(request, exception=None):
    """Rutas inexistentes: siempre JSON, para que el frontend pueda mostrar un mensaje claro."""
    return JsonResponse({'detail': 'El recurso solicitado no existe.'}, status=404)


def error_500(request):
    """Error interno: JSON genérico, sin detalles técnicos."""
    return JsonResponse(
        {'detail': 'Ocurrió un error interno del servidor. Intenta nuevamente en unos momentos.'},
        status=500,
    )
