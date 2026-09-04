import { api } from './client'

export type Rol = 'admin' | 'operador' | 'consulta'

export interface Usuario {
  id: string
  username: string
  first_name: string
  last_name: string
  nombre_completo: string
  email: string
  rol: Rol
  area: string | null
  area_nombre: string | null
  is_active: boolean
  date_joined: string
}

export type UsuarioCreateInput = {
  username: string
  first_name: string
  last_name: string
  email: string
  rol: Rol
  area: string | null
  password: string
}

export type UsuarioUpdateInput = {
  first_name: string
  last_name: string
  email: string
  rol: Rol
  area: string | null
  is_active: boolean
}

export const ROLES: { value: Rol; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operador', label: 'Operador' },
  { value: 'consulta', label: 'Consulta' },
]

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get('/auth/usuarios/')
  return data
}

export async function crearUsuario(payload: UsuarioCreateInput): Promise<Usuario> {
  const { data } = await api.post('/auth/usuarios/', payload)
  return data
}

export async function actualizarUsuario(
  id: string,
  payload: UsuarioUpdateInput,
): Promise<Usuario> {
  const { data } = await api.patch(`/auth/usuarios/${id}/`, payload)
  return data
}

export async function eliminarUsuario(id: string): Promise<void> {
  await api.delete(`/auth/usuarios/${id}/`)
}