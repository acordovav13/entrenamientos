import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  diasDesdeHoy,
  estaCompleto,
  etiquetaDia,
  fechaCorta,
  fechaLarga,
  resumenEjercicio,
  seriesHechas,
  seriesTotales,
} from '../formato'
import { ejerciciosConHistorial, progresoDe } from '../progreso'
import type { Ejercicio, Rutina } from '../tipos'
import Calendario from '../componentes/Calendario'
import GraficoProgreso from '../componentes/GraficoProgreso'

type Vista = 'lista' | 'calendario' | 'progreso'

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

function VistaCalendario({ dias }: { dias: Dia[] }) {
  const [elegida, setElegida] = useState<string | null>(null)
  const dia = dias.find((d) => d.fecha === elegida)

  return (
    <>
      <Calendario
        fechaElegida={elegida}
        onElegirDia={(f) => setElegida((previa) => (previa === f ? null : f))}
      />
      {dia ? (
        <BloqueDia dia={dia} />
      ) : (
        <p className="nota" style={{ textAlign: 'center' }}>
          Toca un día marcado para ver qué entrenaste.
        </p>
      )}
    </>
  )
}

function VistaProgreso() {
  const ejercicios = useLiveQuery(ejerciciosConHistorial, [], [])
  const [elegido, setElegido] = useState<string | null>(null)

  // Por defecto, el que mas has repetido: es del que mas quieres ver la linea.
  const nombre = elegido ?? ejercicios[0]?.nombre ?? null
  const serie = useLiveQuery(() => (nombre ? progresoDe(nombre) : undefined), [nombre])

  if (ejercicios.length === 0) {
    return (
      <div className="vacio">
        <strong>Sin datos todavía</strong>
        Cuando registres el mismo ejercicio varias veces, acá vas a ver si sube o se estanca.
      </div>
    )
  }

  return (
    <>
      <div className="campo">
        <label htmlFor="ejercicio-progreso">Ejercicio</label>
        <select
          id="ejercicio-progreso"
          value={nombre ?? ''}
          onChange={(e) => setElegido(e.target.value)}
        >
          {ejercicios.map((e) => (
            <option key={e.nombre} value={e.nombre}>
              {e.nombre} ({e.veces})
            </option>
          ))}
        </select>
      </div>

      {serie && (
        <div className="grupo">
          <GraficoProgreso serie={serie} />
          <p className="nota" style={{ marginTop: 10 }}>
            {serie.explicacion}.
          </p>
        </div>
      )}

      {serie && serie.puntos.length > 0 && (
        <div className="grupo">
          <h2>Día por día</h2>
          {[...serie.puntos].reverse().map((p) => (
            <div className="resumen" key={p.fecha}>
              <span className="nombre">{fechaCorta(p.fecha)}</span>
              <span className="datos">{p.detalle}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function Historial() {
  const [vista, setVista] = useState<Vista>('lista')
  const dias = useLiveQuery(cargarHistorial, [])

  const vistas: { id: Vista; texto: string }[] = [
    { id: 'lista', texto: 'Lista' },
    { id: 'calendario', texto: 'Calendario' },
    { id: 'progreso', texto: 'Progreso' },
  ]

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

      <nav className="repisa sub" aria-label="Cómo ver el historial">
        {vistas.map((v) => (
          <button
            key={v.id}
            aria-selected={vista === v.id}
            aria-current={vista === v.id ? 'page' : undefined}
            onClick={() => setVista(v.id)}
          >
            <span className="nombre">{v.texto}</span>
          </button>
        ))}
      </nav>

      <div className="contenido">
        {dias === undefined ? null : dias.length === 0 ? (
          <div className="vacio">
            <strong>Aún no hay entrenamientos</strong>
            Lo que registres en Entrenar aparecerá acá.
          </div>
        ) : vista === 'lista' ? (
          dias.map((dia) => <BloqueDia key={dia.fecha} dia={dia} />)
        ) : vista === 'calendario' ? (
          <VistaCalendario dias={dias} />
        ) : (
          <VistaProgreso />
        )}
      </div>
    </>
  )
}
