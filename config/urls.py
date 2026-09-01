from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/proveedores/', include('proveedores.urls')),
    path('api/personas/', include('personas.urls')),
    path('api/custodia/', include('custodia.urls')),
    path('api/actas/', include('actas.urls')),
    path('api/trazabilidad/', include('trazabilidad.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)