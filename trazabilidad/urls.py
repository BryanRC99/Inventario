from rest_framework.routers import DefaultRouter

from .views import MantenimientoViewSet, MovimientoViewSet

router = DefaultRouter()
router.register('movimientos', MovimientoViewSet, basename='movimiento')
router.register('mantenimientos', MantenimientoViewSet, basename='mantenimiento')

urlpatterns = router.urls