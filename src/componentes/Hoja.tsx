import { useEffect, type ReactNode } from 'react'
import { IconoCerrar } from './Iconos'

interface Props {
  titulo: string
  onCerrar: () => void
  children: ReactNode
  /** Contenido fijo bajo el titulo, que no hace scroll (por ejemplo un buscador). */
  fijo?: ReactNode
}

export default function Hoja({ titulo, onCerrar, children, fijo }: Props) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div
      className="velo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="hoja-cab">
          <h2>{titulo}</h2>
          <button className="icono-btn" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar />
          </button>
        </div>
        {fijo}
        {children}
      </div>
    </div>
  )
}
