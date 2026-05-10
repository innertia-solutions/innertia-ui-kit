export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/seo',
  ],
  plugins: [
    '~/plugins/preline.client',
    '~/plugins/dark-state.client',
  ],
  imports: {
    dirs: ['composables'],
  },
})
