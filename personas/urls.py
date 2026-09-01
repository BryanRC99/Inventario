from rest_framework.routers import DefaultRouter

from .views import PersonaViewSet

router = DefaultRouter()
router.register('personas', PersonaViewSet, basename='persona')

urlpatterns = router.urls