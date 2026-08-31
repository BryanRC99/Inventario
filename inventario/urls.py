from rest_framework.routers import DefaultRouter

from .views import CategoriaViewSet, UbicacionViewSet

router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')
router.register('ubicaciones', UbicacionViewSet, basename='ubicacion')

urlpatterns = router.urls