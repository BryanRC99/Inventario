import { api } from './client'

export type TipoActa = 'entrega' | 'devolucion' | 'traslado'

export interface ActaEntrega {
  id: string
  activo: string
  activo_nombre: string
  activo_codigo: string
  persona: string
  persona_nombre: string
  custodia: string | null
  fecha: string
  tipo: TipoActa
  tipo_display: string
  pdf: string | null
  observaciones: string
  generado_por: string | null
  /** Cantidad de escaneos activos (respaldo digital del acta firmada). */
  escaneos_activos: number
}

export type ActaEntregaInput = {
  activo: string
  persona: string
  custodia: string | null
  fecha: string
  tipo: TipoActa
  observaciones: string
}

export const TIPOS_ACTA: { value: TipoActa; label: string }[] = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'devolucion', label: 'Devolución' },
  { value: 'traslado', label: 'Traslado' },
]

export async function listarActas(): Promise<ActaEntrega[]> {
  const { data } = await api.get('/actas/actas/')
  return data
}

export async function crearActa(payload: ActaEntregaInput): Promise<ActaEntrega> {
  const { data } = await api.post('/actas/actas/', payload)
  return data
}

export async function listarActasPorCustodia(custodiaId: string): Promise<ActaEntrega[]> {
  const { data } = await api.get('/actas/actas/', { params: { custodia: custodiaId } })
  return data
}

export async function listarActasPorActivoAsignado(activoId: string): Promise<ActaEntrega[]> {
  const { data } = await api.get('/actas/actas/', { params: { activo: activoId } })
  return data
}

// ---------- Escaneos del acta firmada ----------
export interface EscaneoActa {
  id: string
  nombre_original: string
  tipo_contenido: string
  tamano: number
  sha256: string
  fecha_subida: string
  subido_por: string | null
  subido_por_nombre: string | null
}

export const ESCANEO_MAX_BYTES = 10 * 1024 * 1024
export const ESCANEO_MAX_ARCHIVOS = 10
export const ESCANEO_TIPOS = ['application/pdf', 'image/jpeg', 'image/png']

export async function listarEscaneos(actaId: string): Promise<EscaneoActa[]> {
  const { data } = await api.get(`/actas/actas/${actaId}/escaneos/`)
  return data
}

export async function subirEscaneos(actaId: string, archivos: File[]): Promise<EscaneoActa[]> {
  const formData = new FormData()
  archivos.forEach((f) => formData.append('archivos', f))
  const { data } = await api.post(`/actas/actas/${actaId}/escaneos/`, formData)
  return data
}

/** El archivo se pide con la sesión (Bearer) y se muestra como Blob: nunca hay un enlace público. */
export async function obtenerArchivoEscaneo(actaId: string, escaneoId: string): Promise<Blob> {
  const { data } = await api.get(`/actas/actas/${actaId}/escaneos/${escaneoId}/archivo/`, { responseType: 'blob' })
  return data
}

export async function eliminarEscaneo(actaId: string, escaneoId: string, motivo: string): Promise<void> {
  await api.delete(`/actas/actas/${actaId}/escaneos/${escaneoId}/`, { data: { motivo } })
}
