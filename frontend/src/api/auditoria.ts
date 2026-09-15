import { api } from './client'

export type AccionAuditoria =
  | 'crear'
  | 'editar'
  | 'eliminar'
  | 'login'
  | 'login_fallido'
  | 'logout'

export interface CambioCampo {
  antes: string | null
  despues: string | null
}

export interface RegistroAuditoria {
  id: string
  usuario: string | null
  usuario_username: string
  accion: AccionAuditoria
  accion_display: string
  modelo: string
  objeto_id: string
  objeto_repr: string
  cambios: Record<string, CambioCampo> | null
  ip_address: string | null
  user_agent: string
  fecha_hora: string
}

export interface FiltrosAuditoria {
  accion?: string
  modelo?: string
  usuario_username?: string
  fecha_hora_after?: string
  fecha_hora_before?: string
}

export const ACCIONES: { value: AccionAuditoria; label: string }[] = [
  { value: 'crear', label: 'Creación' },
  { value: 'editar', label: 'Edición' },
  { value: 'eliminar', label: 'Eliminación' },
  { value: 'login', label: 'Inicio de sesión' },
  { value: 'login_fallido', label: 'Login fallido' },
  { value: 'logout', label: 'Cierre de sesión' },
]

export const MODELOS: string[] = [
  'Activo',
  'Categoria',
  'Ubicacion',
  'Custodia',
  'Persona',
  'Usuario',
  'Proveedor',
  'Area',
  'ActaEntrega',
  'Mantenimiento',
]

export async function listarAuditoria(filtros: FiltrosAuditoria): Promise<RegistroAuditoria[]> {
  const params: Record<string, string> = {}
  Object.entries(filtros).forEach(([k, v]) => {
    if (v) params[k] = v
  })
  const { data } = await api.get('/auditoria/registros/', { params })
  return data
}