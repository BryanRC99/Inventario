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
import { CategoriaDialog } from '@/components/categoria-dialog'
import {
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  type Categoria,
  type CategoriaInput,
} from '@/api/categorias'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)

  const cargarCategorias = async () => {
    setLoading(true)
    try {
      const data = await listarCategorias()
      setCategorias(data)
    } catch {
      toast.error('No se pudieron cargar las categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const abrirCrear = () => {
    setCategoriaEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (categoria: Categoria) => {
    setCategoriaEditando(categoria)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: CategoriaInput) => {
    try {
      if (categoriaEditando) {
        await actualizarCategoria(categoriaEditando.id, payload)
        toast.success('Categoría actualizada')
      } else {
        await crearCategoria(payload)
        toast.success('Categoría creada')
      }
      await cargarCategorias()
    } catch {
      toast.error('Ocurrió un error al guardar. Revisa que el nombre no esté repetido.')
    }
  }

  const handleEliminar = async (categoria: Categoria) => {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }
    try {
      await eliminarCategoria(categoria.id)
      toast.success('Categoría eliminada')
      await cargarCategorias()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar categorías')
      } else {
        toast.error('No se pudo eliminar. Puede que tenga activos asociados.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Categorías</h1>
          <p className="text-sm text-muted-foreground">Tipos de activo del inventario</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nueva categoría
        </Button>
      </div>

      <div className="max-w-2xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Custodio único</TableHead>
              <TableHead className="h-9 w-20 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && categorias.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  No hay categorías todavía. Crea la primera.
                </TableCell>
              </TableRow>
            )}

            {categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell className="py-2 text-sm font-medium">{categoria.nombre}</TableCell>
                <TableCell className="py-2">
                  <Badge
                    variant={categoria.requiere_custodio_unico ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {categoria.requiere_custodio_unico ? 'Único' : 'Compartido'}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(categoria)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(categoria)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CategoriaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categoria={categoriaEditando}
        onSubmit={handleSubmit}
      />
    </div>
  )
}