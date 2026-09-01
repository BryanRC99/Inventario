from rest_framework.routers import DefaultRouter

from .views import ActaEntregaViewSet

router = DefaultRouter()
router.register('actas', ActaEntregaViewSet, basename='acta')

urlpatterns = router.urls