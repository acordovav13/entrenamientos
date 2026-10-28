import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { pedirPersistencia, respaldoAtrasado } from './almacenamiento'
import { precargarGis, sincronizarSiHayPermiso } from './drive'
import { useRespaldo } from './useRespaldo'
import Entrenar from './pantallas/Entrenar'
import Historial from './pantallas/Historial'
import Ajustes from './pantallas/Ajustes'
import AvisoRespaldo from './componentes/AvisoRespaldo'
import { IconoEngranaje, IconoLista, IconoPesa } from './componentes/Iconos'

type Pestana = 'entrenar' | 'historial' | 'ajustes'

const pestanas = [
  { id: 'entrenar' as const, texto: 'Entrenar', Icono: IconoPesa },
  { id: 'historial' as const, texto: 'Historial', Icono: IconoLista },
  { id: 'ajustes' as const, texto: 'Ajustes', Icono: IconoEngranaje },
]

/** Cuanto se espera despues del ultimo cambio para subir: no una vez por serie marcada. */
const ESPERA_SUBIDA = 20_000

/** Pasado este rato sin sincronizar, la banda ofrece traer lo de los otros dispositivos. */
const ESPERA_NOVEDADES = 15 * 60_000

const enLista = new Intl.ListFormat('es', { type: 'conjunction' })

export default function App() {
  // La app abre siempre en Entrenar, mostrando hoy: entrar y registrar no debe
  // costar ninguna navegacion.
  const [pestana, setPestana] = useState<Pestana>('entrenar')

  // El historial es la unica copia que existe: hay que pedirle al navegador que no
  // lo descarte cuando al telefono le falte espacio.
  useEffect(() => {
    pedirPersistencia()
  }, [])

  const respaldo = useRespaldo()

  // Con el guion de Google ya cargado, su ventana se abre dentro del toque.
  useEffect(() => {
    if (respaldo.configurado) precargarGis()
  }, [respaldo.configurado])

  // Mientras quede permiso de un toque reciente, lo nuevo se sube solo un rato
  // despues del ultimo cambio.
  useEffect(() => {
    if (!respaldo.pendiente || !respaldo.conPermiso) return
    const t = setTimeout(sincronizarSiHayPermiso, ESPERA_SUBIDA)
    return () => clearTimeout(t)
  }, [respaldo.huella, respaldo.pendiente, respaldo.conPermiso])

  // Y sin esperar al salir de la app, al volver a ella y al recuperar la señal. Al
  // volver tambien se refresca la hora, que decide si ofrecer traer novedades.
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => {
    const alCambiar = () => {
      setAhora(Date.now())
      void sincronizarSiHayPermiso()
    }
    document.addEventListener('visibilitychange', alCambiar)
    window.addEventListener('online', alCambiar)
    const reloj = setInterval(() => setAhora(Date.now()), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', alCambiar)
      window.removeEventListener('online', alCambiar)
      clearInterval(reloj)
    }
  }, [])

  // La banda sale si hay algo propio sin subir que no puede subirse solo, o si hace
  // rato que no se trae lo de los otros dispositivos. En Ajustes no hace falta: ahi
  // esta el boton completo.
  const nombresOtros = [...new Set(respaldo.otros.map((o) => o.nombre))]
  const novedades =
    respaldo.configurado &&
    !respaldo.conPermiso &&
    (respaldo.sincronizado === null ||
      (nombresOtros.length > 0 && ahora - respaldo.sincronizado.getTime() > ESPERA_NOVEDADES))
  const verAviso =
    pestana !== 'ajustes' &&
    ((respaldo.pendiente && (!respaldo.conPermiso || !!respaldo.fallo)) || novedades)
  const textoAviso = respaldo.fallo
    ? `No se pudo sincronizar. ${respaldo.fallo}`
    : respaldo.pendiente
      ? 'Hay cambios sin subir a Drive'
      : nombresOtros.length > 0
        ? `Puede haber novedades de ${enLista.format(nombresOtros)}`
        : 'Sincroniza para traer lo de tus otros dispositivos'

  const hayDatos = useLiveQuery(async () => (await db.rutinas.count()) > 0, [], false)
  const avisarRespaldo = respaldoAtrasado(hayDatos)

  return (
    <div className={`app${verAviso ? ' con-aviso' : ''}`}>
      {pestana === 'entrenar' && <Entrenar />}
      {pestana === 'historial' && <Historial />}
      {pestana === 'ajustes' && <Ajustes />}

      {verAviso && <AvisoRespaldo texto={textoAviso} error={!!respaldo.fallo} />}

      <nav className="nav">
        {pestanas.map(({ id, texto, Icono }) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            aria-current={pestana === id ? 'page' : undefined}
          >
            <span className="icono-nav">
              <Icono />
              {/* Punto discreto: recuerda el respaldo sin interrumpir el entrenamiento. */}
              {id === 'ajustes' && avisarRespaldo && <span className="punto" aria-hidden="true" />}
            </span>
            {texto}
          </button>
        ))}
      </nav>
    </div>
  )
}
