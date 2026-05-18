export default defineNuxtConfig({
  modules: [
    '@nuxtjs/seo',
  ],
  imports: {
    dirs: ['composables'],
  },
  vite: {
    optimizeDeps: {
      include: ['pusher-js'],
    },
  },
})
