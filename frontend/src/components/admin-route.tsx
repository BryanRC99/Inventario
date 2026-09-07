import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'

interface RoleGuardProps {
  children: ReactNode
  rolesPermitidos: string[]
  redirectTo?: string
}

export function RoleGuard({ children, rolesPermitidos, redirectTo = '/' }: RoleGuardProps) {
  const { usuario } = useAuth()

  const tienePermiso = usuario ? rolesPermitidos.includes(usuario.rol) : false

  if (!tienePermiso) {
    toast.error('No tienes permiso para acceder a esa sección')
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

export default function AdminRoute({ children }: { children: ReactNode }) {
  return <RoleGuard rolesPermitidos={['admin']}>{children}</RoleGuard>
}