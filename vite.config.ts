import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync, readFileSync } from 'node:fs'

const certKey = 'certs/key.pem'
const certFile = 'certs/cert.pem'
const hasCerts = existsSync(certKey) && existsSync(certFile)

const https = hasCerts
  ? {
      key: readFileSync(certKey),
      cert: readFileSync(certFile)
    }
  : undefined

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-vault.svg'],
      manifest: {
        name: 'Zero-Knowledge Vault',
        short_name: 'Vault',
        description: 'Foto, video e documenti cifrati in locale con AES-256-GCM — nessun dato lascia il dispositivo',
        lang: 'it',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0E0F0C',
        background_color: '#0E0F0C',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: {
    host: true,
    ...(https ? { https } : {})
  },
  preview: {
    host: true,
    ...(https ? { https } : {})
  }
})
