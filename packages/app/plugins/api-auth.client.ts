// Registers the Authorization header interceptor into the shared registry.
// Runs only on the client (cookie-based token is not available on the server).
export default defineNuxtPlugin(() => {
  const { add } = useRequestInterceptors()

  add((headers: Record<string, string>, options: Record<string, unknown>) => {
    if (options.useToken !== false) {
      const token = useAuthStore().getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
  })
})
