import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { hoyISO } from '../db'
import { contar } from '../formato'
import { diasDelMes } from '../progreso'
import { IconoAtras, IconoDerecha } from './Iconos'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const mesLargo = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' })

/** Solo la primera letra: "Octubre de 2026", no "Octubre De 2026". */
const tituloMes = (d: Date) => {
  const s = mesLargo.format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface Props {
  /** Se avisa al tocar un dia con entrenamiento, para mostrarlo debajo. */
  onElegirDia: (fecha: string) => void
  fechaElegida: string | null
}

export default function Calendario({ onElegirDia, fechaElegida }: Props) {
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth())

  const marcados = useLiveQuery(() => diasDelMes(anio, mes), [anio, mes])
  const hoy = hoyISO()

  const mover = (delta: number) => {
    const d = new Date(anio, mes + delta, 1)
    setAnio(d.getFullYear())
    setMes(d.getMonth())
  }

  // La semana empieza el lunes: getDay() devuelve 0 para domingo.
  const primero = new Date(anio, mes, 1)
  const huecoInicial = (primero.getDay() + 6) % 7
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const celdas: (number | null)[] = [
    ...Array(huecoInicial).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]

  const iso = (dia: number) =>
    `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  // No tiene sentido navegar a meses que todavia no existen.
  const hayFuturo = new Date(anio, mes + 1, 1) <= new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  return (
    <div className="calendario">
      <header className="calendario-cab">
        <button className="icono-btn" onClick={() => mover(-1)} aria-label="Mes anterior">
          <IconoAtras size={18} />
        </button>
        <h2>{tituloMes(primero)}</h2>
        <button
          className="icono-btn"
          onClick={() => mover(1)}
          disabled={!hayFuturo}
          aria-label="Mes siguiente"
        >
          <IconoDerecha size={18} />
        </button>
      </header>

      <div className="calendario-dias" aria-hidden="true">
        {DIAS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="calendario-rejilla">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`h${i}`} />
          const fecha = iso(dia)
          const marca = marcados?.get(fecha)
          const todoHecho = marca && marca.completos === marca.total

          if (!marca) {
            return (
              <span key={fecha} className={`celda${fecha === hoy ? ' hoy' : ''}`}>
                {dia}
              </span>
            )
          }

          return (
            <button
              key={fecha}
              className={`celda entrenado${fecha === hoy ? ' hoy' : ''}${
                fechaElegida === fecha ? ' elegida' : ''
              }${todoHecho ? '' : ' parcial'}`}
              onClick={() => onElegirDia(fecha)}
              aria-label={`${dia}: ${marca.completos} de ${contar(marca.total, 'ejercicio')} completados`}
            >
              {dia}
            </button>
          )
        })}
      </div>

      <p className="leyenda">
        <span className="punto-leyenda" /> entrenado
        <span className="punto-leyenda parcial" /> a medias
      </p>
    </div>
  )
}
