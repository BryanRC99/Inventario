import { api } from './client'

export interface Empresa {
  id: string
  nombre: string
  descripcion: string
  logo_filename: string
}

export type EmpresaInput = {
  nombre: string
  descripcion: string
  logo_filename: string
}

export async function listarEmpresas(): Promise<Empresa[]> {
  const { data } = await api.get('/empresas/empresas/')
  return data
}

export async function crearEmpresa(payload: EmpresaInput): Promise<Empresa> {
  const { data } = await api.post('/empresas/empresas/', payload)
  return data
}

export async function actualizarEmpresa(id: string, payload: EmpresaInput): Promise<Empresa> {
  const { data } = await api.put(`/empresas/empresas/${id}/`, payload)
  return data
}

export async function eliminarEmpresa(id: string): Promise<void> {
  await api.delete(`/empresas/empresas/${id}/`)
}

