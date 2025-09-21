import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // By removing `publicDir: false`, we re-enable Vite's default, reliable handling
  // of the 'public' directory, which copies its contents to the build output root.
  // This is the standard and recommended approach.
  plugins: [
    react(),
    // The vite-plugin-static-copy is no longer needed as Vite will handle the public directory automatically.
  ],
  define: {
    // This makes the process.env.API_KEY variable available in the client-side code.
    // The value is injected at build time by the build environment (e.g., Netlify).
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
