export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function coincide(campo: string | null | undefined, busqueda: string): boolean {
  if (!busqueda) return true
  if (!campo) return false
  return normalizarTexto(campo).includes(normalizarTexto(busqueda))
}