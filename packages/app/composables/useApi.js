// useRequestInterceptors auto-imported from nuxt-core
// useAuthStore auto-imported from this package

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl || '/api'
  const loginPath = config.public.loginPath || '/login'

  const { run, add } = useRequestInterceptors()

  async function makeRequest(method, path, body = null, options = {}) {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    run(headers, options)

    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const url = `${baseUrl}/${cleanPath}`

    const fetchOptions = { method, headers }
    if (body !== null) fetchOptions.body = JSON.stringify(body)

    const response = await fetch(url, fetchOptions)

    if (response.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      await navigateTo(loginPath)
      return null
    }

    const contentType = response.headers.get('content-type') ?? ''
    const data = contentType.includes('application/json') ? await response.json() : await response.text()

    if (!response.ok) {
      const err = new Error(`API error ${response.status}`)
      err.status = response.status
      err.data = data
      throw err
    }

    return data
  }

  const get    = (path, options = {}) => makeRequest('GET',    path, null, options)
  const post   = (path, body, options = {}) => makeRequest('POST',   path, body, options)
  const put    = (path, body, options = {}) => makeRequest('PUT',    path, body, options)
  const patch  = (path, body, options = {}) => makeRequest('PATCH',  path, body, options)
  const del    = (path, options = {}) => makeRequest('DELETE', path, null, options)

  // *Sync aliases — same methods, named for clarity in call sites
  const getSync    = get
  const postSync   = post
  const putSync    = put
  const patchSync  = patch
  const deleteSync = del

  /** Shortcut to add an interceptor from a composable or plugin */
  const addInterceptor = (fn) => add(fn)

  return { get, post, put, patch, delete: del, getSync, postSync, putSync, patchSync, deleteSync, addInterceptor }
}
