import { useState } from 'react'
import { sincronizarAhora } from '../drive'

/**
 * Banda sobre las pestañas cuando hay algo que sincronizar y la app no puede hacerlo
 * sola. Un toque da permiso por una hora, y mientras dure, todo se sincroniza sin
 * preguntar.
 */
export default function AvisoRespaldo({ texto, error }: { texto: string; error: boolean }) {
  const [esperando, setEsperando] = useState(false)

  const alTocar = async () => {
    setEsperando(true)
    try {
      await sincronizarAhora()
    } catch {
      /* el motivo llega como texto de la banda */
    } finally {
      setEsperando(false)
    }
  }

  return (
    <div className={`aviso-respaldo${error ? ' con-fallo' : ''}`} role="status">
      <span>{texto}</span>
      <button onClick={alTocar} disabled={esperando}>
        {esperando ? 'Un momento…' : error ? 'Reintentar' : 'Sincronizar'}
      </button>
    </div>
  )
}
