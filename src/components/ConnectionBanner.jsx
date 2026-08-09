import { useStore } from '../state/store.jsx'

/**
 * O aviso de que a mesa está fora de alcance.
 *
 * Aparece só quando há problema: conectado, não ocupa um pixel. É o primeiro
 * filho de `.app`, então empurra o cabeçalho para baixo em vez de cobrir
 * conteúdo — quem está sem conexão precisa ler isto, não espiar por baixo.
 *
 * Enquanto ele está na tela, o `dispatch` recusa ação de mesa (ver
 * `state/store.jsx`): é a diferença entre "não aconteceu, e olha o motivo" e
 * um item que aparece na mochila e some sozinho meio minuto depois.
 */
export default function ConnectionBanner() {
  const { status } = useStore()
  if (status === 'online') return null

  return (
    <div className="conn" role="status">
      {status === 'connecting' ? (
        <span>Conectando à mesa…</span>
      ) : (
        <span>
          Sem conexão com a mesa. Nada é salvo até voltar — confira o Wi-Fi e se o PC do mestre
          está ligado.
        </span>
      )}
    </div>
  )
}
