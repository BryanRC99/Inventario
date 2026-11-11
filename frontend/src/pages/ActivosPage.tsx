import { useEffect, useRef, useState } from 'react'
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
  listarActivosPagina,
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
  TAMANO_PAGINA_ACTIVOS,
} from '@/api/activos'
import { listarCategorias, type Categoria } from '@/api/categorias'
import { listarUbicaciones, type Ubicacion } from '@/api/ubicaciones'
import { listarProveedores, type Proveedor } from '@/api/proveedores'
import { listarEmpresas, type Empresa } from '@/api/empresas'
import { obtenerEtiquetasLotePdf } from '@/api/activos'
import { SearchInput } from '@/components/search-input'
import { MultiSelectFilter } from '@/components/multi-select-filter'
import { mensajeErrorApi, clasificarErrorCarga, type ErrorCarga as ErrorCargaTipo } from '@/lib/errores-api'
import { ErrorCarga } from '@/components/error-carga'
import { useAuth } from '@/context/AuthContext'
import { listarUsuarios, type Usuario } from '@/api/usuarios'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

const BADGE_POR_ESTADO: Record<EstadoActivo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  activo: 'default',
  en_mantenimiento: 'secondary',
  dado_de_baja: 'outline',
  extraviado: 'destructive',
}

export default function ActivosPage() {
  const { usuario } = useAuth()
  const [activos, setActivos] = useState<Activo[]>([])
  const [totalActivos, setTotalActivos] = useState(0)
  const [pagina, setPagina] = useState(1)
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
  const [fCreador, setFCreador] = useState('admin')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const catalogosCargados = useRef(false)

  // Admin filtra por cualquier empresa; los demás solo por las suyas (y solo si tienen varias).
  const empresasFiltro = usuario?.rol === 'admin' ? empresas : (usuario?.empresas ?? [])
  const esAdmin = usuario?.rol === 'admin'
  const hayFiltros = fEmpresa.length + fCategoria.length + fUbicacion.length + fEstado.length > 0 || (esAdmin && fCreador !== 'todos')
  const filtrosServidor: FiltrosActivos = {
    empresa: fEmpresa,
    categoria: fCategoria,
    ubicacion: fUbicacion,
    estado: fEstado as EstadoActivo[],
    search: busqueda,
    ...(esAdmin ? { creador: fCreador } : {}),
  }
  // Los reportes usan exactamente los mismos filtros que la tabla (+ la búsqueda de texto).
  const filtrosReporte: FiltrosActivos = { ...filtrosServidor, search: busqueda }

  const limpiarFiltros = () => {
    setFEmpresa([])
    setFCategoria([])
    setFUbicacion([])
    setFEstado([])
    setFCreador('todos')
    setPagina(1)
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
      const [paginaActivos, catalogos] = await Promise.all([
        listarActivosPagina(filtrosServidor, pagina),
        catalogosCargados.current
          ? Promise.resolve(null)
          : Promise.all([
              listarCategorias(),
              listarUbicaciones(),
              listarProveedores(),
              listarEmpresas(),
              esAdmin ? listarUsuarios().catch(() => []) : Promise.resolve([] as Usuario[]),
            ]),
      ])
      setActivos(paginaActivos.results)
      setTotalActivos(paginaActivos.count)
      if (catalogos) {
        const [categoriasData, ubicacionesData, proveedoresData, empresasData, usuariosData] = catalogos
        setCategorias(categoriasData)
        setUbicaciones(ubicacionesData)
        setProveedores(proveedoresData)
        setEmpresas(empresasData)
        setUsuarios(usuariosData)
        catalogosCargados.current = true
      }
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
  const claveFiltros = JSON.stringify([fEmpresa, fCategoria, fUbicacion, fEstado, esAdmin, fCreador, busqueda, pagina])
  useEffect(() => {
    cargarTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFiltros])

  const activosFiltrados = activos
  const totalPaginas = Math.max(1, Math.ceil(totalActivos / TAMANO_PAGINA_ACTIVOS))
  const paginaInicio = totalActivos === 0 ? 0 : (pagina - 1) * TAMANO_PAGINA_ACTIVOS + 1
  const paginaFin = Math.min(pagina * TAMANO_PAGINA_ACTIVOS, totalActivos)
  const paginasVisibles = [...new Set([1, pagina - 1, pagina, pagina + 1, totalPaginas])]
    .filter((p) => p >= 1 && p <= totalPaginas)
    .sort((a, b) => a - b)

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
      toast.error(await mensajeErrorApi(err, 'Ocurrió un error al guardar el activo.'))
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
    const todosSeleccionados = activosFiltrados.length > 0 && activosFiltrados.every((a) => seleccionados.has(a.id))
    if (todosSeleccionados) {
      setSeleccionados((prev) => {
        const next = new Set(prev)
        activosFiltrados.forEach((a) => next.delete(a.id))
        return next
      })
    } else {
      setSeleccionados((prev) => new Set([...prev, ...activosFiltrados.map((a) => a.id)]))
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
          onChange={(value) => { setBusqueda(value); setPagina(1) }}
          placeholder="Buscar por código, nombre, modelo, serie..."
        />
        {empresasFiltro.length > 1 && (
          <MultiSelectFilter
            titulo="Empresa"
            opciones={empresasFiltro.map((e) => ({ value: e.id, label: e.nombre }))}
            seleccion={fEmpresa}
            onChange={(value) => { setFEmpresa(value); setPagina(1) }}
          />
        )}
        {esAdmin && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Creador</span>
            <Select value={fCreador} onValueChange={(v) => { setFCreador(v ?? 'todos'); setPagina(1) }}>
              <SelectTrigger className="h-8 w-52 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administradores (Sistemas)</SelectItem>
                <SelectItem value="operador">Operadores</SelectItem>
                <SelectItem value="consulta">Usuarios de consulta</SelectItem>
                <SelectItem value="todos">Todos los creadores</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={`usuario:${u.id}`}>
                    {u.nombre_completo || u.username} ({u.rol})
                  </SelectItem>
                ))}
                <SelectItem value="sin_creador">Sin creador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <MultiSelectFilter
          titulo="Categoría"
          opciones={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
          seleccion={fCategoria}
          onChange={(value) => { setFCategoria(value); setPagina(1) }}
        />
        <MultiSelectFilter
          titulo="Ubicación"
          opciones={ubicaciones.map((u) => ({ value: u.id, label: u.nombre }))}
          seleccion={fUbicacion}
          onChange={(value) => { setFUbicacion(value); setPagina(1) }}
        />
        <MultiSelectFilter
          titulo="Estado"
          opciones={ESTADOS_ACTIVO}
          seleccion={fEstado}
          onChange={(value) => { setFEstado(value); setPagina(1) }}
        />
        {hayFiltros && (
          <Button size="sm" variant="ghost" onClick={limpiarFiltros}>
            <FilterX className="size-3.5" />
            Limpiar filtros
          </Button>
        )}
        {!loading && (hayFiltros || busqueda) && (
          <span className="text-xs text-muted-foreground">{totalActivos} resultado(s)</span>
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
                  checked={activosFiltrados.length > 0 && activosFiltrados.every((a) => seleccionados.has(a.id))}
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
                <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}

            {!loading && activosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">
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
                  {activo.estado !== 'dado_de_baja' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => abrirEditar(activo)}
                      title="Editar"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!loading && totalActivos > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Mostrando {paginaInicio}–{paginaFin} de {totalActivos}
          </span>
          {totalPaginas > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} />
                </PaginationItem>
                {paginasVisibles.flatMap((p, index) => [
                  ...(index > 0 && p - paginasVisibles[index - 1] > 1
                    ? [<PaginationItem key={`ellipsis-${p}`}><PaginationEllipsis /></PaginationItem>]
                    : []),
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === pagina} onClick={() => setPagina(p)}>{p}</PaginationLink>
                  </PaginationItem>,
                ])}
                <PaginationItem>
                  <PaginationNext onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

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
