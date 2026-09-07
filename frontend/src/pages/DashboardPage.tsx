import { useEffect, useState } from 'react'
import { Boxes, ClipboardList, Wrench, AlertTriangle } from 'lucide-react'
import { Cell, Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { obtenerDashboard, type DashboardData } from '@/api/dashboard'

const COLORES_ESTADO: Record<string, string> = {
  activo: 'var(--chart-1)',
  en_mantenimiento: 'var(--chart-3)',
  dado_de_baja: 'var(--chart-5)',
  extraviado: 'var(--chart-4)',
}

const chartConfigCategoria = {
  total: { label: 'Activos', color: 'var(--chart-1)' },
} satisfies ChartConfig

const chartConfigUbicacion = {
  total: { label: 'Activos', color: 'var(--chart-2)' },
} satisfies ChartConfig

const chartConfigEstado = {
  total: { label: 'Activos' },
} satisfies ChartConfig

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    obtenerDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const resumen = [
    {
      titulo: 'Activos totales',
      valor: data?.total_activos ?? '—',
      icon: Boxes,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      titulo: 'Custodias activas',
      valor: data?.custodias_activas ?? '—',
      icon: ClipboardList,
      color: 'bg-emerald-500/10 text-emerald-500',
    },
    {
      titulo: 'En mantenimiento',
      valor: data?.en_mantenimiento ?? '—',
      icon: Wrench,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      titulo: 'Garantías por vencer',
      valor: data?.garantias_por_vencer ?? '—',
      icon: AlertTriangle,
      color: 'bg-red-500/10 text-red-500',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {usuario?.nombre_completo || usuario?.username}
        </h1>
        <p className="text-muted-foreground">Resumen general del inventario</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resumen.map((item) => (
          <Card key={item.titulo}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">{item.valor}</p>
                <p className="text-sm text-muted-foreground">{item.titulo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Activos por categoría</CardTitle>
              <CardDescription>Distribución del inventario por tipo de activo</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigCategoria} className="h-64 w-full">
                <BarChart data={data.por_categoria} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="categoria"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={90}
                    fontSize={12}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activos por estado</CardTitle>
              <CardDescription>Estado actual de los equipos</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={chartConfigEstado} className="h-64 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Pie
                    data={data.por_estado}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.por_estado.map((entry) => (
                      <Cell
                        key={entry.estado}
                        fill={COLORES_ESTADO[entry.estado] ?? 'var(--chart-2)'}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Activos por ubicación</CardTitle>
              <CardDescription>Dónde están concentrados los equipos</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfigUbicacion} className="h-64 w-full">
                <BarChart data={data.por_ubicacion}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="ubicacion"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}