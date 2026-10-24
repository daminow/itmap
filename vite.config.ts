/// <reference types="vitest/config" />
import { createServer, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), {
    name: 'itmap-static-catalogue',
    apply: 'build',
    async closeBundle() {
      const server = await createServer({
        configFile: false,
        root: fileURLToPath(new URL('.', import.meta.url)),
        appType: 'custom',
        server: { middlewareMode: true },
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
      })
      try {
        const { generatePages } = await server.ssrLoadModule('/src/seo/generate.ts')
        await generatePages(fileURLToPath(new URL('./dist', import.meta.url)), process.env.VITE_BASE_PATH || '/')
      } finally {
        await server.close()
      }
    },
  }],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-dom') || /[\\/]react[\\/]/.test(id) || id.includes('scheduler')) return 'react'
          if (id.includes('d3-')) return 'd3'
          if (
            id.includes('@radix-ui') ||
            id.includes('zustand') ||
            id.includes('immer') ||
            id.includes('lucide-react')
          )
            return 'vendor'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
