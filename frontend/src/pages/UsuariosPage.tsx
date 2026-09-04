import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UsuarioDialog } from '@/components/usuario-dialog'
import { useAuth } from '@/context/AuthContext'
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  ROLES,
  type Usuario,
} from '@/api/usuarios'
import { listarAreas, type Area } from '@/api/areas'

export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [areas, setAreas] = useState<Area[]>([])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const [usuariosData, areasData] = await Promise.all([listarUsuarios(), listarAreas()])
      setUsuarios(usuariosData)
      setAreas(areasData)
    } catch {
      toast.error('No se pudieron cargar los usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const abrirCrear = () => {
    setUsuarioEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario)
    setDialogOpen(true)
  }

  const handleEliminar = async (usuario: Usuario) => {
    if (usuario.id === usuarioActual?.id) {
      toast.error('No puedes eliminar tu propio usuario')
      return
    }
    if (!confirm(`¿Eliminar al usuario "${usuario.username}"?`)) return
    try {
      await eliminarUsuario(usuario.id)
      toast.success('Usuario eliminado')
      await cargarUsuarios()
    } catch {
      toast.error('No se pudo eliminar el usuario')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Cuentas de acceso al sistema</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nuevo usuario
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Usuario</TableHead>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Rol</TableHead>
              <TableHead className="h-9 text-xs">Área</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
              <TableHead className="h-9 w-20 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No hay usuarios todavía.
                </TableCell>
              </TableRow>
            )}

            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="py-2 text-sm font-mono">{u.username}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {u.nombre_completo}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {ROLES.find((r) => r.value === u.rol)?.label ?? u.rol}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{u.area_nombre || '—'}</TableCell>
                <TableCell className="py-2">
                  <Badge variant={u.is_active ? 'default' : 'secondary'} className="text-xs">
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(u)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(u)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UsuarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        usuario={usuarioEditando}
        areas={areas}
        onSubmitCrear={async (payload) => {
          try {
            await crearUsuario(payload)
            toast.success('Usuario creado')
            await cargarUsuarios()
          } catch (err: any) {
            const data = err?.response?.data
            const mensaje = data?.username?.[0] || data?.password?.[0] || 'Error al crear usuario'
            toast.error(mensaje)
            throw err
          }
        }}
        onSubmitEditar={async (payload) => {
          if (!usuarioEditando) return
          try {
            await actualizarUsuario(usuarioEditando.id, payload)
            toast.success('Usuario actualizado')
            await cargarUsuarios()
          } catch {
            toast.error('Error al actualizar usuario')
            throw new Error('actualizar_fallo')
          }
        }}
      />
    </div>
  )
}