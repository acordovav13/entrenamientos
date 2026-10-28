import { useState } from 'react'
import { respaldarAhora } from '../drive'

/**
 * Banda sobre las pestañas cuando hay entrenamientos que no están en Drive y la app
 * no puede subirlos sola. Un toque da permiso por una hora, y mientras dure, lo que
 * sigas anotando se sube sin preguntar.
 */
export default function AvisoRespaldo({ fallo }: { fallo: string | null }) {
  const [esperando, setEsperando] = useState(false)

  const alTocar = async () => {
    setEsperando(true)
    try {
      await respaldarAhora()
    } catch {
      /* el motivo llega en `fallo` y se muestra en la banda */
    } finally {
      setEsperando(false)
    }
  }

  return (
    <div className={`aviso-respaldo${fallo ? ' con-fallo' : ''}`} role="status">
      <span>{fallo ? `No se pudo respaldar. ${fallo}` : 'Hay cambios sin respaldar en Drive'}</span>
      <button onClick={alTocar} disabled={esperando}>
        {esperando ? 'Un momento…' : fallo ? 'Reintentar' : 'Respaldar'}
      </button>
    </div>
  )
}
