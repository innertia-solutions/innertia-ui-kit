export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  components: [
    { path: './components', pathPrefix: true, prefix: '' },
  ],
  imports: {
    dirs: ['shared/composables', 'shared/stores'],
  },
})
