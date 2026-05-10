// useAuthStore, useApi auto-imported

export function useAuth() {
  const authStore = useAuthStore()
  const api = useApi()
  const config = useRuntimeConfig()
  const loginPath = config.public.loginPath || '/login'

  /**
   * Standard login (email + password).
   * context: role/area slug used in the API path (e.g. 'admin', 'technician').
   */
  async function performLogin(context, email, password, remember = false) {
    authStore.rememberUser = remember
    const data = await api.post(`${context}/auth/login`, { email, password })
    authStore.saveToken(data.access_token)
    authStore.setCurrentContext(context)
    await fetchMe()
    return data
  }

  /**
   * Load current user, permissions, and available contexts from the API.
   * Called after login and after context switch.
   */
  async function fetchMe() {
    const data = await api.get('auth/me')
    authStore.saveUser(data.user)
    authStore.savePermissions(data.permissions ?? [])
    authStore.availableContexts = data.availableContexts ?? []
    return data
  }

  /**
   * Logout: best-effort POST to backend, then clear local state and redirect.
   */
  async function logout() {
    try {
      await api.post('auth/logout', {})
    } catch {
      // best-effort — ignore network failures
    }
    authStore.logout()
    await navigateTo(loginPath)
  }

  /**
   * Get the OAuth redirect URL for a provider.
   * Returns the URL string from the backend.
   */
  async function getOauthRedirectUrl(context, provider) {
    const data = await api.get(`${context}/auth/oauth/${provider}/redirect`)
    return data.url
  }

  /**
   * Handle OAuth callback. Same success path as performLogin.
   */
  async function handleOauthCallback(context, provider, code) {
    const data = await api.post(`${context}/auth/oauth/${provider}/callback`, { code })
    authStore.saveToken(data.access_token)
    authStore.setCurrentContext(context)
    await fetchMe()
    return data
  }

  return { performLogin, fetchMe, logout, getOauthRedirectUrl, handleOauthCallback }
}
