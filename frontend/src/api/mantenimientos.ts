import { api } from './client'
import type { Pagina } from './paginacion'

export interface Mantenimiento {
  id: string
  activo: string
  activo_nombre: string
  activo_codigo: string
  activo_etiqueta_origen: string
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

export async function listarMantenimientos(
  page: number,
  search: string,
): Promise<Pagina<Mantenimiento>> {
  const { data } = await api.get('/trazabilidad/mantenimientos/', {
    params: { page, ...(search.trim() ? { search: search.trim().slice(0, 100) } : {}) },
  })
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

export async function listarMantenimientosPorActivo(activoId: string): Promise<Mantenimiento[]> {
  const resultados: Mantenimiento[] = []
  let page = 1
  let haySiguiente = true
  while (haySiguiente) {
    const { data } = await api.get<Pagina<Mantenimiento>>('/trazabilidad/mantenimientos/', {
      params: { activo: activoId, page },
    })
    resultados.push(...data.results)
    haySiguiente = data.next !== null
    page += 1
  }
  return resultados
}
