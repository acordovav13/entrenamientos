import Dexie, { type EntityTable } from 'dexie'
import type { Ejercicio, Rutina, Serie, Sugerencia, TipoEjercicio } from './tipos'

const db = new Dexie('entrenamientos') as Dexie & {
  rutinas: EntityTable<Rutina, 'id'>
  ejercicios: EntityTable<Ejercicio, 'id'>
}

db.version(1).stores({
  rutinas: 'id, fecha, [fecha+orden]',
  ejercicios: 'id, rutinaId, nombre, [rutinaId+orden]',
})

export { db }

const id = () => crypto.randomUUID()

/** Fecha local en YYYY-MM-DD. No usamos toISOString porque desplaza por zona horaria. */
export function hoyISO(d = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// --- Rutinas ---

export async function rutinasDe(fecha: string): Promise<Rutina[]> {
  const rs = await db.rutinas.where('fecha').equals(fecha).toArray()
  return rs.sort((a, b) => a.orden - b.orden)
}

/**
 * Devuelve la rutina abierta del dia, creandola si no existe.
 * La rutina se abre sola al agregar el primer ejercicio: nunca hay un boton "empezar".
 */
export async function rutinaAbierta(fecha: string): Promise<Rutina> {
  const rs = await rutinasDe(fecha)
  const abierta = rs.find((r) => !r.cerrada)
  if (abierta) return abierta

  const nueva: Rutina = {
    id: id(),
    fecha,
    cerrada: false,
    orden: rs.length,
    actualizado: Date.now(),
  }
  await db.rutinas.add(nueva)
  return nueva
}

export async function cerrarRutina(rutinaId: string, cerrada = true) {
  await db.rutinas.update(rutinaId, { cerrada, actualizado: Date.now() })
}

export async function renombrarRutina(rutinaId: string, nombre: string) {
  const limpio = nombre.trim()
  await db.rutinas.update(rutinaId, {
    nombre: limpio || undefined,
    actualizado: Date.now(),
  })
}

export async function borrarRutina(rutinaId: string) {
  await db.transaction('rw', db.rutinas, db.ejercicios, async () => {
    await db.ejercicios.where('rutinaId').equals(rutinaId).delete()
    await db.rutinas.delete(rutinaId)
  })
}

/** Nombres de rutina ya usados, mas frecuentes primero. */
export async function nombresDeRutina(): Promise<string[]> {
  const rs = await db.rutinas.toArray()
  const cuenta = new Map<string, number>()
  for (const r of rs) {
    if (!r.nombre) continue
    cuenta.set(r.nombre, (cuenta.get(r.nombre) ?? 0) + 1)
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
}

// --- Ejercicios ---

export async function ejerciciosDe(rutinaId: string): Promise<Ejercicio[]> {
  const es = await db.ejercicios.where('rutinaId').equals(rutinaId).toArray()
  return es.sort((a, b) => a.orden - b.orden)
}

export interface NuevoEjercicio {
  nombre: string
  tipo: TipoEjercicio
  series?: Serie[]
  tiempoMin?: number
  distanciaKm?: number
}

export async function agregarEjercicio(fecha: string, datos: NuevoEjercicio): Promise<Ejercicio> {
  const rutina = await rutinaAbierta(fecha)
  const existentes = await ejerciciosDe(rutina.id)
  const ejercicio: Ejercicio = {
    id: id(),
    rutinaId: rutina.id,
    tipo: datos.tipo,
    nombre: datos.nombre.trim(),
    orden: existentes.length,
    series: (datos.series ?? []).map((s) => ({ ...s, hecha: false })),
    tiempoMin: datos.tiempoMin,
    distanciaKm: datos.distanciaKm,
    hecho: false,
  }
  await db.ejercicios.add(ejercicio)
  await db.rutinas.update(rutina.id, { actualizado: Date.now() })
  return ejercicio
}

export async function actualizarEjercicio(ejercicioId: string, cambios: Partial<Ejercicio>) {
  await db.ejercicios.update(ejercicioId, cambios)
  const e = await db.ejercicios.get(ejercicioId)
  if (e) await db.rutinas.update(e.rutinaId, { actualizado: Date.now() })
}

export async function borrarEjercicio(ejercicioId: string) {
  const e = await db.ejercicios.get(ejercicioId)
  await db.ejercicios.delete(ejercicioId)
  if (e) await db.rutinas.update(e.rutinaId, { actualizado: Date.now() })
}

/** Marca o desmarca una serie concreta. Es el gesto mas frecuente de la app. */
export async function alternarSerie(ejercicio: Ejercicio, indice: number) {
  const series = ejercicio.series.map((s, i) => (i === indice ? { ...s, hecha: !s.hecha } : s))
  await actualizarEjercicio(ejercicio.id, { series })
}

export async function alternarHecho(ejercicio: Ejercicio) {
  await actualizarEjercicio(ejercicio.id, { hecho: !ejercicio.hecho })
}

/** Repite la ultima serie al final, que es lo que uno quiere el 95% de las veces. */
export async function agregarSerie(ejercicio: Ejercicio) {
  const ultima = ejercicio.series.at(-1) ?? { reps: 10, peso: 0, hecha: false }
  await actualizarEjercicio(ejercicio.id, {
    series: [...ejercicio.series, { reps: ultima.reps, peso: ultima.peso, hecha: false }],
  })
}

export async function quitarSerie(ejercicio: Ejercicio) {
  if (ejercicio.series.length <= 1) return
  await actualizarEjercicio(ejercicio.id, { series: ejercicio.series.slice(0, -1) })
}

// --- Autocompletado ---

/**
 * Construye las sugerencias desde el historial propio: cada nombre usado antes,
 * con los numeros de la ultima vez ya cargados. No hay catalogo precargado.
 */
export async function sugerencias(): Promise<Sugerencia[]> {
  const [ejercicios, rutinas] = await Promise.all([db.ejercicios.toArray(), db.rutinas.toArray()])
  const fechaDe = new Map(rutinas.map((r) => [r.id, r.fecha]))

  const porNombre = new Map<string, Sugerencia>()
  for (const e of ejercicios) {
    const fecha = fechaDe.get(e.rutinaId) ?? ''
    const previa = porNombre.get(e.nombre)
    if (!previa) {
      porNombre.set(e.nombre, {
        nombre: e.nombre,
        tipo: e.tipo,
        series: e.series.map((s) => ({ ...s, hecha: false })),
        tiempoMin: e.tiempoMin,
        distanciaKm: e.distanciaKm,
        veces: 1,
        ultimaFecha: fecha,
      })
      continue
    }
    previa.veces += 1
    if (fecha >= previa.ultimaFecha) {
      previa.tipo = e.tipo
      previa.series = e.series.map((s) => ({ ...s, hecha: false }))
      previa.tiempoMin = e.tiempoMin
      previa.distanciaKm = e.distanciaKm
      previa.ultimaFecha = fecha
    }
  }

  // Lo reciente pesa mas que lo frecuente: lo que hiciste ayer es lo que repetiras hoy.
  return [...porNombre.values()].sort(
    (a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha) || b.veces - a.veces,
  )
}

// --- Respaldo ---

export interface Respaldo {
  formato: 1
  exportado: string
  rutinas: Rutina[]
  ejercicios: Ejercicio[]
}

export async function exportar(): Promise<Respaldo> {
  const [rutinas, ejercicios] = await Promise.all([db.rutinas.toArray(), db.ejercicios.toArray()])
  return { formato: 1, exportado: new Date().toISOString(), rutinas, ejercicios }
}

/** Importa reemplazando todo. Devuelve cuantas rutinas entraron. */
export async function importar(datos: unknown): Promise<number> {
  const r = datos as Partial<Respaldo>
  if (!r || r.formato !== 1 || !Array.isArray(r.rutinas) || !Array.isArray(r.ejercicios)) {
    throw new Error('El archivo no tiene el formato de respaldo de esta app.')
  }
  await db.transaction('rw', db.rutinas, db.ejercicios, async () => {
    await db.rutinas.clear()
    await db.ejercicios.clear()
    await db.rutinas.bulkAdd(r.rutinas as Rutina[])
    await db.ejercicios.bulkAdd(r.ejercicios as Ejercicio[])
  })
  return r.rutinas.length
}

export async function borrarTodo() {
  await db.transaction('rw', db.rutinas, db.ejercicios, async () => {
    await db.rutinas.clear()
    await db.ejercicios.clear()
  })
}
