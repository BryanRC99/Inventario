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
import type { Persona, PersonaInput } from '@/api/personas'

interface PersonaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  persona: Persona | null
  onSubmit: (payload: PersonaInput) => Promise<void>
}

const valoresVacios: PersonaInput = {
  nombres: '',
  apellidos: '',
  documento: '',
  cargo: '',
  area: '',
  email: '',
}

export function PersonaDialog({ open, onOpenChange, persona, onSubmit }: PersonaDialogProps) {
  const [form, setForm] = useState<PersonaInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        persona
          ? {
              nombres: persona.nombres,
              apellidos: persona.apellidos,
              documento: persona.documento,
              cargo: persona.cargo,
              area: persona.area,
              email: persona.email,
            }
          : valoresVacios,
      )
    }
  }, [open, persona])

  const set = <K extends keyof PersonaInput>(key: K, value: PersonaInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

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
            <DialogTitle>{persona ? 'Editar persona' : 'Nueva persona'}</DialogTitle>
            <DialogDescription>
              Datos del custodio. Cargo, área y email son opcionales.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nombres">Nombres</Label>
              <Input
                id="nombres"
                value={form.nombres}
                onChange={(e) => set('nombres', e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input
                id="apellidos"
                value={form.apellidos}
                onChange={(e) => set('apellidos', e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documento">Documento</Label>
              <Input
                id="documento"
                value={form.documento}
                onChange={(e) => set('documento', e.target.value)}
                placeholder="Cédula o pasaporte"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={form.cargo}
                onChange={(e) => set('cargo', e.target.value)}
                placeholder="Ej. Analista de Sistemas"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area">Área</Label>
              <Input
                id="area"
                value={form.area}
                onChange={(e) => set('area', e.target.value)}
                placeholder="Ej. Sistemas"
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