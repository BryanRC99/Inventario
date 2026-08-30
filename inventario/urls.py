from rest_framework.routers import DefaultRouter

from .views import CategoriaViewSet

router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')

urlpatterns = router.urls