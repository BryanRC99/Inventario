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
import { AreaDialog } from '@/components/area-dialog'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import {
  listarAreas,
  crearArea,
  actualizarArea,
  eliminarArea,
  type Area,
  type AreaInput,
} from '@/api/areas'
import { listarUbicaciones, type Ubicacion } from '@/api/ubicaciones'

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [areaEditando, setAreaEditando] = useState<Area | null>(null)
  const [areaAEliminar, setAreaAEliminar] = useState<Area | null>(null)

  const cargarAreas = async () => {
    setLoading(true)
    try {
      const [areasData, ubicacionesData] = await Promise.all([listarAreas(), listarUbicaciones()])
      setAreas(areasData)
      setUbicaciones(ubicacionesData)
    } catch {
      toast.error('No se pudieron cargar las áreas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarAreas()
  }, [])

  const abrirCrear = () => {
    setAreaEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (area: Area) => {
    setAreaEditando(area)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: AreaInput) => {
    try {
      if (areaEditando) {
        await actualizarArea(areaEditando.id, payload)
        toast.success('Área actualizada')
      } else {
        await crearArea(payload)
        toast.success('Área creada')
      }
      await cargarAreas()
    } catch {
      toast.error('Ocurrió un error al guardar. Revisa que el nombre no esté repetido.')
    }
  }

  const confirmarEliminar = async () => {
    if (!areaAEliminar) return
    try {
      await eliminarArea(areaAEliminar.id)
      toast.success('Área eliminada')
      await cargarAreas()
    } catch {
      toast.error('No se pudo eliminar. Puede que esté en uso.')
    } finally {
      setAreaAEliminar(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Áreas</h1>
          <p className="text-sm text-muted-foreground">Departamentos de la organización</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nueva área
        </Button>
      </div>

      <div className="max-w-2xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Ubicación por defecto</TableHead>
              <TableHead className="h-9 text-xs">Descripción</TableHead>
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

            {!loading && areas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No hay áreas todavía. Crea la primera.
                </TableCell>
              </TableRow>
            )}

            {areas.map((area) => (
              <TableRow key={area.id}>
                <TableCell className="py-2 text-sm font-medium">{area.nombre}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {area.ubicacion_nombre || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {area.descripcion || '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(area)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setAreaAEliminar(area)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AreaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        area={areaEditando}
        ubicaciones={ubicaciones}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!areaAEliminar}
        onOpenChange={(open) => !open && setAreaAEliminar(null)}
        titulo="¿Eliminar esta área?"
        descripcion={`Vas a eliminar el área "${areaAEliminar?.nombre}".`}
        onConfirm={confirmarEliminar}
      />
    </div>
  )
}