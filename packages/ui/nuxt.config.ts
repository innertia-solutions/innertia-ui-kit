export default defineNuxtConfig({
    extends: ['@innertia-solutions/theme'],
    components: [
        { path: './components', pathPrefix: true }
    ],
    imports: {
        dirs: ['composables']
    },
})
