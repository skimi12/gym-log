import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: '筋トレ記録',
        short_name: '筋トレ記録',
        description: 'ジムで素早く重量と回数を記録する個人用PWA',
        theme_color: '#f5f5f7',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        lang: 'ja',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Manifest icons are injected by vite-plugin-pwa. Excluding them from
        // the glob keeps each icon in the precache manifest exactly once.
        globIgnores: ['**/pwa-*.png'],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false
      }
    })
  ]
})
