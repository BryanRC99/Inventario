/**
 * Convierte cualquier error de axios en un mensaje claro para el usuario.
 * Soporta cuerpos de error en Blob (descargas de PDF/Excel) y errores de
 * validación por campo de DRF ({ estado: ["..."] }).
 */
const NOMBRES_CAMPO: Record<string, string> = {
  empresa: 'Empresa',
  categoria: 'Categoría',
  ubicacion: 'Ubicación',
  estado: 'Estado',
  search: 'Búsqueda',
}

function aplanar(data: unknown): string[] {
  if (!data) return []
  if (typeof data === 'string') return [data]
  if (Array.isArray(data)) return data.flatMap(aplanar)
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.detail === 'string') return [obj.detail]
    return Object.entries(obj).flatMap(([campo, valor]) =>
      aplanar(valor).map((m) => `${NOMBRES_CAMPO[campo] ?? campo}: ${m}`),
    )
  }
  return []
}

export async function mensajeErrorApi(err: unknown, porDefecto: string): Promise<string> {
  const e = err as { response?: { status?: number; data?: unknown }; code?: string }
  if (!e?.response) {
    return 'No hay conexión con el servidor. Verifica tu red e inténtalo de nuevo.'
  }
  let data = e.response.data
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text())
    } catch {
      data = null
    }
  }
  const mensajes = aplanar(data)
  if (mensajes.length) return mensajes.join(' · ')
  if (e.response.status === 403) return 'No tienes permiso para realizar esta acción.'
  if (e.response.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.'
  return porDefecto
}

export interface ErrorCarga {
  tipo: 'red' | '403' | 'error'
  mensaje?: string
}

/** Clasifica un fallo al cargar datos de una pantalla, para mostrar la pantalla de error adecuada. */
export function clasificarErrorCarga(err: unknown): ErrorCarga {
  const e = err as { response?: { status?: number } }
  if (!e?.response) return { tipo: 'red' }
  const status = e.response.status
  if (status === 403) return { tipo: '403' }
  if (status === 401) return { tipo: 'error', mensaje: 'Su sesión expiró. Inicie sesión nuevamente.' }
  if (status === 404) return { tipo: 'error', mensaje: 'La información solicitada ya no existe o fue movida.' }
  if (status && status >= 500) {
    return { tipo: 'error', mensaje: 'El servidor presentó un problema al procesar la solicitud. Intente nuevamente en unos momentos.' }
  }
  return { tipo: 'error' }
}
