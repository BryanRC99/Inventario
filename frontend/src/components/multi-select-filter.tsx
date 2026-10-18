import { ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface OpcionFiltro {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  titulo: string
  opciones: OpcionFiltro[]
  seleccion: string[]
  onChange: (valores: string[]) => void
}

export function MultiSelectFilter({ titulo, opciones, seleccion, onChange }: MultiSelectFilterProps) {
  const toggle = (valor: string) =>
    onChange(seleccion.includes(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor])

  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
      >
        {titulo}
        {seleccion.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
            {seleccion.length}
          </span>
        )}
        <ChevronDown className="size-3.5 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-60 gap-1 overflow-y-auto p-2">
        {opciones.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Sin opciones disponibles.</p>
        )}
        {opciones.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox checked={seleccion.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}
