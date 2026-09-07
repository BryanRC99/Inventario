import { useEffect, useState } from 'react'
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
import { listarCustodiasPorActivo, type Custodia } from '@/api/custodias'
import { listarActasPorActivoAsignado, type ActaEntrega } from '@/api/actas'
import { listarMantenimientosPorActivo, type Mantenimiento } from '@/api/mantenimientos'

interface ActivoDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activo: Activo | null
}

export function ActivoDetailDialog({ open, onOpenChange, activo }: ActivoDetailDialogProps) {
  const [custodias, setCustodias] = useState<Custodia[]>([])
  const [actas, setActas] = useState<ActaEntrega[]>([])
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && activo) {
      setLoading(true)
      Promise.all([
        listarCustodiasPorActivo(activo.id),
        listarActasPorActivoAsignado(activo.id),
        listarMantenimientosPorActivo(activo.id),
      ])
        .then(([c, a, m]) => {
          setCustodias(c)
          setActas(a)
          setMantenimientos(m)
        })
        .finally(() => setLoading(false))
    }
  }, [open, activo])

  if (!activo) return null

  const custodiaActiva = custodias.find((c) => c.activa)
  const especificaciones = activo.especificaciones

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activo.nombre}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {activo.codigo_interno}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Datos generales */}
          <div className="rounded-md border p-3 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted-foreground">Categoría</span>
              <span>{activo.categoria_nombre}</span>

              <span className="text-muted-foreground">Marca / Modelo</span>
              <span>{activo.marca || '—'} {activo.modelo || ''}</span>

              <span className="text-muted-foreground">N° de serie</span>
              <span>{activo.numero_serie || '—'}</span>

              <span className="text-muted-foreground">Ubicación actual</span>
              <span>{activo.ubicacion_nombre}</span>

              <span className="text-muted-foreground">Estado</span>
              <span>
                <Badge variant="outline" className="text-xs">
                  {activo.estado_display}
                </Badge>
              </span>

              <span className="text-muted-foreground">Proveedor</span>
              <span>{activo.proveedor_nombre || '—'}</span>

              <span className="text-muted-foreground">Fecha de adquisición</span>
              <span>{activo.fecha_adquisicion || '—'}</span>

              {activo.fecha_fin_garantia && (
                <>
                  <span className="text-muted-foreground">Garantía hasta</span>
                  <span>{activo.fecha_fin_garantia}</span>
                </>
              )}

              <span className="text-muted-foreground">Custodio actual</span>
              <span>
                {custodiaActiva
                  ? custodiaActiva.persona_nombre || custodiaActiva.area_nombre
                  : 'Sin asignar'}
              </span>
            </div>
          </div>

          {/* Especificaciones técnicas, si existen — solo lectura */}
          {especificaciones && Object.keys(especificaciones).length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Especificaciones técnicas</p>
              <div className="rounded-md border p-3 text-sm">
                <div className="grid grid-cols-2 gap-y-1.5">
                  {Object.entries(especificaciones).map(([clave, valor]) => (
                    <>
                      <span key={`${clave}-label`} className="text-muted-foreground capitalize">
                        {clave.replace(/_/g, ' ')}
                      </span>
                      <span key={`${clave}-valor`}>{String(valor)}</span>
                    </>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Historial de custodias */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Historial de custodias</p>
            {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
            {!loading && custodias.length === 0 && (
              <p className="text-sm text-muted-foreground">Nunca ha sido asignado.</p>
            )}
            {custodias.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{c.persona_nombre || c.area_nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.fecha_inicio} → {c.fecha_fin || 'presente'}
                  </p>
                </div>
                <Badge variant={c.activa ? 'default' : 'secondary'} className="text-xs">
                  {c.activa ? 'Activa' : 'Finalizada'}
                </Badge>
              </div>
            ))}
          </div>

          {/* Actas de entrega */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Actas de entrega</p>
            {!loading && actas.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay actas generadas.</p>
            )}
            {actas.map((acta) => (
              <div key={acta.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
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

          {/* Mantenimientos */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Historial de mantenimientos</p>
            {!loading && mantenimientos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin mantenimientos registrados.</p>
            )}
            {mantenimientos.map((m) => (
              <div key={m.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{m.fecha}</p>
                  {m.costo && <span className="text-xs text-muted-foreground">${m.costo}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{m.descripcion_problema}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}