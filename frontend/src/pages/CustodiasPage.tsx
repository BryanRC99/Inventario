import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CustodiaDetailDialog } from '@/components/custodia-detail-dialog'
import { FinalizarCustodiaDialog } from '@/components/finalizar-custodia-dialog'
import { cerrarCustodia } from '@/api/custodias'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CustodiaDialog } from '@/components/custodia-dialog'
import {
  listarCustodias,
  crearCustodia,
  actualizarCustodia,
  eliminarCustodia,
  extraerMensajeError,
  type Custodia,
  type CustodiaInput,
} from '@/api/custodias'
import { listarActivos, type Activo } from '@/api/activos'
import { listarPersonas, type Persona } from '@/api/personas'
import { ActaDialog } from '@/components/acta-dialog'
import { crearActa } from '@/api/actas'
import { listarAreas, type Area } from '@/api/areas'

export default function CustodiasPage() {
  const [custodias, setCustodias] = useState<Custodia[]>([])
  const [activos, setActivos] = useState<Activo[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [custodiaEditando, setCustodiaEditando] = useState<Custodia | null>(null)
  const [custodiaParaActa, setCustodiaParaActa] = useState<Custodia | null>(null)
  const [custodiaDetalle, setCustodiaDetalle] = useState<Custodia | null>(null)
  const [custodiaAFinalizar, setCustodiaAFinalizar] = useState<Custodia | null>(null)
  const [reasignandoActivoId, setReasignandoActivoId] = useState<string | null>(null)
  const [areas, setAreas] = useState<Area[]>([])

  const cargarTodo = async () => {
    setLoading(true)
    try {
      const [custodiasData, activosData, personasData, areasData] = await Promise.all([
        listarCustodias(),
        listarActivos(),
        listarPersonas(),
        listarAreas(),
      ])
      setCustodias(custodiasData)
      setActivos(activosData)
      setPersonas(personasData)
      setAreas(areasData)
    } catch {
      toast.error('No se pudieron cargar las custodias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const abrirCrear = () => {
    setCustodiaEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (custodia: Custodia) => {
    setCustodiaEditando(custodia)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: CustodiaInput) => {
    const esNueva = !custodiaEditando

    try {
      if (custodiaEditando) {
        await actualizarCustodia(custodiaEditando.id, payload)
        toast.success('Custodia actualizada')
      } else {
        const creada = await crearCustodia(payload)
        toast.success('Custodia creada')

        if (esNueva && creada.persona) {
          setCustodiaParaActa(creada)
        }
      }
      await cargarTodo()
    } catch (err) {
      toast.error(extraerMensajeError(err))
      throw err
    }
  }

  const handleEliminar = async (custodia: Custodia) => {
    const titular = custodia.persona_nombre || custodia.area_nombre
    if (!confirm(`¿Eliminar la custodia de "${custodia.activo_nombre}" a "${titular}"?`)) return
    try {
      await eliminarCustodia(custodia.id)
      toast.success('Custodia eliminada')
      await cargarTodo()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('No tienes permiso para eliminar custodias')
      } else {
        toast.error('No se pudo eliminar la custodia')
      }
    }
  }

  const handleFinalizar = async (fechaFin: string) => {
    if (!custodiaAFinalizar) return
    try {
      await cerrarCustodia(custodiaAFinalizar.id, fechaFin)
      toast.success('Custodia finalizada')
      await cargarTodo()
    } catch {
      toast.error('No se pudo finalizar la custodia')
    }
  }

  const handleReasignar = async (custodia: Custodia) => {
    const hoy = new Date().toISOString().slice(0, 10)
    try {
      // Cierra la custodia actual antes de abrir el formulario de la
      // nueva, así el activo queda libre y no choca con la regla de
      // custodio único al crear la siguiente.
      await cerrarCustodia(custodia.id, hoy)
      toast.success('Custodia anterior cerrada, asigna al nuevo custodio')
      await cargarTodo()
      setCustodiaEditando(null)
      setReasignandoActivoId(custodia.activo)
      setDialogOpen(true)
    } catch {
      toast.error('No se pudo cerrar la custodia actual')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Custodias</h1>
          <p className="text-sm text-muted-foreground">Historial de asignaciones de activos</p>
        </div>
        <Button size="sm" onClick={abrirCrear}>
          <Plus className="size-3.5" />
          Nueva custodia
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 text-xs">Activo</TableHead>
              <TableHead className="h-9 text-xs">Custodio</TableHead>
              <TableHead className="h-9 text-xs">Desde</TableHead>
              <TableHead className="h-9 text-xs">Hasta</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
              <TableHead className="h-9 w-20 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && custodias.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  No hay custodias todavía.
                </TableCell>
              </TableRow>
            )}

            {custodias.map((custodia) => (
              <TableRow key={custodia.id}>
                <TableCell className="py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">
                    {custodia.activo_codigo}
                  </span>{' '}
                  {custodia.activo_nombre}
                </TableCell>
                <TableCell className="py-2 text-sm font-medium">
                  {custodia.persona_nombre || custodia.area_nombre}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {custodia.fecha_inicio}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {custodia.fecha_fin || '—'}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={custodia.activa ? 'default' : 'secondary'} className="text-xs">
                    {custodia.activa ? 'Activa' : 'Finalizada'}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setCustodiaDetalle(custodia)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  {custodia.activa && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setCustodiaAFinalizar(custodia)}
                        title="Finalizar custodia"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleReasignar(custodia)}
                        title="Reasignar a otro custodio"
                      >
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(custodia)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEliminar(custodia)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CustodiaDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setReasignandoActivoId(null)
        }}
        custodia={custodiaEditando}
        activoInicial={reasignandoActivoId ?? undefined}
        activos={activos}
        personas={personas}
        areas={areas}
        onSubmit={handleSubmit}
      />

      <FinalizarCustodiaDialog
        open={!!custodiaAFinalizar}
        onOpenChange={(open) => !open && setCustodiaAFinalizar(null)}
        custodia={custodiaAFinalizar}
        onConfirm={handleFinalizar}
      />

      {custodiaParaActa && (
        <ActaDialog
          open={!!custodiaParaActa}
          onOpenChange={(open) => !open && setCustodiaParaActa(null)}
          activoId={custodiaParaActa.activo}
          activoNombre={custodiaParaActa.activo_nombre}
          activoCodigo={custodiaParaActa.activo_codigo}
          personaId={custodiaParaActa.persona!}
          personaNombre={custodiaParaActa.persona_nombre!}
          custodiaId={custodiaParaActa.id}
          onSubmit={async (payload) => {
            const acta = await crearActa(payload)
            toast.success('Acta generada')
            if (acta.pdf) {
              window.open(acta.pdf, '_blank')
            }
          }}
          onSkip={() => setCustodiaParaActa(null)}
        />
      )}

      <CustodiaDetailDialog
        open={!!custodiaDetalle}
        onOpenChange={(open) => !open && setCustodiaDetalle(null)}
        custodia={custodiaDetalle}
      />
    </div>
  )
}