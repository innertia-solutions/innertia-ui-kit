export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-app'],
  imports: { dirs: ['stores', 'composables'] },
  runtimeConfig: {
    public: {
      loginPath: '/backoffice/login',
      homePath: '/backoffice',
    },
  },
})
