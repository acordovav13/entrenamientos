import { useState } from 'react'
import { importar } from '../db'
import {
  bajarCopia,
  clientId,
  desconectar,
  estaConfigurado,
  guardarClientId,
  listarCopias,
  nombreArchivo,
  respaldarAhora,
  type CopiaEnDrive,
} from '../drive'
import { contar } from '../formato'
import { useRespaldo } from '../useRespaldo'

const cuandoTexto = (d: Date | null) => {
  if (!d) return 'Nunca'
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (dias === 0) return `Hoy, ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}

export default function RespaldoDrive() {
  const respaldo = useRespaldo()
  const [campo, setCampo] = useState(clientId() ?? '')
  const [bajando, setBajando] = useState(false)
  const [copias, setCopias] = useState<CopiaEnDrive[] | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null)

  const error = (e: unknown, otro: string) =>
    setAviso({ texto: e instanceof Error ? e.message : otro, error: true })

  const alGuardarId = () => {
    guardarClientId(campo)
    setAviso(
      estaConfigurado()
        ? { texto: 'ID guardado. Ya puedes respaldar.' }
        : { texto: 'El ID quedó vacío.', error: true },
    )
  }

  // Los dos botones llaman a Drive sin un await antes: la ventana de Google tiene
  // que abrirse dentro del clic, o el navegador la bloquea por emergente.
  const alSubir = async () => {
    setAviso(null)
    try {
      const { rutinas } = await respaldarAhora()
      setAviso({ texto: `Listo: ${contar(rutinas, 'rutina')} en tu Drive.` })
    } catch (e) {
      error(e, 'No se pudo subir.')
    }
  }

  const alRecuperar = async () => {
    setAviso(null)
    setBajando(true)
    try {
      const lista = await listarCopias()
      if (lista.length) setCopias(lista)
      else setAviso({ texto: 'En tu Drive todavía no hay ningún respaldo.', error: true })
    } catch (e) {
      error(e, 'No se pudo leer Drive.')
    } finally {
      setBajando(false)
    }
  }

  const alElegir = async (copia: CopiaEnDrive) => {
    const cual = `la copia de ${copia.nombre} (${cuandoTexto(copia.fecha).toLowerCase()})`
    if (!confirm(`Reemplaza TODO lo de este dispositivo por ${cual}. No se puede deshacer.`)) return
    setCopias(null)
    setBajando(true)
    try {
      const n = await importar(await bajarCopia(copia.id))
      setAviso({ texto: `Listo: se recuperó ${cual}, con ${contar(n, 'rutina')}.` })
    } catch (e) {
      error(e, 'No se pudo bajar.')
    } finally {
      setBajando(false)
    }
  }

  if (!respaldo.configurado) {
    return (
      <div className="grupo">
        <h2>Respaldo en Google Drive</h2>
        <p>
          Falta un paso que solo puedes hacer tú: crear un ID de cliente en Google Cloud con
          tu propia cuenta. Cuando lo tengas, pégalo acá. Se guarda solo en este dispositivo.
        </p>
        <div className="campo">
          <label htmlFor="client-id">ID de cliente de Google</label>
          <input
            id="client-id"
            value={campo}
            onChange={(e) => setCampo(e.target.value)}
            placeholder="123456-abc.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="btn" onClick={alGuardarId} disabled={!campo.trim()}>
          Guardar y activar
        </button>
        {aviso && (
          <div className={`aviso${aviso.error ? ' error' : ''}`} style={{ marginTop: 12 }}>
            {aviso.texto}
          </div>
        )}
      </div>
    )
  }

  const ocupado = respaldo.subiendo || bajando
  // Si el automatico fallo, aqui se dice por que.
  const avisoVisible =
    aviso ??
    (respaldo.fallo && respaldo.pendiente
      ? { texto: `No se pudo respaldar. ${respaldo.fallo}`, error: true }
      : null)

  return (
    <div className="grupo">
      <h2>Respaldo en Google Drive</h2>

      <div className="dato">
        <span>Último respaldo en Drive</span>
        <strong className={respaldo.ultimo ? 'si' : 'no'}>{cuandoTexto(respaldo.ultimo)}</strong>
      </div>
      <div className="dato">
        <span>Estado</span>
        {respaldo.subiendo ? (
          <strong>Subiendo…</strong>
        ) : respaldo.pendiente ? (
          <strong className="no">Cambios sin respaldar</strong>
        ) : (
          <strong className="si">Al día</strong>
        )}
      </div>

      {avisoVisible && (
        <div className={`aviso${avisoVisible.error ? ' error' : ''}`} style={{ marginBottom: 12 }}>
          {avisoVisible.texto}
        </div>
      )}

      {copias ? (
        <div className="copias">
          <p>Elige qué copia traer a este dispositivo:</p>
          {copias.map((c) => (
            <button key={c.id} className="copia" onClick={() => alElegir(c)}>
              <strong>
                {c.nombre}
                {c.propia && ' · este dispositivo'}
              </strong>
              <span>
                {cuandoTexto(c.fecha)}
                {c.rutinas !== null && ` · ${contar(c.rutinas, 'rutina')}`}
              </span>
            </button>
          ))}
          <button className="btn secundario" onClick={() => setCopias(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <button className="btn" onClick={alSubir} disabled={ocupado}>
            {respaldo.subiendo ? 'Subiendo…' : 'Respaldar ahora en Drive'}
          </button>
          <button
            className="btn secundario"
            style={{ marginTop: 10 }}
            onClick={alRecuperar}
            disabled={ocupado}
          >
            {bajando ? 'Leyendo Drive…' : 'Recuperar desde Drive'}
          </button>
        </>
      )}

      <p className="nota" style={{ marginTop: 10 }}>
        Este dispositivo guarda su copia en tu Drive como «{nombreArchivo()}», en Mi
        unidad. Cada dispositivo tiene la suya, así que no se pisan. La app solo ve los
        archivos que ella misma crea, y recuperar reemplaza todo lo de este dispositivo.
      </p>

      <button
        className="btn peligro"
        style={{ marginTop: 12 }}
        onClick={() => {
          if (!confirm('Se olvida la conexión con Drive en este dispositivo. El respaldo que ya subiste no se borra.')) return
          desconectar()
          setCampo('')
          setCopias(null)
          setAviso(null)
        }}
      >
        Desconectar de Drive
      </button>
    </div>
  )
}
