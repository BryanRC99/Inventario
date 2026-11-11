import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Pagination({ className, ...props }: ComponentProps<'nav'>) {
  return <nav aria-label="Paginación" className={cn('mx-auto flex w-full justify-center', className)} {...props} />
}

export function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
  return <ul className={cn('flex flex-row items-center gap-1', className)} {...props} />
}

export function PaginationItem(props: ComponentProps<'li'>) {
  return <li {...props} />
}

interface PaginationLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
}

export function PaginationLink({ className, isActive, ...props }: PaginationLinkProps) {
  return (
    <button
      aria-current={isActive ? 'page' : undefined}
      className={cn(buttonVariants({ variant: isActive ? 'outline' : 'ghost', size: 'icon' }), 'size-8', className)}
      {...props}
    />
  )
}

interface PaginationStepProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
}

export function PaginationPrevious({ className, label = 'Anterior', ...props }: PaginationStepProps) {
  return (
    <button className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 px-2.5', className)} {...props}>
      <ChevronLeft className="size-4" />
      <span>{label}</span>
    </button>
  )
}

export function PaginationNext({ className, label = 'Siguiente', ...props }: PaginationStepProps) {
  return (
    <button className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 px-2.5', className)} {...props}>
      <span>{label}</span>
      <ChevronRight className="size-4" />
    </button>
  )
}

export function PaginationEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span aria-hidden="true" className={cn('flex size-8 items-center justify-center', className)} {...props}>
      <MoreHorizontal className="size-4" />
      <span className="sr-only">Más páginas</span>
    </span>
  )
}
