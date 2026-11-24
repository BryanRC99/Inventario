import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorCarga } from '@/components/error-carga'
import { clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
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
  type Mantenimiento,
  type MantenimientoInput,
} from '@/api/mantenimientos'
import { listarProveedores, type Proveedor } from '@/api/proveedores'
import { SearchInput } from '@/components/search-input'
import { PaginacionTabla } from '@/components/paginacion-tabla'
import { TAMANO_PAGINA_HISTORIAL } from '@/api/paginacion'

export default function MantenimientosPage() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mantenimientoEditando, setMantenimientoEditando] = useState<Mantenimiento | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let vigente = true
    setLoading(true)
    setErrorCarga(null)
    const timer = window.setTimeout(() => {
      listarMantenimientos(pagina, busqueda)
        .then((respuesta) => {
          if (!vigente) return
          setMantenimientos(respuesta.results)
          setTotal(respuesta.count)
        })
        .catch((err) => {
          if (vigente) setErrorCarga(clasificarErrorCarga(err))
        })
        .finally(() => {
          if (vigente) setLoading(false)
        })
    }, 250)
    return () => {
      vigente = false
      window.clearTimeout(timer)
    }
  }, [pagina, busqueda, recarga])

  useEffect(() => {
    let vigente = true
    listarProveedores()
      .then((data) => { if (vigente) setProveedores(data) })
      .catch(() => { if (vigente) toast.error('No se pudieron cargar los proveedores') })
    return () => { vigente = false }
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
      setRecarga((n) => n + 1)
    } catch {
      toast.error('Ocurrió un error al guardar')
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

      <SearchInput
        value={busqueda}
        onChange={(value) => { setBusqueda(value); setPagina(1) }}
        placeholder="Buscar por activo o problema..."
      />

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={() => setRecarga((n) => n + 1)} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Activo</TableHead>
              <TableHead className="h-9 text-xs">Problema</TableHead>
              <TableHead className="h-9 text-xs">Fecha</TableHead>
              <TableHead className="h-9 text-xs">Costo</TableHead>
              <TableHead className="h-9 text-xs">Próximo</TableHead>
              <TableHead className="h-9 w-16 text-right text-xs">Acciones</TableHead>
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
                  {busqueda
                    ? 'No se encontraron mantenimientos con ese criterio.'
                    : 'No hay mantenimientos registrados.'}
                </TableCell>
              </TableRow>
            )}

            {!loading && mantenimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.activo_etiqueta_origen || m.activo_codigo}
                  </span>{' '}
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
                    title="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!loading && !errorCarga && (
        <PaginacionTabla
          pagina={pagina}
          total={total}
          tamanoPagina={TAMANO_PAGINA_HISTORIAL}
          cargando={loading}
          onCambiarPagina={setPagina}
        />
      )}

      <MantenimientoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mantenimiento={mantenimientoEditando}
        proveedores={proveedores}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
