/** Fecha de hoy (AAAA-MM-DD) en la hora LOCAL del usuario.
 *  `new Date().toISOString()` usa UTC: en Ecuador, después de las 19:00 ya daría la fecha de mañana. */
export function hoyLocal(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}
