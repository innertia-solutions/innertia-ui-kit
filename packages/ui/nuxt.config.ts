export default defineNuxtConfig({
    components: [
        { path: './components', pathPrefix: true }
    ],
    imports: {
        dirs: ['composables']
    },
})
