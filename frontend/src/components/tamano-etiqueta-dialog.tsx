import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface TamanoEtiquetaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cantidad: number
  onConfirm: (tamano: 'normal' | 'pequena') => Promise<void>
}

export function TamanoEtiquetaDialog({ open, onOpenChange, cantidad, onConfirm }: TamanoEtiquetaDialogProps) {
  const [tamano, setTamano] = useState<'normal' | 'pequena'>('normal')
  const [generando, setGenerando] = useState(false)

  const handleConfirm = async () => {
    setGenerando(true)
    try {
      await onConfirm(tamano)
      onOpenChange(false)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Imprimir {cantidad > 1 ? `${cantidad} etiquetas` : 'etiqueta'}</DialogTitle>
          <DialogDescription>Elige el tamaño según el espacio disponible en el equipo.</DialogDescription>
        </DialogHeader>

        <RadioGroup value={tamano} onValueChange={(v) => setTamano(v as 'normal' | 'pequena')} className="gap-3 py-2">
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <RadioGroupItem value="normal" id="tamano-normal" />
            <Label htmlFor="tamano-normal" className="flex-1 font-normal">
              <span className="block font-medium">Normal (50 x 25 mm)</span>
              <span className="text-xs text-muted-foreground">QR + código + nombre + logo</span>
            </Label>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <RadioGroupItem value="pequena" id="tamano-pequena" />
            <Label htmlFor="tamano-pequena" className="flex-1 font-normal">
              <span className="block font-medium">Pequeña (30 x 15 mm)</span>
              <span className="text-xs text-muted-foreground">
                Solo QR + código. Ideal para mouse, teclados, accesorios.
              </span>
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={generando}>
            {generando ? 'Generando...' : 'Generar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}