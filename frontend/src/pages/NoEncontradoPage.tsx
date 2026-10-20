import { AccionesNavegacion } from '@/components/acciones-error'
import { PantallaError } from '@/components/pantalla-error'

export default function NoEncontradoPage() {
  return (
    <PantallaError tipo="404">
      <AccionesNavegacion />
    </PantallaError>
  )
}
