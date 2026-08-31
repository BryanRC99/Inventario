import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, loading } = useAuth()

  // Mientras se valida el token contra /me/, no decidas nada todavía
  // (evita un parpadeo hacia /login antes de confirmar la sesión).
  if (loading) {
    return (
      <div className="app-loading">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}