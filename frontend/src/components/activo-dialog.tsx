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
import { ESTADOS_ACTIVO, type Activo, type ActivoInput } from '@/api/activos'
import type { Categoria } from '@/api/categorias'
import type { Ubicacion } from '@/api/ubicaciones'
import type { Proveedor } from '@/api/proveedores'

interface ActivoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activo: Activo | null
  categorias: Categoria[]
  ubicaciones: Ubicacion[]
  proveedores: Proveedor[]
  onSubmit: (payload: ActivoInput) => Promise<void>
}

const valoresVacios: ActivoInput = {
  categoria: '',
  nombre: '',
  numero_serie: '',
  marca: '',
  modelo: '',
  fecha_adquisicion: null,
  valor_adquisicion: null,
  proveedor: null,
  fecha_fin_garantia: null,
  estado: 'activo',
  ubicacion: '',
  especificaciones: null,
}

export function ActivoDialog({
  open,
  onOpenChange,
  activo,
  categorias,
  ubicaciones,
  proveedores,
  onSubmit,
}: ActivoDialogProps) {
  const [form, setForm] = useState<ActivoInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        activo
          ? {
              categoria: activo.categoria,
              nombre: activo.nombre,
              numero_serie: activo.numero_serie,
              marca: activo.marca,
              modelo: activo.modelo,
              fecha_adquisicion: activo.fecha_adquisicion,
              valor_adquisicion: activo.valor_adquisicion,
              proveedor: activo.proveedor,
              fecha_fin_garantia: activo.fecha_fin_garantia,
              estado: activo.estado,
              ubicacion: activo.ubicacion,
              especificaciones: activo.especificaciones,
            }
          : valoresVacios,
      )
    }
  }, [open, activo])

  const set = <K extends keyof ActivoInput>(key: K, value: ActivoInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const categoriaSeleccionada = categorias.find((c) => c.id === form.categoria)
  const ubicacionSeleccionada = ubicaciones.find((u) => u.id === form.ubicacion)
  const proveedorSeleccionado = proveedores.find((p) => p.id === form.proveedor)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({ ...form, especificaciones: activo?.especificaciones ?? null })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-x-hidden overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{activo ? 'Editar activo' : 'Nuevo activo'}</DialogTitle>
            <DialogDescription>
              Solo código, categoría, nombre y ubicación son obligatorios.
            </DialogDescription>
          </DialogHeader>

          {!activo && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              El código se generará automáticamente según la categoría.
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 py-4">
            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                className="w-full"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Laptop Dell 5440"
                required
                autoFocus
              />
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="categoria">Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => set('categoria', v)}>
                <SelectTrigger id="categoria" className="w-full">
                  <SelectValue placeholder="Selecciona">
                    {categoriaSeleccionada?.nombre}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Select value={form.ubicacion} onValueChange={(v) => set('ubicacion', v)}>
                <SelectTrigger id="ubicacion" className="w-full">
                  <SelectValue placeholder="Selecciona">
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

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                className="w-full"
                value={form.marca}
                onChange={(e) => set('marca', e.target.value)}
                placeholder="Dell"
              />
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                className="w-full"
                value={form.modelo}
                onChange={(e) => set('modelo', e.target.value)}
                placeholder="Latitude 5440"
              />
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="numero_serie">Número de serie</Label>
              <Input
                id="numero_serie"
                className="w-full"
                value={form.numero_serie}
                onChange={(e) => set('numero_serie', e.target.value)}
              />
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => set('estado', v as ActivoInput['estado'])}
              >
                <SelectTrigger id="estado" className="w-full">
                  <SelectValue>
                    {ESTADOS_ACTIVO.find((e) => e.value === form.estado)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_ACTIVO.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="proveedor">Proveedor</Label>
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

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="valor_adquisicion">Valor (USD)</Label>
              <Input
                id="valor_adquisicion"
                className="w-full"
                type="number"
                step="0.01"
                min="0"
                value={form.valor_adquisicion ?? ''}
                onChange={(e) => set('valor_adquisicion', e.target.value || null)}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="fecha_adquisicion">Fecha adquisición</Label>
              <Input
                id="fecha_adquisicion"
                className="w-full"
                type="date"
                value={form.fecha_adquisicion ?? ''}
                onChange={(e) => set('fecha_adquisicion', e.target.value || null)}
              />
            </div>

            <div className="col-span-2 grid min-w-0 gap-2 sm:col-span-1">
              <Label htmlFor="fecha_fin_garantia">Fin de garantía</Label>
              <Input
                id="fecha_fin_garantia"
                className="w-full"
                type="date"
                value={form.fecha_fin_garantia ?? ''}
                onChange={(e) => set('fecha_fin_garantia', e.target.value || null)}
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