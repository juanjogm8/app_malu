/* Íconos de trazo uniforme en caja de 24 px, tomados del diseño 2b. */
const paths = {
  inicio: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  pendientes: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM8 12.5l3 3 5-6',
  listas: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  casa: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  kebab: 'M12 5.5h.01M12 12h.01M12 18.5h.01',
  izquierda: 'M15 6l-6 6 6 6',
  derecha: 'M9 6l6 6-6 6',
  abajo: 'M6 9l6 6 6-6',
  alerta: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7.5v5.5M12 16.5h.01',
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7v5l3 2',
  repetir: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
  revision: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  palomita: 'M5 12.5l4.5 4.5L19 7',
  arriba: 'M12 19V5M6 11l6-6 6 6',
  cerrar: 'M6 6l12 12M18 6L6 18',
  agregar: 'M12 5v14M5 12h14',
  enlace:
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  candado: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  sinSenal:
    'M3 9a14 14 0 0 1 18 0M6.5 12.5a9 9 0 0 1 11 0M10 16a4 4 0 0 1 4 0M12 19.5h.01M4 4l16 16',
  comidas: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 0-3 3-3 6s1 4 3 4v8',
  ninos: 'M12 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM6 20v-2a6 6 0 0 1 12 0v2',
  fechas: 'M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16.3 6.6 19.2l1.3-6-4.5-4 6-.6z',
  planes: 'M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z',
  notas: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  buscar: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13zM15.5 15.5 20 20',
  copiar: 'M8 8h11v12H8zM5 16V4h11',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  azar: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  flecha: 'M5 12h14M13 6l6 6-6 6',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 24,
  stroke = 2,
  className,
}: {
  name: IconName
  size?: number
  stroke?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'mas' || name === 'kebab' ? Math.max(stroke, 2.6) : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  )
}
