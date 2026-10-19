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
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { ROLES, type Rol, type Usuario } from '@/api/usuarios'
import type { Area } from '@/api/areas'
import type { Empresa } from '@/api/empresas'

interface UsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario: Usuario | null
  areas: Area[]
  empresas: Empresa[]
  onSubmitCrear: (payload: {
    username: string
    first_name: string
    last_name: string
    email: string
    rol: Rol
    area: string | null
    empresa: string | null
    empresas_adicionales: string[]
    sin_restriccion_area: boolean
  }) => Promise<void>
  onSubmitEditar: (payload: {
    first_name: string
    last_name: string
    email: string
    rol: Rol
    area: string | null
    empresa: string | null
    empresas_adicionales: string[]
    sin_restriccion_area: boolean
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
  empresa: null as string | null,
  empresas_adicionales: [] as string[],
  sin_restriccion_area: false,
}

export function UsuarioDialog({
  open,
  onOpenChange,
  usuario,
  areas,
  empresas,
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
          empresa: usuario.empresa,
          empresas_adicionales: usuario.empresas_adicionales ?? [],
          sin_restriccion_area: usuario.sin_restriccion_area ?? false,
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
  const empresaSeleccionada = empresas.find((e) => e.id === form.empresa)

  const esOperador = form.rol === 'operador'
  // La empresa principal ya cuenta: no se ofrece de nuevo como adicional.
  const opcionesAdicionales = empresas
    .filter((e) => e.id !== form.empresa)
    .map((e) => ({ value: e.id, label: e.nombre }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // Solo el Operador usa estos campos; al cambiar de rol se limpian para no dejar permisos huérfanos.
    const alcance = {
      empresas_adicionales: esOperador && form.empresa ? form.empresas_adicionales.filter((id) => id !== form.empresa) : [],
      sin_restriccion_area: esOperador ? form.sin_restriccion_area : false,
    }
    setSubmitting(true)
    try {
      if (usuario) {
        await onSubmitEditar({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          rol: form.rol,
          area: form.area,
          empresa: form.empresa,
          ...alcance,
          is_active: isActive,
        })
      } else {
        await onSubmitCrear({ ...form, ...alcance })
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

            <div className="grid gap-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Select
                value={form.empresa ?? 'none'}
                onValueChange={(v) => set('empresa', v === 'none' ? null : v)}
              >
                <SelectTrigger id="empresa" className="w-full">
                  <SelectValue placeholder="Sin empresa">
                    {empresaSeleccionada?.nombre ?? (form.empresa ? undefined : 'Sin empresa')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin empresa</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {esOperador && (
              <div className="grid gap-3 rounded-lg border p-3 sm:col-span-2">
                <div className="grid gap-1.5">
                  <Label>Otras empresas que administra</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <MultiSelectFilter
                      titulo="Empresas adicionales"
                      opciones={opcionesAdicionales}
                      seleccion={form.empresas_adicionales}
                      onChange={(v) => set('empresas_adicionales', v)}
                    />
                    {opcionesAdicionales.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!form.empresa}
                        onClick={() => set('empresas_adicionales', opcionesAdicionales.map((o) => o.value))}
                      >
                        Todas
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.empresa
                      ? 'Además de su empresa principal, podrá ver y registrar datos en estas.'
                      : 'Primero elige la empresa principal.'}
                  </p>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <Label htmlFor="sin_restriccion_area" className="font-normal">
                      Acceso completo a sus empresas
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ve todo lo de sus empresas, sin limitarse a lo que creó o a lo de su área.
                    </p>
                  </div>
                  <Switch
                    id="sin_restriccion_area"
                    checked={form.sin_restriccion_area}
                    onCheckedChange={(v) => set('sin_restriccion_area', v)}
                  />
                </div>
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