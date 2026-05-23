import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
  ],
  css: ['@innertia-solutions/nuxt-theme-spark/spark.css'],
  components: [
    { path: './components', pathPrefix: true, prefix: '' },
  ],
  imports: {
    dirs: ['shared/composables', 'shared/stores'],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  appConfig: {
    spark: {
      theme: 'default',
    },
  },
})
