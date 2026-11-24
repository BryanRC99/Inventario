export const TAMANO_PAGINA_HISTORIAL = 20

export interface Pagina<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
