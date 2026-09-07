import { useEffect, useState, type FormEvent } from 'react'
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
import { useAuth } from '@/context/AuthContext'
import { actualizarPerfil } from '@/api/perfil'

interface PerfilDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PerfilDialog({ open, onOpenChange }: PerfilDialogProps) {
  const { usuario, refrescarUsuario } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && usuario) {
      setFirstName(usuario.first_name ?? '')
      setLastName(usuario.last_name ?? '')
      setEmail(usuario.email ?? '')
      setError('')
    }
  }, [open, usuario])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await actualizarPerfil({ first_name: firstName, last_name: lastName, email })
      await refrescarUsuario()
      toast.success('Perfil actualizado correctamente')
      onOpenChange(false)
    } catch {
      setError('No se pudo actualizar el perfil')
      toast.error('No se pudo actualizar el perfil')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mi perfil</DialogTitle>
            <DialogDescription>
              Usuario: <span className="font-mono">{usuario?.username}</span> · Rol:{' '}
              <span className="capitalize">{usuario?.rol}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="first_name">Nombres</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}