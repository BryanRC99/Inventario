import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Activo } from '@/api/activos'

interface DarDeBajaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activo: Activo | null
  onConfirm: (motivo: string) => Promise<void>
}

export function DarDeBajaDialog({ open, onOpenChange, activo, onConfirm }: DarDeBajaDialogProps) {
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!activo) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onConfirm(motivo)
      setMotivo('')
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Dar de baja este activo</DialogTitle>
            <DialogDescription>
              {activo.codigo_interno} — {activo.nombre}. Si tiene una custodia activa, se
              finalizará automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="motivo">Motivo de la baja</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Equipo dañado sin reparación posible, obsolescencia, robo, etc."
              rows={3}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? 'Procesando...' : 'Dar de baja'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}