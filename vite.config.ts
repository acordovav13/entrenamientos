import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages sirve los proyectos desde /<nombre-repo>/.
// Al desplegar se define VITE_BASE con ese valor (ver .github/workflows/deploy.yml).
const base = process.env.VITE_BASE || '/'

// La version se muestra dentro de la app, para saber cual estas usando al comparar.
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

/**
 * __VERSION__ se inyecta al arrancar, leyendo package.json una sola vez, asi que
 * al subir de version el servidor seguia mostrando la anterior hasta reiniciarlo
 * a mano. Esto lo reinicia solo.
 */
const vigilarVersion = {
  name: 'vigilar-version',
  configureServer(servidor: ViteDevServer) {
    const archivo = resolve(dirname(fileURLToPath(import.meta.url)), 'package.json')
    servidor.watcher.add(archivo)
    servidor.watcher.on('change', (cambiado) => {
      if (resolve(cambiado) === archivo) servidor.restart()
    })
  },
}

export default defineConfig({
  base,
  define: {
    __VERSION__: JSON.stringify(version),
  },
  plugins: [
    vigilarVersion,
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono-192.png', 'icono-512.png'],
      workbox: {
        // Las versiones anteriores se publican en subcarpetas tipo /v0.1/, que caen
        // dentro del alcance de este service worker. Sin esta excepcion servirian
        // el index.html de la version actual y nunca veriamos la antigua.
        navigateFallbackDenylist: [/\/v\d+\.\d+\//],
      },
      manifest: {
        name: 'Entrenamientos',
        short_name: 'Entrenos',
        description: 'Registro personal de entrenamientos',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1817',
        theme_color: '#1a1817',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
