import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'
import PersonasPage from './pages/PersonasPage'
import ActivosPage from './pages/ActivosPage'
import CategoriasPage from './pages/CategoriasPage'
import UbicacionesPage from './pages/UbicacionesPage'
import ProveedoresPage from './pages/ProveedoresPage'
import CustodiasPage from './pages/CustodiasPage'
import ActasEntregaPage from './pages/ActasEntregaPage'
import MovimientosPage from './pages/MovimientosPage'
import MantenimientosPage from './pages/MantenimientosPage'
import UsuariosPage from './pages/UsuariosPage'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'


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
        <Route path="/" element={<DashboardPage />} />
        <Route path="/activos" element={<ActivosPage />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/ubicaciones" element={<UbicacionesPage />} />
        <Route path="/personas" element={<PersonasPage />} />
        <Route path="/custodias" element={<CustodiasPage />} />
        <Route path="/actas-entrega" element={<ActasEntregaPage />} />
        <Route path="/movimientos" element={<MovimientosPage />} />
        <Route path="/mantenimientos" element={<MantenimientosPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        
      </Route>
    </Routes>
  )
}

export default App