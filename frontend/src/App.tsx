import { Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'
import CategoriasPage from './pages/CategoriasPage'
import UbicacionesPage from './pages/UbicacionesPage'
import ProveedoresPage from './pages/ProveedoresPage'
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
        <Route path="/activos" element={<PlaceholderPage titulo="Activos" />} />
        <Route path="/categorias" element={<CategoriasPage />} />
        <Route path="/ubicaciones" element={<UbicacionesPage />} />
        <Route path="/personas" element={<PlaceholderPage titulo="Custodios" />} />
        <Route path="/custodias" element={<PlaceholderPage titulo="Custodias" />} />
        <Route path="/actas-entrega" element={<PlaceholderPage titulo="Actas de entrega" />} />
        <Route path="/movimientos" element={<PlaceholderPage titulo="Movimientos" />} />
        <Route path="/mantenimientos" element={<PlaceholderPage titulo="Mantenimientos" />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/usuarios" element={<PlaceholderPage titulo="Usuarios" />} />
  
      </Route>
    </Routes>
  )
}

export default App