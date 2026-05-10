export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  components: [
    { path: './themes/vantage/components', pathPrefix: true, prefix: 'Vantage' },
  ],
  imports: {
    dirs: ['shared/composables', 'shared/stores'],
  },
})
