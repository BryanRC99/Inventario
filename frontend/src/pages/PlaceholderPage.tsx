import { Construction } from 'lucide-react'

export default function PlaceholderPage({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-24 text-center">
      <Construction className="size-10 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-medium">{titulo}</h2>
        <p className="text-sm text-muted-foreground">Este módulo todavía no está implementado.</p>
      </div>
    </div>
  )
}