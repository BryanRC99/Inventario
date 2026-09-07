import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ActivosPage from './pages/ActivosPage'
import CategoriasPage from './pages/CategoriasPage'
import UbicacionesPage from './pages/UbicacionesPage'
import PersonasPage from './pages/PersonasPage'
import CustodiasPage from './pages/CustodiasPage'
import ActasEntregaPage from './pages/ActasEntregaPage'
import MovimientosPage from './pages/MovimientosPage'
import MantenimientosPage from './pages/MantenimientosPage'
import ProveedoresPage from './pages/ProveedoresPage'
import UsuariosPage from './pages/UsuariosPage'
import AreasPage from './pages/AreasPage'
import MisActivosPage from './pages/MisActivosPage'
import ProtectedRoute from './components/ProtectedRoute'
import { RoleGuard } from './components/admin-route'
import DashboardLayout from './layouts/DashboardLayout'
import { useAuth } from './context/AuthContext'

const NO_CONSULTA = ['admin', 'operador']

function InicioSegunRol() {
  const { usuario } = useAuth()
  return usuario?.rol === 'consulta' ? <MisActivosPage /> : <DashboardPage />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<InicioSegunRol />} />

        <Route path="/mis-activos" element={<MisActivosPage />} />

        <Route
          path="/activos"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <ActivosPage />
            </RoleGuard>
          }
        />
        <Route
          path="/categorias"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <CategoriasPage />
            </RoleGuard>
          }
        />
        <Route
          path="/ubicaciones"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <UbicacionesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/personas"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <PersonasPage />
            </RoleGuard>
          }
        />
        <Route
          path="/custodias"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <CustodiasPage />
            </RoleGuard>
          }
        />
        <Route
          path="/actas-entrega"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <ActasEntregaPage />
            </RoleGuard>
          }
        />
        <Route
          path="/movimientos"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <MovimientosPage />
            </RoleGuard>
          }
        />
        <Route
          path="/mantenimientos"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <MantenimientosPage />
            </RoleGuard>
          }
        />
        <Route
          path="/proveedores"
          element={
            <RoleGuard rolesPermitidos={NO_CONSULTA} redirectTo="/mis-activos">
              <ProveedoresPage />
            </RoleGuard>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RoleGuard rolesPermitidos={['admin']} redirectTo="/mis-activos">
              <UsuariosPage />
            </RoleGuard>
          }
        />
        <Route
          path="/areas"
          element={
            <RoleGuard rolesPermitidos={['admin']} redirectTo="/mis-activos">
              <AreasPage />
            </RoleGuard>
          }
        />
      </Route>
    </Routes>
  )
}

export default App