import { useState } from 'react'
import Entrenar from './pantallas/Entrenar'
import Historial from './pantallas/Historial'
import Ajustes from './pantallas/Ajustes'
import { IconoEngranaje, IconoLista, IconoPesa } from './componentes/Iconos'

type Pestana = 'entrenar' | 'historial' | 'ajustes'

const pestanas = [
  { id: 'entrenar' as const, texto: 'Entrenar', Icono: IconoPesa },
  { id: 'historial' as const, texto: 'Historial', Icono: IconoLista },
  { id: 'ajustes' as const, texto: 'Ajustes', Icono: IconoEngranaje },
]

export default function App() {
  // La app abre siempre en Entrenar, mostrando hoy: entrar y registrar no debe
  // costar ninguna navegacion.
  const [pestana, setPestana] = useState<Pestana>('entrenar')

  return (
    <div className="app">
      {pestana === 'entrenar' && <Entrenar />}
      {pestana === 'historial' && <Historial />}
      {pestana === 'ajustes' && <Ajustes />}

      <nav className="nav">
        {pestanas.map(({ id, texto, Icono }) => (
          <button
            key={id}
            onClick={() => setPestana(id)}
            aria-current={pestana === id ? 'page' : undefined}
          >
            <Icono />
            {texto}
          </button>
        ))}
      </nav>
    </div>
  )
}
