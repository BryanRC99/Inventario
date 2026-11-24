import { api } from './client'
import type { Pagina } from './paginacion'

export type TipoEvento =
  | 'creacion'
  | 'asignacion'
  | 'devolucion'
  | 'traslado'
  | 'mantenimiento'
  | 'baja'
  | 'escaneo_validacion'

export interface Movimiento {
  id: string
  activo: string
  activo_nombre: string
  activo_codigo: string
  activo_etiqueta_origen: string
  tipo_evento: TipoEvento
  tipo_evento_display: string
  usuario: string | null
  usuario_username: string | null
  fecha_hora: string
  ubicacion_origen: string | null
  ubicacion_origen_nombre: string | null
  ubicacion_destino: string | null
  ubicacion_destino_nombre: string | null
  observaciones: string
}

export async function listarMovimientos(
  page: number,
  search: string,
): Promise<Pagina<Movimiento>> {
  const { data } = await api.get('/trazabilidad/movimientos/', {
    params: { page, ...(search.trim() ? { search: search.trim().slice(0, 100) } : {}) },
  })
  return data
}
