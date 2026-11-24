import { Button } from '@/components/ui/button'

interface PaginacionTablaProps {
  pagina: number
  total: number
  tamanoPagina: number
  cargando?: boolean
  onCambiarPagina: (pagina: number) => void
}

export function PaginacionTabla({
  pagina,
  total,
  tamanoPagina,
  cargando = false,
  onCambiarPagina,
}: PaginacionTablaProps) {
  if (total === 0) return null
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina))
  const desde = (pagina - 1) * tamanoPagina + 1
  const hasta = Math.min(pagina * tamanoPagina, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        Mostrando {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cargando || pagina <= 1}
          onClick={() => onCambiarPagina(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cargando || pagina >= totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
