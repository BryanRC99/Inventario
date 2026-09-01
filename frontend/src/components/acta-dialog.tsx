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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TIPOS_ACTA, type ActaEntregaInput, type TipoActa } from '@/api/actas'

interface ActaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activoId: string
  activoNombre: string
  activoCodigo: string
  personaId: string
  personaNombre: string
  custodiaId: string | null
  tipoSugerido?: TipoActa
  onSubmit: (payload: ActaEntregaInput) => Promise<void>
  onSkip: () => void
}

const hoy = () => new Date().toISOString().slice(0, 10)

export function ActaDialog({
  open,
  onOpenChange,
  activoId,
  activoNombre,
  activoCodigo,
  personaId,
  personaNombre,
  custodiaId,
  tipoSugerido = 'entrega',
  onSubmit,
  onSkip,
}: ActaDialogProps) {
  const [fecha, setFecha] = useState(hoy())
  const [tipo, setTipo] = useState<TipoActa>(tipoSugerido)
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        activo: activoId,
        persona: personaId,
        custodia: custodiaId,
        fecha,
        tipo,
        observaciones,
      })
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
            <DialogTitle>Generar acta de entrega</DialogTitle>
            <DialogDescription>
              El PDF se genera al instante, con una línea en blanco para firmar al imprimir.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Activo:</span>{' '}
                <span className="font-mono text-xs">{activoCodigo}</span> {activoNombre}
              </p>
              <p>
                <span className="text-muted-foreground">Custodio:</span> {personaNombre}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoActa)}>
                  <SelectTrigger id="tipo" className="w-full">
                    <SelectValue>{TIPOS_ACTA.find((t) => t.value === tipo)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ACTA.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Más tarde
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Generando PDF...' : 'Generar acta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}