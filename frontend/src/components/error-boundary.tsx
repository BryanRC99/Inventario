import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { PantallaError } from '@/components/pantalla-error'

interface Props {
  children: ReactNode
  /** Cambia (ej. la ruta) para limpiar el error automáticamente al navegar. */
  resetKey?: string
  /** true = pantalla completa sin depender del router (nivel global). */
  global?: boolean
}

interface State {
  error: Error | null
}

/**
 * Atrapa errores de renderizado para que una falla en una pantalla no deje la
 * aplicación completa en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de renderizado:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    const detalle = import.meta.env.DEV ? (this.state.error.stack ?? this.state.error.message) : undefined
    const pantalla = (
      <PantallaError tipo="error" detalle={detalle}>
        <Button size="sm" onClick={() => this.setState({ error: null })}>
          Reintentar
        </Button>
        {/* <a> y no <Link>: el boundary global vive fuera del router. */}
        <a
          href="/"
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
        >
          Ir al inicio
        </a>
      </PantallaError>
    )

    return this.props.global ? <div className="min-h-svh bg-background p-6">{pantalla}</div> : pantalla
  }
}
