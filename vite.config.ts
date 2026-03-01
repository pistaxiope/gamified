import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Phaser is large (~1.4 MB unminified). Splitting it into its own chunk
    // lets browsers cache the game engine separately from app logic, so
    // hot-reloads during development and incremental portfolio deploys only
    // re-download the smaller app chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
    // Raise the warning threshold to match Phaser's chunk size.
    // 1300 KB is expected for a game engine – still ~332 KB gzipped.
    chunkSizeWarningLimit: 1300,
  },
})
