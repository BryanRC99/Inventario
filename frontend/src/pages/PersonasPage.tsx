import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PersonaDialog } from '@/components/persona-dialog'
import {
  listarPersonas,
  crearPersona,
  actualizarPersona,
  eliminarPersona,
  type Persona,
  type PersonaInput,
} from '@/api/personas'

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [personaEditando, setPersonaEditando] = useState<Persona | null>(null)

  const cargarPersonas = async () => {
    setLoading(true)
    try {
      setPersonas(await listarPersonas())
    } catch {
      toast.error('No se pudieron cargar las personas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarPersonas()
  }, [])

  const abrirCrear = () => {
    setPersonaEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (persona: Persona) => {
    setPersonaEditando(persona)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: PersonaInput) => {
    try {
      if (personaEditando) {
        await actualizarPersona(personaEditando.id, payload)
        toast.success('Persona actualizada')
      } else {
        await crearPersona(payload)
        toast.success('Persona creada')
      }
      await cargarPersonas()
    } catch {
      toast.error('Ocurrió un error al guardar. Revisa que el documento no esté repetido.')
    }
  }

  const handleEliminar = async (persona: Persona) => {
    if (!confirm(`¿Eliminar a "${persona.nombre_completo}"?`)) return
    try {
      await eliminarPersona(persona.id)
      toast.success('Persona eliminada')
      await cargarPersonas()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar personas')
      } else {
        toast.error('No se pudo eliminar. Puede que tenga custodias asociadas.')
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Custodios</h1>
          <p className="text-sm text-muted-foreground">Personas que pueden tener activos asignados</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nueva persona
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Documento</TableHead>
              <TableHead className="h-9 text-xs">Cargo</TableHead>
              <TableHead className="h-9 text-xs">Área</TableHead>
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

            {!loading && personas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No hay personas todavía. Crea la primera.
                </TableCell>
              </TableRow>
            )}

            {personas.map((persona) => (
              <TableRow key={persona.id}>
                <TableCell className="py-2 text-sm font-medium">{persona.nombre_completo}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{persona.documento}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{persona.cargo || '—'}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{persona.area || '—'}</TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(persona)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(persona)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PersonaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        persona={personaEditando}
        onSubmit={handleSubmit}
      />
    </div>
  )
}