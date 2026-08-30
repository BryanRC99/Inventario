import { api } from './client'

export interface Categoria {
  id: string
  nombre: string
  requiere_custodio_unico: boolean
}

export type CategoriaInput = Omit<Categoria, 'id'>

export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get('/inventario/categorias/')
  return data
}

export async function crearCategoria(payload: CategoriaInput): Promise<Categoria> {
  const { data } = await api.post('/inventario/categorias/', payload)
  return data
}

export async function actualizarCategoria(
  id: string,
  payload: CategoriaInput,
): Promise<Categoria> {
  const { data } = await api.put(`/inventario/categorias/${id}/`, payload)
  return data
}

export async function eliminarCategoria(id: string): Promise<void> {
  await api.delete(`/inventario/categorias/${id}/`)
}