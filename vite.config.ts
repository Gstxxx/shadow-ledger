import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        // Página de exemplo dos efeitos de Combate (sessão menu-motion), publicada junto.
        combat: 'src/ui/combat-fx/showcase.html',
      },
    },
  },
})
