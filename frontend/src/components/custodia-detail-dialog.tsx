import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActaDialog } from '@/components/acta-dialog'
import {
  crearActa,
  listarActasPorCustodia,
  type ActaEntrega,
  type ActaEntregaInput,
} from '@/api/actas'
import type { Custodia } from '@/api/custodias'

interface CustodiaDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  custodia: Custodia | null
}

export function CustodiaDetailDialog({ open, onOpenChange, custodia }: CustodiaDetailDialogProps) {
  const [actas, setActas] = useState<ActaEntrega[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevaActaOpen, setNuevaActaOpen] = useState(false)

  const cargarActas = async () => {
    if (!custodia) return
    setLoading(true)
    try {
      setActas(await listarActasPorCustodia(custodia.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && custodia) cargarActas()
  }, [open, custodia])

  if (!custodia) return null

  const titular = custodia.persona_nombre || custodia.area_nombre

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de custodia</DialogTitle>
            <DialogDescription>
              {custodia.activo_codigo} — {custodia.activo_nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-muted-foreground">Custodio</span>
                <span className="font-medium">{titular}</span>

                <span className="text-muted-foreground">Desde</span>
                <span>{custodia.fecha_inicio}</span>

                <span className="text-muted-foreground">Hasta</span>
                <span>{custodia.fecha_fin || '—'}</span>

                <span className="text-muted-foreground">Estado</span>
                <span>
                  <Badge variant={custodia.activa ? 'default' : 'secondary'} className="text-xs">
                    {custodia.activa ? 'Activa' : 'Finalizada'}
                  </Badge>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Actas de entrega</p>
                {custodia.persona && (
                  <Button size="sm" variant="outline" onClick={() => setNuevaActaOpen(true)}>
                    <Plus className="size-3.5" />
                    Nueva acta
                  </Button>
                )}
              </div>

              {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}

              {!loading && actas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todavía no se ha generado ningún acta para esta custodia.
                </p>
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

      {custodia.persona && (
        <ActaDialog
          open={nuevaActaOpen}
          onOpenChange={setNuevaActaOpen}
          activoId={custodia.activo}
          activoNombre={custodia.activo_nombre}
          activoCodigo={custodia.activo_codigo}
          personaId={custodia.persona}
          personaNombre={custodia.persona_nombre!}
          custodiaId={custodia.id}
          onSubmit={async (payload: ActaEntregaInput) => {
            await crearActa(payload)
            await cargarActas()
          }}
          onSkip={() => setNuevaActaOpen(false)}
        />
      )}
    </>
  )
}