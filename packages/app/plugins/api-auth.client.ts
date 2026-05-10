// Registers the Authorization header interceptor into the shared registry.
// Runs only on the client (cookie-based token is not available on the server).
export default defineNuxtPlugin(() => {
  const { add } = useRequestInterceptors()
  const authStore = useAuthStore()

  add((headers: Record<string, string>, options: Record<string, unknown>) => {
    if (options.useToken !== false) {
      const token = authStore.getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
  })
})
