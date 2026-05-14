export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  imports: {
    dirs: ['stores', 'composables'],
    presets: [
      {
        from: '@tanstack/vue-query',
        imports: ['useQuery', 'useMutation', 'useQueryClient', 'useInfiniteQuery'],
      },
    ],
  },
})
