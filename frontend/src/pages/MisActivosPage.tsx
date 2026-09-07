import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
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
import { MiActivoDetailDialog } from '@/components/mi-activo-detail-dialog'
import { listarActivos, type Activo, type EstadoActivo } from '@/api/activos'

const BADGE_POR_ESTADO: Record<EstadoActivo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  activo: 'default',
  en_mantenimiento: 'secondary',
  dado_de_baja: 'outline',
  extraviado: 'destructive',
}

export default function MisActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [loading, setLoading] = useState(true)
  const [detalle, setDetalle] = useState<Activo | null>(null)

  useEffect(() => {
    listarActivos()
      .then(setActivos)
      .catch(() => toast.error('No se pudieron cargar tus activos'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Mis Activos</h1>
        <p className="text-sm text-muted-foreground">Equipos actualmente asignados a tu nombre</p>
      </div>

      <div className="max-w-3xl rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Categoría</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
              <TableHead className="h-9 w-16 text-right text-xs">Detalle</TableHead>
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

            {!loading && activos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No tienes activos asignados actualmente.
                </TableCell>
              </TableRow>
            )}

            {activos.map((activo) => (
              <TableRow key={activo.id}>
                <TableCell className="py-2 text-sm font-mono">{activo.codigo_interno}</TableCell>
                <TableCell className="py-2 text-sm font-medium">{activo.nombre}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.categoria_nombre}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={BADGE_POR_ESTADO[activo.estado]} className="text-xs">
                    {activo.estado_display}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setDetalle(activo)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MiActivoDetailDialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)} activo={detalle} />
    </div>
  )
}