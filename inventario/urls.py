from rest_framework.routers import DefaultRouter

from .views import ActivoViewSet, CategoriaViewSet, UbicacionViewSet

router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')
router.register('ubicaciones', UbicacionViewSet, basename='ubicacion')
router.register('activos', ActivoViewSet, basename='activo')

urlpatterns = router.urls