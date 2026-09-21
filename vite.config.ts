import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '日历之外 · Beyond the Calendar',
        short_name: '日历之外',
        description: '记录你走过的每一天，也看见尚未抵达的日子。',
        theme_color: '#f5efe6',
        background_color: '#f5efe6',
        display: 'standalone',
        lang: 'zh-CN',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
