import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorCarga } from '@/components/error-carga'
import { clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
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
import { PasswordGeneradaDialog } from '@/components/password-generada-dialog'
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  ROLES,
  type Usuario,
  type UsuarioConPassword,
} from '@/api/usuarios'
import { listarAreas, type Area } from '@/api/areas'
import { listarEmpresas, type Empresa } from '@/api/empresas'
import { SearchInput } from '@/components/search-input'
import { coincide } from '@/lib/normalizar-texto'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [credencialesGeneradas, setCredencialesGeneradas] = useState<UsuarioConPassword | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargarUsuarios = async () => {
    setLoading(true)
    setErrorCarga(null)
    try {
      const [usuariosData, areasData, empresasData] = await Promise.all([
        listarUsuarios(),
        listarAreas(),
        listarEmpresas(),
      ])
      setUsuarios(usuariosData)
      setAreas(areasData)
      setEmpresas(empresasData)
    } catch (err) {
      setErrorCarga(clasificarErrorCarga(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      coincide(u.username, busqueda) ||
      coincide(u.nombre_completo, busqueda) ||
      coincide(u.area_nombre, busqueda),
  )

  const abrirCrear = () => {
    setUsuarioEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (usuario: Usuario) => {
    setUsuarioEditando(usuario)
    setDialogOpen(true)
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

      <SearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por usuario, nombre o área..."
      />

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={cargarUsuarios} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Usuario</TableHead>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Rol</TableHead>
              <TableHead className="h-9 text-xs">Área</TableHead>
              <TableHead className="h-9 text-xs">Empresa</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
              <TableHead className="h-9 w-16 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && usuariosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda
                    ? 'No se encontraron usuarios con ese criterio.'
                    : 'No hay usuarios todavía.'}
                </TableCell>
              </TableRow>
            )}

            {usuariosFiltrados.map((u) => (
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
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {u.area_nombre || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {u.empresa_nombre || '—'}
                </TableCell>
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
                    title="Editar"
                  >
                    <Pencil className="size-3.5" />
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
        empresas={empresas}
        onSubmitCrear={async (payload) => {
          try {
            const creado = await crearUsuario(payload)
            toast.success('Usuario creado')
            await cargarUsuarios()
            if (creado.password_generada) {
              setCredencialesGeneradas(creado)
            }
          } catch (err: any) {
            const data = err?.response?.data
            const mensaje = data?.username?.[0] || 'Error al crear usuario'
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

      {credencialesGeneradas && (
        <PasswordGeneradaDialog
          open={!!credencialesGeneradas}
          onOpenChange={(open) => !open && setCredencialesGeneradas(null)}
          username={credencialesGeneradas.username}
          password={credencialesGeneradas.password_generada!}
        />
      )}
    </div>
  )
}