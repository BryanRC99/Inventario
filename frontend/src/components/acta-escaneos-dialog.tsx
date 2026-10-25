import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  Camera,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import {
  ESCANEO_MAX_ARCHIVOS,
  ESCANEO_MAX_MB,
  ESCANEO_TIPOS_ACEPTADOS,
  eliminarEscaneo,
  listarEscaneos,
  obtenerArchivoEscaneo,
  restaurarEscaneo,
  subirEscaneos,
  type ActaEntrega,
  type ActaEscaneo,
} from '@/api/actas'
import { clasificarErrorCarga, mensajeErrorApi, type ErrorCarga } from '@/lib/errores-api'
import { PantallaError } from '@/components/pantalla-error'

const ACEPTA = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png'
const ZOOM_MIN = 0.5
const ZOOM_MAX = 4

function formatearTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })
}

function mostrarErrores(titulo: string, lineas: string[]) {
  toast.error(titulo, {
    description: (
      <ul className="mt-1 list-disc pl-4">
        {lineas.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    ),
    duration: 9000,
  })
}

/* ------------------------------------------------------------------ */
/* Visor de imagen: ajusta al ancho, con zoom y rotación               */
/* ------------------------------------------------------------------ */
function VisorImagen({ url, nombre, zoom, rotacion }: { url: string; nombre: string; zoom: number; rotacion: number }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const observador = new ResizeObserver(() => setAncho(el.clientWidth))
    observador.observe(el)
    setAncho(el.clientWidth)
    return () => observador.disconnect()
  }, [])

  const base = Math.max(ancho - 24, 120) * zoom // ancho visual de la imagen
  const girada = rotacion % 180 !== 0
  let w = 0
  let h = 0
  if (natural) {
    if (girada) {
      h = base // al girar 90°, el ancho visual es el alto original
      w = (h * natural.w) / natural.h
    } else {
      w = base
      h = (w * natural.h) / natural.w
    }
  }
  const cajaAncho = girada ? h : w
  const cajaAlto = girada ? w : h

  return (
    <div ref={contenedor} className="h-full w-full overflow-auto rounded-md border bg-muted/40 p-3">
      <div className="relative mx-auto" style={natural ? { width: cajaAncho, height: cajaAlto } : undefined}>
        <img
          src={url}
          alt={nombre}
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className={natural ? 'absolute top-1/2 left-1/2 max-w-none' : 'mx-auto max-h-full'}
          style={
            natural
              ? { width: w, height: h, transform: `translate(-50%, -50%) rotate(${rotacion}deg)` }
              : undefined
          }
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Visor de un escaneo (carga el archivo con la sesión del usuario)    */
/* ------------------------------------------------------------------ */
function VisorEscaneo({
  escaneo,
  obtenerUrl,
}: {
  escaneo: ActaEscaneo
  obtenerUrl: (e: ActaEscaneo) => Promise<string>
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [intento, setIntento] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotacion, setRotacion] = useState(0)

  const esImagen = escaneo.tipo_contenido.startsWith('image/')

  useEffect(() => {
    let vigente = true
    setUrl(null)
    setError(null)
    setCargando(true)
    setZoom(1)
    setRotacion(0)
    obtenerUrl(escaneo)
      .then((u) => vigente && setUrl(u))
      .catch(async (err) => {
        const mensaje = await mensajeErrorApi(err, 'No se pudo abrir el archivo.')
        if (vigente) setError(mensaje)
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escaneo.id, intento])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        {esImagen && url && (
          <>
            <Button size="icon" variant="outline" className="size-8" title="Alejar"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.25).toFixed(2)))} disabled={zoom <= ZOOM_MIN}>
              <ZoomOut className="size-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 min-w-14 tabular-nums" title="Ajustar al ancho"
              onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)}%
            </Button>
            <Button size="icon" variant="outline" className="size-8" title="Acercar"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.25).toFixed(2)))} disabled={zoom >= ZOOM_MAX}>
              <ZoomIn className="size-4" />
            </Button>
            <Button size="icon" variant="outline" className="ml-2 size-8" title="Girar a la izquierda"
              onClick={() => setRotacion((r) => (r + 270) % 360)}>
              <RotateCcw className="size-4" />
            </Button>
            <Button size="icon" variant="outline" className="size-8" title="Girar a la derecha"
              onClick={() => setRotacion((r) => (r + 90) % 360)}>
              <RotateCw className="size-4" />
            </Button>
          </>
        )}
        {url && !esImagen && (
          // Algunos navegadores (sobre todo en celulares) no muestran un PDF dentro de un recuadro:
          // abrirlo en su propia pestaña funciona en todos.
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            Abrir en pestaña nueva
          </a>
        )}
        {url && (
          <a
            href={url}
            download={escaneo.nombre_original}
            className={`${esImagen ? 'ml-auto ' : ''}inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted`}
          >
            <Download className="size-3.5" />
            Descargar
          </a>
        )}
      </div>

      <div className="h-[52vh] min-h-64 lg:h-[58vh]">
        {cargando && (
          <div className="flex h-full items-center justify-center gap-2 rounded-md border text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando archivo...
          </div>
        )}
        {error && (
          <div className="h-full overflow-auto rounded-md border">
            <PantallaError tipo="error" titulo="No se pudo abrir el archivo" mensaje={error} compacto>
              <Button size="sm" onClick={() => setIntento((n) => n + 1)}>
                Reintentar
              </Button>
            </PantallaError>
          </div>
        )}
        {url && esImagen && <VisorImagen url={url} nombre={escaneo.nombre_original} zoom={zoom} rotacion={rotacion} />}
        {url && !esImagen && (
          <iframe src={url} title={escaneo.nombre_original} className="h-full w-full rounded-md border bg-background" />
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          Subido por {escaneo.subido_por_nombre ?? 'un usuario eliminado'} · {formatearFecha(escaneo.fecha_subida)} ·{' '}
          {formatearTamano(escaneo.tamano)}
        </p>
        <p title={escaneo.sha256} className="font-mono">
          Huella SHA-256: {escaneo.sha256.slice(0, 16)}…
        </p>
        {escaneo.eliminado && (
          <p className="mt-1 text-destructive">
            Eliminado por {escaneo.eliminado_por_nombre ?? 'un usuario'}
            {escaneo.fecha_eliminacion ? ` el ${formatearFecha(escaneo.fecha_eliminacion)}` : ''}: {escaneo.motivo_eliminacion}
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Diálogo principal                                                   */
/* ------------------------------------------------------------------ */
interface Props {
  acta: ActaEntrega
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama con la cantidad de escaneos activos cada vez que cambia. */
  onConteo?: (cantidad: number) => void
}

export function EscaneosActaDialog({ acta, open, onOpenChange, onConteo }: Props) {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'
  const puedeSubir = esAdmin || usuario?.rol === 'operador'

  const [escaneos, setEscaneos] = useState<ActaEscaneo[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<ErrorCarga | null>(null)
  const [verEliminados, setVerEliminados] = useState(false)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const [paraEliminar, setParaEliminar] = useState<ActaEscaneo | null>(null)
  const [motivo, setMotivo] = useState('')
  const [eliminando, setEliminando] = useState(false)

  const entradaArchivos = useRef<HTMLInputElement>(null)
  const entradaCamara = useRef<HTMLInputElement>(null)
  const cache = useRef(new Map<string, string>()) // id del escaneo -> URL temporal (blob)

  const limpiarCache = useCallback(() => {
    cache.current.forEach((u) => URL.revokeObjectURL(u))
    cache.current.clear()
  }, [])

  useEffect(() => {
    if (!open) limpiarCache()
    return limpiarCache
  }, [open, limpiarCache])

  const obtenerUrl = useCallback(
    async (e: ActaEscaneo) => {
      const guardada = cache.current.get(e.id)
      if (guardada) return guardada
      const blob = await obtenerArchivoEscaneo(acta.id, e.id)
      const url = URL.createObjectURL(new Blob([blob], { type: e.tipo_contenido }))
      cache.current.set(e.id, url)
      return url
    },
    [acta.id],
  )

  const cargar = useCallback(
    async (preferido?: string) => {
      setCargando(true)
      setErrorCarga(null)
      try {
        const lista = await listarEscaneos(acta.id, verEliminados)
        setEscaneos(lista)
        onConteo?.(lista.filter((e) => !e.eliminado).length)
        setSeleccionadoId((actual) => {
          const buscado = preferido ?? actual
          if (buscado && lista.some((e) => e.id === buscado)) return buscado
          return (lista.find((e) => !e.eliminado) ?? lista[0])?.id ?? null
        })
      } catch (err) {
        setErrorCarga(clasificarErrorCarga(err))
      } finally {
        setCargando(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acta.id, verEliminados],
  )

  useEffect(() => {
    if (open) cargar()
  }, [open, cargar])

  const activos = escaneos.filter((e) => !e.eliminado).length
  const seleccionado = escaneos.find((e) => e.id === seleccionadoId) ?? null

  const procesarArchivos = async (lista: File[]) => {
    if (!puedeSubir || lista.length === 0 || subiendo) return

    // Mismas reglas que el servidor, para avisar al instante. El servidor sigue siendo quien decide.
    const problemas: string[] = []
    const validos: File[] = []
    const vistos = new Set<string>()
    for (const f of lista) {
      const clave = `${f.name}|${f.size}|${f.lastModified}`
      if (vistos.has(clave)) {
        problemas.push(`"${f.name}": está repetido en la selección.`)
        continue
      }
      vistos.add(clave)
      const formatoValido = ESCANEO_TIPOS_ACEPTADOS.includes(f.type) || /\.(pdf|jpe?g|png)$/i.test(f.name)
      if (!formatoValido) problemas.push(`"${f.name}": formato no permitido (solo PDF, JPG o PNG).`)
      else if (f.size === 0) problemas.push(`"${f.name}": el archivo está vacío.`)
      else if (f.size > ESCANEO_MAX_MB * 1024 * 1024)
        problemas.push(`"${f.name}": supera el tamaño máximo de ${ESCANEO_MAX_MB} MB (pesa ${formatearTamano(f.size)}).`)
      else validos.push(f)
    }
    if (activos + lista.length > ESCANEO_MAX_ARCHIVOS) {
      problemas.push(
        `Un acta admite hasta ${ESCANEO_MAX_ARCHIVOS} archivos y esta ya tiene ${activos}; intentas agregar ${lista.length}.`,
      )
    }
    if (problemas.length > 0) {
      mostrarErrores('No se subió ningún archivo', [...problemas, 'Corrige la selección e inténtalo de nuevo.'])
      return
    }

    setSubiendo(true)
    setProgreso(0)
    try {
      const creados = await subirEscaneos(acta.id, validos, setProgreso)
      toast.success(creados.length === 1 ? 'Archivo subido correctamente' : `${creados.length} archivos subidos correctamente`)
      await cargar(creados[0]?.id)
    } catch (err) {
      const datos = (err as { response?: { data?: { archivos?: unknown } } })?.response?.data
      if (Array.isArray(datos?.archivos)) {
        mostrarErrores('No se pudo subir', datos.archivos.map(String))
      } else {
        toast.error(await mensajeErrorApi(err, 'No se pudo subir el archivo. Inténtalo de nuevo.'))
      }
    } finally {
      setSubiendo(false)
    }
  }

  const alElegir = (e: ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? [])
    e.target.value = '' // permite volver a elegir el mismo archivo
    void procesarArchivos(archivos)
  }

  const alSoltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setArrastrando(false)
    void procesarArchivos(Array.from(e.dataTransfer.files))
  }

  const confirmarEliminar = async () => {
    if (!paraEliminar) return
    const texto = motivo.trim()
    if (texto.length < 5) {
      toast.error('Indica el motivo de la eliminación (mínimo 5 caracteres).')
      return
    }
    setEliminando(true)
    try {
      await eliminarEscaneo(acta.id, paraEliminar.id, texto)
      toast.success('Archivo eliminado. Sigue guardado en el servidor y un administrador puede restaurarlo.')
      setParaEliminar(null)
      setMotivo('')
      await cargar()
    } catch (err) {
      toast.error(await mensajeErrorApi(err, 'No se pudo eliminar el archivo.'))
    } finally {
      setEliminando(false)
    }
  }

  const restaurar = async (e: ActaEscaneo) => {
    try {
      await restaurarEscaneo(acta.id, e.id)
      toast.success('Archivo restaurado')
      await cargar(e.id)
    } catch (err) {
      toast.error(await mensajeErrorApi(err, 'No se pudo restaurar el archivo.'))
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[94vh] flex-col gap-4 overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Acta firmada y escaneada</DialogTitle>
            <DialogDescription>
              {acta.tipo_display} · {acta.activo_codigo} {acta.activo_nombre} · {acta.persona_nombre} · {acta.fecha}
            </DialogDescription>
          </DialogHeader>

          {errorCarga ? (
            <PantallaError tipo={errorCarga.tipo} mensaje={errorCarga.mensaje} compacto>
              {errorCarga.tipo !== '403' && (
                <Button size="sm" onClick={() => cargar()}>
                  Reintentar
                </Button>
              )}
            </PantallaError>
          ) : (
            <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              {/* Columna izquierda: archivos y subida */}
              <div className="flex min-w-0 flex-col gap-3">
                {puedeSubir && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setArrastrando(true)
                    }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={alSoltar}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                      arrastrando ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    {subiendo ? (
                      <div className="flex w-full flex-col items-center gap-2" role="status">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Subiendo... {progreso}%</p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary transition-all" style={{ width: `${progreso}%` }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="size-5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Arrastra aquí el acta firmada, o elige los archivos.
                          <br />
                          PDF, JPG o PNG · máx. {ESCANEO_MAX_MB} MB c/u · hasta {ESCANEO_MAX_ARCHIVOS} por acta
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button size="sm" onClick={() => entradaArchivos.current?.click()}>
                            <Upload className="size-3.5" />
                            Elegir archivos
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => entradaCamara.current?.click()}>
                            <Camera className="size-3.5" />
                            Tomar foto
                          </Button>
                        </div>
                      </>
                    )}
                    <input ref={entradaArchivos} type="file" multiple accept={ACEPTA} className="hidden" onChange={alElegir} />
                    <input ref={entradaCamara} type="file" accept="image/*" capture="environment" className="hidden" onChange={alElegir} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Archivos <span className="text-muted-foreground">({activos})</span>
                  </p>
                  {esAdmin && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="ver-eliminados" className="text-xs font-normal text-muted-foreground">
                        Ver eliminados
                      </Label>
                      <Switch id="ver-eliminados" checked={verEliminados} onCheckedChange={setVerEliminados} />
                    </div>
                  )}
                </div>

                <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto lg:max-h-[46vh]">
                  {cargando && escaneos.length === 0 && (
                    <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Cargando...
                    </p>
                  )}
                  {!cargando && escaneos.length === 0 && (
                    <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      {puedeSubir
                        ? 'Esta acta aún no tiene respaldo digital. Escanea o fotografía el documento firmado y súbelo aquí: así tendrás una copia si el papel se pierde.'
                        : 'Todavía no se ha cargado el escaneo de esta acta.'}
                    </p>
                  )}
                  {escaneos.map((e) => {
                    const activo = e.id === seleccionadoId
                    const Icono = e.tipo_contenido.startsWith('image/') ? ImageIcon : FileText
                    return (
                      <div
                        key={e.id}
                        className={`flex items-center gap-1 rounded-md border pr-1 ${activo ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSeleccionadoId(e.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
                        >
                          <Icono className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm ${e.eliminado ? 'line-through opacity-60' : ''}`}>
                              {e.nombre_original}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatearTamano(e.tamano)} · {formatearFecha(e.fecha_subida)}
                            </span>
                          </span>
                          {e.eliminado && (
                            <Badge variant="destructive" className="text-[10px]">
                              Eliminado
                            </Badge>
                          )}
                        </button>
                        {esAdmin && !e.eliminado && (
                          <Button size="icon" variant="ghost" className="size-7" title="Eliminar"
                            onClick={() => { setParaEliminar(e); setMotivo('') }}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                        {esAdmin && e.eliminado && (
                          <Button size="icon" variant="ghost" className="size-7" title="Restaurar"
                            onClick={() => restaurar(e)}>
                            <Undo2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Columna derecha: vista previa */}
              <div className="flex min-h-64 min-w-0 flex-col">
                {seleccionado ? (
                  <VisorEscaneo escaneo={seleccionado} obtenerUrl={obtenerUrl} />
                ) : (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-sm text-muted-foreground">
                    <FileText className="size-8 opacity-50" />
                    {cargando ? 'Cargando...' : 'Selecciona un archivo para previsualizarlo.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!paraEliminar} onOpenChange={(o) => !o && !eliminando && setParaEliminar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar archivo</DialogTitle>
            <DialogDescription>
              "{paraEliminar?.nombre_original}" dejará de mostrarse, pero se conserva en el servidor y puedes restaurarlo
              después. Indica el motivo: queda registrado en la auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo-eliminar">Motivo</Label>
            <Textarea
              id="motivo-eliminar"
              value={motivo}
              maxLength={255}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: se subió el escaneo de otra acta por error"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={eliminando} onClick={() => setParaEliminar(null)}>
              Cancelar
            </Button>
            <Button
              disabled={eliminando || motivo.trim().length < 5}
              onClick={confirmarEliminar}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
