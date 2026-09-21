import { useRef, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  descargarPlantillaActivos,
  validarImportacionActivos,
  confirmarImportacionActivos,
  type ResultadoValidacion,
  type ResultadoImportacion,
} from '@/api/activos'

interface ImportarActivosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportado: () => void
}

type Paso = 'subir' | 'previsualizar' | 'resultado'

export function ImportarActivosDialog({ open, onOpenChange, onImportado }: ImportarActivosDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [paso, setPaso] = useState<Paso>('subir')
  const [validando, setValidando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [validacion, setValidacion] = useState<ResultadoValidacion | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)

  const reiniciar = () => {
    setArchivo(null)
    setPaso('subir')
    setValidacion(null)
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) reiniciar()
    onOpenChange(v)
  }

  const handleDescargarPlantilla = async () => {
    try {
      const blob = await descargarPlantillaActivos()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_activos.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo descargar la plantilla')
    }
  }

  const handleValidar = async () => {
    if (!archivo) return
    setValidando(true)
    try {
      const data = await validarImportacionActivos(archivo)
      setValidacion(data)
      setPaso('previsualizar')
    } catch {
      toast.error('No se pudo leer el archivo. Verifica que sea el formato de la plantilla.')
    } finally {
      setValidando(false)
    }
  }

  const handleConfirmar = async () => {
    if (!archivo) return
    setConfirmando(true)
    try {
      const data = await confirmarImportacionActivos(archivo)
      setResultado(data)
      setPaso('resultado')
      if (data.creados > 0) {
        toast.success(`${data.creados} activo(s) importado(s) correctamente`)
        onImportado()
      }
    } catch {
      toast.error('No se pudo completar la importación')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar activos masivamente</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala, y súbela para validar antes de importar.
          </DialogDescription>
        </DialogHeader>

        {paso === 'subir' && (
          <div className="flex flex-col gap-4 py-2">
            <Button variant="outline" onClick={handleDescargarPlantilla} className="w-fit">
              <Download className="size-3.5" />
              Descargar plantilla Excel
            </Button>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Sube el archivo completado</label>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              {archivo && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileSpreadsheet className="size-3.5" />
                  {archivo.name}
                </p>
              )}
            </div>
          </div>
        )}

        {paso === 'previsualizar' && validacion && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex gap-2 text-sm">
              <Badge variant="default">{validacion.validas} válidas</Badge>
              {validacion.invalidas > 0 && (
                <Badge variant="destructive">{validacion.invalidas} con error</Badge>
              )}
              <span className="text-muted-foreground">de {validacion.total} filas</span>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Fila</TableHead>
                    <TableHead className="h-8 text-xs">Nombre</TableHead>
                    <TableHead className="h-8 text-xs">Categoría</TableHead>
                    <TableHead className="h-8 text-xs">Estado</TableHead>
                    <TableHead className="h-8 text-xs">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validacion.filas.map((f) => (
                    <TableRow key={f.fila}>
                      <TableCell className="py-1.5 text-sm">{f.fila}</TableCell>
                      <TableCell className="py-1.5 text-sm">{f.datos_mostrar.nombre || '—'}</TableCell>
                      <TableCell className="py-1.5 text-sm text-muted-foreground">
                        {f.datos_mostrar.categoria || '—'}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {f.valido ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="size-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                        {f.errores.join('; ') || 'Listo para importar'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {validacion.validas === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay filas válidas para importar. Corrige el archivo y vuelve a intentar.
              </p>
            )}
          </div>
        )}

        {paso === 'resultado' && resultado && (
          <div className="flex flex-col gap-3 py-2">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{resultado.creados} activo(s) importado(s) correctamente.</p>
              {resultado.errores.length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  {resultado.errores.length} fila(s) no se importaron por errores.
                </p>
              )}
            </div>

            {resultado.errores.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">Fila</TableHead>
                      <TableHead className="h-8 text-xs">Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.errores.map((e) => (
                      <TableRow key={e.fila}>
                        <TableCell className="py-1.5 text-sm">{e.fila}</TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground">
                          {e.errores.join('; ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {paso === 'subir' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleValidar} disabled={!archivo || validando}>
                <Upload className="size-3.5" />
                {validando ? 'Validando...' : 'Validar archivo'}
              </Button>
            </>
          )}

          {paso === 'previsualizar' && (
            <>
              <Button variant="outline" onClick={reiniciar}>
                Subir otro archivo
              </Button>
              <Button
                onClick={handleConfirmar}
                disabled={!validacion || validacion.validas === 0 || confirmando}
              >
                {confirmando ? 'Importando...' : `Importar ${validacion?.validas ?? 0} activo(s)`}
              </Button>
            </>
          )}

          {paso === 'resultado' && (
            <Button onClick={() => handleOpenChange(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}