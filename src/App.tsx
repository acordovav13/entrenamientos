import { useState } from 'react'
import Hoy from './pantallas/Hoy'
import Historial from './pantallas/Historial'
import Ajustes from './pantallas/Ajustes'
import { IconoEngranaje, IconoLista, IconoPesa } from './componentes/Iconos'

type Pestana = 'hoy' | 'historial' | 'ajustes'

const pestanas = [
  { id: 'hoy' as const, texto: 'Hoy', Icono: IconoPesa },
  { id: 'historial' as const, texto: 'Historial', Icono: IconoLista },
  { id: 'ajustes' as const, texto: 'Ajustes', Icono: IconoEngranaje },
]

export default function App() {
  // La app abre siempre en Hoy: entrar y registrar no debe costar ninguna navegacion.
  const [pestana, setPestana] = useState<Pestana>('hoy')

  return (
    <div className="app">
      {pestana === 'hoy' && <Hoy />}
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
