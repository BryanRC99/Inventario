import type { ReactNode } from 'react'
import { AccionesNavegacion } from '@/components/acciones-error'
import { PantallaError } from '@/components/pantalla-error'
import { useAuth } from '@/context/AuthContext'

interface RoleGuardProps {
  children: ReactNode
  rolesPermitidos: string[]
  /** Pantalla de inicio a la que se ofrece volver (por defecto, según el rol). */
  redirectTo?: string
}

export function RoleGuard({ children, rolesPermitidos, redirectTo }: RoleGuardProps) {
  const { usuario } = useAuth()

  const tienePermiso = usuario ? rolesPermitidos.includes(usuario.rol) : false

  if (!tienePermiso) {
    return (
      <PantallaError tipo="403">
        <AccionesNavegacion inicio={redirectTo} />
      </PantallaError>
    )
  }

  return <>{children}</>
}

export default function AdminRoute({ children }: { children: ReactNode }) {
  return <RoleGuard rolesPermitidos={['admin']}>{children}</RoleGuard>
}
