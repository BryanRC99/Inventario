import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MantenimientoDialog } from '@/components/mantenimiento-dialog'
import {
  listarMantenimientos,
  crearMantenimiento,
  actualizarMantenimiento,
  eliminarMantenimiento,
  type Mantenimiento,
  type MantenimientoInput,
} from '@/api/mantenimientos'
import { listarActivos, type Activo } from '@/api/activos'
import { listarProveedores, type Proveedor } from '@/api/proveedores'

export default function MantenimientosPage() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mantenimientoEditando, setMantenimientoEditando] = useState<Mantenimiento | null>(null)

  const cargarTodo = async () => {
    setLoading(true)
    try {
      const [mantenimientosData, activosData, proveedoresData] = await Promise.all([
        listarMantenimientos(),
        listarActivos(),
        listarProveedores(),
      ])
      setMantenimientos(mantenimientosData)
      setActivos(activosData)
      setProveedores(proveedoresData)
    } catch {
      toast.error('No se pudieron cargar los mantenimientos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const abrirCrear = () => {
    setMantenimientoEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (mantenimiento: Mantenimiento) => {
    setMantenimientoEditando(mantenimiento)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: MantenimientoInput) => {
    try {
      if (mantenimientoEditando) {
        await actualizarMantenimiento(mantenimientoEditando.id, payload)
        toast.success('Mantenimiento actualizado')
      } else {
        await crearMantenimiento(payload)
        toast.success('Mantenimiento registrado')
      }
      await cargarTodo()
    } catch {
      toast.error('Ocurrió un error al guardar')
    }
  }

  const handleEliminar = async (mantenimiento: Mantenimiento) => {
    if (!confirm(`¿Eliminar el registro de mantenimiento de "${mantenimiento.activo_nombre}"?`)) return
    try {
      await eliminarMantenimiento(mantenimiento.id)
      toast.success('Mantenimiento eliminado')
      await cargarTodo()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar mantenimientos')
      } else {
        toast.error('No se pudo eliminar')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Mantenimientos</h1>
          <p className="text-sm text-muted-foreground">Historial de reparaciones y servicio técnico</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nuevo mantenimiento
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Activo</TableHead>
              <TableHead className="h-9 text-xs">Problema</TableHead>
              <TableHead className="h-9 text-xs">Fecha</TableHead>
              <TableHead className="h-9 text-xs">Costo</TableHead>
              <TableHead className="h-9 text-xs">Próximo</TableHead>
              <TableHead className="h-9 w-20 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && mantenimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  No hay mantenimientos registrados.
                </TableCell>
              </TableRow>
            )}

            {mantenimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{m.activo_codigo}</span>{' '}
                  {m.activo_nombre}
                </TableCell>
                <TableCell className="py-2 max-w-56 truncate text-sm text-muted-foreground">
                  {m.descripcion_problema}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{m.fecha}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {m.costo ? `$${m.costo}` : '—'}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {m.proxima_fecha_programada || '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(m)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(m)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MantenimientoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mantenimiento={mantenimientoEditando}
        activos={activos}
        proveedores={proveedores}
        onSubmit={handleSubmit}
      />
    </div>
  )
}