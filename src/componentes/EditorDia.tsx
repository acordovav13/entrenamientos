import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  actualizarEjercicio,
  agregarEjercicio,
  borrarEjercicio,
  borrarRutina,
  cerrarRutina,
  ejerciciosDe,
  nombresDeRutina,
  renombrarRutina,
  rutinasDe,
  sugerencias,
  type NuevoEjercicio,
} from '../db'
import { diasDesdeHoy } from '../formato'
import type { Ejercicio } from '../tipos'
import FormularioEjercicio from './FormularioEjercicio'
import Hoja from './Hoja'
import HojaAgregar from './HojaAgregar'
import TarjetaEjercicio from './TarjetaEjercicio'
import { IconoCandado, IconoMas, IconoPapelera } from './Iconos'

interface Props {
  /** YYYY-MM-DD. Sirve para hoy o para cualquier dia futuro. */
  fecha: string
}

/** Donde cae el ejercicio que se esta agregando: una rutina concreta o una nueva. */
type Destino = string | 'nueva'

export default function EditorDia({ fecha }: Props) {
  const [agregandoEn, setAgregandoEn] = useState<Destino | null>(null)
  const [editando, setEditando] = useState<Ejercicio | null>(null)
  const esFuturo = diasDesdeHoy(fecha) > 0

  const dia = useLiveQuery(async () => {
    const rutinas = await rutinasDe(fecha)
    const ejercicios = await Promise.all(rutinas.map((r) => ejerciciosDe(r.id)))
    return rutinas.map((rutina, i) => ({ rutina, ejercicios: ejercicios[i] }))
  }, [fecha])

  const nombresRutina = useLiveQuery(nombresDeRutina, [], [] as string[])
  const nombresEjercicio = useLiveQuery(
    async () => (await sugerencias()).map((s) => s.nombre),
    [],
    [] as string[],
  )

  const verbo = esFuturo ? 'Planificar' : 'Agregar'

  return (
    <>
      <div className="contenido">
        {dia === undefined ? null : dia.length === 0 ? (
          <div className="vacio">
            <strong>{esFuturo ? 'Día sin planificar' : 'Sin ejercicios todavía'}</strong>
            La rutina empieza sola con el primer ejercicio.
            <button className="btn" onClick={() => setAgregandoEn('nueva')}>
              <IconoMas size={17} /> {verbo} ejercicio
            </button>
          </div>
        ) : (
          <>
            {dia.map(({ rutina, ejercicios }) => (
              <section key={rutina.id} className={`rutina${rutina.cerrada ? ' cerrada' : ''}`}>
                <header className="rutina-cab">
                  {rutina.cerrada && <IconoCandado size={13} />}
                  {/* Se guarda en cada tecla, no al salir del campo: si cierras la app
                      a mitad de escribir el nombre, igual queda guardado. */}
                  <input
                    list="nombres-rutina"
                    defaultValue={rutina.nombre ?? ''}
                    placeholder={dia.length > 1 ? `Rutina ${rutina.orden + 1}` : 'Sin nombre'}
                    onChange={(e) => renombrarRutina(rutina.id, e.target.value)}
                    disabled={rutina.cerrada}
                    aria-label="Nombre de la rutina"
                  />
                  <button
                    className="abrir-cerrar"
                    onClick={() => cerrarRutina(rutina.id, !rutina.cerrada)}
                  >
                    {rutina.cerrada ? 'Reabrir' : 'Cerrar'}
                  </button>
                </header>

                {ejercicios.length === 0 ? (
                  <div className="ejercicio">
                    <span className="progreso">Rutina vacía.</span>{' '}
                    <button
                      className="progreso"
                      style={{ color: 'var(--peligro)', textDecoration: 'underline' }}
                      onClick={() => borrarRutina(rutina.id)}
                    >
                      Descartar
                    </button>
                  </div>
                ) : (
                  ejercicios.map((e) => (
                    <TarjetaEjercicio
                      key={e.id}
                      ejercicio={e}
                      bloqueado={rutina.cerrada}
                      onEditar={setEditando}
                    />
                  ))
                )}

                {/* Cada rutina abierta recibe lo suyo sin que haya que cerrar las demas. */}
                {!rutina.cerrada && ejercicios.length > 0 && (
                  <div className="pie-fila">
                    <button className="pie-rutina" onClick={() => setAgregandoEn(rutina.id)}>
                      <IconoMas size={15} /> {verbo} en esta rutina
                    </button>
                    <button
                      className="pie-borrar"
                      aria-label="Borrar esta rutina"
                      onClick={() => {
                        const cuantos = ejercicios.length
                        const nombre = rutina.nombre ? `"${rutina.nombre}"` : 'esta rutina'
                        if (
                          confirm(
                            `Se borra ${nombre} con sus ${cuantos} ejercicios. No se puede deshacer.`,
                          )
                        ) {
                          borrarRutina(rutina.id)
                        }
                      }}
                    >
                      <IconoPapelera />
                    </button>
                  </div>
                )}
              </section>
            ))}

            <button className="nueva-rutina" onClick={() => setAgregandoEn('nueva')}>
              <IconoMas size={15} /> Nueva rutina de este día
            </button>
          </>
        )}

        <datalist id="nombres-rutina">
          {nombresRutina.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      {agregandoEn && (
        <HojaAgregar
          onCerrar={() => setAgregandoEn(null)}
          onAgregar={(datos: NuevoEjercicio) => agregarEjercicio(fecha, datos, agregandoEn)}
        />
      )}

      {editando && (
        <Hoja titulo="Editar ejercicio" onCerrar={() => setEditando(null)}>
          <FormularioEjercicio
            modo="editar"
            inicial={editando}
            nombresSugeridos={nombresEjercicio}
            onGuardar={async (datos) => {
              // Al editar se conservan las series ya marcadas mientras no cambie su cantidad.
              const series = datos.series ?? []
              await actualizarEjercicio(editando.id, {
                nombre: datos.nombre,
                tipo: datos.tipo,
                series: series.map((s, i) => ({ ...s, hecha: editando.series[i]?.hecha ?? false })),
                tiempoMin: datos.tiempoMin,
                distanciaKm: datos.distanciaKm,
              })
              setEditando(null)
            }}
            onBorrar={async () => {
              // Un toque mal dado borraba el ejercicio sin aviso y sin deshacer.
              if (!confirm(`Se borra "${editando.nombre}". No se puede deshacer.`)) return
              await borrarEjercicio(editando.id)
              setEditando(null)
            }}
          />
        </Hoja>
      )}
    </>
  )
}
