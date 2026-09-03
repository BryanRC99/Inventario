from rest_framework.permissions import SAFE_METHODS, BasePermission


class PermisoPorRol(BasePermission):
    """
    Regla única para todos los módulos CRUD del sistema:
    - Lectura (GET, HEAD, OPTIONS): cualquier usuario autenticado.
    - Crear/editar (POST, PUT, PATCH): Admin y Operador.
    - Borrar (DELETE): solo Admin (o superusuario de Django).
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            return True

        if request.method == 'DELETE':
            return user.is_superuser or user.rol == 'admin'

        # POST, PUT, PATCH
        return user.is_superuser or user.rol in ('admin', 'operador')

class SoloAdmin(BasePermission):
    """
    Restringe el acceso completo (incluida la lectura) solo a Admin
    o superusuario. Se usa para el módulo de gestión de Usuarios,
    donde ni siquiera un Operador debería poder ver la lista completa.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_superuser or user.rol == 'admin'