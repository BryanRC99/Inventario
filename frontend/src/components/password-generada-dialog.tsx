import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PasswordGeneradaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  password: string
}

export function PasswordGeneradaDialog({
  open,
  onOpenChange,
  username,
  password,
}: PasswordGeneradaDialogProps) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(password)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cuenta creada</DialogTitle>
          <DialogDescription>
            Copia esta contraseña ahora — no se podrá volver a ver después de cerrar esta ventana.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-2">
            <Label>Usuario</Label>
            <Input value={username} disabled className="font-mono" />
          </div>

          <div className="grid gap-2">
            <Label>Contraseña generada</Label>
            <div className="flex gap-2">
              <Input value={password} disabled className="font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={copiar}>
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Listo, ya la copié</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}