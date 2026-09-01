import { api } from './client'

export interface Mantenimiento {
  id: string
  activo: string
  activo_nombre: string
  activo_codigo: string
  proveedor: string | null
  proveedor_nombre: string | null
  fecha: string
  costo: string | null
  descripcion_problema: string
  repuestos_usados: string
  proxima_fecha_programada: string | null
}

export type MantenimientoInput = {
  activo: string
  proveedor: string | null
  fecha: string
  costo: string | null
  descripcion_problema: string
  repuestos_usados: string
  proxima_fecha_programada: string | null
}

export async function listarMantenimientos(): Promise<Mantenimiento[]> {
  const { data } = await api.get('/trazabilidad/mantenimientos/')
  return data
}

export async function crearMantenimiento(payload: MantenimientoInput): Promise<Mantenimiento> {
  const { data } = await api.post('/trazabilidad/mantenimientos/', payload)
  return data
}

export async function actualizarMantenimiento(
  id: string,
  payload: MantenimientoInput,
): Promise<Mantenimiento> {
  const { data } = await api.put(`/trazabilidad/mantenimientos/${id}/`, payload)
  return data
}

export async function eliminarMantenimiento(id: string): Promise<void> {
  await api.delete(`/trazabilidad/mantenimientos/${id}/`)
}