import { fechaCorta } from '../formato'
import type { SerieProgreso } from '../progreso'

/** Lienzo en coordenadas propias; el SVG se estira al ancho que haya. */
const ANCHO = 320
const ALTO = 140
const MARGEN = { arriba: 12, abajo: 22, izq: 34, der: 10 }

const numero = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))

export default function GraficoProgreso({ serie }: { serie: SerieProgreso }) {
  const { puntos, unidad } = serie

  if (puntos.length < 2) {
    return (
      <p className="nota" style={{ padding: '18px 0' }}>
        {puntos.length === 0
          ? 'Todavía no hay series marcadas como hechas para este ejercicio.'
          : 'Con un solo día registrado no hay progreso que dibujar. Vuelve después del próximo.'}
      </p>
    )
  }

  const valores = puntos.map((p) => p.valor)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  // Si todo vale lo mismo, el rango seria 0 y la linea se iria al infinito.
  const rango = max - min || Math.max(max, 1) * 0.2

  const tiempos = puntos.map((p) => new Date(p.fecha + 'T12:00:00').getTime())
  const t0 = tiempos[0]
  const spanT = tiempos[tiempos.length - 1] - t0 || 1

  const anchoUtil = ANCHO - MARGEN.izq - MARGEN.der
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo

  const x = (i: number) => MARGEN.izq + ((tiempos[i] - t0) / spanT) * anchoUtil
  const y = (v: number) => MARGEN.arriba + altoUtil - ((v - (min - rango * 0.15)) / (rango * 1.3)) * altoUtil

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${linea} L${x(puntos.length - 1).toFixed(1)},${ALTO - MARGEN.abajo} L${x(0).toFixed(1)},${ALTO - MARGEN.abajo} Z`

  const primero = puntos[0].valor
  const ultimo = puntos[puntos.length - 1].valor
  const cambio = ultimo - primero

  return (
    <>
      <svg
        className="grafico"
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Progreso de ${serie.nombre}: de ${numero(primero)} a ${numero(ultimo)} ${unidad}`}
      >
        {/* Referencias del maximo y el minimo */}
        {[max, min].map((v, i) => (
          <g key={i}>
            <line
              x1={MARGEN.izq}
              x2={ANCHO - MARGEN.der}
              y1={y(v)}
              y2={y(v)}
              className="grafico-guia"
            />
            <text x={MARGEN.izq - 5} y={y(v) + 3.5} className="grafico-etiqueta" textAnchor="end">
              {numero(v)}
            </text>
          </g>
        ))}

        <path d={area} className="grafico-area" />
        <path d={linea} className="grafico-linea" />

        {puntos.map((p, i) => (
          <circle key={p.fecha} cx={x(i)} cy={y(p.valor)} r={2.6} className="grafico-punto" />
        ))}

        <text x={MARGEN.izq} y={ALTO - 6} className="grafico-etiqueta">
          {fechaCorta(puntos[0].fecha)}
        </text>
        <text x={ANCHO - MARGEN.der} y={ALTO - 6} className="grafico-etiqueta" textAnchor="end">
          {fechaCorta(puntos[puntos.length - 1].fecha)}
        </text>
      </svg>

      <div className="resumen-progreso">
        <span>
          {numero(primero)} → <strong>{numero(ultimo)}</strong> {unidad}
        </span>
        <span className={cambio > 0 ? 'sube' : cambio < 0 ? 'baja' : ''}>
          {cambio > 0 ? '+' : ''}
          {numero(cambio)} {unidad} en {puntos.length} sesiones
        </span>
      </div>
    </>
  )
}
