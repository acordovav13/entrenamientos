import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { borrarTodo, db, exportar, hoyISO, importar } from '../db'
import {
  DIAS_PARA_RECORDAR,
  diasSinRespaldo,
  estadoAlmacenamiento,
  marcarRespaldo,
  type EstadoAlmacenamiento,
} from '../almacenamiento'
import { cargarEjemplo } from '../ejemplo'

/** Tiene que coincidir con VERSIONES_ANTERIORES de .github/workflows/deploy.yml. */
const VERSIONES_ANTERIORES = ['v0.1', 'v0.2', 'v0.3', 'v0.4', 'v0.5']

export default function Ajustes() {
  const archivo = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null)

  const cuentas = useLiveQuery(
    async () => ({
      rutinas: await db.rutinas.count(),
      ejercicios: await db.ejercicios.count(),
    }),
    [],
  )

  const [almacen, setAlmacen] = useState<EstadoAlmacenamiento | null>(null)
  const [dias, setDias] = useState<number | null>(diasSinRespaldo)

  useEffect(() => {
    estadoAlmacenamiento().then(setAlmacen)
  }, [])

  const alExportar = async () => {
    const datos = await exportar()
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `entrenamientos-${hoyISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    marcarRespaldo()
    setDias(0)
    setAviso({ texto: 'Respaldo descargado.' })
  }

  const alImportar = async (f: File) => {
    try {
      const n = await importar(JSON.parse(await f.text()))
      setAviso({ texto: `Listo: se importaron ${n} rutinas.` })
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo leer el archivo.', error: true })
    }
  }

  const alBorrar = async () => {
    if (!confirm('Se borra todo el historial de este dispositivo. Esto no se puede deshacer.')) return
    await borrarTodo()
    setAviso({ texto: 'Historial borrado.' })
  }

  const alCargarEjemplo = async () => {
    if (!confirm('Reemplaza lo que tengas por un historial inventado de dos meses.')) return
    const { rutinas, ejercicios } = await cargarEjemplo()
    setAviso({ texto: `Cargado: ${ejercicios} ejercicios en ${rutinas} rutinas.` })
  }

  return (
    <>
      <div className="cabecera">
        <div className="cabecera-fila">
          <h1 style={{ flex: 1 }}>Ajustes</h1>
          <span className="pastilla">v{__VERSION__}</span>
        </div>
        <div className="sub">
          {cuentas
            ? `${cuentas.ejercicios} ejercicios en ${cuentas.rutinas} rutinas`
            : ' '}
        </div>
      </div>

      <div className="contenido">
        {aviso && <div className={`aviso${aviso.error ? ' error' : ''}`}>{aviso.texto}</div>}

        <div className="grupo">
          <h2>Dónde viven tus datos</h2>
          <p style={{ margin: 0 }}>
            Tu historial se guarda dentro de este navegador, en este dispositivo. No está en
            internet y nadie más lo ve.
          </p>
          <div className="dato">
            <span>Protegido contra borrado automático</span>
            <strong className={almacen?.protegido ? 'si' : 'no'}>
              {almacen === null ? '…' : almacen.protegido ? 'Sí' : 'Todavía no'}
            </strong>
          </div>
          {almacen?.usadoMB != null && (
            <div className="dato">
              <span>Espacio ocupado</span>
              <strong>{almacen.usadoMB < 1 ? 'menos de 1 MB' : `${almacen.usadoMB.toFixed(1)} MB`}</strong>
            </div>
          )}
          {almacen && !almacen.protegido && (
            <p className="nota" style={{ marginTop: 10 }}>
              El navegador aún no garantiza tus datos. Se concede solo al instalar la app en
              la pantalla de inicio y usarla unos días. Mientras tanto, exporta un respaldo.
            </p>
          )}
        </div>

        <div className="grupo">
          <h2>Respaldo</h2>
          <div className="dato">
            <span>Último respaldo</span>
            <strong className={dias === null || dias >= DIAS_PARA_RECORDAR ? 'no' : 'si'}>
              {dias === null ? 'Nunca' : dias === 0 ? 'Hoy' : `Hace ${dias} días`}
            </strong>
          </div>
          <p>
            Exporta un archivo de vez en cuando y guárdalo donde quieras; con importar lo
            recuperas en otro navegador o teléfono.
          </p>
          <button className="btn" onClick={alExportar}>
            Exportar respaldo
          </button>
          <button
            className="btn secundario"
            style={{ marginTop: 10 }}
            onClick={() => archivo.current?.click()}
          >
            Importar respaldo
          </button>
          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) alImportar(f)
              e.target.value = ''
            }}
          />
          <p style={{ margin: '10px 0 0', fontSize: 12 }}>
            Importar reemplaza todo lo que haya en este dispositivo.
          </p>
        </div>

        <div className="grupo">
          <h2>Sincronización con Google Drive</h2>
          <p style={{ margin: 0 }}>
            Todavía no está. Llega en la fase 3 y hará que teléfono y PC compartan el mismo
            historial sin mover archivos. Mientras tanto, el respaldo de arriba cumple esa función.
          </p>
        </div>

        {/* Las versiones viven en el mismo origen, asi que comparten IndexedDB:
            se puede saltar entre ellas sin perder ni duplicar el historial. */}
        {import.meta.env.PROD && (
          <div className="grupo">
            <h2>Comparar versiones</h2>
            <p>
              Estás en la v{__VERSION__}. Las versiones publicadas comparten el mismo historial,
              así que puedes saltar entre ellas y seguir donde ibas.
            </p>
            {VERSIONES_ANTERIORES.map((v) => (
              <a
                key={v}
                className="btn secundario"
                style={{ marginBottom: 8 }}
                href={`${import.meta.env.BASE_URL}${v}/`}
              >
                Abrir la {v}
              </a>
            ))}
          </div>
        )}

        {/* Solo en desarrollo: sirve para juzgar la app llena, no para el uso real. */}
        {import.meta.env.DEV && (
          <div className="grupo">
            <h2>Datos de ejemplo</h2>
            <p>
              Rellena la app con dos meses de entrenamientos inventados, para ver cómo se lee
              el historial cuando tiene contenido. No existe en la versión publicada.
            </p>
            <button className="btn secundario" onClick={alCargarEjemplo}>
              Cargar datos de ejemplo
            </button>
          </div>
        )}

        <div className="grupo">
          <h2>Zona peligrosa</h2>
          <p>Borra todas las rutinas y ejercicios de este dispositivo.</p>
          <button className="btn peligro" onClick={alBorrar}>
            Borrar todo el historial
          </button>
        </div>
      </div>
    </>
  )
}
