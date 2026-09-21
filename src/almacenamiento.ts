/**
 * El historial vive solo en el IndexedDB de este navegador. Si el sistema necesita
 * espacio puede descartarlo sin avisar, asi que hay que pedir proteccion
 * explicitamente y vigilar cada cuanto se respalda.
 */

const CLAVE_RESPALDO = 'ultimo-respaldo'

/**
 * Pide al navegador que no descarte los datos por falta de espacio.
 * En Android lo concede casi siempre si la app esta instalada en la pantalla de inicio.
 */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface EstadoAlmacenamiento {
  protegido: boolean
  /** Megabytes ocupados, cuando el navegador los informa. */
  usadoMB: number | null
}

export async function estadoAlmacenamiento(): Promise<EstadoAlmacenamiento> {
  try {
    const protegido = (await navigator.storage?.persisted?.()) ?? false
    const { usage } = (await navigator.storage?.estimate?.()) ?? {}
    return { protegido, usadoMB: usage ? usage / 1_048_576 : null }
  } catch {
    return { protegido: false, usadoMB: null }
  }
}

// --- Cuando fue el ultimo respaldo ---
// Va en localStorage, no en IndexedDB: es una comodidad de este dispositivo y no
// tiene por que viajar dentro del propio respaldo.

export function marcarRespaldo() {
  try {
    localStorage.setItem(CLAVE_RESPALDO, new Date().toISOString())
  } catch {
    /* modo privado o almacenamiento bloqueado: no pasa nada */
  }
}

export function ultimoRespaldo(): Date | null {
  try {
    const v = localStorage.getItem(CLAVE_RESPALDO)
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/** Dias desde el ultimo respaldo, o null si nunca se hizo uno. */
export function diasSinRespaldo(): number | null {
  const d = ultimoRespaldo()
  if (!d) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

/** A partir de dos semanas sin respaldo conviene recordarlo. */
export const DIAS_PARA_RECORDAR = 14

export function respaldoAtrasado(hayDatos: boolean): boolean {
  if (!hayDatos) return false
  const dias = diasSinRespaldo()
  return dias === null || dias >= DIAS_PARA_RECORDAR
}
