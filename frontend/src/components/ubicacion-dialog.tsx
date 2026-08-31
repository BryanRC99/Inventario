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
import {
  TIPOS_UBICACION,
  type Ubicacion,
  type UbicacionInput,
} from '@/api/ubicaciones'

interface UbicacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ubicacion: Ubicacion | null
  ubicaciones: Ubicacion[] // para el select de "ubicación padre"
  onSubmit: (payload: UbicacionInput) => Promise<void>
}

const valoresVacios: UbicacionInput = { nombre: '', tipo: 'oficina', ubicacion_padre: null }

export function UbicacionDialog({
  open,
  onOpenChange,
  ubicacion,
  ubicaciones,
  onSubmit,
}: UbicacionDialogProps) {
  const [form, setForm] = useState<UbicacionInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        ubicacion
          ? {
              nombre: ubicacion.nombre,
              tipo: ubicacion.tipo,
              ubicacion_padre: ubicacion.ubicacion_padre,
            }
          : valoresVacios,
      )
    }
  }, [open, ubicacion])

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

  // No te dejes elegir a ti mismo como tu propio padre en el select
  const opcionesPadre = ubicaciones.filter((u) => u.id !== ubicacion?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{ubicacion ? 'Editar ubicación' : 'Nueva ubicación'}</DialogTitle>
            <DialogDescription>
              Define el nombre, el tipo, y de qué ubicación depende (opcional).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Sede Machala, Piso 1, Bodega General"
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, tipo: value as UbicacionInput['tipo'] }))
                }
              >
                <SelectTrigger id="tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_UBICACION.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ubicacion_padre">Depende de (opcional)</Label>
              <Select
                value={form.ubicacion_padre ?? 'none'}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, ubicacion_padre: value === 'none' ? null : value }))
                }
              >
                <SelectTrigger id="ubicacion_padre" className="w-full">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {opcionesPadre.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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