import { useState } from 'react'
import { hoyISO } from '../db'
import { diaMes, diaSemanaCorto, diasDesdeHoy, fechaLarga } from '../formato'
import EditorDia from '../componentes/EditorDia'
import Hoja from '../componentes/Hoja'
import { IconoCalendario } from '../componentes/Iconos'

/** Los cuatro dias que siempre estan a un toque: hoy y los tres siguientes. */
const FIJOS = [0, 1, 2, 3]

function enDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return hoyISO(d)
}

function nombreDe(desplazamiento: number, fecha: string): string {
  switch (desplazamiento) {
    case 0:
      return 'Hoy'
    case 1:
      return 'Mañana'
    case 2:
      return 'Pasado'
    default:
      return diaSemanaCorto(fecha)
  }
}

/** Calendario para cualquier otro dia futuro. */
function HojaCalendario({
  inicial,
  onElegir,
  onCerrar,
}: {
  inicial: string
  onElegir: (f: string) => void
  onCerrar: () => void
}) {
  const [fecha, setFecha] = useState(inicial)

  return (
    <Hoja titulo="Elegir otro día" onCerrar={onCerrar}>
      <div className="hoja-cuerpo">
        <div className="campo">
          <label htmlFor="fecha-elegida">Fecha</label>
          <input
            id="fecha-elegida"
            type="date"
            min={hoyISO()}
            value={fecha}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            autoFocus
          />
        </div>
        <p className="nota">
          Deja preparada la rutina de cualquier día. Cuando llegue esa fecha la vas a
          encontrar lista en "Hoy".
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

export default function Entrenar() {
  const [fecha, setFecha] = useState(hoyISO())
  const [abriendoCalendario, setAbriendoCalendario] = useState(false)

  const desplazamiento = diasDesdeHoy(fecha)
  const esOtroDia = !FIJOS.includes(desplazamiento)

  return (
    <>
      {/* Repisa de dias: hoy y los proximos a un toque, mas el calendario para el resto. */}
      <nav className="repisa" aria-label="Día que estás viendo">
        {FIJOS.map((n) => {
          const f = enDias(n)
          const activo = f === fecha
          return (
            <button
              key={n}
              aria-selected={activo}
              aria-current={activo ? 'page' : undefined}
              onClick={() => setFecha(f)}
            >
              <span className="nombre">{nombreDe(n, f)}</span>
              <span className="fecha">{diaMes(f)}</span>
            </button>
          )
        })}

        <button
          className="calendario"
          aria-selected={esOtroDia}
          onClick={() => setAbriendoCalendario(true)}
          aria-label="Elegir otro día en el calendario"
        >
          <IconoCalendario size={17} />
          {esOtroDia && <span className="fecha">{diaMes(fecha)}</span>}
        </button>
      </nav>

      <EditorDia fecha={fecha} />

      {abriendoCalendario && (
        <HojaCalendario
          inicial={esOtroDia ? fecha : enDias(4)}
          onCerrar={() => setAbriendoCalendario(false)}
          onElegir={(f) => {
            setFecha(f)
            setAbriendoCalendario(false)
          }}
        />
      )}
    </>
  )
}
