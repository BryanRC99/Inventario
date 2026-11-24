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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Mantenimiento, MantenimientoInput } from '@/api/mantenimientos'
import { listarActivosPagina, obtenerActivo, type Activo } from '@/api/activos'
import type { Proveedor } from '@/api/proveedores'
import { hoyLocal } from '@/lib/fechas'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface MantenimientoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mantenimiento: Mantenimiento | null
  proveedores: Proveedor[]
  onSubmit: (payload: MantenimientoInput) => Promise<void>
}

const hoy = hoyLocal

const valoresVacios: MantenimientoInput = {
  activo: '',
  proveedor: null,
  fecha: hoy(),
  costo: null,
  descripcion_problema: '',
  repuestos_usados: '',
  proxima_fecha_programada: null,
}

export function MantenimientoDialog({
  open,
  onOpenChange,
  mantenimiento,
  proveedores,
  onSubmit,
}: MantenimientoDialogProps) {
  const [form, setForm] = useState<MantenimientoInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)
  const [selectorActivoAbierto, setSelectorActivoAbierto] = useState(false)
  const [busquedaActivo, setBusquedaActivo] = useState('')
  const [activosEncontrados, setActivosEncontrados] = useState<Activo[]>([])
  const [activoElegido, setActivoElegido] = useState<Activo | null>(null)
  const [paginaActivos, setPaginaActivos] = useState(1)
  const [totalActivos, setTotalActivos] = useState(0)
  const [buscandoActivos, setBuscandoActivos] = useState(false)
  const [errorBusquedaActivos, setErrorBusquedaActivos] = useState('')

  useEffect(() => {
    if (open) {
      setForm(
        mantenimiento
          ? {
              activo: mantenimiento.activo,
              proveedor: mantenimiento.proveedor,
              fecha: mantenimiento.fecha,
              costo: mantenimiento.costo,
              descripcion_problema: mantenimiento.descripcion_problema,
              repuestos_usados: mantenimiento.repuestos_usados,
              proxima_fecha_programada: mantenimiento.proxima_fecha_programada,
            }
          : valoresVacios,
      )
      setActivoElegido(null)
      setBusquedaActivo('')
      setSelectorActivoAbierto(false)
      setPaginaActivos(1)
      setActivosEncontrados([])
      setTotalActivos(0)
      setErrorBusquedaActivos('')
    }
  }, [open, mantenimiento])

  useEffect(() => {
    if (!open || !mantenimiento) return
    let vigente = true
    obtenerActivo(mantenimiento.activo)
      .then((activo) => { if (vigente) setActivoElegido(activo) })
      .catch(() => {})
    return () => { vigente = false }
  }, [open, mantenimiento])

  useEffect(() => {
    if (!open || !selectorActivoAbierto) return
    let vigente = true
    const timer = window.setTimeout(async () => {
      setBuscandoActivos(true)
      setErrorBusquedaActivos('')
      try {
        const pagina = await listarActivosPagina(
          { search: busquedaActivo.trim() || undefined },
          paginaActivos,
        )
        if (!vigente) return
        setActivosEncontrados((actuales) => {
          if (paginaActivos === 1) return pagina.results
          const idsActuales = new Set(actuales.map((activo) => activo.id))
          return [...actuales, ...pagina.results.filter((activo) => !idsActuales.has(activo.id))]
        })
        setTotalActivos(pagina.count)
      } catch {
        if (vigente) setErrorBusquedaActivos('No se pudieron buscar activos. Intenta de nuevo.')
      } finally {
        if (vigente) setBuscandoActivos(false)
      }
    }, 250)
    return () => {
      vigente = false
      window.clearTimeout(timer)
    }
  }, [open, selectorActivoAbierto, busquedaActivo, paginaActivos])

  const set = <K extends keyof MantenimientoInput>(key: K, value: MantenimientoInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const activoSeleccionado = activoElegido?.id === form.activo
    ? activoElegido
    : activosEncontrados.find((a) => a.id === form.activo)
  const proveedorSeleccionado = proveedores.find((p) => p.id === form.proveedor)

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
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mantenimiento ? 'Editar mantenimiento' : 'Nuevo mantenimiento'}</DialogTitle>
            <DialogDescription>
              Registra el problema, y opcionalmente el proveedor y costo asociado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activo">Activo</Label>
              <Popover open={selectorActivoAbierto} onOpenChange={setSelectorActivoAbierto}>
                <PopoverTrigger
                  id="activo"
                  className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'w-full justify-between font-normal')}
                >
                  <span className="truncate text-left">
                    {activoSeleccionado
                      ? `${activoSeleccionado.etiqueta_origen || activoSeleccionado.codigo_interno} — ${activoSeleccionado.nombre}`
                      : 'Busca por código, etiqueta, nombre o serie...'}
                  </span>
                  <span aria-hidden="true" className="ml-2 opacity-50">⌄</span>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] gap-2 p-2">
                  <Input
                    autoFocus
                    value={busquedaActivo}
                    onChange={(e) => {
                      setBusquedaActivo(e.target.value)
                      setPaginaActivos(1)
                      setActivosEncontrados([])
                      setTotalActivos(0)
                    }}
                    placeholder="Código, etiqueta, nombre, serie, empresa..."
                    aria-label="Buscar activo para mantenimiento"
                  />
                  <div className="max-h-72 overflow-y-auto">
                    {buscandoActivos && activosEncontrados.length === 0 ? (
                      <p className="px-3 py-5 text-center text-sm text-muted-foreground">Buscando activos...</p>
                    ) : errorBusquedaActivos ? (
                      <p className="px-3 py-5 text-center text-sm text-destructive">{errorBusquedaActivos}</p>
                    ) : activosEncontrados.length === 0 ? (
                      <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                        No hay activos que coincidan con la búsqueda.
                      </p>
                    ) : activosEncontrados.map((activo) => (
                      <button
                        key={activo.id}
                        type="button"
                        onClick={() => {
                          set('activo', activo.id)
                          setActivoElegido(activo)
                          setSelectorActivoAbierto(false)
                        }}
                        className="flex w-full flex-col gap-0.5 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="font-medium">
                          <span className="font-mono text-xs">
                            {activo.etiqueta_origen || activo.codigo_interno}
                          </span>{' — '}{activo.nombre}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[activo.marca, activo.modelo, activo.numero_serie && `Serie: ${activo.numero_serie}`,
                            activo.empresa_nombre, activo.ubicacion_nombre].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                  {activosEncontrados.length > 0 && (
                    <div className="flex items-center justify-between border-t px-1 pt-2 text-xs text-muted-foreground">
                      <span>{activosEncontrados.length} de {totalActivos} resultado(s)</span>
                      {activosEncontrados.length < totalActivos && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          disabled={buscandoActivos}
                          onClick={() => setPaginaActivos((pagina) => pagina + 1)}
                        >
                          {buscandoActivos ? 'Cargando...' : 'Cargar más'}
                        </Button>
                      )}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion_problema">Descripción del problema</Label>
              <Textarea
                id="descripcion_problema"
                value={form.descripcion_problema}
                onChange={(e) => set('descripcion_problema', e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="costo">Costo (USD, opcional)</Label>
                <Input
                  id="costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costo ?? ''}
                  onChange={(e) => set('costo', e.target.value || null)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proveedor">Proveedor / técnico (opcional)</Label>
              <Select
                value={form.proveedor ?? 'none'}
                onValueChange={(v) => set('proveedor', v === 'none' ? null : v)}
              >
                <SelectTrigger id="proveedor" className="w-full">
                  <SelectValue placeholder="Sin proveedor">
                    {proveedorSeleccionado?.nombre ?? (form.proveedor ? undefined : 'Sin proveedor')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="repuestos_usados">Repuestos usados (opcional)</Label>
              <Input
                id="repuestos_usados"
                value={form.repuestos_usados}
                onChange={(e) => set('repuestos_usados', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="proxima_fecha_programada">Próximo mantenimiento (opcional)</Label>
              <Input
                id="proxima_fecha_programada"
                type="date"
                value={form.proxima_fecha_programada ?? ''}
                onChange={(e) => set('proxima_fecha_programada', e.target.value || null)}
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
