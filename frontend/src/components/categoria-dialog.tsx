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
import { Switch } from '@/components/ui/switch'
import type { Categoria, CategoriaInput } from '@/api/categorias'

interface CategoriaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoria: Categoria | null // null = modo "crear", con valor = modo "editar"
  onSubmit: (payload: CategoriaInput) => Promise<void>
}

const valoresVacios: CategoriaInput = { nombre: '', requiere_custodio_unico: true }

export function CategoriaDialog({
  open,
  onOpenChange,
  categoria,
  onSubmit,
}: CategoriaDialogProps) {
  const [form, setForm] = useState<CategoriaInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  // Cada vez que se abre el modal, carga los datos de la categoría a editar
  // (o limpia el formulario si estamos creando una nueva).
  useEffect(() => {
    if (open) {
      setForm(
        categoria
          ? { nombre: categoria.nombre, requiere_custodio_unico: categoria.requiere_custodio_unico }
          : valoresVacios,
      )
    }
  }, [open, categoria])

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
            <DialogTitle>{categoria ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Define el tipo de activo y si permite más de un custodio a la vez.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Laptop, Silla, Proyector"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="requiere_custodio_unico">Custodio único</Label>
                <p className="text-sm text-muted-foreground">
                  Si lo desactivas, este tipo de activo podrá asignarse a varias personas o un área.
                </p>
              </div>
              <Switch
                id="requiere_custodio_unico"
                checked={form.requiere_custodio_unico}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, requiere_custodio_unico: checked }))
                }
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