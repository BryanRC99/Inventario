import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PantallaError } from '@/components/pantalla-error'
import type { ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'

/** Reemplaza la tabla cuando no se pudieron cargar los datos, para no confundir un fallo con "no hay registros". */
export function ErrorCarga({ error, onReintentar }: { error: ErrorCargaTipo; onReintentar: () => void }) {
  return (
    <div className="rounded-md border">
      <PantallaError tipo={error.tipo} mensaje={error.mensaje} compacto>
        {error.tipo !== '403' && (
          <Button size="sm" onClick={onReintentar}>
            <RefreshCw className="size-3.5" />
            Reintentar
          </Button>
        )}
      </PantallaError>
    </div>
  )
}
