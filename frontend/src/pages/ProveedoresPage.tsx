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
import { ProveedorDialog } from '@/components/proveedor-dialog'
import {
  listarProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  type Proveedor,
  type ProveedorInput,
} from '@/api/proveedores'

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null)

  const cargarProveedores = async () => {
    setLoading(true)
    try {
      const data = await listarProveedores()
      setProveedores(data)
    } catch {
      toast.error('No se pudieron cargar los proveedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarProveedores()
  }, [])

  const abrirCrear = () => {
    setProveedorEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (proveedor: Proveedor) => {
    setProveedorEditando(proveedor)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: ProveedorInput) => {
    try {
      if (proveedorEditando) {
        await actualizarProveedor(proveedorEditando.id, payload)
        toast.success('Proveedor actualizado')
      } else {
        await crearProveedor(payload)
        toast.success('Proveedor creado')
      }
      await cargarProveedores()
    } catch (err: any) {
      const detalle = err?.response?.data?.detail || err?.response?.data?.ruc?.[0]
      toast.error(detalle || 'Ocurrió un error al guardar el proveedor.')
    }
  }

  const handleEliminar = async (proveedor: Proveedor) => {
    if (!confirm(`¿Eliminar el proveedor "${proveedor.nombre}"?`)) {
      return
    }
    try {
      await eliminarProveedor(proveedor.id)
      toast.success('Proveedor eliminado')
      await cargarProveedores()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar proveedores')
      } else {
        toast.error('No se pudo eliminar. Puede que tenga activos asociados.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los proveedores del inventario
          </p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nuevo proveedor
        </Button>
      </div>

      <div className="max-w-5xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">RUC</TableHead>
              <TableHead className="h-9 text-xs">Contacto</TableHead>
              <TableHead className="h-9 w-20 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && proveedores.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No hay proveedores todavía. Crea el primero.
                </TableCell>
              </TableRow>
            )}

            {proveedores.map((proveedor) => (
              <TableRow key={proveedor.id}>
                <TableCell className="py-2 text-sm font-medium">{proveedor.nombre}</TableCell>
                <TableCell className="py-2 text-sm font-mono text-muted-foreground">
                  {proveedor.ruc}
                </TableCell>
                <TableCell className="py-2 text-sm">{proveedor.contacto}</TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(proveedor)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(proveedor)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProveedorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        proveedor={proveedorEditando}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
