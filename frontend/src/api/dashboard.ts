import { api } from './client'

export interface DashboardData {
  total_activos: number
  custodias_activas: number
  en_mantenimiento: number
  garantias_por_vencer: number
  por_estado: { estado: string; label: string; total: number }[]
  por_categoria: { categoria: string; total: number }[]
  por_ubicacion: { ubicacion: string; total: number }[]
}

export async function obtenerDashboard(): Promise<DashboardData> {
  const { data } = await api.get('/inventario/dashboard/')
  return data
}