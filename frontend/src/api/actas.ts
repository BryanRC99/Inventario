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