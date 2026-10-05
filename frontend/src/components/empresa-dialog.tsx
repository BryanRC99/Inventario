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
import type { Empresa, EmpresaInput } from '@/api/empresas'

interface EmpresaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresa: Empresa | null
  onSubmit: (payload: EmpresaInput) => Promise<void>
}

const valoresVacios: EmpresaInput = { nombre: '', descripcion: '', logo_filename: '' }

export function EmpresaDialog({ open, onOpenChange, empresa, onSubmit }: EmpresaDialogProps) {
  const [form, setForm] = useState<EmpresaInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        empresa
          ? { nombre: empresa.nombre, descripcion: empresa.descripcion, logo_filename: empresa.logo_filename }
          : valoresVacios,
      )
    }
  }, [open, empresa])

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
            <DialogTitle>{empresa ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
            <DialogDescription>Cada usuario y activo se asocia a una sola empresa.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logo_filename">Archivo de logo (opcional)</Label>
            <Input
              id="logo_filename"
              value={form.logo_filename}
              onChange={(e) => setForm((f) => ({ ...f, logo_filename: e.target.value }))}
              placeholder="Ej. logo_empresa_a.png"
            />
            <p className="text-xs text-muted-foreground">
              Debe existir ese archivo exacto en la carpeta static/ del backend. Si se deja
              vacío, se usa el logo por defecto en las etiquetas de esta empresa.
            </p>
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