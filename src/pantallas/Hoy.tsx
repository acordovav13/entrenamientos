import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  actualizarEjercicio,
  agregarEjercicio,
  borrarEjercicio,
  borrarRutina,
  cerrarRutina,
  ejerciciosDe,
  hoyISO,
  nombresDeRutina,
  renombrarRutina,
  rutinasDe,
  sugerencias,
  type NuevoEjercicio,
} from '../db'
import { fechaLarga } from '../formato'
import type { Ejercicio } from '../tipos'
import FormularioEjercicio from '../componentes/FormularioEjercicio'
import Hoja from '../componentes/Hoja'
import HojaAgregar from '../componentes/HojaAgregar'
import TarjetaEjercicio from '../componentes/TarjetaEjercicio'
import { IconoCandado, IconoMas } from '../componentes/Iconos'

export default function Hoy() {
  const fecha = hoyISO()
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<Ejercicio | null>(null)

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

  const alAgregar = async (datos: NuevoEjercicio) => {
    await agregarEjercicio(fecha, datos)
  }

  return (
    <>
      <div className="cabecera">
        <h1>Hoy</h1>
        <div className="sub">{fechaLarga(fecha)}</div>
      </div>

      <div className="contenido">
        {dia === undefined ? null : dia.length === 0 ? (
          <div className="vacio">
            <strong>Sin ejercicios todavía</strong>
            Toca "Agregar ejercicio" y la rutina de hoy empieza sola.
          </div>
        ) : (
          dia.map(({ rutina, ejercicios }) => (
            <section key={rutina.id} className={`rutina${rutina.cerrada ? ' cerrada' : ''}`}>
              <header className="rutina-cab">
                {/* Se guarda en cada tecla, no al salir del campo: si cierras la app
                    a mitad de escribir el nombre, igual queda guardado. */}
                <input
                  list="nombres-rutina"
                  defaultValue={rutina.nombre ?? ''}
                  placeholder={dia.length > 1 ? `Rutina ${rutina.orden + 1}` : 'Sin nombre'}
                  onChange={(e) => renombrarRutina(rutina.id, e.target.value)}
                  aria-label="Nombre de la rutina"
                />
                {rutina.cerrada ? (
                  <span className="etiqueta">
                    <IconoCandado size={11} /> Cerrada
                  </span>
                ) : (
                  <span className="etiqueta viva">En curso</span>
                )}
                <button
                  className="icono-btn"
                  style={{ width: 'auto', padding: '0 10px', fontSize: 13 }}
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
            </section>
          ))
        )}

        <datalist id="nombres-rutina">
          {nombresRutina.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <button className="agregar" onClick={() => setAgregando(true)}>
        <IconoMas size={18} /> Agregar ejercicio
      </button>

      {agregando && <HojaAgregar onCerrar={() => setAgregando(false)} onAgregar={alAgregar} />}

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
              await borrarEjercicio(editando.id)
              setEditando(null)
            }}
          />
        </Hoja>
      )}
    </>
  )
}
