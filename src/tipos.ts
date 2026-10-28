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
  /** Nota libre, por ejemplo "molestia en el hombro". */
  nota?: string
}

export interface Rutina {
  id: string
  /** YYYY-MM-DD. Sin hora: la app no guarda relojes. */
  fecha: string
  nombre?: string
  cerrada: boolean
  /** Orden dentro del dia, para permitir varias rutinas diarias. */
  orden: number
  /**
   * Interno: cuando se toco por ultima vez la rutina o cualquiera de sus ejercicios.
   * Al sincronizar, entre dos versiones de la misma rutina gana la mas reciente.
   */
  actualizado: number
}

/** Rutina borrada. Viaja a los otros dispositivos para que la borren tambien. */
export interface Borrado {
  id: string
  cuando: number
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
  /** La nota de la ultima vez, para verla justo al volver a agregarlo. */
  ultimaNota?: string
}
