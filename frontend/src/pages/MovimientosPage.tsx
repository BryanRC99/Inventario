import { useEffect, useState } from 'react'
import { ErrorCarga } from '@/components/error-carga'
import { clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listarMovimientos, type Movimiento, type TipoEvento } from '@/api/movimientos'
import { SearchInput } from '@/components/search-input'
import { PaginacionTabla } from '@/components/paginacion-tabla'
import { TAMANO_PAGINA_HISTORIAL } from '@/api/paginacion'

const BADGE_POR_EVENTO: Record<TipoEvento, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  creacion: 'outline',
  asignacion: 'default',
  devolucion: 'secondary',
  traslado: 'secondary',
  mantenimiento: 'outline',
  baja: 'destructive',
  escaneo_validacion: 'outline',
}

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let vigente = true
    setLoading(true)
    setErrorCarga(null)
    const timer = window.setTimeout(() => {
      listarMovimientos(pagina, busqueda)
        .then((respuesta) => {
          if (!vigente) return
          setMovimientos(respuesta.results)
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          Historial automático de eventos de cada activo
        </p>
      </div>

      <SearchInput
        value={busqueda}
        onChange={(value) => { setBusqueda(value); setPagina(1) }}
        placeholder="Buscar por activo, evento o usuario..."
      />

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={() => setRecarga((n) => n + 1)} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Fecha</TableHead>
              <TableHead className="h-9 text-xs">Activo</TableHead>
              <TableHead className="h-9 text-xs">Evento</TableHead>
              <TableHead className="h-9 text-xs">Usuario</TableHead>
              <TableHead className="h-9 text-xs">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda
                    ? 'No se encontraron movimientos con ese criterio.'
                    : 'Todavía no hay movimientos registrados.'}
                </TableCell>
              </TableRow>
            )}

            {!loading && movimientos.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {new Date(mov.fecha_hora).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </TableCell>
                <TableCell className="py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {mov.activo_etiqueta_origen || mov.activo_codigo}
                  </span>{' '}
                  {mov.activo_nombre}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={BADGE_POR_EVENTO[mov.tipo_evento]} className="text-xs">
                    {mov.tipo_evento_display}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {mov.usuario_username || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {mov.observaciones || '—'}
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
    </div>
  )
}
