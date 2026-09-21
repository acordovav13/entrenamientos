import { agregarSerie, alternarHecho, alternarSerie } from '../db'
import {
  estaCompleto,
  numero,
  resumenCardio,
  resumenEjercicio,
  seriesHechas,
  seriesTotales,
} from '../formato'
import type { Ejercicio } from '../tipos'
import { IconoCheck, IconoPuntos } from './Iconos'

interface Props {
  ejercicio: Ejercicio
  /** Una rutina cerrada se ve pero no se toca. */
  bloqueado?: boolean
  onEditar: (e: Ejercicio) => void
}

export default function TarjetaEjercicio({ ejercicio, bloqueado, onEditar }: Props) {
  const completo = estaCompleto(ejercicio)
  const hechas = seriesHechas(ejercicio)
  const total = seriesTotales(ejercicio)

  // Rutina cerrada: una linea por ejercicio en vez de las fichas grandes. Ocupa la
  // cuarta parte y se distingue de un vistazo de lo que todavia estas entrenando.
  if (bloqueado) {
    return (
      <div className={`ejercicio-cerrado${completo ? '' : ' pendiente'}`}>
        <span className={`marca${completo ? '' : ' pendiente'}`}>
          {completo ? '●' : '○'}
        </span>
        <span className="nombre">{ejercicio.nombre}</span>
        <span className="datos">
          {resumenEjercicio(ejercicio)}
          {hechas > 0 && !completo && (
            <>
              {' · '}
              {hechas}/{total}
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <div className={`ejercicio${completo ? ' completo' : ''}`}>
      <div className="ejercicio-cab">
        <span className="ejercicio-nombre">{ejercicio.nombre}</span>
        <span className={`progreso${completo ? ' listo' : ''}`}>
          {completo ? <IconoCheck size={16} /> : `${hechas}/${total}`}
        </span>
        <button
          className="icono-btn"
          onClick={() => onEditar(ejercicio)}
          aria-label={`Editar ${ejercicio.nombre}`}
        >
          <IconoPuntos />
        </button>
      </div>

      {ejercicio.tipo === 'cardio' ? (
        <div className="series">
          <button
            className={`serie ancha${ejercicio.hecho ? ' hecha' : ''}`}
            onClick={() => alternarHecho(ejercicio)}
            aria-pressed={ejercicio.hecho}
          >
            <span className="principal">
              {resumenCardio(ejercicio.tiempoMin, ejercicio.distanciaKm)}
            </span>
            <span className="secundario">{ejercicio.hecho ? 'hecho' : 'tocar al terminar'}</span>
          </button>
        </div>
      ) : (
        <div className="series">
          {ejercicio.series.map((s, i) => (
            <button
              key={i}
              className={`serie${s.hecha ? ' hecha' : ''}`}
              onClick={() => alternarSerie(ejercicio, i)}
              aria-pressed={s.hecha}
              aria-label={`Serie ${i + 1}: ${s.reps} repeticiones${s.peso ? ` con ${s.peso} kilos` : ''}`}
            >
              <span className="principal">{s.reps} reps</span>
              <span className="secundario">{s.peso > 0 ? `${numero(s.peso)} kg` : 'corporal'}</span>
            </button>
          ))}
          <button
            className="mas-serie"
            onClick={() => agregarSerie(ejercicio)}
            aria-label="Agregar otra serie igual a la última"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
