import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Boxes, ClipboardList, Wrench, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { usuario } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {usuario?.nombre_completo || usuario?.username}
        </h1>
        <p className="text-muted-foreground">Resumen general del inventario</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Boxes className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">—</p>
              <p className="text-sm text-muted-foreground">Activos totales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">—</p>
              <p className="text-sm text-muted-foreground">Custodias activas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Wrench className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">—</p>
              <p className="text-sm text-muted-foreground">En mantenimiento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-none">—</p>
              <p className="text-sm text-muted-foreground">Garantías por vencer</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}