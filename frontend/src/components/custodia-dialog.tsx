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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { extraerMensajeError, type Custodia, type CustodiaInput } from '@/api/custodias'
import type { Activo } from '@/api/activos'
import type { Persona } from '@/api/personas'

interface CustodiaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  custodia: Custodia | null
  activoInicial?: string
  activos: Activo[]
  personas: Persona[]
  onSubmit: (payload: CustodiaInput) => Promise<void>
}

type TitularTipo = 'persona' | 'area'

const hoy = () => new Date().toISOString().slice(0, 10)

const valoresVacios: CustodiaInput = {
  activo: '',
  persona: null,
  area: '',
  fecha_inicio: hoy(),
  fecha_fin: null,
  tipo: 'principal',
}

export function CustodiaDialog({
  open,
  onOpenChange,
  custodia,
  activoInicial,
  activos,
  personas,
  onSubmit,
}: CustodiaDialogProps) {
  const [form, setForm] = useState<CustodiaInput>(valoresVacios)
  const [titularTipo, setTitularTipo] = useState<TitularTipo>('persona')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (custodia) {
        setForm({
          activo: custodia.activo,
          persona: custodia.persona,
          area: custodia.area,
          fecha_inicio: custodia.fecha_inicio,
          fecha_fin: custodia.fecha_fin,
          tipo: custodia.tipo,
        })
        setTitularTipo(custodia.persona ? 'persona' : 'area')
      } else {
        setForm({ ...valoresVacios, activo: activoInicial ?? '' })
        setTitularTipo('persona')
      }
      setError('')
    }
  }, [open, custodia])

  const set = <K extends keyof CustodiaInput>(key: K, value: CustodiaInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const cambiarTitularTipo = (valor: TitularTipo) => {
    setTitularTipo(valor)
    // Al cambiar de tipo, limpia el campo contrario para no mandar ambos
    // (el backend rechaza persona Y área a la vez).
    if (valor === 'persona') set('area', '')
    else set('persona', null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err) {
      setError(extraerMensajeError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const activoSeleccionado = activos.find((a) => a.id === form.activo)
  const personaSeleccionada = personas.find((p) => p.id === form.persona)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{custodia ? 'Editar custodia' : 'Nueva custodia'}</DialogTitle>
            <DialogDescription>
              Asigna un activo a una persona o a un área responsable.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

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
              <Label>Custodio</Label>
              <RadioGroup
                value={titularTipo}
                onValueChange={(v) => cambiarTitularTipo(v as TitularTipo)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="persona" id="titular-persona" />
                  <Label htmlFor="titular-persona" className="font-normal">
                    Persona
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="area" id="titular-area" />
                  <Label htmlFor="titular-area" className="font-normal">
                    Área
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {titularTipo === 'persona' ? (
              <div className="grid gap-2">
                <Label htmlFor="persona">Persona</Label>
                <Select
                  value={form.persona ?? undefined}
                  onValueChange={(v) => set('persona', v)}
                >
                  <SelectTrigger id="persona" className="w-full">
                    <SelectValue placeholder="Selecciona una persona">
                      {personaSeleccionada?.nombre_completo}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="area">Área</Label>
                <Input
                  id="area"
                  value={form.area}
                  onChange={(e) => set('area', e.target.value)}
                  placeholder="Ej. Operaciones"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha_inicio">Fecha inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => set('fecha_inicio', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fecha_fin">Fecha fin (opcional)</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={form.fecha_fin ?? ''}
                  onChange={(e) => set('fecha_fin', e.target.value || null)}
                />
              </div>
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