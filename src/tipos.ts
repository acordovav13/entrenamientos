export type TipoEjercicio = 'fuerza' | 'cardio'

export interface Serie {
  reps: number
  /** Kilos. 0 significa peso corporal. */
  peso: number
  hecha: boolean
}

export interface Ejercicio {
  id: string
  rutinaId: string
  tipo: TipoEjercicio
  nombre: string
  orden: number
  /** Solo fuerza. */
  series: Serie[]
  /** Solo cardio, en minutos. */
  tiempoMin?: number
  /** Solo cardio, en kilometros. */
  distanciaKm?: number
  /** Solo cardio. */
  hecho: boolean
}

export interface Rutina {
  id: string
  /** YYYY-MM-DD. Sin hora: la app no guarda relojes. */
  fecha: string
  nombre?: string
  cerrada: boolean
  /** Orden dentro del dia, para permitir varias rutinas diarias. */
  orden: number
  /** Interno, para resolver conflictos cuando llegue la sincronizacion con Drive. */
  actualizado: number
}

/** Lo que el autocompletado sabe de un ejercicio ya usado antes. */
export interface Sugerencia {
  nombre: string
  tipo: TipoEjercicio
  series: Serie[]
  tiempoMin?: number
  distanciaKm?: number
  /** Cuantas veces se ha registrado, para ordenar las sugerencias. */
  veces: number
  ultimaFecha: string
}
