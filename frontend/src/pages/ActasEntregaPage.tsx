import { useEffect, useState } from 'react'
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

  const actasFiltradas = actas.filter(
    (a) =>
      coincide(a.activo_nombre, busqueda) ||
      coincide(a.activo_codigo, busqueda) ||
      coincide(a.persona_nombre, busqueda),
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Actas de entrega</h1>
        <p className="text-sm text-muted-foreground">
          Historial de documentos generados por asignación de activos
        </p>
      </div>

      <SearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por activo o custodio..."
      />

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={cargar} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Activo</TableHead>
              <TableHead className="h-9 text-xs">Custodio</TableHead>
              <TableHead className="h-9 text-xs">Tipo</TableHead>
              <TableHead className="h-9 text-xs">Fecha</TableHead>
              <TableHead className="h-9 w-24 text-right text-xs">PDF</TableHead>
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

            {!loading && actasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda
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
    </div>
  )
}