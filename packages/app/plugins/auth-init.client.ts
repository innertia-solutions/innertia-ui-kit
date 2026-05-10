// On app boot: if the stored token exists but is expired, clear auth state silently.
// This prevents stale tokens from reaching the API.
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  if (authStore.token && !authStore.isAuthenticated()) {
    authStore.logout()
  }
})
