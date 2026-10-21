import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Download, FileText, Loader2, RotateCw, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import {
  ESCANEO_MAX_ARCHIVOS,
  ESCANEO_MAX_BYTES,
  ESCANEO_TIPOS,
  eliminarEscaneo,
  listarEscaneos,
  obtenerArchivoEscaneo,
  subirEscaneos,
  type ActaEntrega,
  type EscaneoActa,
} from '@/api/actas'
import { mensajeErrorApi } from '@/lib/errores-api'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  acta: ActaEntrega | null
  /** Se llama tras subir o eliminar, para refrescar el estado de respaldo en la tabla. */
  onCambio?: () => void
}

const formatoTamano = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const formatoFecha = (iso: string) => new Date(iso).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })

export function ActaEscaneosDialog({ open, onOpenChange, acta, onCambio }: Props) {
  const { usuario } = useAuth()
  const puedeSubir = usuario?.rol === 'admin' || usuario?.rol === 'operador'
  const puedeEliminar = usuario?.rol === 'admin'

  const [escaneos, setEscaneos] = useState<EscaneoActa[]>([])
  const [cargando, setCargando] = useState(false)
  const [errorLista, setErrorLista] = useState<string | null>(null)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [cargandoVista, setCargandoVista] = useState(false)
  const [errorVista, setErrorVista] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotacion, setRotacion] = useState(0)
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const inputArchivos = useRef<HTMLInputElement>(null)
  const inputCamara = useRef<HTMLInputElement>(null)

  const actaId = acta?.id
  const actual = escaneos.find((e) => e.id === seleccionado) ?? null

  const cargarLista = useCallback(
    async (seleccionar?: string) => {
      if (!actaId) return
      setCargando(true)
      setErrorLista(null)
      try {
        const lista = await listarEscaneos(actaId)
        setEscaneos(lista)
        setSeleccionado((prev) => seleccionar ?? (lista.some((e) => e.id === prev) ? prev : (lista[0]?.id ?? null)))
      } catch (err) {
        setErrorLista(await mensajeErrorApi(err, 'No se pudieron cargar los escaneos del acta.'))
      } finally {
        setCargando(false)
      }
    },
    [actaId],
  )

  useEffect(() => {
    if (open) {
      setSeleccionado(null)
      setConfirmando(false)
      cargarLista()
    } else {
      setEscaneos([])
    }
  }, [open, cargarLista])

  // Vista previa: se pide el archivo con la sesión y se muestra desde un Blob local.
  useEffect(() => {
    if (!actaId || !actual) {
      setBlobUrl(null)
      return
    }
    let url: string | null = null
    let cancelado = false
    setCargandoVista(true)
    setErrorVista(null)
    setZoom(1)
    setRotacion(0)
    setConfirmando(false)
    obtenerArchivoEscaneo(actaId, actual.id)
      .then((blob) => {
        if (cancelado) return
        url = URL.createObjectURL(new Blob([blob], { type: actual.tipo_contenido }))
        setBlobUrl(url)
      })
      .catch(async (err) => {
        if (!cancelado) {
          setBlobUrl(null)
          setErrorVista(await mensajeErrorApi(err, 'No se pudo cargar la vista previa del archivo.'))
        }
      })
      .finally(() => !cancelado && setCargandoVista(false))
    return () => {
      cancelado = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [actaId, actual?.id, actual?.tipo_contenido]) // eslint-disable-line react-hooks/exhaustive-deps

  const subir = async (archivos: File[]) => {
    if (!actaId || archivos.length === 0) return
    const problemas: string[] = []
    if (escaneos.length + archivos.length > ESCANEO_MAX_ARCHIVOS) {
      problemas.push(`Cada acta admite máximo ${ESCANEO_MAX_ARCHIVOS} archivos. Ya tiene ${escaneos.length}.`)
    }
    for (const f of archivos) {
      if (!ESCANEO_TIPOS.includes(f.type)) problemas.push(`"${f.name}" no es un formato admitido. Use PDF, JPG o PNG.`)
      else if (f.size > ESCANEO_MAX_BYTES) problemas.push(`"${f.name}" pesa ${formatoTamano(f.size)} y el máximo es ${formatoTamano(ESCANEO_MAX_BYTES)}.`)
      else if (f.size === 0) problemas.push(`"${f.name}" está vacío.`)
    }
    if (problemas.length) {
      toast.error(problemas.join(' · '))
      return
    }
    setSubiendo(true)
    try {
      const creados = await subirEscaneos(actaId, archivos)
      toast.success(creados.length === 1 ? 'Escaneo guardado correctamente' : `${creados.length} escaneos guardados correctamente`)
      await cargarLista(creados[0]?.id)
      onCambio?.()
    } catch (err) {
      toast.error(await mensajeErrorApi(err, 'No se pudieron subir los archivos.'))
    } finally {
      setSubiendo(false)
    }
  }

  const alElegir = (e: React.ChangeEvent<HTMLInputElement>) => {
    subir(Array.from(e.target.files ?? []))
    e.target.value = '' // permite volver a elegir el mismo archivo
  }

  const descargar = () => {
    if (!blobUrl || !actual) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = actual.nombre_original
    a.click()
  }

  const confirmarEliminar = async () => {
    if (!actaId || !actual) return
    setEliminando(true)
    try {
      await eliminarEscaneo(actaId, actual.id, motivo)
      toast.success('Escaneo eliminado. Queda conservado en el respaldo del servidor.')
      setMotivo('')
      setConfirmando(false)
      await cargarLista()
      onCambio?.()
    } catch (err) {
      toast.error(await mensajeErrorApi(err, 'No se pudo eliminar el escaneo.'))
    } finally {
      setEliminando(false)
    }
  }

  if (!acta) return null
  const esImagen = actual?.tipo_contenido.startsWith('image/')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Acta firmada — respaldo digital</DialogTitle>
          <DialogDescription>
            {acta.tipo_display} · <span className="font-mono">{acta.activo_codigo}</span> {acta.activo_nombre} · {acta.persona_nombre}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 md:grid-cols-[17rem_1fr]">
          {/* Columna izquierda: archivos + subida */}
          <div className="flex min-w-0 flex-col gap-3">
            {puedeSubir && (
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastrando(false); subir(Array.from(e.dataTransfer.files)) }}
                className={cn('flex flex-col items-center gap-2 rounded-md border border-dashed p-3 text-center', arrastrando && 'border-primary bg-primary/5')}
              >
                {subiendo ? (
                  <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Subiendo...</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Arrastre aquí el escaneo o fotos del acta firmada (PDF, JPG o PNG, máx. 10 MB c/u)</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button size="sm" onClick={() => inputArchivos.current?.click()}><Upload className="size-3.5" />Subir archivos</Button>
                      <Button size="sm" variant="outline" onClick={() => inputCamara.current?.click()}><Camera className="size-3.5" />Tomar foto</Button>
                    </div>
                  </>
                )}
                <input ref={inputArchivos} type="file" multiple accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={alElegir} />
                <input ref={inputCamara} type="file" accept="image/*" capture="environment" className="hidden" onChange={alElegir} />
              </div>
            )}

            <div className="flex max-h-[40vh] min-h-0 flex-col gap-1.5 overflow-y-auto md:max-h-[52vh]">
              {cargando && <p className="text-sm text-muted-foreground">Cargando...</p>}
              {errorLista && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
                  {errorLista} <button className="underline" onClick={() => cargarLista()}>Reintentar</button>
                </p>
              )}
              {!cargando && !errorLista && escaneos.length === 0 && (
                <p className="rounded-md border p-3 text-sm text-muted-foreground">
                  Esta acta aún no tiene respaldo digital.{puedeSubir ? ' Suba el escaneo de la versión firmada.' : ''}
                </p>
              )}
              {escaneos.map((e, i) => (
                <button
                  key={e.id}
                  onClick={() => setSeleccionado(e.id)}
                  className={cn('flex items-start gap-2 rounded-md border p-2 text-left text-sm hover:bg-muted', seleccionado === e.id && 'border-primary bg-muted')}
                >
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{i + 1}. {e.nombre_original}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatoTamano(e.tamano)} · {formatoFecha(e.fecha_subida)}
                      {e.subido_por_nombre ? ` · ${e.subido_por_nombre}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Columna derecha: vista previa */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {esImagen && (
                <>
                  <Button size="icon" variant="outline" className="size-8" title="Alejar" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}><ZoomOut className="size-4" /></Button>
                  <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  <Button size="icon" variant="outline" className="size-8" title="Acercar" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}><ZoomIn className="size-4" /></Button>
                  <Button size="icon" variant="outline" className="size-8" title="Girar" onClick={() => setRotacion((r) => (r + 90) % 360)}><RotateCw className="size-4" /></Button>
                </>
              )}
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" disabled={!blobUrl} onClick={descargar}><Download className="size-3.5" />Descargar</Button>
                {puedeEliminar && actual && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmando((v) => !v)}><Trash2 className="size-3.5" />Eliminar</Button>
                )}
              </div>
            </div>

            {confirmando && (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
                <p className="text-sm">El archivo se oculta del sistema pero se conserva en el servidor para su respaldo. Indique el motivo:</p>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Archivo duplicado / foto ilegible" rows={2} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmando(false)}>Cancelar</Button>
                  <Button size="sm" variant="destructive" disabled={motivo.trim().length < 5 || eliminando} onClick={confirmarEliminar}>
                    {eliminando ? 'Eliminando...' : 'Confirmar eliminación'}
                  </Button>
                </div>
              </div>
            )}

            <div className="relative h-[52vh] overflow-auto rounded-md border bg-muted/30">
              {!actual && <p className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Seleccione un archivo para previsualizarlo.</p>}
              {actual && cargandoVista && <p className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando vista previa...</p>}
              {actual && errorVista && <p className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">{errorVista}</p>}
              {actual && blobUrl && !cargandoVista && esImagen && (
                <div className="flex min-h-full min-w-full items-center justify-center p-2">
                  <img
                    src={blobUrl}
                    alt={`Acta escaneada: ${actual.nombre_original}`}
                    style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? '100%' : 'none', transform: `rotate(${rotacion}deg)`, transition: 'transform .2s' }}
                    className="origin-center"
                  />
                </div>
              )}
              {actual && blobUrl && !cargandoVista && !esImagen && (
                <iframe title={`Acta escaneada: ${actual.nombre_original}`} src={blobUrl} className="h-full w-full border-0" />
              )}
            </div>
            {actual && (
              <p className="truncate font-mono text-[10px] text-muted-foreground" title={actual.sha256}>
                Huella SHA-256: {actual.sha256}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
