import { useEffect, useState, type FormEvent } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ROLES, type Rol, type Usuario } from '@/api/usuarios'
import type { Area } from '@/api/areas'

interface UsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario: Usuario | null
  areas: Area[]
  onSubmitCrear: (payload: {
    username: string
    first_name: string
    last_name: string
    email: string
    rol: Rol
    area: string | null
    password: string
  }) => Promise<void>
  onSubmitEditar: (payload: {
    first_name: string
    last_name: string
    email: string
    rol: Rol
    area: string | null
    is_active: boolean
  }) => Promise<void>
}

const vacioCrear = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  rol: 'operador' as Rol,
  area: null as string | null,
  password: '',
}

export function UsuarioDialog({
  open,
  onOpenChange,
  usuario,
  areas,
  onSubmitCrear,
  onSubmitEditar,
}: UsuarioDialogProps) {
  const [form, setForm] = useState(vacioCrear)
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (usuario) {
        setForm({
          username: usuario.username,
          first_name: usuario.first_name,
          last_name: usuario.last_name,
          email: usuario.email,
          rol: usuario.rol,
          area: usuario.area,
          password: '',
        })
        setIsActive(usuario.is_active)
      } else {
        setForm(vacioCrear)
        setIsActive(true)
      }
    }
  }, [open, usuario])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const areaSeleccionada = areas.find((a) => a.id === form.area)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (usuario) {
        await onSubmitEditar({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          rol: form.rol,
          area: form.area,
          is_active: isActive,
        })
      } else {
        await onSubmitCrear(form)
      }
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{usuario ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
            <DialogDescription>
              {usuario
                ? 'El nombre de usuario no se puede cambiar. La contraseña se resetea aparte.'
                : 'Define las credenciales y el rol del nuevo usuario del sistema.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                required
                disabled={!!usuario}
                autoFocus={!usuario}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="first_name">Nombres</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rol">Rol</Label>
              <Select value={form.rol} onValueChange={(v) => set('rol', v as Rol)}>
                <SelectTrigger id="rol" className="w-full">
                  <SelectValue>{ROLES.find((r) => r.value === form.rol)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area">Área</Label>
              <Select
                value={form.area ?? 'none'}
                onValueChange={(v) => set('area', v === 'none' ? null : v)}
              >
                <SelectTrigger id="area" className="w-full">
                  <SelectValue placeholder="Sin área">
                    {areaSeleccionada?.nombre ?? (form.area ? undefined : 'Sin área')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin área</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!usuario && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}

            {usuario && (
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <Label htmlFor="is_active" className="font-normal">
                  Usuario activo
                </Label>
                <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
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