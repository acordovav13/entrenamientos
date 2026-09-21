import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  diasDesdeHoy,
  estaCompleto,
  etiquetaDia,
  fechaLarga,
  resumenEjercicio,
  seriesHechas,
  seriesTotales,
} from '../formato'
import type { Ejercicio, Rutina } from '../tipos'

interface Dia {
  fecha: string
  rutinas: { rutina: Rutina; ejercicios: Ejercicio[] }[]
  completos: number
  total: number
}

/**
 * El historial es de solo lectura: lo que ya pasó se mira, no se toca.
 * Los días futuros no salen acá; se planifican y editan desde "Entrenar".
 */
async function cargarHistorial(): Promise<Dia[]> {
  const [rutinas, ejercicios] = await Promise.all([db.rutinas.toArray(), db.ejercicios.toArray()])

  const porRutina = new Map<string, Ejercicio[]>()
  for (const e of ejercicios) {
    const lista = porRutina.get(e.rutinaId) ?? []
    lista.push(e)
    porRutina.set(e.rutinaId, lista)
  }

  const porFecha = new Map<string, Dia>()
  for (const r of rutinas) {
    if (diasDesdeHoy(r.fecha) > 0) continue // lo planificado todavia no es historial
    const es = (porRutina.get(r.id) ?? []).sort((a, b) => a.orden - b.orden)
    if (es.length === 0) continue // las rutinas vacias no ensucian el historial
    const dia = porFecha.get(r.fecha) ?? { fecha: r.fecha, rutinas: [], completos: 0, total: 0 }
    dia.rutinas.push({ rutina: r, ejercicios: es })
    dia.completos += es.filter(estaCompleto).length
    dia.total += es.length
    porFecha.set(r.fecha, dia)
  }

  const dias = [...porFecha.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))
  for (const d of dias) d.rutinas.sort((a, b) => a.rutina.orden - b.rutina.orden)
  return dias
}

function BloqueDia({ dia }: { dia: Dia }) {
  const etiqueta = etiquetaDia(dia.fecha)

  return (
    <article className="dia">
      <div className="dia-cab">
        <span className="fecha">{fechaLarga(dia.fecha)}</span>
        {etiqueta && <span className="pastilla">{etiqueta}</span>}
        <span className="cuenta">
          {dia.completos}/{dia.total}
        </span>
      </div>

      {dia.rutinas.map(({ rutina, ejercicios }, i) => (
        <div className="dia-rutina" key={rutina.id}>
          <div className="titulo-rutina">
            {rutina.nombre || `Rutina ${i + 1}`}
            {!rutina.cerrada && ' · abierta'}
          </div>
          {ejercicios.map((e) => {
            const completo = estaCompleto(e)
            const parcial = seriesHechas(e) > 0 && !completo
            return (
              <div className={`resumen${completo ? '' : ' pendiente'}`} key={e.id}>
                <span className={`marca${completo ? '' : ' pendiente'}`}>
                  {completo ? '●' : '○'}
                </span>
                <span className="nombre">{e.nombre}</span>
                <span className="datos">
                  {resumenEjercicio(e)}
                  {parcial && (
                    <>
                      {' · '}
                      {seriesHechas(e)}/{seriesTotales(e)}
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </article>
  )
}

export default function Historial() {
  const dias = useLiveQuery(cargarHistorial, [])

  return (
    <>
      <div className="cabecera">
        <h1>Historial</h1>
        <div className="sub">
          {dias === undefined
            ? ' '
            : dias.length === 0
              ? 'Nada registrado aún'
              : `${dias.length} ${dias.length === 1 ? 'día' : 'días'} con entrenamiento`}
        </div>
      </div>

      <div className="contenido sin-boton">
        {dias === undefined ? null : dias.length === 0 ? (
          <div className="vacio">
            <strong>Aún no hay entrenamientos</strong>
            Lo que registres en Entrenar aparecerá acá.
          </div>
        ) : (
          dias.map((dia) => <BloqueDia key={dia.fecha} dia={dia} />)
        )}
      </div>
    </>
  )
}
