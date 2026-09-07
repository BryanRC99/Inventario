from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivoViewSet, CategoriaViewSet, DashboardView, UbicacionViewSet

router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')
router.register('ubicaciones', UbicacionViewSet, basename='ubicacion')
router.register('activos', ActivoViewSet, basename='activo')

urlpatterns = router.urls + [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]