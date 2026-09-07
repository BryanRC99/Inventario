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
import type { Area, AreaInput } from '@/api/areas'
import type { Ubicacion } from '@/api/ubicaciones'

interface AreaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  area: Area | null
  ubicaciones: Ubicacion[]
  onSubmit: (payload: AreaInput) => Promise<void>
}

const valoresVacios: AreaInput = { nombre: '', descripcion: '', ubicacion: null }

export function AreaDialog({ open, onOpenChange, area, ubicaciones, onSubmit }: AreaDialogProps) {
  const [form, setForm] = useState<AreaInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        area
          ? { nombre: area.nombre, descripcion: area.descripcion, ubicacion: area.ubicacion }
          : valoresVacios,
      )
    }
  }, [open, area])

  const ubicacionSeleccionada = ubicaciones.find((u) => u.id === form.ubicacion)

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
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{area ? 'Editar área' : 'Nueva área'}</DialogTitle>
            <DialogDescription>Departamentos usados en Personas, Usuarios y Custodias.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Sistemas, Finanzas"
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Input
                id="descripcion"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ubicacion">Ubicación por defecto (opcional)</Label>
              <Select
                value={form.ubicacion ?? 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, ubicacion: v === 'none' ? null : v }))}
              >
                <SelectTrigger id="ubicacion" className="w-full">
                  <SelectValue placeholder="Sin ubicación por defecto">
                    {ubicacionSeleccionada?.nombre ?? (form.ubicacion ? undefined : 'Sin ubicación por defecto')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ubicación por defecto</SelectItem>
                  {ubicaciones.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Al asignar un activo a alguien de esta área, su ubicación se actualizará a esta automáticamente.
              </p>
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