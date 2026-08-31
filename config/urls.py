from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/proveedores/', include('proveedores.urls')),
]