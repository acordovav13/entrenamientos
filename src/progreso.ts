import { db } from './db'
import { diasDesdeHoy, estaCompleto } from './formato'
import type { Ejercicio } from './tipos'

/**
 * Lecturas del historial para el calendario y el grafico. Siempre sobre lo que ya
 * paso: los dias planificados no son historial y no entran en ninguna de las dos.
 */

export interface DiaMarcado {
  fecha: string
  total: number
  completos: number
}

/** Dias con entrenamiento de un mes, indexados por fecha. mes va de 0 a 11. */
export async function diasDelMes(anio: number, mes: number): Promise<Map<string, DiaMarcado>> {
  const [rutinas, ejercicios] = await Promise.all([db.rutinas.toArray(), db.ejercicios.toArray()])

  const porRutina = new Map<string, Ejercicio[]>()
  for (const e of ejercicios) {
    const lista = porRutina.get(e.rutinaId) ?? []
    lista.push(e)
    porRutina.set(e.rutinaId, lista)
  }

  const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}-`
  const dias = new Map<string, DiaMarcado>()

  for (const r of rutinas) {
    if (!r.fecha.startsWith(prefijo)) continue
    if (diasDesdeHoy(r.fecha) > 0) continue
    const es = porRutina.get(r.id) ?? []
    if (es.length === 0) continue
    const dia = dias.get(r.fecha) ?? { fecha: r.fecha, total: 0, completos: 0 }
    dia.total += es.length
    dia.completos += es.filter(estaCompleto).length
    dias.set(r.fecha, dia)
  }

  return dias
}

// --- Progreso por ejercicio ---

export type Unidad = 'kg' | 'reps' | 'min' | 'km'

export interface PuntoProgreso {
  fecha: string
  valor: number
  /** Lo que se vio ese dia, para la lista de abajo del grafico. */
  detalle: string
}

export interface SerieProgreso {
  nombre: string
  unidad: Unidad
  /** Que se esta midiendo, en una linea, porque no siempre es el peso. */
  explicacion: string
  puntos: PuntoProgreso[]
}

export interface EjercicioConHistorial {
  nombre: string
  veces: number
}

/** Ejercicios que tienen historial, los mas repetidos primero. */
export async function ejerciciosConHistorial(): Promise<EjercicioConHistorial[]> {
  const [rutinas, ejercicios] = await Promise.all([db.rutinas.toArray(), db.ejercicios.toArray()])
  const fechaDe = new Map(rutinas.map((r) => [r.id, r.fecha]))

  const cuenta = new Map<string, number>()
  for (const e of ejercicios) {
    const fecha = fechaDe.get(e.rutinaId)
    if (!fecha || diasDesdeHoy(fecha) > 0) continue
    cuenta.set(e.nombre, (cuenta.get(e.nombre) ?? 0) + 1)
  }

  return [...cuenta.entries()]
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre))
}

const numero = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

/**
 * Serie de progreso de un ejercicio. Lo que se mide depende del ejercicio:
 * los kilos cuando los hay, las repeticiones si es peso corporal, y el tiempo o
 * la distancia si es cardio. Un grafico de kilos en dominadas seria una linea plana en 0.
 */
export async function progresoDe(nombre: string): Promise<SerieProgreso> {
  const [rutinas, ejercicios] = await Promise.all([db.rutinas.toArray(), db.ejercicios.toArray()])
  const fechaDe = new Map(rutinas.map((r) => [r.id, r.fecha]))

  const delEjercicio = ejercicios.filter((e) => {
    const fecha = fechaDe.get(e.rutinaId)
    return e.nombre === nombre && fecha && diasDesdeHoy(fecha) <= 0
  })

  const esCardio = delEjercicio.some((e) => e.tipo === 'cardio')
  const hayPeso = delEjercicio.some((e) => e.series.some((s) => s.hecha && s.peso > 0))

  // Un dia puede tener el mismo ejercicio en dos rutinas: se juntan en un punto.
  const porFecha = new Map<string, Ejercicio[]>()
  for (const e of delEjercicio) {
    const fecha = fechaDe.get(e.rutinaId)!
    porFecha.set(fecha, [...(porFecha.get(fecha) ?? []), e])
  }

  let unidad: Unidad = 'kg'
  let explicacion = 'Kilos de la serie más pesada que marcaste hecha'

  const puntos: PuntoProgreso[] = []

  for (const [fecha, lista] of porFecha) {
    if (esCardio) {
      const minutos = lista.reduce((t, e) => t + (e.hecho ? (e.tiempoMin ?? 0) : 0), 0)
      const kms = lista.reduce((t, e) => t + (e.hecho ? (e.distanciaKm ?? 0) : 0), 0)
      if (minutos > 0) {
        unidad = 'min'
        explicacion = 'Minutos que marcaste hechos'
        puntos.push({
          fecha,
          valor: minutos,
          detalle: kms > 0 ? `${numero(minutos)} min · ${numero(kms)} km` : `${numero(minutos)} min`,
        })
      } else if (kms > 0) {
        unidad = 'km'
        explicacion = 'Kilómetros que marcaste hechos'
        puntos.push({ fecha, valor: kms, detalle: `${numero(kms)} km` })
      }
      continue
    }

    const hechas = lista.flatMap((e) => e.series.filter((s) => s.hecha))
    if (hechas.length === 0) continue

    if (hayPeso) {
      const mejor = hechas.reduce((a, b) => (b.peso > a.peso ? b : a))
      puntos.push({
        fecha,
        valor: mejor.peso,
        detalle: `${hechas.length} series · ${mejor.reps} reps @ ${numero(mejor.peso)} kg`,
      })
    } else {
      unidad = 'reps'
      explicacion = 'Repeticiones totales que marcaste hechas (es peso corporal)'
      const total = hechas.reduce((t, s) => t + s.reps, 0)
      puntos.push({ fecha, valor: total, detalle: `${hechas.length} series · ${total} reps` })
    }
  }

  puntos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return { nombre, unidad, explicacion, puntos }
}
