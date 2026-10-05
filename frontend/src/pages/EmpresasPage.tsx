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
import { EmpresaDialog } from '@/components/empresa-dialog'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import {
  listarEmpresas,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  type Empresa,
  type EmpresaInput,
} from '@/api/empresas'
import { SearchInput } from '@/components/search-input'
import { coincide } from '@/lib/normalizar-texto'

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null)
  const [empresaAEliminar, setEmpresaAEliminar] = useState<Empresa | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargarEmpresas = async () => {
    setLoading(true)
    try {
      setEmpresas(await listarEmpresas())
    } catch {
      toast.error('No se pudieron cargar las empresas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEmpresas()
  }, [])

  const empresasFiltradas = empresas.filter((e) => coincide(e.nombre, busqueda))

  const abrirCrear = () => {
    setEmpresaEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (empresa: Empresa) => {
    setEmpresaEditando(empresa)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: EmpresaInput) => {
    try {
      if (empresaEditando) {
        await actualizarEmpresa(empresaEditando.id, payload)
        toast.success('Empresa actualizada')
      } else {
        await crearEmpresa(payload)
        toast.success('Empresa creada')
      }
      await cargarEmpresas()
    } catch {
      toast.error('Ocurrió un error al guardar. Revisa que el nombre no esté repetido.')
    }
  }

  const confirmarEliminar = async () => {
    if (!empresaAEliminar) return
    try {
      await eliminarEmpresa(empresaAEliminar.id)
      toast.success('Empresa eliminada')
      await cargarEmpresas()
    } catch {
      toast.error('No se pudo eliminar. Puede que esté en uso.')
    } finally {
      setEmpresaAEliminar(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Empresas</h1>
          <p className="text-sm text-muted-foreground">Empresas administradas en este sistema</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nueva empresa
        </Button>
      </div>

      <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre..." />

      <div className="max-w-2xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Descripción</TableHead>
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

            {!loading && empresasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda ? 'No se encontraron empresas.' : 'No hay empresas todavía. Crea la primera.'}
                </TableCell>
              </TableRow>
            )}

            {empresasFiltradas.map((empresa) => (
              <TableRow key={empresa.id}>
                <TableCell className="py-2 text-sm font-medium">{empresa.nombre}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {empresa.descripcion || '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(empresa)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setEmpresaAEliminar(empresa)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmpresaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        empresa={empresaEditando}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={!!empresaAEliminar}
        onOpenChange={(open) => !open && setEmpresaAEliminar(null)}
        titulo="¿Eliminar esta empresa?"
        descripcion={`Vas a eliminar "${empresaAEliminar?.nombre}".`}
        onConfirm={confirmarEliminar}
      />
    </div>
  )
}