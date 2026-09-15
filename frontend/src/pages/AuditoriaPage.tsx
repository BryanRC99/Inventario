import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { toast } from 'sonner'
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
}

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)

  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('todos')
  const [filtroModelo, setFiltroModelo] = useState('todos')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await listarAuditoria({
        usuario_username: filtroUsuario || undefined,
        accion: filtroAccion !== 'todos' ? filtroAccion : undefined,
        modelo: filtroModelo !== 'todos' ? filtroModelo : undefined,
        fecha_hora_after: filtroDesde || undefined,
        fecha_hora_before: filtroHasta || undefined,
      })
      setRegistros(data)
    } catch {
      toast.error('No se pudo cargar la auditoría')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [filtroAccion, filtroModelo, filtroDesde, filtroHasta])

  // Búsqueda por usuario con un pequeño debounce manual para no
  // disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(cargar, 400)
    return () => clearTimeout(t)
  }, [filtroUsuario])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">Historial completo de acciones del sistema</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Usuario</label>
          <Input
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            placeholder="Buscar usuario..."
            className="h-8 w-40 text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Acción</label>
          <Select value={filtroAccion} onValueChange={setFiltroAccion}>
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
          <Select value={filtroModelo} onValueChange={setFiltroModelo}>
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
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
      </div>

      <div className="rounded-md border">
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