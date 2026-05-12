import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  css: ['./spark.css'],
  components: [
    { path: './components', pathPrefix: true, prefix: '' },
  ],
  imports: {
    dirs: ['shared/composables', 'shared/stores'],
  },
  plugins: ['./plugins/preline.client.ts'],
  vite: {
    plugins: [tailwindcss()],
  },
})
