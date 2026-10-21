import { useEffect, useState } from 'react'
import { CheckCircle2, FileText, Paperclip } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ActaEscaneosDialog } from '@/components/acta-escaneos-dialog'
import { SearchInput } from '@/components/search-input'
import { coincide } from '@/lib/normalizar-texto'

const BADGE_POR_TIPO: Record<TipoActa, 'default' | 'secondary' | 'outline'> = {
  entrega: 'default',
  devolucion: 'secondary',
  traslado: 'outline',
}

export default function ActasEntregaPage() {
  const [actas, setActas] = useState<ActaEntrega[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [searchParams] = useSearchParams()
  const [respaldo, setRespaldo] = useState<'todas' | 'pendientes' | 'respaldadas'>(
    searchParams.get('respaldo') === 'pendientes' ? 'pendientes' : 'todas',
  )
  const [actaEscaneos, setActaEscaneos] = useState<ActaEntrega | null>(null)

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

  const actasFiltradas = actas
    .filter((a) => respaldo === 'todas' || (respaldo === 'pendientes' ? a.escaneos_activos === 0 : a.escaneos_activos > 0))
    .filter(
      (a) =>
        coincide(a.activo_nombre, busqueda) ||
        coincide(a.activo_codigo, busqueda) ||
        coincide(a.persona_nombre, busqueda),
    )
  const pendientes = actas.filter((a) => a.escaneos_activos === 0).length

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
        <Select value={respaldo} onValueChange={(v) => setRespaldo(v as typeof respaldo)}>
          <SelectTrigger className="h-8 w-56 text-sm">
            <SelectValue>
              {{ todas: 'Todas las actas', pendientes: `Pendientes de escaneo (${pendientes})`, respaldadas: 'Con respaldo digital' }[respaldo]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las actas</SelectItem>
            <SelectItem value="pendientes">Pendientes de escaneo ({pendientes})</SelectItem>
            <SelectItem value="respaldadas">Con respaldo digital</SelectItem>
          </SelectContent>
        </Select>
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
              <TableHead className="h-9 w-24 text-right text-xs">PDF</TableHead>
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
                  {busqueda || respaldo !== 'todas'
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
                  <button
                    onClick={() => setActaEscaneos(acta)}
                    className="inline-flex items-center gap-1.5"
                    title="Ver o subir el escaneo del acta firmada"
                  >
                    {acta.escaneos_activos > 0 ? (
                      <Badge variant="outline" className="gap-1 border-emerald-500/40 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Respaldada ({acta.escaneos_activos})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-amber-500/50 text-xs text-amber-600 dark:text-amber-400">
                        <Paperclip className="size-3" />
                        Pendiente
                      </Badge>
                    )}
                  </button>
                </TableCell>
                <TableCell className="py-2 text-right">
                  {acta.pdf ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => window.open(acta.pdf!, '_blank')}
                    >
                      <FileText className="size-3.5" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ActaEscaneosDialog
        open={!!actaEscaneos}
        onOpenChange={(open) => !open && setActaEscaneos(null)}
        acta={actaEscaneos}
        onCambio={cargar}
      />
    </div>
  )
}