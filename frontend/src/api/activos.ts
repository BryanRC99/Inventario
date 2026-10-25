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
  empresa: string | null
  empresa_nombre: string | null
  especificaciones: Record<string, unknown> | null
  creado_por: string | null
  fecha_creacion: string
  motivo_baja: string
  fecha_baja: string | null
}

export type ActivoInput = {
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
  empresa: string | null
  especificaciones: Record<string, unknown> | null
}

export interface FilaValidacion {
  fila: number
  valido: boolean
  errores: string[]
  datos_mostrar: {
    nombre: string
    categoria: string
    ubicacion: string
    marca: string
    modelo: string
  }
}

export interface ResultadoValidacion {
  total: number
  validas: number
  invalidas: number
  filas: FilaValidacion[]
}

export interface ResultadoImportacion {
  creados: number
  errores: { fila: number; errores: string[] }[]
}

export const ESTADOS_ACTIVO: { value: EstadoActivo; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'en_mantenimiento', label: 'En mantenimiento' },
  { value: 'dado_de_baja', label: 'Dado de baja' },
  { value: 'extraviado', label: 'Extraviado' },
]

export interface FiltrosActivos {
  empresa?: string[]
  categoria?: string[]
  ubicacion?: string[]
  estado?: EstadoActivo[]
  search?: string
}

// Repite la clave por valor (estado=a&estado=b), que es lo que espera django-filter.
const serializarFiltros = { indexes: null as null }

function limpiarFiltros(filtros: FiltrosActivos = {}) {
  const params: Record<string, string | string[]> = {}
  for (const clave of ['empresa', 'categoria', 'ubicacion', 'estado'] as const) {
    const valores = filtros[clave]
    if (valores && valores.length > 0) params[clave] = valores
  }
  const search = filtros.search?.trim()
  if (search) params.search = search.slice(0, 100)
  return params
}

export async function listarActivos(filtros?: FiltrosActivos): Promise<Activo[]> {
  const { data } = await api.get('/inventario/activos/', {
    params: limpiarFiltros(filtros),
    paramsSerializer: serializarFiltros,
  })
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

export async function obtenerEtiquetaPdf(activoId: string, tamano: 'normal' | 'pequena' = 'normal'): Promise<Blob> {
  const { data } = await api.get(`/inventario/activos/${activoId}/etiqueta/`, {
    params: { tamano },
    responseType: 'blob',
  })
  return data
}

export async function obtenerEtiquetasLotePdf(ids: string[], tamano: 'normal' | 'pequena' = 'normal'): Promise<Blob> {
  const { data } = await api.post(
    '/inventario/activos/etiquetas_lote/',
    { ids, tamano },
    { responseType: 'blob' },
  )
  return data
}

export async function darDeBajaActivo(id: string, motivo: string): Promise<Activo> {
  const { data } = await api.post(`/inventario/activos/${id}/dar_de_baja/`, { motivo })
  return data
}

export async function descargarPlantillaActivos(): Promise<Blob> {
  const { data } = await api.get('/inventario/activos/plantilla_importacion/', {
    responseType: 'blob',
  })
  return data
}

export async function validarImportacionActivos(archivo: File): Promise<ResultadoValidacion> {
  const formData = new FormData()
  formData.append('archivo', archivo)
  const { data } = await api.post('/inventario/activos/validar_importacion/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function confirmarImportacionActivos(
  archivo: File,
  empresaId?: string,
): Promise<ResultadoImportacion> {
  const formData = new FormData()
  formData.append('archivo', archivo)
  if (empresaId) formData.append('empresa', empresaId)
  const { data } = await api.post('/inventario/activos/confirmar_importacion/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function descargarReporteExcel(filtros?: FiltrosActivos): Promise<Blob> {
  const { data } = await api.get('/inventario/activos/reporte_excel/', {
    params: limpiarFiltros(filtros),
    paramsSerializer: serializarFiltros,
    responseType: 'blob',
  })
  return data
}

export async function descargarReportePdf(filtros?: FiltrosActivos): Promise<Blob> {
  const { data } = await api.get('/inventario/activos/reporte_pdf/', {
    params: limpiarFiltros(filtros),
    paramsSerializer: serializarFiltros,
    responseType: 'blob',
  })
  return data
}