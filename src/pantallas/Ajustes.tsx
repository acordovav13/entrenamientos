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
import { olvidarVistos } from '../drive'
import { contar } from '../formato'
import { useRespaldo } from '../useRespaldo'
import RespaldoDrive from '../componentes/RespaldoDrive'

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

  // Un respaldo en Drive tambien cuenta como ultimo respaldo; esto vuelve a pintar
  // la pantalla cuando termina uno.
  const { configurado: conDrive } = useRespaldo()
  const dias = diasSinRespaldo()

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
    setAviso({ texto: 'Respaldo descargado.' })
  }

  const alImportar = async (f: File) => {
    try {
      const n = await importar(JSON.parse(await f.text()))
      olvidarVistos()
      setAviso({ texto: `Listo: se importó el respaldo, con ${contar(n, 'rutina')}.` })
    } catch (e) {
      setAviso({ texto: e instanceof Error ? e.message : 'No se pudo leer el archivo.', error: true })
    }
  }

  const alBorrar = async () => {
    if (!confirm('Se borra todo el historial de este dispositivo. Esto no se puede deshacer.')) return
    await borrarTodo()
    olvidarVistos()
    setAviso({ texto: 'Historial borrado.' })
  }

  const alCargarEjemplo = async () => {
    // El guard deja el modulo fuera del paquete publicado.
    if (!import.meta.env.DEV) return
    if (!confirm('Reemplaza lo que tengas por un historial inventado de dos meses.')) return
    const { cargarEjemplo } = await import('../ejemplo')
    const { rutinas, ejercicios } = await cargarEjemplo()
    setAviso({
      texto: `Cargado: ${contar(ejercicios, 'ejercicio')} en ${contar(rutinas, 'rutina')}.`,
    })
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
            ? `${contar(cuentas.ejercicios, 'ejercicio')} en ${contar(cuentas.rutinas, 'rutina')}`
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
              {dias === null
                ? 'Nunca'
                : dias === 0
                  ? 'Hoy'
                  : dias === 1
                    ? 'Ayer'
                    : `Hace ${dias} días`}
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

        <RespaldoDrive />

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
          <p>
            Borra todas las rutinas y ejercicios de este dispositivo.
            {conDrive && ' Lo de tus otros dispositivos vuelve a bajar al sincronizar.'}
          </p>
          <button className="btn peligro" onClick={alBorrar}>
            Borrar todo el historial
          </button>
        </div>
      </div>
    </>
  )
}
