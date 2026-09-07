import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
import { cambiarPassword } from '@/api/perfil'

interface CambiarPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CambiarPasswordDialog({ open, onOpenChange }: CambiarPasswordDialogProps) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const limpiar = () => {
    setActual('')
    setNueva('')
    setConfirmacion('')
    setError('')
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) limpiar()
    onOpenChange(v)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (nueva !== confirmacion) {
      setError('La nueva contraseña y su confirmación no coinciden')
      return
    }
    if (nueva.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    setSubmitting(true)
    try {
      await cambiarPassword({ password_actual: actual, password_nueva: nueva })
      toast.success('Contraseña actualizada correctamente')
      handleOpenChange(false)
    } catch (err: any) {
      const mensaje = err?.response?.data?.password_actual?.[0]
      setError(mensaje || 'No se pudo cambiar la contraseña')
      toast.error(mensaje || 'No se pudo cambiar la contraseña')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña actual y luego la nueva, dos veces para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="password_actual">Contraseña actual</Label>
              <Input
                id="password_actual"
                type="password"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                required
                autoFocus
                autoComplete="current-password"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password_nueva">Nueva contraseña</Label>
              <Input
                id="password_nueva"
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmacion">Confirma la nueva contraseña</Label>
              <Input
                id="confirmacion"
                type="password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}