import { db, exportar, type Respaldo } from './db'
import { marcarRespaldo } from './almacenamiento'

/**
 * Respaldo en Google Drive. Es respaldo, no sincronizacion: la app sube una copia
 * y solo baja cuando tu lo pides. Asi nunca puede borrarte nada por una mezcla mal
 * resuelta entre dos dispositivos.
 *
 * Cada dispositivo escribe en su propio archivo. En la 1.0 habia uno solo para
 * todos, y el ultimo dispositivo que respaldaba borraba lo que habia subido el otro.
 *
 * El permiso que se pide es `drive.file`: la app solo ve los archivos que ella misma
 * crea. No puede leer nada mas de tu Drive.
 */

const CLAVE_CLIENT_ID = 'drive-client-id'
const CLAVE_ARCHIVO = 'drive-archivo-id'
const CLAVE_ULTIMA = 'drive-ultimo-respaldo'
const CLAVE_MARCA = 'drive-huella-datos'
const CLAVE_DISPOSITIVO = 'drive-dispositivo'
const PREFIJO = 'entrenamientos-respaldo'
const AMBITO = 'https://www.googleapis.com/auth/drive.file'
const API = 'https://www.googleapis.com/drive/v3'
const SUBIDA = 'https://www.googleapis.com/upload/drive/v3'

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
export const estaConfigurado = () => !!clientId()

export function guardarClientId(id: string) {
  escribir(CLAVE_CLIENT_ID, id.trim() || null)
  cambiar({ configurado: estaConfigurado() })
}

function ultimoRespaldoDrive(): Date | null {
  const v = leer(CLAVE_ULTIMA)
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

// --- Este dispositivo ---

export interface Dispositivo {
  id: string
  nombre: string
}

/** Como se llama este dispositivo en Drive. Sale del navegador: no hay que escribir nada. */
function tipoDeDispositivo(): string {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Teléfono Android' : 'Tablet Android'
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/CrOS/.test(ua)) return 'Chromebook'
  if (/Windows/i.test(ua)) return 'PC con Windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'PC con Linux'
  return 'Navegador'
}

// Tambien en memoria: sin localStorage, cada respaldo crearia un archivo nuevo.
let idDispositivo: string | null = null

export function esteDispositivo(): Dispositivo {
  if (!idDispositivo) {
    idDispositivo = leer(CLAVE_DISPOSITIVO)
    if (!idDispositivo) {
      idDispositivo = crypto.randomUUID().slice(0, 8)
      escribir(CLAVE_DISPOSITIVO, idDispositivo)
    }
  }
  return { id: idDispositivo, nombre: tipoDeDispositivo() }
}

export const nombreArchivo = (d = esteDispositivo()) => `${PREFIJO} (${d.nombre}).json`

// --- Estado para la interfaz ---

export interface EstadoDrive {
  configurado: boolean
  /** Huella de los datos que se subieron por ultima vez desde este dispositivo. */
  marca: string | null
  ultimo: Date | null
  subiendo: boolean
  /** Por que fallo el ultimo intento, ya en castellano. */
  fallo: string | null
}

let estado: EstadoDrive = {
  configurado: estaConfigurado(),
  marca: leer(CLAVE_MARCA),
  ultimo: ultimoRespaldoDrive(),
  subiendo: false,
  fallo: null,
}

const oyentes = new Set<() => void>()

export function suscribirDrive(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export const estadoDrive = () => estado

function cambiar(parcial: Partial<EstadoDrive>) {
  estado = { ...estado, ...parcial }
  oyentes.forEach((o) => o())
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
            callback: (respuesta: {
              access_token?: string
              expires_in?: number | string
              error?: string
            }) => void
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
      s.remove()
      err(new Error('No se pudo cargar Google. ¿Hay internet?'))
    }
    document.head.appendChild(s)
  })
  return cargandoGis
}

/** Para que al tocar un boton de respaldo el guion de Google ya este cargado. */
export function precargarGis() {
  cargarGis().catch(() => {
    /* sin internet se reintenta al tocar */
  })
}

/** El permiso vive una hora; se guarda en memoria, nunca en disco. */
let token: { valor: string; expira: number } | null = null

export const tokenVigente = () => !!token && Date.now() < token.expira

function olvidarToken() {
  token = null
  cambiar({})
}

/** Los codigos de Google vienen en ingles y no dicen nada a quien usa la app. */
const EN_CASTELLANO: Record<string, string> = {
  popup_failed_to_open:
    'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes de este sitio y vuelve a intentar.',
  popup_closed: 'Cerraste la ventana de Google antes de dar permiso.',
  access_denied: 'No le diste permiso a la app para usar tu Drive.',
  invalid_client: 'Google no reconoce ese ID de cliente. Revisa que lo pegaste completo.',
}

const traducir = (codigo?: string) =>
  (codigo && EN_CASTELLANO[codigo]) ?? `Google respondió: ${codigo ?? 'error desconocido'}.`

function pedirTokenConGis(id: string): Promise<string> {
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) return Promise.reject(new Error('Google no quedó disponible.'))

  // El cuerpo de la Promise corre sincrono: la ventana se abre dentro del mismo
  // clic. Si se abriera tras un await, el navegador la bloquearia por emergente.
  return new Promise<string>((ok, err) => {
    const cliente = oauth2.initTokenClient({
      client_id: id,
      scope: AMBITO,
      callback: (r) => {
        if (!r.access_token) return err(new Error(traducir(r.error)))
        // Cinco minutos de margen, para no empezar una subida con el permiso venciendo.
        const vida = (Number(r.expires_in) || 3600) * 1000 - 5 * 60_000
        token = { valor: r.access_token, expira: Date.now() + vida }
        // Al vencer, la interfaz tiene que enterarse para volver a ofrecer el boton.
        setTimeout(() => cambiar({}), vida + 1000)
        cambiar({})
        ok(r.access_token)
      },
      error_callback: (e) => err(new Error(traducir(e.type))),
    })
    // Con prompt vacio Google solo pide el consentimiento la primera vez.
    cliente.requestAccessToken({ prompt: '' })
  })
}

/**
 * Puede abrir la ventana de Google, asi que solo se llama directo desde un clic.
 * El respaldo automatico nunca la usa: sube solo con el permiso de un toque reciente.
 */
function pedirToken(): Promise<string> {
  if (token && tokenVigente()) return Promise.resolve(token.valor)

  const id = clientId()
  if (!id) return Promise.reject(new Error('Falta el ID de cliente de Google.'))

  // Camino rapido y sincrono cuando el guion ya esta cargado, que es lo normal.
  if (window.google?.accounts?.oauth2) return pedirTokenConGis(id)

  return cargarGis().then(() => pedirTokenConGis(id))
}

// --- Archivos en Drive ---

const ERRORES_DE_DRIVE: Record<number, string> = {
  401: 'El permiso de Google venció.',
  403: 'Falta el permiso para usar tu Drive.',
  404: 'No se encontró el archivo en Drive.',
}

class ErrorDeDrive extends Error {
  constructor(readonly codigo: number) {
    super(
      ERRORES_DE_DRIVE[codigo] ??
        (codigo >= 500 ? 'Drive no respondió. Prueba en un rato.' : `Drive respondió ${codigo}.`),
    )
  }
}

async function pedirADrive(url: string, t: string, opciones: RequestInit = {}) {
  const r = await fetch(url, {
    ...opciones,
    headers: { ...opciones.headers, Authorization: `Bearer ${t}` },
  })
  if (!r.ok) {
    // Sin permiso util, el proximo toque tiene que volver a pedirlo.
    if (r.status === 401 || r.status === 403) olvidarToken()
    throw new ErrorDeDrive(r.status)
  }
  return r
}

interface ArchivoDrive {
  id: string
  name?: string
  modifiedTime?: string
  trashed?: boolean
  appProperties?: Record<string, string>
}

/**
 * El archivo de este dispositivo. Se reconoce por una marca interna (appProperties),
 * no por el nombre, asi que sigue funcionando aunque lo muevas de carpeta.
 */
async function buscarMiArchivo(t: string, yo: Dispositivo): Promise<string | null> {
  const guardado = leer(CLAVE_ARCHIVO)
  if (guardado) {
    try {
      const r = await pedirADrive(`${API}/files/${guardado}?fields=id,trashed,appProperties`, t)
      const f = (await r.json()) as ArchivoDrive
      const dueno = f.appProperties?.dispositivo
      // Sin dueno es el archivo unico de la 1.0: se lo queda el dispositivo que ya lo
      // usaba, y al subir queda marcado como suyo. Uno en la papelera no sirve.
      if (!f.trashed && (!dueno || dueno === yo.id)) return guardado
    } catch (e) {
      // Solo se olvida si ya no existe; un permiso vencido no es motivo.
      if (!(e instanceof ErrorDeDrive && e.codigo === 404)) throw e
    }
    escribir(CLAVE_ARCHIVO, null)
  }

  const q = `appProperties has { key='dispositivo' and value='${yo.id}' } and trashed=false`
  const r = await pedirADrive(`${API}/files?${new URLSearchParams({ q, fields: 'files(id)' })}`, t)
  const { files } = (await r.json()) as { files?: ArchivoDrive[] }
  return files?.[0]?.id ?? null
}

/** Sube la copia al archivo de este dispositivo, o lo crea si todavia no existe. */
async function subirRespaldo(t: string, datos: Respaldo): Promise<void> {
  const yo = esteDispositivo()
  const existente = await buscarMiArchivo(t, yo)

  const metadatos = {
    name: nombreArchivo(yo),
    appProperties: {
      dispositivo: yo.id,
      nombreDispositivo: yo.nombre,
      rutinas: String(datos.rutinas.length),
    },
    ...(existente ? {} : { mimeType: 'application/json' }),
  }
  const limite = 'limite-' + crypto.randomUUID()
  const cuerpo =
    `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadatos) +
    `\r\n--${limite}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify(datos) +
    `\r\n--${limite}--`

  const r = await pedirADrive(
    existente
      ? `${SUBIDA}/files/${existente}?uploadType=multipart&fields=id`
      : `${SUBIDA}/files?uploadType=multipart&fields=id`,
    t,
    {
      method: existente ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
      body: cuerpo,
    },
  )
  const { id } = (await r.json()) as ArchivoDrive
  escribir(CLAVE_ARCHIVO, id)
}

// --- Subir ---

/**
 * Huella de los datos: cuantas rutinas hay y cuando se toco la ultima. Todo cambio
 * actualiza `actualizado` de su rutina, asi que si la huella no cambia, no hay nada
 * nuevo que subir.
 */
export async function huellaDeLosDatos(): Promise<string> {
  const rutinas = await db.rutinas.toArray()
  const ultima = rutinas.reduce((m, r) => Math.max(m, r.actualizado ?? 0), 0)
  const ejercicios = await db.ejercicios.count()
  return `${rutinas.length}:${ejercicios}:${ultima}`
}

const sinDatos = (huella: string) => huella.startsWith('0:0:')

const mensajeDe = (e: unknown) =>
  // fetch falla con TypeError cuando no hay red: el caso tipico en el gimnasio.
  e instanceof TypeError
    ? 'Sin conexión con Drive.'
    : e instanceof Error
      ? e.message
      : 'No se pudo respaldar.'

export interface ResultadoRespaldo {
  fecha: Date
  rutinas: number
}

let enCurso: Promise<ResultadoRespaldo> | null = null

function subir(huella: string): Promise<ResultadoRespaldo> {
  if (enCurso) return enCurso

  enCurso = (async () => {
    cambiar({ subiendo: true })
    try {
      if (!token || !tokenVigente()) throw new Error('Hace falta dar permiso de nuevo.')
      const datos = await exportar()
      await subirRespaldo(token.valor, datos)
      const fecha = new Date()
      escribir(CLAVE_ULTIMA, fecha.toISOString())
      escribir(CLAVE_MARCA, huella)
      // El punto ambar de Ajustes cuenta cualquier respaldo, no solo el archivo exportado.
      marcarRespaldo()
      cambiar({ subiendo: false, fallo: null, marca: huella, ultimo: fecha })
      return { fecha, rutinas: datos.rutinas.length }
    } catch (e) {
      cambiar({ subiendo: false, fallo: mensajeDe(e) })
      throw e
    }
  })().finally(() => {
    enCurso = null
  })
  return enCurso
}

/**
 * Respaldo de un toque. Va directo en el clic: puede abrir la ventana de Google.
 * Ese permiso dura una hora, y mientras tanto lo que anotes se sube solo.
 */
export async function respaldarAhora(): Promise<ResultadoRespaldo> {
  const permiso = pedirToken()
  cambiar({ fallo: null })
  try {
    await permiso
  } catch (e) {
    cambiar({ fallo: mensajeDe(e) })
    throw e
  }
  if (enCurso) await enCurso.catch(() => undefined)
  return subir(await huellaDeLosDatos())
}

export type ResultadoAuto = 'sin-configurar' | 'sin-permiso' | 'sin-cambios' | 'subido' | 'error'

/**
 * Sube si hay algo nuevo y queda permiso vigente. Nunca abre ventanas: sin un clic
 * el navegador las bloquea, asi que cuando falta permiso se queda esperando un toque.
 */
export async function respaldarSiHayCambios(): Promise<ResultadoAuto> {
  if (!estado.configurado) return 'sin-configurar'
  if (!tokenVigente()) return 'sin-permiso'
  const huella = await huellaDeLosDatos()
  if (huella === estado.marca || sinDatos(huella)) return 'sin-cambios'
  try {
    await subir(huella)
    return 'subido'
  } catch {
    return 'error'
  }
}

// --- Recuperar ---

export interface CopiaEnDrive {
  id: string
  /** De que dispositivo es. */
  nombre: string
  fecha: Date
  rutinas: number | null
  propia: boolean
}

/** Las copias que hay en Drive, la mas reciente primero. Va directo en un clic. */
export async function listarCopias(): Promise<CopiaEnDrive[]> {
  const t = await pedirToken()
  const yo = esteDispositivo()
  // Con drive.file la lista trae solo lo que creo esta app; el nombre lo confirma.
  const consulta = new URLSearchParams({
    q: 'trashed=false',
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,modifiedTime,appProperties)',
    pageSize: '50',
  })
  const r = await pedirADrive(`${API}/files?${consulta}`, t)
  const { files = [] } = (await r.json()) as { files?: ArchivoDrive[] }

  return files
    .filter((f) => f.name?.startsWith(PREFIJO))
    .map((f) => ({
      id: f.id,
      nombre: f.appProperties?.nombreDispositivo ?? 'Copia de la 1.0',
      fecha: new Date(f.modifiedTime ?? 0),
      rutinas: f.appProperties?.rutinas ? Number(f.appProperties.rutinas) : null,
      propia: f.appProperties?.dispositivo === yo.id,
    }))
}

export async function bajarCopia(id: string): Promise<unknown> {
  const t = await pedirToken()
  const r = await pedirADrive(`${API}/files/${id}?alt=media`, t)
  return r.json()
}

/** Olvida la conexion en este dispositivo. Lo que ya se subio a Drive no se toca. */
export function desconectar() {
  token = null
  escribir(CLAVE_CLIENT_ID, null)
  escribir(CLAVE_ARCHIVO, null)
  escribir(CLAVE_ULTIMA, null)
  escribir(CLAVE_MARCA, null)
  cambiar({ configurado: false, marca: null, ultimo: null, fallo: null })
}
