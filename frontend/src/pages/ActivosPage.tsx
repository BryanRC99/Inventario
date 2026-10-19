import { useEffect, useState } from 'react'
import { Plus, Pencil, Eye, Tag, PackageX, Upload, FileSpreadsheet, FileText, FilterX } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ActivoDialog } from '@/components/activo-dialog'
import { ActivoDetailDialog } from '@/components/activo-detail-dialog'
import { DarDeBajaDialog } from '@/components/dar-de-baja-dialog'
import { ImportarActivosDialog } from '@/components/importar-activos-dialog'
import { TamanoEtiquetaDialog } from '@/components/tamano-etiqueta-dialog'
import {
  listarActivos,
  crearActivo,
  actualizarActivo,
  obtenerEtiquetaPdf,
  darDeBajaActivo,
  descargarReporteExcel,
  descargarReportePdf,
  type Activo,
  type ActivoInput,
  type FiltrosActivos,
  ESTADOS_ACTIVO,
  type EstadoActivo,
} from '@/api/activos'
import { listarCategorias, type Categoria } from '@/api/categorias'
import { listarUbicaciones, type Ubicacion } from '@/api/ubicaciones'
import { listarProveedores, type Proveedor } from '@/api/proveedores'
import { listarEmpresas, type Empresa } from '@/api/empresas'
import { obtenerEtiquetasLotePdf } from '@/api/activos'
import { SearchInput } from '@/components/search-input'
import { coincide } from '@/lib/normalizar-texto'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { mensajeErrorApi, clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
import { ErrorCarga } from '@/components/error-carga'

const BADGE_POR_ESTADO: Record<EstadoActivo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  activo: 'default',
  en_mantenimiento: 'secondary',
  dado_de_baja: 'outline',
  extraviado: 'destructive',
}

export default function ActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCargaTipo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activoEditando, setActivoEditando] = useState<Activo | null>(null)
  const [activoDetalle, setActivoDetalle] = useState<Activo | null>(null)
  const [activoParaBaja, setActivoParaBaja] = useState<Activo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [importarOpen, setImportarOpen] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [tamanoDialogOpen, setTamanoDialogOpen] = useState(false)
  const [activoParaEtiqueta, setActivoParaEtiqueta] = useState<Activo | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [fEmpresa, setFEmpresa] = useState<string[]>([])
  const [fCategoria, setFCategoria] = useState<string[]>([])
  const [fUbicacion, setFUbicacion] = useState<string[]>([])
  const [fEstado, setFEstado] = useState<string[]>([])

  const hayFiltros = fEmpresa.length + fCategoria.length + fUbicacion.length + fEstado.length > 0
  const filtrosServidor: FiltrosActivos = {
    empresa: fEmpresa,
    categoria: fCategoria,
    ubicacion: fUbicacion,
    estado: fEstado as EstadoActivo[],
  }
  // Los reportes usan exactamente los mismos filtros que la tabla (+ la búsqueda de texto).
  const filtrosReporte: FiltrosActivos = { ...filtrosServidor, search: busqueda }

  const limpiarFiltros = () => {
    setFEmpresa([])
    setFCategoria([])
    setFUbicacion([])
    setFEstado([])
  }

  const handleExportarExcel = async () => {
    try {
      const blob = await descargarReporteExcel(filtrosReporte)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = hayFiltros || busqueda.trim() ? 'reporte_activos_filtrado.xlsx' : 'reporte_activos.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(await mensajeErrorApi(err, 'No se pudo generar el reporte Excel.'))
    }
  }

  const handleExportarPdf = async () => {
    try {
      const blob = await descargarReportePdf(filtrosReporte)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      toast.error(await mensajeErrorApi(err, 'No se pudo generar el reporte PDF.'))
    }
  }

  const cargarTodo = async () => {
    setLoading(true)
    setErrorCarga(null)
    try {
      const [activosData, categoriasData, ubicacionesData, proveedoresData, empresasData] = await Promise.all([
        listarActivos(filtrosServidor),
        listarCategorias(),
        listarUbicaciones(),
        listarProveedores(),
        listarEmpresas(),
      ])
      setActivos(activosData)
      setCategorias(categoriasData)
      setUbicaciones(ubicacionesData)
      setProveedores(proveedoresData)
      setEmpresas(empresasData)
    } catch (err) {
      // Un 400 es un filtro inválido (mensaje claro en toast); el resto es un fallo de carga.
      if ((err as { response?: { status?: number } })?.response?.status === 400) {
        toast.error(await mensajeErrorApi(err, 'Los filtros seleccionados no son válidos.'))
      } else {
        setErrorCarga(clasificarErrorCarga(err))
      }
    } finally {
      setLoading(false)
    }
  }

  // Recarga al montar y cada vez que cambia un filtro.
  const claveFiltros = JSON.stringify([fEmpresa, fCategoria, fUbicacion, fEstado])
  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFiltros])

  const activosFiltrados = activos.filter(
    (a) =>
      coincide(a.codigo_interno, busqueda) ||
      coincide(a.nombre, busqueda) ||
      coincide(a.categoria_nombre, busqueda) ||
      coincide(a.modelo, busqueda) ||
      coincide(a.numero_serie, busqueda) ||
      coincide(a.marca, busqueda),
  )

  const abrirCrear = () => {
    setActivoEditando(null)
    setDialogOpen(true)
  }

  const abrirEditar = (activo: Activo) => {
    setActivoEditando(activo)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: ActivoInput) => {
    try {
      if (activoEditando) {
        await actualizarActivo(activoEditando.id, payload)
        toast.success('Activo actualizado')
      } else {
        await crearActivo(payload)
        toast.success('Activo creado')
      }
      await cargarTodo()
    } catch (err: any) {
      const data = err?.response?.data
      toast.error(data?.empresa?.[0] || data?.detail || 'Ocurrió un error al guardar el activo.')
    }
  }

  const abrirDialogoEtiqueta = (activo: Activo | null) => {
    setActivoParaEtiqueta(activo)
    setTamanoDialogOpen(true)
  }

  const handleGenerarEtiqueta = async (tamano: 'normal' | 'pequena') => {
    try {
      const blob = activoParaEtiqueta
        ? await obtenerEtiquetaPdf(activoParaEtiqueta.id, tamano)
        : await obtenerEtiquetasLotePdf(Array.from(seleccionados), tamano)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      if (!activoParaEtiqueta) setSeleccionados(new Set())
    } catch {
      toast.error('No se pudo generar el PDF de etiquetas')
    }
  }

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === activosFiltrados.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(activosFiltrados.map((a) => a.id)))
    }
  }

  const handleDarDeBaja = async (motivo: string) => {
    if (!activoParaBaja) return
    try {
      await darDeBajaActivo(activoParaBaja.id, motivo)
      toast.success('Activo dado de baja')
      await cargarTodo()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo dar de baja el activo')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Activos</h1>
          <p className="text-sm text-muted-foreground">Equipos registrados en el inventario</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportarExcel}>
            <FileSpreadsheet className="size-3.5" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportarPdf}>
            <FileText className="size-3.5" />
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportarOpen(true)}>
            <Upload className="size-3.5" />
            Importar
          </Button>
          <Button size="sm" onClick={abrirCrear}>
            <Plus className="size-3.5" />
            Nuevo activo
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por código, nombre, modelo, serie..."
        />
        {empresas.length > 1 && (
          <MultiSelectFilter
            titulo="Empresa"
            opciones={empresas.map((e) => ({ value: e.id, label: e.nombre }))}
            seleccion={fEmpresa}
            onChange={setFEmpresa}
          />
        )}
        <MultiSelectFilter
          titulo="Categoría"
          opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
          seleccion={fCategoria}
          onChange={setFCategoria}
        />
        <MultiSelectFilter
          titulo="Ubicación"
          opciones={ubicaciones.map((u) => ({ value: u.id, label: u.nombre }))}
          seleccion={fUbicacion}
          onChange={setFUbicacion}
        />
        <MultiSelectFilter
          titulo="Estado"
          opciones={ESTADOS_ACTIVO}
          seleccion={fEstado}
          onChange={setFEstado}
        />
        {hayFiltros && (
          <Button size="sm" variant="ghost" onClick={limpiarFiltros}>
            <FilterX className="size-3.5" />
            Limpiar filtros
          </Button>
        )}
        {!loading && (hayFiltros || busqueda) && (
          <span className="text-xs text-muted-foreground">{activosFiltrados.length} resultado(s)</span>
        )}
      </div>

      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">{seleccionados.size} seleccionado(s)</span>
          <Button size="sm" variant="outline" onClick={() => abrirDialogoEtiqueta(null)}>
            <Tag className="size-3.5" />
            Imprimir etiquetas
          </Button>
        </div>
      )}

      {errorCarga && <ErrorCarga error={errorCarga} onReintentar={cargarTodo} />}
      <div className={errorCarga ? 'hidden' : 'rounded-md border'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 w-8">
                <Checkbox
                  checked={activosFiltrados.length > 0 && seleccionados.size === activosFiltrados.length}
                  onCheckedChange={toggleSeleccionarTodos}
                />
              </TableHead>
              <TableHead className="h-9 text-xs">Código</TableHead>
              <TableHead className="h-9 text-xs">Nombre</TableHead>
              <TableHead className="h-9 text-xs">Modelo</TableHead>
              <TableHead className="h-9 text-xs">N° Serie</TableHead>
              <TableHead className="h-9 text-xs">Categoría</TableHead>
              <TableHead className="h-9 text-xs">Empresa</TableHead>
              <TableHead className="h-9 text-xs">Ubicación</TableHead>
              <TableHead className="h-9 text-xs">Estado</TableHead>
              <TableHead className="h-9 w-32 text-right text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && activosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                  {busqueda || hayFiltros
                    ? 'No se encontraron activos con esos filtros.'
                    : 'No hay activos todavía. Registra el primero.'}
                </TableCell>
              </TableRow>
            )}

            {activosFiltrados.map((activo) => (
              <TableRow key={activo.id}>
                <TableCell className="py-2">
                  <Checkbox
                    checked={seleccionados.has(activo.id)}
                    onCheckedChange={() => toggleSeleccion(activo.id)}
                  />
                </TableCell>
                <TableCell className="py-2 text-sm font-mono">{activo.codigo_interno}</TableCell>
                <TableCell className="py-2 text-sm font-medium">{activo.nombre}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.modelo || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm font-mono text-muted-foreground">
                  {activo.numero_serie || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.categoria_nombre}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.empresa_nombre || '—'}
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {activo.ubicacion_nombre}
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant={BADGE_POR_ESTADO[activo.estado]} className="text-xs">
                    {activo.estado_display}
                  </Badge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirDialogoEtiqueta(activo)}
                    title="Imprimir etiqueta"
                  >
                    <Tag className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setActivoDetalle(activo)}
                    title="Ver detalle"
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  {activo.estado !== 'dado_de_baja' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setActivoParaBaja(activo)}
                      title="Dar de baja"
                    >
                      <PackageX className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => abrirEditar(activo)}
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

      <ActivoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activo={activoEditando}
        categorias={categorias}
        ubicaciones={ubicaciones}
        proveedores={proveedores}
        empresas={empresas}
        onSubmit={handleSubmit}
      />

      <ActivoDetailDialog
        open={!!activoDetalle}
        onOpenChange={(open) => !open && setActivoDetalle(null)}
        activo={activoDetalle}
      />

      <DarDeBajaDialog
        open={!!activoParaBaja}
        onOpenChange={(open) => !open && setActivoParaBaja(null)}
        activo={activoParaBaja}
        onConfirm={handleDarDeBaja}
      />

      <ImportarActivosDialog
        open={importarOpen}
        onOpenChange={setImportarOpen}
        onImportado={cargarTodo}
      />

      <TamanoEtiquetaDialog
        open={tamanoDialogOpen}
        onOpenChange={setTamanoDialogOpen}
        cantidad={activoParaEtiqueta ? 1 : seleccionados.size}
        onConfirm={handleGenerarEtiqueta}
      />
    </div>
  )
}