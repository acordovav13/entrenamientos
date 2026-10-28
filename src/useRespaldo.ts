import { useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { estadoDrive, huellaDeLosDatos, suscribirDrive, tokenVigente } from './drive'

/** El estado del respaldo en Drive, al día con cada cambio en los datos. */
export function useRespaldo() {
  const estado = useSyncExternalStore(suscribirDrive, estadoDrive)
  const huella = useLiveQuery(huellaDeLosDatos, [], null)
  const hayDatos = !!huella && !huella.startsWith('0:0:')

  return {
    ...estado,
    huella,
    /** Hay entrenamientos en este dispositivo que todavía no están en Drive. */
    pendiente: estado.configurado && hayDatos && huella !== estado.marca,
    /** Queda permiso de un toque reciente: lo pendiente se sube solo. */
    conPermiso: tokenVigente(),
  }
}
