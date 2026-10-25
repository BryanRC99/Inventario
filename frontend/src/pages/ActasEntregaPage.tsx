import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { ErrorCarga } from '@/components/error-carga'
import { clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
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
import { listarActas, type ActaEntrega, type TipoActa } from '@/api/actas'
import { BotonEscaneos } from '@/components/boton-escaneos'
import { SearchInput } from '@/components/search-input'
import { coincide } from '@/lib/normalizar-texto'

const BADGE_POR_TIPO: Record<TipoActa, 'default' | 'secondary' | 'outline'> = {
  entrega: 'default',
  devolucion: 'secondary',
  traslado: 'outline',
}

type FiltroRespaldo = 'todas' | 'pendientes' | 'respaldadas'

export default function ActasEntregaPage() {
  const [params, setParams] = useSearchParams()
  const filtro: FiltroRespaldo =
    params.get('respaldo') === 'pendientes' ? 'pendientes' : params.get('respaldo') === 'respaldadas' ? 'respaldadas' : 'todas'
  const cambiarFiltro = (nuevo: FiltroRespaldo) => setParams(nuevo === 'todas' ? {} : { respaldo: nuevo }, { replace: true })
  const [actas, setActas] = useState<ActaEntrega[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = () => {
    setLoading(true)
    setErrorCarga(null)
    listarActas()
      .then(setActas)
      .catch((err) => setErrorCarga(clasificarErrorCarga(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const actualizarConteo = (actaId: string, cantidad: number) =>
    setActas((prev) => prev.map((a) => (a.id === actaId ? { ...a, escaneos_count: cantidad } : a)))

  const pendientes = useMemo(() => actas.filter((a) => a.escaneos_count === 0).length, [actas])

  const actasFiltradas = actas.filter(
    (a) =>
      (filtro === 'todas' || (filtro === 'pendientes' ? a.escaneos_count === 0 : a.escaneos_count > 0)) &&
      (coincide(a.activo_nombre, busqueda) ||
        coincide(a.activo_codigo, busqueda) ||
        coincide(a.persona_nombre, busqueda)),
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Actas de entrega</h1>
        <p className="text-sm text-muted-foreground">
          Historial de documentos generados por asignación de activos
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por activo o custodio..."
        />
        <div className="flex gap-1" role="group" aria-label="Filtrar por respaldo digital">
          {(
            [
              ['todas', `Todas (${actas.length})`],
              ['pendientes', `Pendientes de escaneo (${pendientes})`],
              ['respaldadas', `Respaldadas (${actas.length - pendientes})`],
            ] as const
          ).map(([valor, texto]) => (
            <Button
              key={valor}
              size="sm"
              variant={filtro === valor ? 'default' : 'outline'}
              onClick={() => cambiarFiltro(valor)}
            >
              {texto}
            </Button>
          ))}
        </div>
      </div>

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={cargar} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Activo</TableHead>
              <TableHead className="h-9 text-xs">Custodio</TableHead>
              <TableHead className="h-9 text-xs">Tipo</TableHead>
              <TableHead className="h-9 text-xs">Fecha</TableHead>
              <TableHead className="h-9 text-xs">Respaldo firmado</TableHead>
              <TableHead className="h-9 w-28 text-right text-xs">Acciones</TableHead>
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

            {!loading && actasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda || filtro !== 'todas'
                    ? 'No se encontraron actas con ese criterio.'
                    : 'Todavía no se ha generado ninguna acta.'}
                </TableCell>
              </TableRow>
            )}

            {actasFiltradas.map((acta) => (
              <TableRow key={acta.id}>
                <TableCell className="py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {acta.activo_codigo}
                  </span>{' '}
                  {acta.activo_nombre}
                </TableCell>
                <TableCell className="py-2 text-sm font-medium">{acta.persona_nombre}</TableCell>
                <TableCell className="py-2">
                  <Badge variant={BADGE_POR_TIPO[acta.tipo]} className="text-xs">
                    {acta.tipo_display}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{acta.fecha}</TableCell>
                <TableCell className="py-2">
                  {acta.escaneos_count > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400"
                    >
                      Respaldada ({acta.escaneos_count})
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
                    >
                      Pendiente de escaneo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="py-2 text-right">
                  {acta.pdf && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Ver acta generada (PDF para imprimir)"
                      onClick={() => window.open(acta.pdf!, '_blank')}
                    >
                      <FileText className="size-3.5" />
                    </Button>
                  )}
                  <BotonEscaneos acta={acta} compacto onConteo={actualizarConteo} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}