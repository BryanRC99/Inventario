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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Custodia } from '@/api/custodias'

interface FinalizarCustodiaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  custodia: Custodia | null
  onConfirm: (fechaFin: string) => Promise<void>
}

const hoy = () => new Date().toISOString().slice(0, 10)

export function FinalizarCustodiaDialog({
  open,
  onOpenChange,
  custodia,
  onConfirm,
}: FinalizarCustodiaDialogProps) {
  const [fechaFin, setFechaFin] = useState(hoy())
  const [submitting, setSubmitting] = useState(false)

  if (!custodia) return null

  const titular = custodia.persona_nombre || custodia.area

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onConfirm(fechaFin)
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
            <DialogTitle>Finalizar custodia</DialogTitle>
            <DialogDescription>
              {custodia.activo_codigo} — {custodia.activo_nombre}, actualmente con {titular}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="fecha_fin_close">Fecha de devolución</Label>
            <Input
              id="fecha_fin_close"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}