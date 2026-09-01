from rest_framework.routers import DefaultRouter

from .views import CustodiaViewSet

router = DefaultRouter()
router.register('custodias', CustodiaViewSet, basename='custodia')

urlpatterns = router.urls