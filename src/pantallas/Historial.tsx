import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, hoyISO } from '../db'
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
import EditorDia from '../componentes/EditorDia'
import Hoja from '../componentes/Hoja'
import { IconoAtras, IconoCalendario, IconoDerecha } from '../componentes/Iconos'

interface Dia {
  fecha: string
  rutinas: { rutina: Rutina; ejercicios: Ejercicio[] }[]
  completos: number
  total: number
  futuro: boolean
}

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
    const es = (porRutina.get(r.id) ?? []).sort((a, b) => a.orden - b.orden)
    if (es.length === 0) continue // las rutinas vacias no ensucian el historial
    const dia = porFecha.get(r.fecha) ?? {
      fecha: r.fecha,
      rutinas: [],
      completos: 0,
      total: 0,
      futuro: diasDesdeHoy(r.fecha) > 0,
    }
    dia.rutinas.push({ rutina: r, ejercicios: es })
    dia.completos += es.filter(estaCompleto).length
    dia.total += es.length
    porFecha.set(r.fecha, dia)
  }

  const dias = [...porFecha.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))
  for (const d of dias) d.rutinas.sort((a, b) => a.rutina.orden - b.rutina.orden)
  return dias
}

/** Un dia cualquiera abierto para editar, con la misma interfaz que "Hoy". */
function DiaAbierto({ fecha, onVolver }: { fecha: string; onVolver: () => void }) {
  const etiqueta = etiquetaDia(fecha)
  const futuro = diasDesdeHoy(fecha) > 0

  return (
    <>
      <div className="cabecera con-atras">
        <button className="icono-btn" onClick={onVolver} aria-label="Volver al historial">
          <IconoAtras />
        </button>
        <div style={{ minWidth: 0 }}>
          <h1>{etiqueta ?? fechaLarga(fecha)}</h1>
          <div className="sub">{etiqueta ? fechaLarga(fecha) : futuro ? 'Día planificado' : 'Editando'}</div>
        </div>
      </div>

      <EditorDia fecha={fecha} textoAgregar={futuro ? 'Planificar ejercicio' : 'Agregar ejercicio'} />
    </>
  )
}

/** Elige cualquier fecha, pasada o futura, para abrirla. */
function HojaFecha({ onElegir, onCerrar }: { onElegir: (f: string) => void; onCerrar: () => void }) {
  const enDias = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return hoyISO(d)
  }
  const [fecha, setFecha] = useState(enDias(1))

  const atajos = [
    { texto: 'Hoy', dias: 0 },
    { texto: 'Mañana', dias: 1 },
    { texto: 'Pasado mañana', dias: 2 },
  ]

  return (
    <Hoja titulo="Abrir otro día" onCerrar={onCerrar}>
      <div className="hoja-cuerpo">
        <div className="campo">
          <label>Atajos</label>
          <div className="segmentado">
            {atajos.map((a) => (
              <button
                key={a.texto}
                aria-pressed={fecha === enDias(a.dias)}
                onClick={() => setFecha(enDias(a.dias))}
              >
                {a.texto}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="fecha-elegida">O cualquier fecha</label>
          <input
            id="fecha-elegida"
            type="date"
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
          />
        </div>

        <p className="nota">
          Puedes abrir un día que ya pasó para corregirlo, o uno futuro para dejar la rutina
          preparada. Al llegar ese día la vas a encontrar lista en "Hoy".
        </p>
      </div>

      <div className="hoja-pie">
        <button className="btn" onClick={() => onElegir(fecha)}>
          Abrir {fechaLarga(fecha).toLowerCase()}
        </button>
      </div>
    </Hoja>
  )
}

function BloqueDia({ dia, onAbrir }: { dia: Dia; onAbrir: () => void }) {
  const etiqueta = etiquetaDia(dia.fecha)

  return (
    <article className={`dia${dia.futuro ? ' planificado' : ''}`}>
      <button className="dia-cab" onClick={onAbrir}>
        <span className="fecha">{fechaLarga(dia.fecha)}</span>
        {etiqueta && <span className="pastilla">{etiqueta}</span>}
        <span className="cuenta">
          {dia.futuro ? `${dia.total} ejercicios` : `${dia.completos}/${dia.total}`}
        </span>
        <IconoDerecha size={16} />
      </button>

      {dia.rutinas.map(({ rutina, ejercicios }, i) => (
        <div className="dia-rutina" key={rutina.id}>
          <div className="titulo-rutina">
            {rutina.nombre || `Rutina ${i + 1}`}
            {!rutina.cerrada && !dia.futuro && ' · abierta'}
          </div>
          {ejercicios.map((e) => {
            const completo = estaCompleto(e)
            const parcial = seriesHechas(e) > 0 && !completo
            return (
              <div className={`resumen${completo ? '' : ' pendiente'}`} key={e.id}>
                {!dia.futuro && (
                  <span className={`marca${completo ? '' : ' pendiente'}`}>
                    {completo ? '●' : '○'}
                  </span>
                )}
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
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null)
  const [eligiendoFecha, setEligiendoFecha] = useState(false)
  const dias = useLiveQuery(cargarHistorial, [])

  if (fechaAbierta) {
    return <DiaAbierto fecha={fechaAbierta} onVolver={() => setFechaAbierta(null)} />
  }

  const futuros = dias?.filter((d) => d.futuro) ?? []
  const pasados = dias?.filter((d) => !d.futuro) ?? []

  return (
    <>
      <div className="cabecera">
        <div className="cabecera-fila">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1>Historial</h1>
            <div className="sub">
              {dias === undefined
                ? ' '
                : pasados.length === 0
                  ? 'Nada registrado aún'
                  : `${pasados.length} ${pasados.length === 1 ? 'día' : 'días'} con entrenamiento`}
            </div>
          </div>
          <button className="btn-cabecera" onClick={() => setEligiendoFecha(true)}>
            <IconoCalendario size={16} /> Otro día
          </button>
        </div>
      </div>

      <div className="contenido sin-boton">
        {dias === undefined ? null : dias.length === 0 ? (
          <div className="vacio">
            <strong>Aún no hay entrenamientos</strong>
            Lo que registres en Hoy aparecerá acá. Con "Otro día" puedes dejar preparada la
            rutina de mañana.
          </div>
        ) : (
          <>
            {futuros.length > 0 && (
              <>
                <h2 className="seccion">Planificado</h2>
                {futuros.map((dia) => (
                  <BloqueDia key={dia.fecha} dia={dia} onAbrir={() => setFechaAbierta(dia.fecha)} />
                ))}
                <h2 className="seccion">Hecho</h2>
              </>
            )}
            {pasados.map((dia) => (
              <BloqueDia key={dia.fecha} dia={dia} onAbrir={() => setFechaAbierta(dia.fecha)} />
            ))}
          </>
        )}
      </div>

      {eligiendoFecha && (
        <HojaFecha
          onCerrar={() => setEligiendoFecha(false)}
          onElegir={(f) => {
            setEligiendoFecha(false)
            setFechaAbierta(f)
          }}
        />
      )}
    </>
  )
}
