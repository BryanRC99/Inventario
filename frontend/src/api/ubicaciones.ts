import { api } from './client'

export type TipoUbicacion = 'sede' | 'piso' | 'oficina' | 'bodega'

export interface Ubicacion {
  id: string
  nombre: string
  tipo: TipoUbicacion
  ubicacion_padre: string | null
  ubicacion_padre_nombre: string | null
}

export type UbicacionInput = {
  nombre: string
  tipo: TipoUbicacion
  ubicacion_padre: string | null
}

export const TIPOS_UBICACION: { value: TipoUbicacion; label: string }[] = [
  { value: 'sede', label: 'Sede' },
  { value: 'piso', label: 'Piso' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'bodega', label: 'Bodega' },
]

export async function listarUbicaciones(): Promise<Ubicacion[]> {
  const { data } = await api.get('/inventario/ubicaciones/')
  return data
}

export async function crearUbicacion(payload: UbicacionInput): Promise<Ubicacion> {
  const { data } = await api.post('/inventario/ubicaciones/', payload)
  return data
}

export async function actualizarUbicacion(
  id: string,
  payload: UbicacionInput,
): Promise<Ubicacion> {
  const { data } = await api.put(`/inventario/ubicaciones/${id}/`, payload)
  return data
}

export async function eliminarUbicacion(id: string): Promise<void> {
  await api.delete(`/inventario/ubicaciones/${id}/`)
}