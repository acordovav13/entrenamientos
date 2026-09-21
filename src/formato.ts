import type { Ejercicio, Serie } from './tipos'

const largo = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const corto = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** Interpreta YYYY-MM-DD como fecha local, no UTC. */
function aFecha(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

/** Solo la primera letra: "Lunes 21 de septiembre", no "Lunes 21 De Septiembre". */
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function fechaLarga(iso: string): string {
  return mayuscula(largo.format(aFecha(iso)))
}

export function fechaCorta(iso: string): string {
  return mayuscula(corto.format(aFecha(iso)).replace(/\./g, ''))
}

const diaMesFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })
const diaSemanaFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'short' })

/** "21 sep", para la segunda linea de la repisa de dias. */
export function diaMes(iso: string): string {
  return diaMesFmt.format(aFecha(iso)).replace(/\./g, '')
}

/** "Jue", para los dias de la repisa que no tienen nombre propio. */
export function diaSemanaCorto(iso: string): string {
  const s = diaSemanaFmt.format(aFecha(iso)).replace(/\./g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Dias de diferencia con hoy: negativo es pasado, positivo es futuro. */
export function diasDesdeHoy(iso: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const d = aFecha(iso)
  return Math.round((d.getTime() - hoy.getTime()) / 86400000)
}

/** "Hoy", "Ayer", "Mañana" o nada, para acompañar a la fecha larga. */
export function etiquetaDia(iso: string): string | null {
  switch (diasDesdeHoy(iso)) {
    case 0:
      return 'Hoy'
    case -1:
      return 'Ayer'
    case 1:
      return 'Mañana'
    default:
      return null
  }
}

export function numero(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

/** "3 x 10 · 40 kg" cuando las series son iguales, o "10/10/8 · 40 kg" cuando no. */
export function resumenSeries(series: Serie[]): string {
  if (series.length === 0) return 'sin series'
  const iguales = series.every((s) => s.reps === series[0].reps && s.peso === series[0].peso)
  const reps = iguales ? `${series.length} x ${series[0].reps}` : series.map((s) => s.reps).join('/')
  const pesos = [...new Set(series.map((s) => s.peso))]
  if (pesos.length === 1) {
    return pesos[0] === 0 ? reps : `${reps} · ${numero(pesos[0])} kg`
  }
  return `${reps} · ${pesos.map(numero).join('/')} kg`
}

export function resumenCardio(tiempoMin?: number, distanciaKm?: number): string {
  const partes: string[] = []
  if (tiempoMin) partes.push(`${numero(tiempoMin)} min`)
  if (distanciaKm) partes.push(`${numero(distanciaKm)} km`)
  return partes.join(' · ') || 'sin medida'
}

export function resumenEjercicio(e: Ejercicio): string {
  return e.tipo === 'cardio' ? resumenCardio(e.tiempoMin, e.distanciaKm) : resumenSeries(e.series)
}

export function seriesHechas(e: Ejercicio): number {
  return e.tipo === 'cardio' ? (e.hecho ? 1 : 0) : e.series.filter((s) => s.hecha).length
}

export function seriesTotales(e: Ejercicio): number {
  return e.tipo === 'cardio' ? 1 : e.series.length
}

export function estaCompleto(e: Ejercicio): boolean {
  const total = seriesTotales(e)
  return total > 0 && seriesHechas(e) === total
}
