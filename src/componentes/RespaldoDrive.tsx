import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportar, importar } from '../db'
import {
  bajarRespaldo,
  clientId,
  desconectar,
  estaConfigurado,
  guardarClientId,
  pedirToken,
  marcarDatosRespaldados,
  precargarGis,
  subirRespaldo,
  ultimoRespaldoDrive,
} from '../drive'
import { marcarRespaldo } from '../almacenamiento'

const cuandoTexto = (d: Date | null) => {
  if (!d) return 'Nunca'
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (dias === 0) return `Hoy, ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}

export default function RespaldoDrive() {
  const [configurado, setConfigurado] = useState(estaConfigurado)
  const [campo, setCampo] = useState(clientId() ?? '')
  const [ultimo, setUltimo] = useState<Date | null>(ultimoRespaldoDrive)
  const [ocupado, setOcupado] = useState<'subir' | 'bajar' | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null)

  const cuentas = useLiveQuery(
    async () => ({ rutinas: await db.rutinas.count(), ejercicios: await db.ejercicios.count() }),
    [],
  )

  // Con el guion ya cargado, la ventana de Google se abre dentro del clic.
  useEffect(() => {
    if (configurado) precargarGis()
  }, [configurado])

  const alGuardarId = () => {
    guardarClientId(campo)
    setConfigurado(estaConfigurado())
    setAviso(
      estaConfigurado()
        ? { texto: 'ID guardado. Ya puedes respaldar.' }
        : { texto: 'El ID quedó vacío.', error: true },
    )
  }

  const alSubir = async () => {
    setOcupado('subir')
    setAviso(null)
    try {
      // El permiso se pide primero, pegado al clic: si se pidiera despues de leer
      // la base, el navegador bloquearia la ventana de Google por emergente.
      await pedirToken(true)
      const datos = await exportar()
      const { fecha, rutinas } = await subirRespaldo(datos, datos.rutinas.length, false)
      setUltimo(fecha)
      marcarRespaldo()
      await marcarDatosRespaldados()
      setAviso({ texto: `Subidas ${rutinas} rutinas a tu Drive.` })
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo subir.', error: true })
    } finally {
      setOcupado(null)
    }
  }

  const alBajar = async () => {
    if (
      !confirm(
        'Reemplaza TODO lo que tengas en este dispositivo por la copia de Drive. No se puede deshacer.',
      )
    )
      return
    setOcupado('bajar')
    setAviso(null)
    try {
      const datos = await bajarRespaldo()
      if (!datos) {
        setAviso({ texto: 'En tu Drive todavía no hay ningún respaldo.', error: true })
        return
      }
      const n = await importar(datos)
      setAviso({ texto: `Recuperadas ${n} rutinas desde Drive.` })
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo bajar.', error: true })
    } finally {
      setOcupado(null)
    }
  }

  if (!configurado) {
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

  return (
    <div className="grupo">
      <h2>Respaldo en Google Drive</h2>

      <div className="dato">
        <span>Último respaldo en Drive</span>
        <strong className={ultimo ? 'si' : 'no'}>{cuandoTexto(ultimo)}</strong>
      </div>
      {cuentas && (
        <div className="dato">
          <span>Por subir</span>
          <strong>
            {cuentas.rutinas} rutinas, {cuentas.ejercicios} ejercicios
          </strong>
        </div>
      )}

      {aviso && (
        <div className={`aviso${aviso.error ? ' error' : ''}`} style={{ marginBottom: 12 }}>
          {aviso.texto}
        </div>
      )}

      <button className="btn" onClick={alSubir} disabled={ocupado !== null}>
        {ocupado === 'subir' ? 'Subiendo…' : 'Respaldar ahora en Drive'}
      </button>
      <button
        className="btn secundario"
        style={{ marginTop: 10 }}
        onClick={alBajar}
        disabled={ocupado !== null}
      >
        {ocupado === 'bajar' ? 'Bajando…' : 'Recuperar desde Drive'}
      </button>

      <p className="nota" style={{ marginTop: 10 }}>
        La app solo ve el archivo que ella misma crea; no puede leer nada más de tu Drive.
        Recuperar reemplaza todo lo de este dispositivo.
      </p>

      <button
        className="btn peligro"
        style={{ marginTop: 12 }}
        onClick={() => {
          if (!confirm('Se olvida la conexión con Drive en este dispositivo. El respaldo que ya subiste no se borra.')) return
          desconectar()
          guardarClientId('')
          setConfigurado(false)
          setUltimo(null)
          setCampo('')
        }}
      >
        Desconectar de Drive
      </button>
    </div>
  )
}
