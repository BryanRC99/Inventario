import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { ErrorCarga } from '@/components/error-carga'
import { clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AuditoriaDetailDialog } from '@/components/auditoria-detail-dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  listarAuditoria,
  ACCIONES,
  MODELOS,
  type RegistroAuditoria,
  type AccionAuditoria,
} from '@/api/auditoria'

const BADGE_POR_ACCION: Record<AccionAuditoria, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  crear: 'default',
  editar: 'secondary',
  eliminar: 'destructive',
  login: 'outline',
  login_fallido: 'destructive',
  logout: 'outline',
  cambio_permisos: 'secondary',
  ver_escaneo: 'outline',
}

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [pagina, setPagina] = useState(1)

  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('todos')
  const [filtroModelo, setFiltroModelo] = useState('todos')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const cargar = async () => {
    setLoading(true)
    setErrorCarga(null)
    try {
      const data = await listarAuditoria({
        search: busqueda || undefined,
        accion: filtroAccion !== 'todos' ? filtroAccion : undefined,
        modelo: filtroModelo !== 'todos' ? filtroModelo : undefined,
        fecha_hora_after: filtroDesde || undefined,
        fecha_hora_before: filtroHasta || undefined,
      }, pagina)
      setRegistros(data.results)
      setTotalRegistros(data.count)
    } catch (err) {
      setErrorCarga(clasificarErrorCarga(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(cargar, 350)
    return () => clearTimeout(t)
  }, [busqueda, filtroAccion, filtroModelo, filtroDesde, filtroHasta, pagina])

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / 20))
  const paginasVisibles = [...new Set([1, pagina - 1, pagina, pagina + 1, totalPaginas])]
    .filter((p) => p >= 1 && p <= totalPaginas)
    .sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">Historial completo de acciones del sistema</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Buscar en registros</label>
          <Input
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            placeholder="Usuario, registro, IP, módulo..."
            className="h-8 w-64 text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Acción</label>
          <Select value={filtroAccion} onValueChange={(v) => { setFiltroAccion(v ?? ''); setPagina(1) }}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {ACCIONES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Módulo</label>
          <Select value={filtroModelo} onValueChange={(v) => { setFiltroModelo(v ?? ''); setPagina(1) }}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {MODELOS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input
            type="date"
            value={filtroDesde}
            onChange={(e) => { setFiltroDesde(e.target.value); setPagina(1) }}
            className="h-8 w-36 text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={filtroHasta}
            onChange={(e) => { setFiltroHasta(e.target.value); setPagina(1) }}
            className="h-8 w-36 text-sm"
          />
        </div>
      </div>

      {!loading && totalRegistros > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Mostrando {(pagina - 1) * 20 + 1}–{Math.min(pagina * 20, totalRegistros)} de {totalRegistros} registros
          </span>
          {totalPaginas > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} />
                </PaginationItem>
                {paginasVisibles.flatMap((p, index) => [
                  ...(index > 0 && p - paginasVisibles[index - 1] > 1
                    ? [<PaginationItem key={`ellipsis-${p}`}><PaginationEllipsis /></PaginationItem>]
                    : []),
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === pagina} onClick={() => setPagina(p)}>{p}</PaginationLink>
                  </PaginationItem>,
                ])}
                <PaginationItem>
                  <PaginationNext onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={cargar} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Fecha</TableHead>
              <TableHead className="h-9 text-xs">Usuario</TableHead>
              <TableHead className="h-9 text-xs">Acción</TableHead>
              <TableHead className="h-9 text-xs">Módulo</TableHead>
              <TableHead className="h-9 text-xs">Registro</TableHead>
              <TableHead className="h-9 text-xs">IP</TableHead>
              <TableHead className="h-9 w-16 text-right text-xs">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  No hay registros con esos filtros.
                </TableCell>
              </TableRow>
            )}

            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {new Date(r.fecha_hora).toLocaleString('es-EC', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </TableCell>
                <TableCell className="py-2 text-sm font-mono">
                  {r.usuario_username || '—'}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={BADGE_POR_ACCION[r.accion]} className="text-xs">
                    {r.accion_display}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {r.modelo || '—'}
                </TableCell>
                <TableCell className="py-2 max-w-48 truncate text-sm text-muted-foreground">
                  {r.objeto_repr || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm font-mono text-muted-foreground">
                  {r.ip_address || '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setDetalle(r)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AuditoriaDetailDialog
        open={!!detalle}
        onOpenChange={(open) => !open && setDetalle(null)}
        registro={detalle}
      />
    </div>
  )
}
