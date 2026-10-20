/**
 * Ilustraciones propias (SVG) para las pantallas de error. Usan los colores del
 * tema (muted / primary), así se ven bien en modo claro y oscuro.
 */
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 240 180',
  fill: 'none',
  role: 'img' as const,
  'aria-hidden': true,
}

const sombra = <ellipse cx="120" cy="156" rx="72" ry="9" className="fill-muted" />

/** 404: caja vacía y una lupa que no encuentra nada. */
export function IlustracionNoEncontrado(props: Props) {
  return (
    <svg {...base} {...props}>
      {sombra}
      <path d="M70 84 L120 104 L170 84 L170 134 L120 154 L70 134 Z" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" strokeLinejoin="round" />
      <path d="M120 104 V154" className="stroke-muted-foreground/40" strokeWidth="2" />
      <path d="M70 84 L48 64 L98 56 L120 72 Z" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" strokeLinejoin="round" />
      <path d="M170 84 L192 64 L142 56 L120 72 Z" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" strokeLinejoin="round" />
      <path d="M70 84 L120 104 L170 84 L120 72 Z" className="fill-background stroke-muted-foreground/40" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="152" cy="116" r="23" className="fill-background stroke-primary" strokeWidth="5" />
      <path d="M169 133 L188 152" className="stroke-primary" strokeWidth="8" strokeLinecap="round" />
      <text x="152" y="126" textAnchor="middle" fontSize="28" fontWeight="700" className="fill-primary">?</text>
      <circle cx="58" cy="40" r="3" className="fill-muted-foreground/30" />
      <circle cx="196" cy="34" r="4" className="fill-muted-foreground/30" />
      <circle cx="176" cy="50" r="2" className="fill-muted-foreground/30" />
    </svg>
  )
}

/** 403: candado, acceso restringido. */
export function IlustracionSinPermiso(props: Props) {
  return (
    <svg {...base} {...props}>
      {sombra}
      <path d="M92 78 V62 a28 28 0 0 1 56 0 V78" className="stroke-primary" strokeWidth="9" strokeLinecap="round" />
      <rect x="72" y="76" width="96" height="76" rx="12" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" />
      <circle cx="120" cy="108" r="9" className="fill-primary" />
      <path d="M120 114 V132" className="stroke-primary" strokeWidth="7" strokeLinecap="round" />
      <circle cx="56" cy="50" r="3" className="fill-muted-foreground/30" />
      <circle cx="188" cy="44" r="4" className="fill-muted-foreground/30" />
    </svg>
  )
}

/** Error inesperado / servidor: advertencia sobre un panel roto. */
export function IlustracionError(props: Props) {
  return (
    <svg {...base} {...props}>
      {sombra}
      <rect x="52" y="40" width="136" height="104" rx="10" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" />
      <path d="M52 62 H188" className="stroke-muted-foreground/40" strokeWidth="2" />
      <circle cx="66" cy="51" r="3" className="fill-muted-foreground/40" />
      <circle cx="78" cy="51" r="3" className="fill-muted-foreground/40" />
      <path d="M120 78 L152 132 H88 Z" className="fill-background stroke-primary" strokeWidth="5" strokeLinejoin="round" />
      <path d="M120 96 V114" className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
      <circle cx="120" cy="124" r="3.5" className="fill-primary" />
      <path d="M168 60 l8 10 l-6 6 l9 10" className="stroke-muted-foreground/50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Sin conexión: nube tachada. */
export function IlustracionSinConexion(props: Props) {
  return (
    <svg {...base} {...props}>
      {sombra}
      <path d="M78 128 a26 26 0 0 1 4-51 a36 36 0 0 1 69 8 a22 22 0 0 1 3 43 Z" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" strokeLinejoin="round" />
      <path d="M92 52 L152 148" className="stroke-primary" strokeWidth="8" strokeLinecap="round" />
      <path d="M92 52 L152 148" className="stroke-background" strokeWidth="2" strokeLinecap="round" transform="translate(5 -1)" />
      <circle cx="190" cy="52" r="3" className="fill-muted-foreground/30" />
      <circle cx="52" cy="60" r="4" className="fill-muted-foreground/30" />
    </svg>
  )
}
