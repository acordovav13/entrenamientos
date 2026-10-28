import { db } from './db'

/**
 * Respaldo en Google Drive. Es respaldo, no sincronizacion: la app sube una copia
 * y solo baja cuando tu lo pides. Asi nunca puede borrarte nada por una mezcla mal
 * resuelta entre dos dispositivos.
 *
 * El permiso que se pide es `drive.file`: la app solo ve los archivos que ella misma
 * crea. No puede leer nada mas de tu Drive.
 */

const CLAVE_CLIENT_ID = 'drive-client-id'
const CLAVE_ARCHIVO = 'drive-archivo-id'
const CLAVE_ULTIMA = 'drive-ultimo-respaldo'
const CLAVE_MARCA = 'drive-huella-datos'
const NOMBRE_ARCHIVO = 'entrenamientos-respaldo.json'
const AMBITO = 'https://www.googleapis.com/auth/drive.file'

// --- Configuracion ---

const leer = (clave: string): string | null => {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

const escribir = (clave: string, valor: string | null) => {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
  } catch {
    /* modo privado: no pasa nada */
  }
}

export const clientId = () => leer(CLAVE_CLIENT_ID)
export const guardarClientId = (id: string) => escribir(CLAVE_CLIENT_ID, id.trim() || null)
export const estaConfigurado = () => !!clientId()

export function ultimoRespaldoDrive(): Date | null {
  const v = leer(CLAVE_ULTIMA)
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// --- Google Identity Services ---

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            prompt?: string
            callback: (respuesta: { access_token?: string; error?: string }) => void
            error_callback?: (error: { type?: string }) => void
          }): { requestAccessToken(opciones?: { prompt?: string }): void }
        }
      }
    }
  }
}

let cargandoGis: Promise<void> | null = null

function cargarGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (cargandoGis) return cargandoGis

  cargandoGis = new Promise((ok, err) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => ok()
    s.onerror = () => {
      cargandoGis = null
      err(new Error('No se pudo cargar Google. ¿Hay internet?'))
    }
    document.head.appendChild(s)
  })
  return cargandoGis
}

/** El token vive una hora; se guarda en memoria, nunca en disco. */
let token: { valor: string; expira: number } | null = null

export function olvidarToken() {
  token = null
}

/** Se llama al entrar a Ajustes para que al pulsar el boton el guion ya este listo. */
export function precargarGis() {
  cargarGis().catch(() => {
    /* sin internet se reintenta al pulsar */
  })
}

/** Los codigos de Google vienen en ingles y no dicen nada a quien usa la app. */
const EN_CASTELLANO: Record<string, string> = {
  popup_failed_to_open:
    'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes de este sitio y vuelve a intentar.',
  popup_closed: 'Cerraste la ventana de Google antes de dar permiso.',
  access_denied: 'No le diste permiso a la app para usar tu Drive.',
  invalid_client: 'Google no reconoce ese ID de cliente. Revisa que lo pegaste completo.',
  idpiframe_initialization_failed: 'Google no pudo iniciar. Revisa que tengas internet.',
}

const traducir = (codigo?: string) =>
  (codigo && EN_CASTELLANO[codigo]) ?? `Google respondió: ${codigo ?? 'error desconocido'}.`

function pedirTokenConGis(id: string, interactivo: boolean): Promise<string> {
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) return Promise.reject(new Error('Google no quedó disponible.'))

  // El cuerpo de la Promise corre sincrono: la ventana se abre dentro del mismo
  // clic. Si se abriera tras un await, el navegador la bloquearia por emergente.
  return new Promise<string>((ok, err) => {
    const cliente = oauth2.initTokenClient({
      client_id: id,
      scope: AMBITO,
      callback: (r) => {
        if (r.access_token) {
          token = { valor: r.access_token, expira: Date.now() + 55 * 60_000 }
          ok(r.access_token)
        } else {
          err(new Error(traducir(r.error)))
        }
      },
      error_callback: (e) => err(new Error(traducir(e.type))),
    })
    cliente.requestAccessToken({ prompt: interactivo ? 'consent' : '' })
  })
}

/**
 * `interactivo` en false intenta renovar sin molestar, aprovechando que ya diste
 * permiso antes. Si Google necesita preguntarte algo, falla en silencio y el
 * respaldo automatico se salta ese intento.
 */
export function pedirToken(interactivo: boolean): Promise<string> {
  if (token && token.expira > Date.now() + 60_000) return Promise.resolve(token.valor)

  const id = clientId()
  if (!id) return Promise.reject(new Error('Falta el ID de cliente de Google.'))

  // Camino rapido y sincrono cuando el guion ya esta cargado, que es lo normal.
  if (window.google?.accounts?.oauth2) return pedirTokenConGis(id, interactivo)

  return cargarGis().then(() => pedirTokenConGis(id, interactivo))
}

// --- Archivo en Drive ---

async function pedirADrive(url: string, token: string, opciones: RequestInit = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { ...opciones.headers, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) olvidarToken()
    throw new Error(`Drive respondió ${r.status}.`)
  }
  return r
}

/** Busca el archivo de respaldo. Solo ve los que creó esta app. */
async function buscarArchivo(token: string): Promise<string | null> {
  const guardado = leer(CLAVE_ARCHIVO)
  if (guardado) {
    // Puede haberse borrado desde Drive: se comprueba antes de confiar en el id.
    try {
      await pedirADrive(
        `https://www.googleapis.com/drive/v3/files/${guardado}?fields=id,trashed`,
        token,
      )
      return guardado
    } catch {
      escribir(CLAVE_ARCHIVO, null)
    }
  }

  const q = encodeURIComponent(`name='${NOMBRE_ARCHIVO}' and trashed=false`)
  const r = await pedirADrive(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`,
    token,
  )
  const { files } = (await r.json()) as { files: { id: string }[] }
  const id = files?.[0]?.id ?? null
  if (id) escribir(CLAVE_ARCHIVO, id)
  return id
}

export interface ResultadoRespaldo {
  fecha: Date
  rutinas: number
}

export async function subirRespaldo(
  datos: unknown,
  rutinas: number,
  interactivo = true,
): Promise<ResultadoRespaldo> {
  const t = await pedirToken(interactivo)
  const existente = await buscarArchivo(t)
  const cuerpo = JSON.stringify(datos)

  if (existente) {
    await pedirADrive(
      `https://www.googleapis.com/upload/drive/v3/files/${existente}?uploadType=media`,
      t,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: cuerpo },
    )
  } else {
    const limite = 'limite-' + crypto.randomUUID()
    const multipart =
      `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name: NOMBRE_ARCHIVO, mimeType: 'application/json' }) +
      `\r\n--${limite}\r\nContent-Type: application/json\r\n\r\n` +
      cuerpo +
      `\r\n--${limite}--`

    const r = await pedirADrive(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      t,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
        body: multipart,
      },
    )
    const { id } = (await r.json()) as { id: string }
    escribir(CLAVE_ARCHIVO, id)
  }

  const fecha = new Date()
  escribir(CLAVE_ULTIMA, fecha.toISOString())
  return { fecha, rutinas }
}

export async function bajarRespaldo(): Promise<unknown | null> {
  const t = await pedirToken(true)
  const id = await buscarArchivo(t)
  if (!id) return null
  const r = await pedirADrive(
    `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
    t,
  )
  return r.json()
}

export function desconectar() {
  olvidarToken()
  escribir(CLAVE_ARCHIVO, null)
  escribir(CLAVE_ULTIMA, null)
  escribir(CLAVE_MARCA, null)
}

// --- Respaldo automatico ---

/**
 * Huella de los datos: cuantas rutinas hay y cuando se toco la ultima. Si no
 * cambia, no hay nada que subir y se ahorra la llamada a Drive.
 */
async function huellaDeLosDatos(): Promise<string> {
  const rutinas = await db.rutinas.toArray()
  const ultima = rutinas.reduce((m, r) => Math.max(m, r.actualizado ?? 0), 0)
  const ejercicios = await db.ejercicios.count()
  return `${rutinas.length}:${ejercicios}:${ultima}`
}

export type ResultadoAuto = 'sin-configurar' | 'sin-cambios' | 'sin-permiso' | 'subido' | 'error'

/**
 * Sube si hay algo nuevo y si Google renueva el permiso sin preguntar. Nunca abre
 * ventanas ni interrumpe: si hace falta autorizar de nuevo, se queda esperando a
 * que entres a Ajustes y lo hagas tu.
 */
export async function respaldarSiHayCambios(): Promise<ResultadoAuto> {
  if (!estaConfigurado()) return 'sin-configurar'

  try {
    const huella = await huellaDeLosDatos()
    if (huella === leer(CLAVE_MARCA)) return 'sin-cambios'
    if (huella.startsWith('0:0:')) return 'sin-cambios' // nada que respaldar todavia

    try {
      await pedirToken(false)
    } catch {
      return 'sin-permiso'
    }

    const { exportar } = await import('./db')
    const datos = await exportar()
    await subirRespaldo(datos, datos.rutinas.length, false)
    escribir(CLAVE_MARCA, huella)
    return 'subido'
  } catch {
    return 'error'
  }
}

/** Para que Ajustes pueda marcar la huella tras un respaldo manual. */
export async function marcarDatosRespaldados() {
  escribir(CLAVE_MARCA, await huellaDeLosDatos())
}
