import { api } from './client'

export type PerfilInput = {
  first_name: string
  last_name: string
  email: string
}

export type CambiarPasswordInput = {
  password_actual: string
  password_nueva: string
}

export async function actualizarPerfil(payload: PerfilInput) {
  const { data } = await api.patch('/auth/me/', payload)
  return data
}

export async function cambiarPassword(payload: CambiarPasswordInput) {
  const { data } = await api.post('/auth/cambiar-password/', payload)
  return data
}