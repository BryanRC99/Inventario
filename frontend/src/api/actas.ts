import { api } from './client'
import { toast } from 'sonner'

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
  entregado_por_nombre: string
  recibido_por_nombre: string
  pdf: string | null
  observaciones: string
  generado_por: string | null
  /** Cantidad de escaneos activos (copia firmada y digitalizada). 0 = pendiente de escaneo. */
  escaneos_count: number
}

export interface ActaEscaneo {
  id: string
  nombre_original: string
  tipo_contenido: string
  tamano: number
  sha256: string
  subido_por_nombre: string | null
  fecha_subida: string
  eliminado: boolean
  eliminado_por_nombre: string | null
  fecha_eliminacion: string | null
  motivo_eliminacion: string
}

/** Límites que también valida el servidor (que es quien manda). */
export const ESCANEO_MAX_MB = 10
export const ESCANEO_MAX_ARCHIVOS = 10
export const ESCANEO_TIPOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png']

export type ActaEntregaInput = {
  activo: string
  persona: string
  custodia: string | null
  fecha: string
  tipo: TipoActa
  entregado_por_nombre: string
  recibido_por_nombre: string
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

/** Obtiene el PDF autenticado y lo abre sin exponer una URL pública de media. */
export async function abrirPdfActa(actaId: string): Promise<void> {
  const ventana = window.open('about:blank', '_blank')
  if (ventana) {
    ventana.document.title = 'Cargando acta'
    ventana.document.body.textContent = 'Cargando acta…'
  }

  try {
    const { data } = await api.get<Blob>(`/actas/actas/${actaId}/pdf/`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    if (ventana) {
      ventana.location.href = url
    } else {
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.target = '_blank'
      enlace.rel = 'noopener'
      enlace.click()
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
  } catch {
    ventana?.close()
    toast.error('No se pudo abrir el PDF. Verifica tu sesión y vuelve a intentarlo.')
  }
}

export async function listarActasPorCustodia(custodiaId: string): Promise<ActaEntrega[]> {
  const { data } = await api.get('/actas/actas/', { params: { custodia: custodiaId } })
  return data
}

export async function listarActasPorActivoAsignado(activoId: string): Promise<ActaEntrega[]> {
  const { data } = await api.get('/actas/actas/', { params: { activo: activoId } })
  return data
}

export async function listarEscaneos(actaId: string, incluirEliminados = false): Promise<ActaEscaneo[]> {
  const { data } = await api.get(`/actas/actas/${actaId}/escaneos/`, {
    params: incluirEliminados ? { incluir_eliminados: 1 } : undefined,
  })
  return data
}

export async function subirEscaneos(
  actaId: string,
  archivos: File[],
  onProgreso?: (porcentaje: number) => void,
): Promise<ActaEscaneo[]> {
  const formData = new FormData()
  archivos.forEach((a) => formData.append('archivos', a))
  const { data } = await api.post(`/actas/actas/${actaId}/escaneos/`, formData, {
    onUploadProgress: (e) => {
      if (onProgreso && e.total) onProgreso(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

/** El archivo solo sale con sesión válida: se pide con el token y se muestra como blob (sin URL pública). */
export async function obtenerArchivoEscaneo(actaId: string, escaneoId: string): Promise<Blob> {
  const { data } = await api.get(`/actas/actas/${actaId}/escaneos/${escaneoId}/archivo/`, {
    responseType: 'blob',
  })
  return data
}

export async function eliminarEscaneo(actaId: string, escaneoId: string, motivo: string): Promise<ActaEscaneo> {
  const { data } = await api.delete(`/actas/actas/${actaId}/escaneos/${escaneoId}/`, { data: { motivo } })
  return data
}

export async function restaurarEscaneo(actaId: string, escaneoId: string): Promise<ActaEscaneo> {
  const { data } = await api.post(`/actas/actas/${actaId}/escaneos/${escaneoId}/restaurar/`)
  return data
}
