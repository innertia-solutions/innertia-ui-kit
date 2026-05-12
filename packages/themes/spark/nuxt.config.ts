import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  css: [resolve(__dirname, './spark.css')],
  components: [
    { path: './components', pathPrefix: true, prefix: '' },
  ],
  imports: {
    dirs: ['shared/composables', 'shared/stores'],
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
