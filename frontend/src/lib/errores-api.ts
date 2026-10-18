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
