import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Boxes, ClipboardList, Wrench, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { usuario } = useAuth()

  const stats = [
    {
      icon: Boxes,
      label: 'Activos totales',
      value: '—',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
    },
    {
      icon: ClipboardList,
      label: 'Custodias activas',
      value: '—',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-500',
    },
    {
      icon: Wrench,
      label: 'En mantenimiento',
      value: '—',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-500',
    },
    {
      icon: AlertTriangle,
      label: 'Garantías por vencer',
      value: '—',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-500',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">
          Hola, {usuario?.nombre_completo || usuario?.username}
        </h1>
        <p className="text-muted-foreground mt-1">Resumen general del inventario</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`flex size-9 items-center justify-center rounded-lg ${stat.bgColor}`}>
                    <Icon className={`size-5 ${stat.textColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}