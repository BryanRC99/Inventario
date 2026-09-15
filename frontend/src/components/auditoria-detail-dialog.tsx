import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { RegistroAuditoria } from '@/api/auditoria'

interface AuditoriaDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registro: RegistroAuditoria | null
}

export function AuditoriaDetailDialog({ open, onOpenChange, registro }: AuditoriaDetailDialogProps) {
  if (!registro) return null

  const tieneCambios = registro.cambios && Object.keys(registro.cambios).length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{registro.accion_display}</DialogTitle>
          <DialogDescription>
            {registro.modelo && `${registro.modelo} — `}
            {registro.objeto_repr}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted-foreground">Usuario</span>
              <span>{registro.usuario_username || 'Anónimo / desconocido'}</span>

              <span className="text-muted-foreground">Fecha</span>
              <span>{new Date(registro.fecha_hora).toLocaleString('es-EC')}</span>

              <span className="text-muted-foreground">IP</span>
              <span className="font-mono text-xs">{registro.ip_address || '—'}</span>

              {registro.user_agent && (
                <>
                  <span className="text-muted-foreground">Navegador</span>
                  <span className="truncate text-xs" title={registro.user_agent}>
                    {registro.user_agent}
                  </span>
                </>
              )}
            </div>
          </div>

          {tieneCambios && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Campos modificados</p>
              <div className="flex flex-col gap-2">
                {Object.entries(registro.cambios!).map(([campo, { antes, despues }]) => (
                  <div key={campo} className="rounded-md border px-3 py-2 text-sm">
                    <p className="mb-1 font-medium capitalize">{campo.replace(/_/g, ' ')}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-normal">
                        {antes ?? '(vacío)'}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="secondary" className="font-normal">
                        {despues ?? '(vacío)'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}