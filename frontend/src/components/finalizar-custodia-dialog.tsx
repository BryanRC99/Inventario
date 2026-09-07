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
import type { Custodia } from '@/api/custodias'
import type { Ubicacion } from '@/api/ubicaciones'
import type { Activo } from '@/api/activos'

interface FinalizarCustodiaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  custodia: Custodia | null
  activo: Activo | null // para saber la ubicación actual y sugerirla como default
  ubicaciones: Ubicacion[]
  onConfirm: (fechaFin: string, ubicacionDestino: string) => Promise<void>
}

const hoy = () => new Date().toISOString().slice(0, 10)

export function FinalizarCustodiaDialog({
  open,
  onOpenChange,
  custodia,
  activo,
  ubicaciones,
  onConfirm,
}: FinalizarCustodiaDialogProps) {
  const [fechaFin, setFechaFin] = useState(hoy())
  const [ubicacionDestino, setUbicacionDestino] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setFechaFin(hoy())
      // Sugiere la ubicación actual del activo como punto de partida,
      // pero queda totalmente editable.
      setUbicacionDestino(activo?.ubicacion ?? '')
    }
  }, [open, activo])

  if (!custodia) return null

  const titular = custodia.persona_nombre || custodia.area_nombre
  const ubicacionSeleccionada = ubicaciones.find((u) => u.id === ubicacionDestino)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onConfirm(fechaFin, ubicacionDestino)
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

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
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

            <div className="grid gap-2">
              <Label htmlFor="ubicacion_destino">¿Dónde queda el activo ahora?</Label>
              <Select value={ubicacionDestino} onValueChange={setUbicacionDestino}>
                <SelectTrigger id="ubicacion_destino" className="w-full">
                  <SelectValue placeholder="Selecciona una ubicación">
                    {ubicacionSeleccionada?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((u) => (
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
              {submitting ? 'Guardando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}