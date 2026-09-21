import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { sugerencias, type NuevoEjercicio } from '../db'
import { fechaCorta, resumenCardio, resumenSeries } from '../formato'
import type { Sugerencia } from '../tipos'
import FormularioEjercicio from './FormularioEjercicio'
import Hoja from './Hoja'
import { IconoAjustar, IconoMas } from './Iconos'

interface Props {
  onCerrar: () => void
  onAgregar: (datos: NuevoEjercicio) => void
}

/** Quita tildes para que "press militar" encuentre "Press Militar". */
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const comoNuevo = (s: Sugerencia): NuevoEjercicio => ({
  nombre: s.nombre,
  tipo: s.tipo,
  series: s.series,
  tiempoMin: s.tiempoMin,
  distanciaKm: s.distanciaKm,
})

export default function HojaAgregar({ onCerrar, onAgregar }: Props) {
  const todas = useLiveQuery(sugerencias, [])
  const [texto, setTexto] = useState('')
  const [formulario, setFormulario] = useState<Partial<Sugerencia> | null>(null)

  // Mientras la consulta no resuelve no se decide nada, para no mostrar el buscador
  // por un instante y saltar al formulario de golpe.
  if (todas === undefined) {
    return (
      <Hoja titulo="Agregar ejercicio" onCerrar={onCerrar}>
        <div className="hoja-cuerpo" style={{ minHeight: 280 }} />
      </Hoja>
    )
  }

  // Primer uso: sin historial no hay nada que sugerir, asi que se va directo al formulario.
  const mostrarFormulario = formulario !== null || todas.length === 0

  if (mostrarFormulario) {
    const inicial = formulario ?? {}
    return (
      <Hoja titulo="Nuevo ejercicio" onCerrar={onCerrar}>
        <FormularioEjercicio
          modo="crear"
          inicial={inicial}
          nombresSugeridos={todas.map((s) => s.nombre)}
          onGuardar={(datos) => {
            onAgregar(datos)
            onCerrar()
          }}
        />
      </Hoja>
    )
  }

  const filtro = normalizar(texto.trim())
  const lista = todas.filter((s) => !filtro || normalizar(s.nombre).includes(filtro))
  const hayExacto = todas.some((s) => normalizar(s.nombre) === filtro)

  return (
    <Hoja
      titulo="Agregar ejercicio"
      onCerrar={onCerrar}
      fijo={
        <div className="buscador">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar o escribir uno nuevo"
            autoFocus
            autoComplete="off"
            aria-label="Buscar ejercicio"
          />
        </div>
      }
    >
      <div className="sugerencias">
        {filtro && !hayExacto && (
          <button className="sugerencia" onClick={() => setFormulario({ nombre: texto.trim() })}>
            <span className="ajustar">
              <IconoMas size={16} />
            </span>
            <span className="texto">
              <span className="nombre">Crear "{texto.trim()}"</span>
              <span className="detalle">Ejercicio nuevo</span>
            </span>
          </button>
        )}

        {lista.map((s) => (
          <div key={s.nombre} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className="sugerencia"
              onClick={() => {
                onAgregar(comoNuevo(s))
                onCerrar()
              }}
            >
              <span className="texto">
                <span className="nombre">{s.nombre}</span>
                <span className="detalle">
                  {s.tipo === 'cardio'
                    ? resumenCardio(s.tiempoMin, s.distanciaKm)
                    : resumenSeries(s.series)}
                  {' · '}
                  {fechaCorta(s.ultimaFecha)}
                </span>
              </span>
            </button>
            <button
              className="ajustar"
              style={{ height: 38, width: 38, flexShrink: 0 }}
              onClick={() => setFormulario(s)}
              aria-label={`Ajustar ${s.nombre} antes de agregar`}
            >
              <IconoAjustar />
            </button>
          </div>
        ))}

        {lista.length === 0 && !filtro && (
          <p className="vacio" style={{ padding: '24px 8px' }}>
            Escribe el nombre del ejercicio para crearlo.
          </p>
        )}
      </div>
    </Hoja>
  )
}
