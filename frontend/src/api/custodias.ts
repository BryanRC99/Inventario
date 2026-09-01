import { api } from './client'

export type TipoCustodia = 'principal' | 'secundario'

export interface Custodia {
  id: string
  activo: string
  activo_nombre: string
  activo_codigo: string
  persona: string | null
  persona_nombre: string | null
  area: string
  fecha_inicio: string
  fecha_fin: string | null
  tipo: TipoCustodia
  activa: boolean
}

export type CustodiaInput = {
  activo: string
  persona: string | null
  area: string
  fecha_inicio: string
  fecha_fin: string | null
  tipo: TipoCustodia
}

export async function listarCustodias(): Promise<Custodia[]> {
  const { data } = await api.get('/custodia/custodias/')
  return data
}

export async function crearCustodia(payload: CustodiaInput): Promise<Custodia> {
  const { data } = await api.post('/custodia/custodias/', payload)
  return data
}

export async function actualizarCustodia(id: string, payload: CustodiaInput): Promise<Custodia> {
  const { data } = await api.put(`/custodia/custodias/${id}/`, payload)
  return data
}

export async function eliminarCustodia(id: string): Promise<void> {
  await api.delete(`/custodia/custodias/${id}/`)
}

export function extraerMensajeError(err: any): string {
  const data = err?.response?.data
  if (data?.non_field_errors?.[0]) return data.non_field_errors[0]
  if (typeof data === 'string') return data
  return 'Ocurrió un error al guardar la custodia'
}

export async function cerrarCustodia(id: string, fecha_fin: string): Promise<Custodia> {
  const { data } = await api.patch(`/custodia/custodias/${id}/`, { fecha_fin })
  return data
}