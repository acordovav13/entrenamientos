// Genera los iconos del PWA sin dependencias: dibuja los pixeles a mano y los
// empaqueta como PNG con el zlib que ya trae Node.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const FONDO = [0xf7, 0xa5, 0x5c]
const TRAZO = [0x24, 0x12, 0x06]

const tablaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = tablaCrc[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

function png(ancho, alto, pixeles) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 2 // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(pixeles, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ])
}

/** Rectangulo con esquinas redondeadas, en coordenadas de un lienzo de 512. */
function rect(pintar, x0, y0, x1, y1, r) {
  for (let y = Math.floor(y0); y < y1; y++) {
    for (let x = Math.floor(x0); x < x1; x++) {
      if (r > 0) {
        const dx = Math.max(x0 + r - x, x - (x1 - r), 0)
        const dy = Math.max(y0 + r - y, y - (y1 - r), 0)
        if (dx * dx + dy * dy > r * r) continue
      }
      pintar(x, y)
    }
  }
}

function dibujar(tam) {
  const bytes = Buffer.alloc(tam * (tam * 3 + 1))
  const e = tam / 512 // escala desde el diseno de 512

  // Filtro 0 al inicio de cada linea y fondo liso.
  for (let y = 0; y < tam; y++) {
    const fila = y * (tam * 3 + 1)
    bytes[fila] = 0
    for (let x = 0; x < tam; x++) {
      const i = fila + 1 + x * 3
      bytes[i] = FONDO[0]
      bytes[i + 1] = FONDO[1]
      bytes[i + 2] = FONDO[2]
    }
  }

  const pintar = (x, y) => {
    if (x < 0 || y < 0 || x >= tam || y >= tam) return
    const i = y * (tam * 3 + 1) + 1 + x * 3
    bytes[i] = TRAZO[0]
    bytes[i + 1] = TRAZO[1]
    bytes[i + 2] = TRAZO[2]
  }

  // Una mancuerna: barra central, discos interiores y discos exteriores.
  const r = (v) => v * e
  rect(pintar, r(168), r(240), r(344), r(272), r(10)) // barra
  rect(pintar, r(128), r(196), r(172), r(316), r(14)) // disco interior izq
  rect(pintar, r(340), r(196), r(384), r(316), r(14)) // disco interior der
  rect(pintar, r(92), r(222), r(130), r(290), r(12)) // disco exterior izq
  rect(pintar, r(382), r(222), r(420), r(290), r(12)) // disco exterior der

  return png(tam, tam, bytes)
}

mkdirSync(join(raiz, 'public'), { recursive: true })
for (const tam of [192, 512]) {
  const destino = join(raiz, 'public', `icono-${tam}.png`)
  writeFileSync(destino, dibujar(tam))
  console.log(`icono-${tam}.png`)
}
