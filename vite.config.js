import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // host: true faz o Vite escutar em 0.0.0.0, para os celulares da LAN acessarem
  server: { host: true, port: 3000 },
  preview: { host: true, port: 3000 },
})
