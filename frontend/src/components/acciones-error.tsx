import { Link, useNavigate } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

/** Botones "Volver" e "Ir al inicio" (el inicio depende del rol). */
export function AccionesNavegacion({ inicio }: { inicio?: string }) {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const destino = inicio ?? (usuario?.rol === 'consulta' ? '/mis-activos' : '/')
  // react-router guarda el índice en history.state: 0 = primera pantalla de la sesión.
  const puedeVolver = (window.history.state?.idx ?? 0) > 0

  return (
    <>
      {puedeVolver && (
        <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      )}
      <Link to={destino} replace className={cn(buttonVariants({ size: 'sm' }))}>
        Ir al inicio
      </Link>
    </>
  )
}
