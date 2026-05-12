import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  css: ['@innertia-solutions/spark/spark.css'],
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
