import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Activo } from '@/api/activos'
import { listarActasPorActivoAsignado } from '@/api/actas'
import { useEffect, useState } from 'react'
import type { ActaEntrega } from '@/api/actas'

interface MiActivoDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activo: Activo | null
}

export function MiActivoDetailDialog({ open, onOpenChange, activo }: MiActivoDetailDialogProps) {
  const [actas, setActas] = useState<ActaEntrega[]>([])

  useEffect(() => {
    if (open && activo) {
      listarActasPorActivoAsignado(activo.id).then(setActas)
    }
  }, [open, activo])

  if (!activo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{activo.nombre}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {activo.codigo_interno}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border p-3 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted-foreground">Categoría</span>
              <span>{activo.categoria_nombre}</span>

              <span className="text-muted-foreground">Marca / Modelo</span>
              <span>{activo.marca || '—'} {activo.modelo || ''}</span>

              <span className="text-muted-foreground">N° de serie</span>
              <span>{activo.numero_serie || '—'}</span>

              <span className="text-muted-foreground">Ubicación</span>
              <span>{activo.ubicacion_nombre}</span>

              <span className="text-muted-foreground">Estado</span>
              <span>
                <Badge variant="outline" className="text-xs">
                  {activo.estado_display}
                </Badge>
              </span>

              {activo.fecha_fin_garantia && (
                <>
                  <span className="text-muted-foreground">Garantía hasta</span>
                  <span>{activo.fecha_fin_garantia}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Actas de entrega</p>
            {actas.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay actas generadas.</p>
            )}
            {actas.map((acta) => (
              <div
                key={acta.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{acta.tipo_display}</p>
                  <p className="text-xs text-muted-foreground">{acta.fecha}</p>
                </div>
                {acta.pdf && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => window.open(acta.pdf!, '_blank')}
                  >
                    <FileText className="size-3.5" />
                    Ver PDF
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}