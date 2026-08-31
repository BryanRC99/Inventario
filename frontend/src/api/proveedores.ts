import { api } from './client'

export interface Proveedor {
  id: string
  nombre: string
  ruc: string
  contacto: string
}

export type ProveedorInput = {
  nombre: string
  ruc: string
  contacto: string
}

export async function listarProveedores(): Promise<Proveedor[]> {
  const { data } = await api.get('/proveedores/proveedores/')
  return data
}

export async function crearProveedor(payload: ProveedorInput): Promise<Proveedor> {
  const { data } = await api.post('/proveedores/proveedores/', payload)
  return data
}

export async function actualizarProveedor(
  id: string,
  payload: ProveedorInput,
): Promise<Proveedor> {
  const { data } = await api.put(`/proveedores/proveedores/${id}/`, payload)
  return data
}

export async function eliminarProveedor(id: string): Promise<void> {
  await api.delete(`/proveedores/proveedores/${id}/`)
}