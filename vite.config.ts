import react from '@vitejs/plugin-react'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const root = import.meta.dirname

/**
 * Só no `npm run dev`: permite ao Estúdio de Captura gravar a calibração e os
 * clipes direto no repositório (src/data). Aceita apenas os dois destinos fixos.
 */
function pipelineSavePlugin(): Plugin {
  return {
    name: 'acme-pipeline-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__pipeline/save', (req, res) => {
        const reply = (status: number, body: object) => {
          res.statusCode = status
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return reply(405, { ok: false, error: 'Use POST' })

        const chunks: Buffer[] = []
        let size = 0
        req.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > 50 * 1024 * 1024) req.destroy()
          else chunks.push(chunk)
        })
        req.on('end', async () => {
          try {
            const { kind, name, data } = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            let target: string
            if (kind === 'calibration' && data?.schema === 'acme.rigcalibration') {
              target = resolve(root, 'src/data/rigCalibration.json')
            } else if (kind === 'clip' && data?.schema === 'acme.signclip' && /^[a-z0-9-]{1,64}$/.test(name)) {
              target = resolve(root, 'src/data/clips', `${name}.json`)
            } else {
              return reply(400, { ok: false, error: 'Destino ou formato inválido' })
            }
            await mkdir(dirname(target), { recursive: true })
            // Calibração fica legível para revisão em PR; clipes ficam compactos (tamanho)
            const text = kind === 'calibration' ? JSON.stringify(data, null, 2) : JSON.stringify(data)
            await writeFile(target, text + '\n', 'utf8')
            reply(200, { ok: true, path: relative(root, target).replaceAll('\\', '/') })
          } catch (err) {
            reply(400, { ok: false, error: String(err) })
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pipelineSavePlugin()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(root, 'index.html'),
        estudio: resolve(root, 'estudio.html'),
      },
    },
  },
})
