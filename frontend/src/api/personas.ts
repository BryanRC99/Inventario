import { api } from './client'

export interface Persona {
  id: string
  nombres: string
  apellidos: string
  nombre_completo: string
  documento: string
  cargo: string
  area: string | null
  area_nombre: string | null
  email: string
}

export type PersonaInput = {
  nombres: string
  apellidos: string
  documento: string
  cargo: string
  area: string | null
  email: string
}

export async function listarPersonas(): Promise<Persona[]> {
  const { data } = await api.get('/personas/personas/')
  return data
}

export async function crearPersona(payload: PersonaInput): Promise<Persona> {
  const { data } = await api.post('/personas/personas/', payload)
  return data
}

export async function actualizarPersona(id: string, payload: PersonaInput): Promise<Persona> {
  const { data } = await api.put(`/personas/personas/${id}/`, payload)
  return data
}

export async function eliminarPersona(id: string): Promise<void> {
  await api.delete(`/personas/personas/${id}/`)
}