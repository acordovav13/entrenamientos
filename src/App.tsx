import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { pedirPersistencia, respaldoAtrasado } from './almacenamiento'
import { precargarGis, respaldarSiHayCambios } from './drive'
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
const ESPERA_RESPALDO = 20_000

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

  // Respaldo automatico: mientras quede permiso de un toque reciente, lo nuevo se
  // sube solo un rato despues del ultimo cambio.
  useEffect(() => {
    if (!respaldo.pendiente || !respaldo.conPermiso) return
    const t = setTimeout(respaldarSiHayCambios, ESPERA_RESPALDO)
    return () => clearTimeout(t)
  }, [respaldo.huella, respaldo.pendiente, respaldo.conPermiso])

  // Y sin esperar al salir de la app, al volver a ella y al recuperar la señal.
  useEffect(() => {
    const intentar = () => void respaldarSiHayCambios()
    document.addEventListener('visibilitychange', intentar)
    window.addEventListener('online', intentar)
    return () => {
      document.removeEventListener('visibilitychange', intentar)
      window.removeEventListener('online', intentar)
    }
  }, [])

  // En Ajustes no hace falta: ahi esta el respaldo completo.
  const verAviso =
    pestana !== 'ajustes' && respaldo.pendiente && (!respaldo.conPermiso || !!respaldo.fallo)

  const hayDatos = useLiveQuery(async () => (await db.rutinas.count()) > 0, [], false)
  const avisarRespaldo = respaldoAtrasado(hayDatos)

  return (
    <div className={`app${verAviso ? ' con-aviso' : ''}`}>
      {pestana === 'entrenar' && <Entrenar />}
      {pestana === 'historial' && <Historial />}
      {pestana === 'ajustes' && <Ajustes />}

      {verAviso && <AvisoRespaldo fallo={respaldo.fallo} />}

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
