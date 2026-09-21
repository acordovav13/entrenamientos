import { db, hoyISO } from './db'
import type { Ejercicio, Rutina, Serie, TipoEjercicio } from './tipos'

/**
 * Historial inventado para poder juzgar la app llena antes de tener datos propios.
 * Solo se ofrece en desarrollo: no se quiere basura en el historial de verdad.
 */

interface Plantilla {
  nombre: string
  ejercicios: {
    nombre: string
    tipo: TipoEjercicio
    /** Fuerza: cuantas series y con cuantas reps. */
    series?: number
    reps?: number
    /** Fuerza: kilos de la primera semana; van subiendo con el tiempo. */
    pesoInicial?: number
    /** Cardio. */
    tiempoMin?: number
    distanciaKm?: number
  }[]
}

const PLANTILLAS: Plantilla[] = [
  {
    nombre: 'Empuje',
    ejercicios: [
      { nombre: 'Press banca', tipo: 'fuerza', series: 4, reps: 8, pesoInicial: 40 },
      { nombre: 'Press militar', tipo: 'fuerza', series: 3, reps: 10, pesoInicial: 25 },
      { nombre: 'Fondos', tipo: 'fuerza', series: 3, reps: 12, pesoInicial: 0 },
      { nombre: 'Extensión de tríceps', tipo: 'fuerza', series: 3, reps: 12, pesoInicial: 15 },
    ],
  },
  {
    nombre: 'Tirón',
    ejercicios: [
      { nombre: 'Dominadas', tipo: 'fuerza', series: 4, reps: 8, pesoInicial: 0 },
      { nombre: 'Remo con barra', tipo: 'fuerza', series: 4, reps: 10, pesoInicial: 45 },
      { nombre: 'Curl de bíceps', tipo: 'fuerza', series: 3, reps: 12, pesoInicial: 12 },
      { nombre: 'Face pull', tipo: 'fuerza', series: 3, reps: 15, pesoInicial: 20 },
    ],
  },
  {
    nombre: 'Pierna',
    ejercicios: [
      { nombre: 'Sentadilla', tipo: 'fuerza', series: 4, reps: 8, pesoInicial: 60 },
      { nombre: 'Peso muerto', tipo: 'fuerza', series: 3, reps: 6, pesoInicial: 70 },
      { nombre: 'Zancadas', tipo: 'fuerza', series: 3, reps: 12, pesoInicial: 20 },
      { nombre: 'Elevación de gemelos', tipo: 'fuerza', series: 4, reps: 15, pesoInicial: 30 },
    ],
  },
]

const CARDIO: Plantilla = {
  nombre: 'Cardio',
  ejercicios: [
    { nombre: 'Trote', tipo: 'cardio', tiempoMin: 30, distanciaKm: 5 },
    { nombre: 'Cuerda', tipo: 'cardio', tiempoMin: 10 },
    { nombre: 'Saco de boxeo', tipo: 'cardio', tiempoMin: 15 },
  ],
}

/** Aleatorio con semilla, para que los datos de ejemplo salgan siempre iguales. */
function generador(semilla: number) {
  let s = semilla
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function fechaHace(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return hoyISO(d)
}

export async function cargarEjemplo(): Promise<{ rutinas: number; ejercicios: number }> {
  const azar = generador(20260921)
  const rutinas: Rutina[] = []
  const ejercicios: Ejercicio[] = []
  const id = () => crypto.randomUUID()

  // Nueve semanas hacia atras, entrenando lunes, martes, jueves y viernes.
  for (let dias = 62; dias >= 0; dias--) {
    const fecha = fechaHace(dias)
    const diaSemana = new Date(fecha + 'T12:00:00').getDay()
    if (![1, 2, 4, 5].includes(diaSemana)) continue

    const semana = Math.floor((62 - dias) / 7)
    const plantilla = PLANTILLAS[[1, 2, 4, 5].indexOf(diaSemana) % PLANTILLAS.length]
    const esHoy = dias === 0

    const bloques: Plantilla[] = [plantilla]
    // Los viernes se suma una segunda rutina de cardio: asi se ven varias en un dia.
    if (diaSemana === 5) bloques.push(CARDIO)

    bloques.forEach((bloque, indice) => {
      const rutina: Rutina = {
        id: id(),
        fecha,
        nombre: bloque.nombre,
        // La de hoy queda abierta, como si estuvieras a media rutina.
        cerrada: !esHoy,
        orden: indice,
        actualizado: Date.now() - dias * 86400000,
      }
      rutinas.push(rutina)

      bloque.ejercicios.forEach((plan, orden) => {
        // Progresion: unos 2,5 kg cada dos semanas, para que el grafico de la fase 2
        // tenga una linea que de verdad suba.
        const incremento = plan.pesoInicial ? Math.floor(semana / 2) * 2.5 : 0
        const peso = (plan.pesoInicial ?? 0) + incremento

        const total = plan.series ?? 0
        // De vez en cuando un ejercicio queda a medias, que es lo que pasa en la vida real.
        const seDejoAMedias = azar() < 0.12
        const hechas = esHoy ? Math.min(2, total) : seDejoAMedias ? total - 1 : total

        const series: Serie[] = Array.from({ length: total }, (_, i) => ({
          reps: plan.reps ?? 10,
          peso,
          hecha: i < hechas,
        }))

        ejercicios.push({
          id: id(),
          rutinaId: rutina.id,
          tipo: plan.tipo,
          nombre: plan.nombre,
          orden,
          series,
          tiempoMin: plan.tiempoMin,
          distanciaKm: plan.distanciaKm,
          hecho: plan.tipo === 'cardio' ? !esHoy : false,
        })
      })
    })
  }

  await db.transaction('rw', db.rutinas, db.ejercicios, async () => {
    await db.rutinas.clear()
    await db.ejercicios.clear()
    await db.rutinas.bulkAdd(rutinas)
    await db.ejercicios.bulkAdd(ejercicios)
  })

  return { rutinas: rutinas.length, ejercicios: ejercicios.length }
}
