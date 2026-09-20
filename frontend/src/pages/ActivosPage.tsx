import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, Tag, PackageX } from 'lucide-react'
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
import { ActivoDetailDialog } from '@/components/activo-detail-dialog'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { DarDeBajaDialog } from '@/components/dar-de-baja-dialog'
import {
  listarActivos,
  crearActivo,
  actualizarActivo,
  eliminarActivo,
  obtenerEtiquetaPdf,
  darDeBajaActivo,
  type Activo,
  type ActivoInput,
  type EstadoActivo,
} from '@/api/activos'
import { listarCategorias, type Categoria } from '@/api/categorias'
import { listarUbicaciones, type Ubicacion } from '@/api/ubicaciones'
import { listarProveedores, type Proveedor } from '@/api/proveedores'
import { SearchInput } from '@/components/search-input'
import { coincide } from '@/lib/normalizar-texto'

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
  const [activoDetalle, setActivoDetalle] = useState<Activo | null>(null)
  const [activoAEliminar, setActivoAEliminar] = useState<Activo | null>(null)
  const [activoParaBaja, setActivoParaBaja] = useState<Activo | null>(null)
  const [busqueda, setBusqueda] = useState('')

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

  const activosFiltrados = activos.filter(
    (a) =>
      coincide(a.codigo_interno, busqueda) ||
      coincide(a.nombre, busqueda) ||
      coincide(a.categoria_nombre, busqueda) ||
      coincide(a.modelo, busqueda) ||
      coincide(a.numero_serie, busqueda) ||
      coincide(a.marca, busqueda),
  )

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

  const confirmarEliminar = async () => {
    if (!activoAEliminar) return
    try {
      await eliminarActivo(activoAEliminar.id)
      toast.success('Activo eliminado')
      await cargarTodo()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar activos')
      } else if (err?.response?.data?.detail) {
        toast.error(err.response.data.detail)
      } else {
        toast.error('No se pudo eliminar el activo')
      }
    } finally {
      setActivoAEliminar(null)
    }
  }

  const handleImprimirEtiqueta = async (activo: Activo) => {
    try {
      const blob = await obtenerEtiquetaPdf(activo.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      toast.error('No se pudo generar la etiqueta')
    }
  }

  const handleDarDeBaja = async (motivo: string) => {
    if (!activoParaBaja) return
    try {
      await darDeBajaActivo(activoParaBaja.id, motivo)
      toast.success('Activo dado de baja')
      await cargarTodo()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo dar de baja el activo')
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

      <SearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por código, nombre, modelo, serie..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Modelo</TableHead>
              <TableHead className="h-9 text-xs">N° Serie</TableHead>
              <TableHead className="h-9 text-xs">Categoría</TableHead>
              <TableHead className="h-9 text-xs">Ubicación</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
              <TableHead className="h-9 w-36 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && activosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda
                    ? 'No se encontraron activos con ese criterio.'
                    : 'No hay activos todavía. Registra el primero.'}
                </TableCell>
              </TableRow>
            )}

            {activosFiltrados.map((activo) => (
              <TableRow key={activo.id}>
                <TableCell className="py-2 text-sm font-mono">{activo.codigo_interno}</TableCell>
                <TableCell className="py-2 text-sm font-medium">{activo.nombre}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.modelo || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm font-mono text-muted-foreground">
                  {activo.numero_serie || '—'}
                </TableCell>
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
                    onClick={() => handleImprimirEtiqueta(activo)}
                    title="Imprimir etiqueta"
                  >
                    <Tag className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setActivoDetalle(activo)}
                    title="Ver detalle"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  {activo.estado !== 'dado_de_baja' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setActivoParaBaja(activo)}
                      title="Dar de baja"
                    >
                      <PackageX className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(activo)}
                    title="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setActivoAEliminar(activo)}
                    title="Eliminar"
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

      <ActivoDetailDialog
        open={!!activoDetalle}
        onOpenChange={(open) => !open && setActivoDetalle(null)}
        activo={activoDetalle}
      />

      <DarDeBajaDialog
        open={!!activoParaBaja}
        onOpenChange={(open) => !open && setActivoParaBaja(null)}
        activo={activoParaBaja}
        onConfirm={handleDarDeBaja}
      />

      <ConfirmDeleteDialog
        open={!!activoAEliminar}
        onOpenChange={(open) => !open && setActivoAEliminar(null)}
        titulo="¿Eliminar este activo?"
        descripcion={`Vas a eliminar "${activoAEliminar?.nombre}" (${activoAEliminar?.codigo_interno}).`}
        onConfirm={confirmarEliminar}
      />
    </div>
  )
}