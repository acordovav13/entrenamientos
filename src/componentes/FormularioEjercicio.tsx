import { useState } from 'react'
import type { NuevoEjercicio } from '../db'
import type { Serie, TipoEjercicio } from '../tipos'

/** Las series se editan como texto para que el campo pueda quedar vacio mientras escribes. */
type SerieTexto = { reps: string; peso: string }

interface Props {
  modo: 'crear' | 'editar'
  inicial?: {
    nombre?: string
    tipo?: TipoEjercicio
    series?: Serie[]
    tiempoMin?: number
    distanciaKm?: number
  }
  nombresSugeridos?: string[]
  onGuardar: (datos: NuevoEjercicio) => void
  onBorrar?: () => void
}

const num = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function FormularioEjercicio({
  modo,
  inicial,
  nombresSugeridos = [],
  onGuardar,
  onBorrar,
}: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoEjercicio>(inicial?.tipo ?? 'fuerza')
  const [series, setSeries] = useState<SerieTexto[]>(() =>
    inicial?.series?.length
      ? inicial.series.map((s) => ({ reps: String(s.reps), peso: String(s.peso) }))
      : [{ reps: '10', peso: '0' }],
  )
  const [tiempoMin, setTiempoMin] = useState(inicial?.tiempoMin ? String(inicial.tiempoMin) : '')
  const [distanciaKm, setDistanciaKm] = useState(
    inicial?.distanciaKm ? String(inicial.distanciaKm) : '',
  )

  const cambiarSerie = (i: number, campo: keyof SerieTexto, valor: string) =>
    setSeries((prev) => prev.map((s, j) => (j === i ? { ...s, [campo]: valor } : s)))

  // La serie nueva copia a la anterior: casi siempre repites el mismo peso y reps.
  const agregarFila = () =>
    setSeries((prev) => [...prev, { ...(prev.at(-1) ?? { reps: '10', peso: '0' }) }])

  const quitarFila = () => setSeries((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))

  const valido =
    nombre.trim().length > 0 &&
    (tipo === 'fuerza' ? series.length > 0 : num(tiempoMin) > 0 || num(distanciaKm) > 0)

  const guardar = () => {
    if (!valido) return
    onGuardar({
      nombre: nombre.trim(),
      tipo,
      series:
        tipo === 'fuerza'
          ? series.map((s) => ({ reps: num(s.reps), peso: num(s.peso), hecha: false }))
          : [],
      tiempoMin: tipo === 'cardio' && num(tiempoMin) > 0 ? num(tiempoMin) : undefined,
      distanciaKm: tipo === 'cardio' && num(distanciaKm) > 0 ? num(distanciaKm) : undefined,
    })
  }

  return (
    <>
      <div className="hoja-cuerpo">
        <div className="campo">
          <label htmlFor="nombre-ejercicio">Ejercicio</label>
          <input
            id="nombre-ejercicio"
            list="nombres-ejercicio"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Press banca"
            autoFocus={modo === 'crear' && !inicial?.nombre}
            autoComplete="off"
          />
          <datalist id="nombres-ejercicio">
            {nombresSugeridos.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div className="campo">
          <label>Tipo</label>
          <div className="segmentado">
            <button aria-pressed={tipo === 'fuerza'} onClick={() => setTipo('fuerza')}>
              Fuerza
            </button>
            <button aria-pressed={tipo === 'cardio'} onClick={() => setTipo('cardio')}>
              Cardio
            </button>
          </div>
        </div>

        {tipo === 'fuerza' ? (
          <div className="campo">
            <label>Series: repeticiones y kilos (0 kg es peso corporal)</label>
            <div className="filas-serie">
              {series.map((s, i) => (
                <div className="fila" key={i}>
                  <span className="num">{i + 1}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={s.reps}
                    onChange={(e) => cambiarSerie(i, 'reps', e.target.value)}
                    aria-label={`Repeticiones de la serie ${i + 1}`}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={s.peso}
                    onChange={(e) => cambiarSerie(i, 'peso', e.target.value)}
                    aria-label={`Kilos de la serie ${i + 1}`}
                  />
                </div>
              ))}
            </div>
            <div className="fila" style={{ marginTop: 8 }}>
              <button className="btn secundario" onClick={quitarFila} disabled={series.length <= 1}>
                Quitar serie
              </button>
              <button className="btn secundario" onClick={agregarFila}>
                Agregar serie
              </button>
            </div>
          </div>
        ) : (
          <div className="campo">
            <label>Medida: minutos y/o kilómetros</label>
            <div className="fila">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={tiempoMin}
                onChange={(e) => setTiempoMin(e.target.value)}
                placeholder="minutos"
                aria-label="Minutos"
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={distanciaKm}
                onChange={(e) => setDistanciaKm(e.target.value)}
                placeholder="km"
                aria-label="Kilómetros"
              />
            </div>
          </div>
        )}

        {onBorrar && (
          <button className="btn peligro" onClick={onBorrar}>
            Borrar ejercicio
          </button>
        )}
      </div>

      <div className="hoja-pie">
        <button className="btn" onClick={guardar} disabled={!valido}>
          {modo === 'crear' ? 'Agregar' : 'Guardar'}
        </button>
      </div>
    </>
  )
}
