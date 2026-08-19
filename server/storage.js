import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Guarda a mesa num arquivo JSON. Sem banco: o dado mutável de uma mesa são
 * dezenas de KB, e o catálogo de 5.700 itens já vem pronto no bundle — não há
 * consulta que justifique SQL, e módulo nativo é risco de `npm install` que
 * não compila no PC do mestre.
 *
 * O que precisa ser levado a sério é não perder a mesa numa queda de energia
 * no meio da gravação. Daí:
 *  - grava num `.tmp` e renomeia por cima (rename é atômico no mesmo volume);
 *  - o `.bak` é uma CÓPIA da versão anterior, nunca a versão anterior movida
 *    de lugar: mover primeiro criaria um intervalo em que a mesa não existe
 *    em arquivo nenhum, que é exatamente a hora em que a luz cai;
 *  - a primeira alteração vai pro disco na hora, e só uma rajada seguida
 *    (o dedo no "+" do stepper) é agrupada, para não virar 20 gravações;
 *  - e força a escrita pendente antes de o processo morrer.
 *
 * O `.bak` cobre a queda no meio da gravação, e só ela: ele é sempre a versão
 * imediatamente anterior, então um erro percebido no dia seguinte já passou por
 * cima dele. Para isso existe a pasta `backups/`, com uma cópia datada por
 * fechamento de mesa — ver `backup()`.
 */

const WRITE_DELAY_MS = 300

/** "2026-08-18T14:32:07.123Z" -> "2026-08-18T14-32-07": serve de nome de arquivo. */
const carimbo = (date) => date.toISOString().slice(0, 19).replace(/:/g, '-')

export function createStorage(filePath) {
  const tmpPath = `${filePath}.tmp`
  const bakPath = filePath.replace(/\.json$/, '') + '.bak.json'
  const backupDir = join(dirname(filePath), 'backups')

  let timer = null
  let pending = null
  let lastWrite = 0

  function writeNow(state) {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8')
    if (existsSync(filePath)) {
      try {
        copyFileSync(filePath, bakPath)
      } catch {
        // Backup é conforto, não requisito: se falhar, a gravação segue.
      }
    }
    renameSync(tmpPath, filePath)
    lastWrite = Date.now()
  }

  /** Grava o que estiver pendente, engolindo o erro para não derrubar a mesa. */
  function drain() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pending) return
    const snapshot = pending
    pending = null
    try {
      writeNow(snapshot)
    } catch (error) {
      console.error(`[mesa] falha ao gravar: ${error.message}`)
    }
  }

  return {
    path: filePath,

    /** Lê a mesa do disco. Devolve `null` na primeira execução. */
    read() {
      for (const candidate of [filePath, bakPath]) {
        if (!existsSync(candidate)) continue
        try {
          const parsed = JSON.parse(readFileSync(candidate, 'utf8'))
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.players)) {
            if (candidate === bakPath) {
              console.warn('[mesa] arquivo principal ilegível — recuperado do backup.')
            }
            return parsed
          }
        } catch (error) {
          console.warn(`[mesa] não consegui ler ${candidate}: ${error.message}`)
        }
      }
      return null
    },

    /**
     * Grava a mesa. A primeira alteração depois de um tempo parado vai pro
     * disco na hora — é o caso normal na mesa, uma ação de vez em quando. Só
     * uma rajada seguida espera, e aí as chamadas se fundem numa gravação só.
     */
    save(state) {
      pending = state
      const since = Date.now() - lastWrite
      if (since >= WRITE_DELAY_MS) {
        drain()
        return
      }
      if (timer) return
      timer = setTimeout(drain, WRITE_DELAY_MS - since)
      // Não segura o processo vivo no encerramento: quem garante essa última
      // gravação é o `flush()`.
      timer.unref?.()
    },

    /** Grava agora o que estiver pendente. Chamado ao desligar o servidor. */
    flush: drain,

    /**
     * Uma cópia datada da mesa em `data/backups/mesa-<data>T<hora>.json`.
     *
     * Chamada quando uma mesa se fecha: ao desligar o servidor e antes de uma
     * mesa importada substituir a que estava aqui. São os dois momentos em que
     * o estado atual deixa de ser o atual — e o `.bak` de uma versão atrás não
     * ajuda quando o erro só aparece na semana seguinte.
     *
     * Nada é apagado daqui: uma mesa são dezenas de KB, e decidir qual backup
     * some não é decisão de programa. Grava antes o que estiver pendente, para
     * a cópia ser a mesa que os celulares estavam vendo, e não a de 300 ms
     * atrás. Falhar aqui nunca derruba a mesa — vira aviso no log.
     */
    backup(motivo = 'fechamento', now = new Date()) {
      drain()
      if (!existsSync(filePath)) return null
      const destino = join(backupDir, `mesa-${carimbo(now)}.json`)
      try {
        mkdirSync(backupDir, { recursive: true })
        copyFileSync(filePath, destino)
        console.log(`[mesa] backup (${motivo}): ${destino}`)
        return destino
      } catch (error) {
        console.error(`[mesa] falha ao gravar o backup: ${error.message}`)
        return null
      }
    },
  }
}
