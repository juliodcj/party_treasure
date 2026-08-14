import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // host: true faz o Vite escutar em 0.0.0.0, para os celulares da LAN acessarem.
  //
  // O proxy é o que mantém uma URL só nos dois modos: em desenvolvimento quem
  // atende na 3000 é o Vite, e ele repassa o WebSocket da mesa para o servidor
  // de estado na 3001 (`npm run dev` sobe os dois). Na mesa, o mesmo endereço é
  // servido direto pelo servidor. O celular nunca precisa saber a diferença.
  server: {
    host: true,
    port: 3000,
    // Libera o link do túnel (tunel.bat): sem isso o Vite recusa o Host
    // "algumacoisa.trycloudflare.com" com "Blocked request... allowedHosts".
    // Subdomínio sorteado a cada túnel novo, por isso o curinga.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/api': 'http://localhost:3001',
    },
  },
  preview: { host: true, port: 3000, allowedHosts: ['.trycloudflare.com'] },
})
