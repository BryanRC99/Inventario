import { api } from './client'

export interface Area {
  id: string
  nombre: string
  descripcion: string
}

export type AreaInput = {
  nombre: string
  descripcion: string
}

export async function listarAreas(): Promise<Area[]> {
  const { data } = await api.get('/areas/areas/')
  return data
}

export async function crearArea(payload: AreaInput): Promise<Area> {
  const { data } = await api.post('/areas/areas/', payload)
  return data
}

export async function actualizarArea(id: string, payload: AreaInput): Promise<Area> {
  const { data } = await api.put(`/areas/areas/${id}/`, payload)
  return data
}

export async function eliminarArea(id: string): Promise<void> {
  await api.delete(`/areas/areas/${id}/`)
}