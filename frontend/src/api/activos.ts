import { api } from './client'

export type EstadoActivo = 'activo' | 'en_mantenimiento' | 'dado_de_baja' | 'extraviado'

export interface Activo {
  id: string
  codigo_interno: string
  categoria: string
  categoria_nombre: string
  nombre: string
  numero_serie: string
  marca: string
  modelo: string
  fecha_adquisicion: string | null
  valor_adquisicion: string | null
  proveedor: string | null
  proveedor_nombre: string | null
  fecha_fin_garantia: string | null
  estado: EstadoActivo
  estado_display: string
  ubicacion: string
  ubicacion_nombre: string
  especificaciones: Record<string, unknown> | null
  creado_por: string | null
  fecha_creacion: string
}

export type ActivoInput = {
  codigo_interno: string
  categoria: string
  nombre: string
  numero_serie: string
  marca: string
  modelo: string
  fecha_adquisicion: string | null
  valor_adquisicion: string | null
  proveedor: string | null
  fecha_fin_garantia: string | null
  estado: EstadoActivo
  ubicacion: string
  especificaciones: Record<string, unknown> | null
}

export const ESTADOS_ACTIVO: { value: EstadoActivo; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'en_mantenimiento', label: 'En mantenimiento' },
  { value: 'dado_de_baja', label: 'Dado de baja' },
  { value: 'extraviado', label: 'Extraviado' },
]

export async function listarActivos(): Promise<Activo[]> {
  const { data } = await api.get('/inventario/activos/')
  return data
}

export async function crearActivo(payload: ActivoInput): Promise<Activo> {
  const { data } = await api.post('/inventario/activos/', payload)
  return data
}

export async function actualizarActivo(id: string, payload: ActivoInput): Promise<Activo> {
  const { data } = await api.put(`/inventario/activos/${id}/`, payload)
  return data
}

export async function eliminarActivo(id: string): Promise<void> {
  await api.delete(`/inventario/activos/${id}/`)
}