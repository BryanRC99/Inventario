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
import { coincide } from '@/lib/normalizar-texto'

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
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = () => {
    setLoading(true)
    setErrorCarga(null)
    listarMovimientos()
      .then(setMovimientos)
      .catch((err) => setErrorCarga(clasificarErrorCarga(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const movimientosFiltrados = movimientos.filter(
    (mov) =>
      coincide(mov.activo_nombre, busqueda) ||
      coincide(mov.activo_codigo, busqueda) ||
      coincide(mov.tipo_evento_display, busqueda) ||
      coincide(mov.usuario_username, busqueda),
  )

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
        onChange={setBusqueda}
        placeholder="Buscar por activo, evento o usuario..."
      />

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={cargar} />}
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

            {!loading && movimientosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda
                    ? 'No se encontraron movimientos con ese criterio.'
                    : 'Todavía no hay movimientos registrados.'}
                </TableCell>
              </TableRow>
            )}

            {movimientosFiltrados.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {new Date(mov.fecha_hora).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </TableCell>
                <TableCell className="py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {mov.activo_codigo}
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
    </div>
  )
}