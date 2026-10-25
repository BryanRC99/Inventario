import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EscaneosActaDialog } from '@/components/acta-escaneos-dialog'
import type { ActaEntrega } from '@/api/actas'

interface BotonEscaneosProps {
  acta: ActaEntrega
  /** Avisa a la pantalla que lo usa cuando cambia la cantidad de escaneos del acta. */
  onConteo?: (actaId: string, cantidad: number) => void
  /** Solo ícono (para tablas). */
  compacto?: boolean
}

/** Botón "Escaneo (n)" que abre el visor/gestor de escaneos del acta firmada. */
export function BotonEscaneos({ acta, onConteo, compacto }: BotonEscaneosProps) {
  const [abierto, setAbierto] = useState(false)
  const base = acta.escaneos_count ?? 0
  // Conteo corregido por el diálogo (subidas/eliminaciones). Si el acta se vuelve a cargar con otro valor, manda el nuevo.
  const [local, setLocal] = useState<{ base: number; valor: number } | null>(null)
  const conteo = local && local.base === base ? local.valor : base

  const texto = conteo > 0 ? `Escaneo (${conteo})` : 'Subir escaneo'

  return (
    <>
      {compacto ? (
        <Button
          variant="ghost"
          size="icon"
          className="relative size-7"
          title={conteo > 0 ? `Ver acta escaneada (${conteo})` : 'Subir acta escaneada'}
          onClick={() => setAbierto(true)}
        >
          <ScanLine className="size-3.5" />
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="h-7" onClick={() => setAbierto(true)}>
          <ScanLine className="size-3.5" />
          {texto}
        </Button>
      )}
      {abierto && (
        <EscaneosActaDialog
          acta={acta}
          open
          onOpenChange={setAbierto}
          onConteo={(n) => {
            setLocal({ base, valor: n })
            onConteo?.(acta.id, n)
          }}
        />
      )}
    </>
  )
}
