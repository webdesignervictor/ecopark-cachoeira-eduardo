import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), seo(env.VITE_SITE_URL ?? '')],
  }
})
