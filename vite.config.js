import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const setImageHttpCacheHeaders = (server) => {
  server.middlewares.use((request, response, next) => {
    if (/\.(?:svg|png|jpe?g|webp|gif)(?:\?.*)?$/i.test(request.url || '')) {
      response.setHeader('Cache-Control', 'public, max-age=3600')
    }
    next()
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'image-http-cache-headers',
      configureServer: setImageHttpCacheHeaders,
      configurePreviewServer: setImageHttpCacheHeaders,
    },
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Bore & Barrel',
        short_name: 'Bore & Barrel',
        description: 'A small armory — pistols, rifles, and shotguns.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f2f4f5',
        theme_color: '#f2f4f5',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['**/guns/**'],
      },
    }),
  ],
})
