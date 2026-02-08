import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths(),
    tanstackStart(),
    nitro(),
    // react's vite plugin must come after start's vite plugin
    viteReact()
  ],
  optimizeDeps: {
    // Exclude this server-side dependency to avoid bundling errors
    exclude: ['mongodb-client-encryption']
  },
  ssr: {
    // Ensure this module is externalized during server-side rendering
    external: ['mongodb-client-encryption']
  },
});
