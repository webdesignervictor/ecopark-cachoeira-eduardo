import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { calcularAgenda } from './src/dados/agenda.ts'

/**
 * Gera robots.txt e sitemap.xml no build, a partir de VITE_SITE_URL (.env ou Vercel).
 * Sem o endereço, sai só o robots.txt liberando tudo (sitemap exige URL completa).
 */
function seo(siteUrl: string): Plugin {
  return {
    name: 'seo-robots-sitemap',
    apply: 'build',
    generateBundle() {
      const url = siteUrl.replace(/\/+$/, '')
      const robots = ['User-agent: *', 'Allow: /']
      if (url) robots.push('', `Sitemap: ${url}/sitemap.xml`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' })
      if (url) {
        const hoje = new Date().toISOString().slice(0, 10)
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${url}/</loc><lastmod>${hoje}</lastmod><priority>1.0</priority></url>
</urlset>
`,
        })
      }
    },
  }
}

/**
 * Troca os %DATA_...% do index.html pelas datas de src/dados/agenda.ts (título, descrição,
 * prévia do WhatsApp, dados do Google). Roda no build e no `npm run dev`.
 */
function agendaNoHtml(): Plugin {
  return {
    name: 'agenda-no-html',
    transformIndexHtml(html) {
      const a = calcularAgenda()
      const valores: Record<string, string> = {
        DATA_CURTA: a.dataCurta,
        DATA_COMPLETA: a.dataCompleta,
        DATA_SEMANA_EXTENSA: `${a.diaSemana} ${a.dataExtensa}`,
        DATA_INICIO: a.inicio,
        DATA_FIM: a.fim,
        DATA_TURNOS_E: a.turnos.join(' e '),
      }
      return html.replace(/%(DATA_[A-Z_]+)%/g, (todo, chave: string) => valores[chave] ?? todo)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), agendaNoHtml(), seo(env.VITE_SITE_URL ?? '')],
  }
})
