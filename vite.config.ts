import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['logo.png', 'icon-192.png', 'icon-512.png', 'favicon.png', 'favicon.ico'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']
        },
        manifest: {
          name: 'Вера +1: Тренажер апологетики',
          short_name: 'Вера +1',
          description: 'Интеллектуальный тренажер для оттачивания навыков христианского свидетельства и защиты веры.',
          theme_color: '#FDFCF8',
          background_color: '#FDFCF8',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(
        [process.env.GEMINI_API_KEY, process.env.VITE_GEMINI_API_KEY, process.env.GOOGLE_API_KEY]
          .find(k => k && k.trim() !== '' && k.trim() !== 'MY_GEMINI_API_KEY') || ''
      ),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(
        [process.env.VITE_GEMINI_API_KEY, process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY]
          .find(k => k && k.trim() !== '' && k.trim() !== 'MY_GEMINI_API_KEY') || ''
      ),
      'process.env.GOOGLE_API_KEY': JSON.stringify(
        [process.env.GOOGLE_API_KEY, process.env.GEMINI_API_KEY, process.env.VITE_GEMINI_API_KEY]
          .find(k => k && k.trim() !== '' && k.trim() !== 'MY_GEMINI_API_KEY') || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
