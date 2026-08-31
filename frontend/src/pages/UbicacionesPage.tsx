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
import { UbicacionDialog } from '@/components/ubicacion-dialog'
import {
  listarUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
  TIPOS_UBICACION,
  type Ubicacion,
  type UbicacionInput,
} from '@/api/ubicaciones'

// Colores distintos por tipo para que la jerarquía se lea rápido en la tabla
const badgeVariantPorTipo: Record<Ubicacion['tipo'], 'default' | 'secondary' | 'outline'> = {
  sede: 'default',
  piso: 'secondary',
  oficina: 'outline',
  bodega: 'outline',
}

export default function UbicacionesPage() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [ubicacionEditando, setUbicacionEditando] = useState<Ubicacion | null>(null)

  const cargarUbicaciones = async () => {
    setLoading(true)
    try {
      const data = await listarUbicaciones()
      setUbicaciones(data)
    } catch {
      toast.error('No se pudieron cargar las ubicaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUbicaciones()
  }, [])

  const abrirCrear = () => {
    setUbicacionEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (ubicacion: Ubicacion) => {
    setUbicacionEditando(ubicacion)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: UbicacionInput) => {
    try {
      if (ubicacionEditando) {
        await actualizarUbicacion(ubicacionEditando.id, payload)
        toast.success('Ubicación actualizada')
      } else {
        await crearUbicacion(payload)
        toast.success('Ubicación creada')
      }
      await cargarUbicaciones()
    } catch (err: any) {
      const detalle = err?.response?.data?.ubicacion_padre?.[0]
      toast.error(detalle || 'Ocurrió un error al guardar la ubicación.')
    }
  }

  const handleEliminar = async (ubicacion: Ubicacion) => {
    if (
      !confirm(
        `¿Eliminar la ubicación "${ubicacion.nombre}"? Las sub-ubicaciones quedarán sin padre.`,
      )
    ) {
      return
    }
    try {
      await eliminarUbicacion(ubicacion.id)
      toast.success('Ubicación eliminada')
      await cargarUbicaciones()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar ubicaciones')
      } else {
        toast.error('No se pudo eliminar. Puede que tenga activos asociados.')
      }
    }
  }

  const labelTipo = (tipo: Ubicacion['tipo']) =>
    TIPOS_UBICACION.find((t) => t.value === tipo)?.label ?? tipo

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Ubicaciones</h1>
          <p className="text-sm text-muted-foreground">
            Sedes, pisos, oficinas y bodegas del inventario
          </p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nueva ubicación
        </Button>
      </div>

      <div className="max-w-3xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Tipo</TableHead>
              <TableHead className="h-9 text-xs">Depende de</TableHead>
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

            {!loading && ubicaciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No hay ubicaciones todavía. Crea la primera.
                </TableCell>
              </TableRow>
            )}

            {ubicaciones.map((ubicacion) => (
              <TableRow key={ubicacion.id}>
                <TableCell className="py-2 text-sm font-medium">{ubicacion.nombre}</TableCell>
                <TableCell className="py-2">
                  <Badge variant={badgeVariantPorTipo[ubicacion.tipo]} className="text-xs">
                    {labelTipo(ubicacion.tipo)}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {ubicacion.ubicacion_padre_nombre || '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(ubicacion)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(ubicacion)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UbicacionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ubicacion={ubicacionEditando}
        ubicaciones={ubicaciones}
        onSubmit={handleSubmit}
      />
    </div>
  )
}