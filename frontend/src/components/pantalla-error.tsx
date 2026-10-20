import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  IlustracionError,
  IlustracionNoEncontrado,
  IlustracionSinConexion,
  IlustracionSinPermiso,
} from '@/components/ilustraciones-error'

export type TipoError = '404' | '403' | 'error' | 'red'

const CONTENIDO: Record<TipoError, { codigo?: string; titulo: string; mensaje: string; Ilustracion: typeof IlustracionError }> = {
  '404': {
    codigo: 'Error 404',
    titulo: 'Página no encontrada',
    mensaje: 'La dirección que intentó abrir no existe o fue movida. Verifique el enlace o regrese al inicio.',
    Ilustracion: IlustracionNoEncontrado,
  },
  '403': {
    codigo: 'Error 403',
    titulo: 'Acceso restringido',
    mensaje: 'Su usuario no tiene permiso para ver esta sección. Si considera que es un error, comuníquese con un administrador.',
    Ilustracion: IlustracionSinPermiso,
  },
  error: {
    titulo: 'Ocurrió un problema inesperado',
    mensaje: 'No fue posible completar la operación. Intente nuevamente; si el problema continúa, informe al administrador.',
    Ilustracion: IlustracionError,
  },
  red: {
    titulo: 'Sin conexión con el servidor',
    mensaje: 'No se pudo comunicar con el servidor. Revise su conexión a la red e intente nuevamente.',
    Ilustracion: IlustracionSinConexion,
  },
}

interface PantallaErrorProps {
  tipo: TipoError
  /** Reemplaza el título por defecto. */
  titulo?: string
  /** Reemplaza el mensaje por defecto. */
  mensaje?: string
  /** Botones de acción (Volver, Reintentar, Ir al inicio...). */
  children?: ReactNode
  /** Versión reducida para mostrarse dentro de una página en lugar de la tabla. */
  compacto?: boolean
  /** Detalle técnico; solo se pasa en desarrollo. */
  detalle?: string
}

export function PantallaError({ tipo, titulo, mensaje, children, compacto, detalle }: PantallaErrorProps) {
  const c = CONTENIDO[tipo]
  return (
    <div
      role="alert"
      className={cn(
        'mx-auto flex max-w-md flex-col items-center text-center',
        compacto ? 'gap-3 py-10' : 'gap-4 py-16',
      )}
    >
      <c.Ilustracion className={compacto ? 'w-40' : 'w-56'} />
      {c.codigo && (
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">{c.codigo}</span>
      )}
      <h2 className={cn('font-semibold', compacto ? 'text-base' : 'text-xl')}>{titulo ?? c.titulo}</h2>
      <p className="text-sm text-muted-foreground">{mensaje ?? c.mensaje}</p>
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
      {detalle && (
        <pre className="mt-2 max-h-40 w-full overflow-auto rounded-md border bg-muted p-3 text-left text-xs">
          {detalle}
        </pre>
      )}
    </div>
  )
}
