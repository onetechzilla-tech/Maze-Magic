import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  // By setting publicDir to false, we prevent Vite from using the 'public' directory by default.
  // This gives us full control over asset handling with vite-plugin-static-copy.
  publicDir: false,
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // All static assets are now explicitly sourced from the 'public' directory
        // to ensure they are correctly copied to the 'dist' folder during build.
        { src: 'public/icons', dest: '' },
        { src: 'public/sounds', dest: '' },
        { src: 'public/splash.png', dest: '' },
        { src: 'public/home-page-background.png', dest: '' },
        { src: 'public/privacy_policy.html', dest: '' },
        { src: 'public/manifest.json', dest: '' },
        { src: 'public/service-worker.js', dest: '' },
        { src: 'public/.well-known', dest: '' },
      ]
    })
  ],
  define: {
    // This makes the process.env.API_KEY variable available in the client-side code.
    // The value is injected at build time by the build environment (e.g., Netlify).
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
