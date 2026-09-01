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
import type { Proveedor, ProveedorInput } from '@/api/proveedores'

interface ProveedorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proveedor: Proveedor | null
  onSubmit: (payload: ProveedorInput) => Promise<void>
}

const valoresVacios: ProveedorInput = { nombre: '', ruc: '', contacto: '' }

export function ProveedorDialog({
  open,
  onOpenChange,
  proveedor,
  onSubmit,
}: ProveedorDialogProps) {
  const [form, setForm] = useState<ProveedorInput>(valoresVacios)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (open) {
      if (proveedor) {
        setForm({
          nombre: proveedor.nombre,
          ruc: proveedor.ruc,
          contacto: proveedor.contacto,
        })
      } else {
        setForm(valoresVacios)
      }
      setErrors({})
    }
  }, [open, proveedor])

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!form.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!form.ruc.trim()) {
      newErrors.ruc = 'El RUC es requerido'
    } else if (!/^\d{13}$/.test(form.ruc)) {
      newErrors.ruc = 'El RUC debe tener exactamente 13 dígitos'
    }

    if (!form.contacto.trim()) {
      newErrors.contacto = 'El contacto es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      await onSubmit({
        nombre: form.nombre.trim(),
        ruc: form.ruc.trim(),
        contacto: form.contacto.trim(),
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
            <DialogDescription>
              Registra los datos del proveedor con su información de contacto.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => {
                  setForm((f) => ({ ...f, nombre: e.target.value }))
                  if (errors.nombre) setErrors((err) => ({ ...err, nombre: '' }))
                }}
                required
                autoFocus
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && <p className="text-sm text-red-500">{errors.nombre}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ruc">RUC</Label>
              <Input
                id="ruc"
                value={form.ruc}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setForm((f) => ({ ...f, ruc: value }))
                  if (errors.ruc) setErrors((err) => ({ ...err, ruc: '' }))
                }}
                maxLength={13}
                className={errors.ruc ? 'border-red-500' : ''}
              />
              {errors.ruc && <p className="text-sm text-red-500">{errors.ruc}</p>}
              <p className="text-xs text-muted-foreground">13 dígitos sin separadores</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contacto">Contacto</Label>
              <Input
                id="contacto"
                value={form.contacto}
                onChange={(e) => {
                  setForm((f) => ({ ...f, contacto: e.target.value }))
                  if (errors.contacto) setErrors((err) => ({ ...err, contacto: '' }))
                }}
                className={errors.contacto ? 'border-red-500' : ''}
              />
              {errors.contacto && <p className="text-sm text-red-500">{errors.contacto}</p>}
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
