import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Mantenimiento, MantenimientoInput } from '@/api/mantenimientos'
import type { Activo } from '@/api/activos'
import type { Proveedor } from '@/api/proveedores'

interface MantenimientoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mantenimiento: Mantenimiento | null
  activos: Activo[]
  proveedores: Proveedor[]
  onSubmit: (payload: MantenimientoInput) => Promise<void>
}

const hoy = () => new Date().toISOString().slice(0, 10)

const valoresVacios: MantenimientoInput = {
  activo: '',
  proveedor: null,
  fecha: hoy(),
  costo: null,
  descripcion_problema: '',
  repuestos_usados: '',
  proxima_fecha_programada: null,
}

export function MantenimientoDialog({
  open,
  onOpenChange,
  mantenimiento,
  activos,
  proveedores,
  onSubmit,
}: MantenimientoDialogProps) {
  const [form, setForm] = useState<MantenimientoInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        mantenimiento
          ? {
              activo: mantenimiento.activo,
              proveedor: mantenimiento.proveedor,
              fecha: mantenimiento.fecha,
              costo: mantenimiento.costo,
              descripcion_problema: mantenimiento.descripcion_problema,
              repuestos_usados: mantenimiento.repuestos_usados,
              proxima_fecha_programada: mantenimiento.proxima_fecha_programada,
            }
          : valoresVacios,
      )
    }
  }, [open, mantenimiento])

  const set = <K extends keyof MantenimientoInput>(key: K, value: MantenimientoInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const activoSeleccionado = activos.find((a) => a.id === form.activo)
  const proveedorSeleccionado = proveedores.find((p) => p.id === form.proveedor)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mantenimiento ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</DialogTitle>
            <DialogDescription>
              Registra el problema, y opcionalmente el proveedor y costo asociado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activo">Activo</Label>
              <Select value={form.activo} onValueChange={(v) => set('activo', v)}>
                <SelectTrigger id="activo" className="w-full">
                  <SelectValue placeholder="Selecciona un activo">
                    {activoSeleccionado
                      ? `${activoSeleccionado.codigo_interno} — ${activoSeleccionado.nombre}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.codigo_interno} — {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion_problema">Descripción del problema</Label>
              <Textarea
                id="descripcion_problema"
                value={form.descripcion_problema}
                onChange={(e) => set('descripcion_problema', e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="costo">Costo (USD, opcional)</Label>
                <Input
                  id="costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costo ?? ''}
                  onChange={(e) => set('costo', e.target.value || null)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proveedor">Proveedor / técnico (opcional)</Label>
              <Select
                value={form.proveedor ?? 'none'}
                onValueChange={(v) => set('proveedor', v === 'none' ? null : v)}
              >
                <SelectTrigger id="proveedor" className="w-full">
                  <SelectValue placeholder="Sin proveedor">
                    {proveedorSeleccionado?.nombre ?? (form.proveedor ? undefined : 'Sin proveedor')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="repuestos_usados">Repuestos usados (opcional)</Label>
              <Input
                id="repuestos_usados"
                value={form.repuestos_usados}
                onChange={(e) => set('repuestos_usados', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proxima_fecha_programada">Próximo mantenimiento (opcional)</Label>
              <Input
                id="proxima_fecha_programada"
                type="date"
                value={form.proxima_fecha_programada ?? ''}
                onChange={(e) => set('proxima_fecha_programada', e.target.value || null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}