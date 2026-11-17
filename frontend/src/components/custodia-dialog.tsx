import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import type { Area } from '@/api/areas'
import { hoyLocal } from '@/lib/fechas'
import { coincide } from '@/lib/normalizar-texto'
import { cn } from '@/lib/utils'

interface CustodiaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  custodia: Custodia | null
  activoInicial?: string
  activos: Activo[]
  custodias: Custodia[]
  personas: Persona[]
  areas: Area[]
  onSubmit: (payload: CustodiaInput) => Promise<void>
}

type TitularTipo = 'persona' | 'area'

const hoy = hoyLocal

const valoresVacios: CustodiaInput = {
  activo: '',
  persona: null,
  area: null,
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
  custodias,
  personas,
  areas,
  onSubmit,
}: CustodiaDialogProps) {
  const [form, setForm] = useState<CustodiaInput>(valoresVacios)
  const [titularTipo, setTitularTipo] = useState<TitularTipo>('persona')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectorActivoAbierto, setSelectorActivoAbierto] = useState(false)
  const [busquedaActivo, setBusquedaActivo] = useState('')

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
      setBusquedaActivo('')
    }
  }, [open, custodia])

  const set = <K extends keyof CustodiaInput>(key: K, value: CustodiaInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const cambiarTitularTipo = (valor: TitularTipo) => {
    setTitularTipo(valor)
    if (valor === 'persona') set('area', null)
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
  const areaSeleccionada = areas.find((a) => a.id === form.area)
  const activosCoincidentes = activos.filter((activo) =>
    [
      activo.codigo_interno,
      activo.nombre,
      activo.marca,
      activo.modelo,
      activo.numero_serie,
      activo.categoria_nombre,
      activo.empresa_nombre ?? '',
      activo.ubicacion_nombre,
    ].some((valor) => coincide(valor, busquedaActivo)),
  )

  const custodiaActivaDe = (activoId: string) =>
    custodias.find((custodia) => custodia.activo === activoId && custodia.activa)

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
              <Popover open={selectorActivoAbierto} onOpenChange={setSelectorActivoAbierto}>
                <PopoverTrigger
                  id="activo"
                  disabled={!!custodia}
                  className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'w-full justify-between font-normal')}
                >
                  <span className="truncate text-left">
                    {activoSeleccionado
                      ? `${activoSeleccionado.codigo_interno} — ${activoSeleccionado.nombre}`
                      : 'Busca por código, nombre, serie...'}
                  </span>
                  <span aria-hidden="true" className="ml-2 opacity-50">⌄</span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] gap-2 p-2">
                  <Input
                    autoFocus
                    value={busquedaActivo}
                    onChange={(e) => setBusquedaActivo(e.target.value)}
                    placeholder="Código, nombre, serie, marca, empresa..."
                    aria-label="Buscar activo"
                  />
                  <div className="max-h-72 overflow-y-auto">
                    {activosCoincidentes.length === 0 ? (
                      <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                        No hay activos que coincidan con la búsqueda.
                      </p>
                    ) : activosCoincidentes.map((activo) => {
                      const custodiaActual = custodiaActivaDe(activo.id)
                      const dadoDeBaja = activo.estado === 'dado_de_baja'
                      const bloqueado = dadoDeBaja || Boolean(custodiaActual && activo.categoria_requiere_custodio_unico)
                      const titular = custodiaActual?.persona_nombre || custodiaActual?.area_nombre
                      return (
                        <button
                          key={activo.id}
                          type="button"
                          disabled={bloqueado}
                          onClick={() => {
                            set('activo', activo.id)
                            setSelectorActivoAbierto(false)
                          }}
                          className="flex w-full flex-col gap-0.5 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="font-medium">
                            <span className="font-mono text-xs">{activo.codigo_interno}</span>
                            {' — '}{activo.nombre}
                          </span>
                          <span className="text-xs text-muted-foreground">
                          {[activo.marca, activo.modelo, activo.numero_serie && `Serie: ${activo.numero_serie}`,
                              activo.empresa_nombre, activo.ubicacion_nombre].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}
                          </span>
                          {dadoDeBaja && (
                            <span className="text-xs text-destructive">Activo dado de baja; no se puede asignar.</span>
                          )}
                          {custodiaActual && (
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              {bloqueado ? 'Ya asignado' : 'También tiene custodia activa'}
                              {titular ? ` a ${titular}` : ''}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Custodio</Label>
              <RadioGroup
                value={titularTipo}
                onValueChange={(v) => cambiarTitularTipo(v as TitularTipo)}
                className="flex gap-4"
                disabled={!!custodia}
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
                  disabled={!!custodia}
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
                <Select
                  value={form.area ?? undefined}
                  onValueChange={(v) => set('area', v)}
                  disabled={!!custodia}
                >
                  <SelectTrigger id="area" className="w-full">
                    <SelectValue placeholder="Selecciona un área">
                      {areaSeleccionada?.nombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {custodia && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                El activo y el custodio no se pueden cambiar. Para entregarlo a otra persona o área,
                finaliza esta custodia y crea una nueva.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha_inicio">Fecha inicio</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => set('fecha_inicio', e.target.value)}
                  max={hoy()}
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
                  min={form.fecha_inicio || undefined}
                  max={hoy()}
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
