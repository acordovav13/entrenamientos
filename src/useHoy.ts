import { useEffect, useState } from 'react'
import { hoyISO } from './db'

/**
 * La fecha de hoy, viva. Calcularla una sola vez al montar dejaba la app pegada en
 * el dia anterior si pasaba la medianoche con la app abierta, que es justo lo que
 * hace una app instalada: nunca se cierra del todo, solo queda en segundo plano.
 */
export function useHoy(): string {
  const [hoy, setHoy] = useState(hoyISO)

  useEffect(() => {
    const revisar = () => setHoy((actual) => (hoyISO() === actual ? actual : hoyISO()))

    // Al volver del segundo plano, y tambien cada minuto por si sigue en pantalla.
    document.addEventListener('visibilitychange', revisar)
    window.addEventListener('focus', revisar)
    const cadaMinuto = setInterval(revisar, 60_000)

    return () => {
      document.removeEventListener('visibilitychange', revisar)
      window.removeEventListener('focus', revisar)
      clearInterval(cadaMinuto)
    }
  }, [])

  return hoy
}
