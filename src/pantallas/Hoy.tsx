import { hoyISO } from '../db'
import { fechaLarga } from '../formato'
import EditorDia from '../componentes/EditorDia'

export default function Hoy() {
  const fecha = hoyISO()

  return (
    <>
      <div className="cabecera">
        <h1>Hoy</h1>
        <div className="sub">{fechaLarga(fecha)}</div>
      </div>

      <EditorDia fecha={fecha} />
    </>
  )
}
