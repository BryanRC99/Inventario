import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ActivoDialog } from '@/components/activo-dialog'
import {
  listarActivos,
  crearActivo,
  actualizarActivo,
  eliminarActivo,
  type Activo,
  type ActivoInput,
  type EstadoActivo,
} from '@/api/activos'
import { listarCategorias, type Categoria } from '@/api/categorias'
import { listarUbicaciones, type Ubicacion } from '@/api/ubicaciones'
import { listarProveedores, type Proveedor } from '@/api/proveedores'

const BADGE_POR_ESTADO: Record<EstadoActivo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  activo: 'default',
  en_mantenimiento: 'secondary',
  dado_de_baja: 'outline',
  extraviado: 'destructive',
}

export default function ActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activoEditando, setActivoEditando] = useState<Activo | null>(null)

  const cargarTodo = async () => {
    setLoading(true)
    try {
      const [activosData, categoriasData, ubicacionesData, proveedoresData] = await Promise.all([
        listarActivos(),
        listarCategorias(),
        listarUbicaciones(),
        listarProveedores(),
      ])
      setActivos(activosData)
      setCategorias(categoriasData)
      setUbicaciones(ubicacionesData)
      setProveedores(proveedoresData)
    } catch {
      toast.error('No se pudieron cargar los activos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const abrirCrear = () => {
    setActivoEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (activo: Activo) => {
    setActivoEditando(activo)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: ActivoInput) => {
    try {
      if (activoEditando) {
        await actualizarActivo(activoEditando.id, payload)
        toast.success('Activo actualizado')
      } else {
        await crearActivo(payload)
        toast.success('Activo creado')
      }
      await cargarTodo()
    } catch {
      toast.error('Ocurrió un error al guardar. Revisa que el código no esté repetido.')
    }
  }

  const handleEliminar = async (activo: Activo) => {
    if (!confirm(`¿Eliminar el activo "${activo.nombre}" (${activo.codigo_interno})?`)) return
    try {
      await eliminarActivo(activo.id)
      toast.success('Activo eliminado')
      await cargarTodo()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar activos')
      } else {
        toast.error('No se pudo eliminar el activo')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Activos</h1>
          <p className="text-sm text-muted-foreground">Equipos registrados en el inventario</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nuevo activo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Categoría</TableHead>
              <TableHead className="h-9 text-xs">Ubicación</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
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

            {!loading && activos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  No hay activos todavía. Registra el primero.
                </TableCell>
              </TableRow>
            )}

            {activos.map((activo) => (
              <TableRow key={activo.id}>
                <TableCell className="py-2 text-sm font-mono">{activo.codigo_interno}</TableCell>
                <TableCell className="py-2 text-sm font-medium">{activo.nombre}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.categoria_nombre}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.ubicacion_nombre}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={BADGE_POR_ESTADO[activo.estado]} className="text-xs">
                    {activo.estado_display}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(activo)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(activo)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ActivoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activo={activoEditando}
        categorias={categorias}
        ubicaciones={ubicaciones}
        proveedores={proveedores}
        onSubmit={handleSubmit}
      />
    </div>
  )
}