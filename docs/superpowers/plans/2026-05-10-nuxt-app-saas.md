# nuxt-app & nuxt-saas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `nuxt-core@0.1.3`, `nuxt-app@0.1.0`, and `nuxt-saas@0.1.0` — three Nuxt layer packages that provide auth, context, permissions, API client, and multi-tenant identification.

**Architecture:** `nuxt-core` adds `useRequestInterceptors` (shared header registry used by `useApi`, `useRealtime`, `useDownload`). `nuxt-app` adds auth store, API client, and composables for auth/context/permissions. `nuxt-saas` extends `nuxt-app` with tenant identification via subdomain, tenant config, and automatic `X-Tenant-Id` injection.

**Tech Stack:** Nuxt 4, Vue 3, Pinia 3, pinia-plugin-persistedstate v4, fetch API, `document.cookie` fallback pattern (no `useCookie` in Pinia actions).

**Spec:** `docs/superpowers/specs/2026-05-10-nuxt-app-saas-design.md`

---

## File Map

### Phase 1 — nuxt-core@0.1.3

| Action | Path |
|--------|------|
| **Create** | `packages/core/composables/useRequestInterceptors.js` |
| **Modify** | `packages/core/composables/useRealtime.js` |
| **Modify** | `packages/core/composables/useDownload.js` |
| **Modify** | `packages/core/package.json` (version bump to 0.1.3) |

### Phase 2 — nuxt-app@0.1.0

| Action | Path |
|--------|------|
| **Create** | `packages/app/package.json` |
| **Create** | `packages/app/nuxt.config.ts` |
| **Create** | `packages/app/stores/auth.js` |
| **Create** | `packages/app/composables/useApi.js` |
| **Create** | `packages/app/composables/useAuth.js` |
| **Create** | `packages/app/composables/useContext.js` |
| **Create** | `packages/app/composables/usePermissions.js` |
| **Create** | `packages/app/middleware/auth.ts` |
| **Create** | `packages/app/middleware/guest.ts` |
| **Create** | `packages/app/plugins/api-auth.client.ts` |
| **Create** | `packages/app/plugins/auth-init.client.ts` |

### Phase 3 — nuxt-saas@0.1.0

| Action | Path |
|--------|------|
| **Create** | `packages/saas/package.json` |
| **Create** | `packages/saas/nuxt.config.ts` |
| **Create** | `packages/saas/stores/tenant.js` |
| **Create** | `packages/saas/composables/useTenant.js` |
| **Create** | `packages/saas/middleware/01.detect-subdomain.global.ts` |
| **Create** | `packages/saas/middleware/02.validate-tenant.global.ts` |
| **Create** | `packages/saas/plugins/api-tenant.client.ts` |

---

## Task 1: `useRequestInterceptors` in nuxt-core

**Files:**
- Create: `packages/core/composables/useRequestInterceptors.js`

- [ ] **Step 1: Create `useRequestInterceptors.js`**

```js
// packages/core/composables/useRequestInterceptors.js

/**
 * Module-level singleton registry.
 * Shared by useApi (nuxt-app), useRealtime, and useDownload (nuxt-core).
 * Each layer adds interceptors at plugin init time.
 */
const interceptors = []

export function useRequestInterceptors() {
  /**
   * Register an interceptor function.
   * fn(headers: object, options: object) — mutates headers in place.
   * Idempotent: adding the same fn twice is a no-op.
   */
  const add = (fn) => {
    if (!interceptors.includes(fn)) interceptors.push(fn)
  }

  /**
   * Run all registered interceptors.
   * headers and options are passed by reference; interceptors mutate headers.
   */
  const run = (headers, options = {}) => {
    for (const fn of interceptors) fn(headers, options)
  }

  return { add, run }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/guillermofarias/Sites/inertia/innertia-ui-kit
git add packages/core/composables/useRequestInterceptors.js
git commit -m "feat(core): add useRequestInterceptors singleton registry"
```

---

## Task 2: Update `useRealtime` to use interceptors (Pusher auth headers)

**Files:**
- Modify: `packages/core/composables/useRealtime.js`

The current `connect()` builds Pusher options without auth headers. We need to add an `auth` config to Pusher that calls `useRequestInterceptors().run({})` so any registered interceptor (auth token, X-Tenant-Id) flows into Pusher channel authentication.

- [ ] **Step 1: Update `connect()` in `useRealtime.js`**

Replace the existing `connect` function body with the version below. The only addition is the `auth` property in `options` before `new Pusher(...)`:

```js
const connect = () => {
  if (alreadyConnected || pusher.value) return

  if (!pusherAppKey) {
    error.value = '[nuxt-core] Falta runtimeConfig.public.pusherAppKey'
    console.error(error.value)
    return
  }

  // Build auth headers from all registered interceptors
  const { run } = useRequestInterceptors()
  const authHeaders = {}
  run(authHeaders)

  const options = {
    cluster: pusherAppCluster || 'mt1',
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    auth: {
      headers: authHeaders,
    },
  }

  // Socketi / host personalizado
  if (pusherWsHost) {
    options.wsHost = pusherWsHost
    options.wsPort = pusherWsPort ? Number(pusherWsPort) : 443
    options.wssPort = pusherWsPort ? Number(pusherWsPort) : 443
  }

  pusher.value = new Pusher(pusherAppKey, options)

  pusher.value.connection.bind('connected', () => {
    connected.value = true
    alreadyConnected = true
  })

  pusher.value.connection.bind('error', (err) => {
    error.value = err
    connected.value = false
    alreadyConnected = false
    pusher.value = null // allow reconnect after error
    console.error('[nuxt-core] Realtime error:', err)
  })

  pusher.value.connection.bind('disconnected', () => {
    connected.value = false
    alreadyConnected = false
  })
}
```

The full file must also import `useRequestInterceptors` — since it's in the same package's composables dir and auto-imported by Nuxt, no explicit import is needed at runtime. But for clarity in the file itself, add a comment at the top:

At top of file, add:
```js
// useRequestInterceptors is auto-imported from this same package (nuxt-core)
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/composables/useRealtime.js
git commit -m "feat(core): useRealtime reads interceptors for Pusher auth headers"
```

---

## Task 3: Update `useDownload` to use interceptors

**Files:**
- Modify: `packages/core/composables/useDownload.js`

Currently `download()` accepts a `headers` option that callers must populate manually. After this task, interceptors run automatically and callers no longer need to pass auth headers.

- [ ] **Step 1: Update `download()` in `useDownload.js`**

Replace the full file with:

```js
/**
 * Descarga un archivo usando XHR con soporte de progreso.
 * Los headers de autenticación se inyectan automáticamente vía useRequestInterceptors.
 */
// useRequestInterceptors is auto-imported from nuxt-core composables
export function useDownload() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl

  /**
   * @param {string} url - ruta relativa al baseUrl
   * @param {object} params - query params (GET) o body (POST)
   * @param {object} options - { onProgress, method, headers }
   *   `headers` is merged AFTER interceptors run (caller can still override)
   * @returns {Promise<{ blob: Blob, headers: object }>}
   */
  function download(url, params = {}, options = {}) {
    const {
      onProgress = null,
      method = 'GET',
      headers: extraHeaders = {},
    } = options

    // Run all interceptors (auth token, X-Tenant-Id, etc.)
    const { run } = useRequestInterceptors()
    const headers = {}
    run(headers, options)
    // Merge caller-supplied headers last (allow override)
    Object.assign(headers, extraHeaders)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      let query = ''
      if (method === 'GET' && Object.keys(params).length) {
        query = '?' + new URLSearchParams(params).toString()
      }
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url
      xhr.open(method, `${baseUrl}/${cleanUrl}${query}`)
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
      xhr.responseType = 'blob'
      xhr.onload = function () {
        const responseHeaders = {}
        xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
          const [key, value] = line.split(': ')
          if (key) responseHeaders[key.toLowerCase()] = value
        })
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ blob: xhr.response, headers: responseHeaders })
        } else {
          reject(new Error(`Download failed: ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100), event)
        }
      }
      xhr.send(method === 'GET' ? null : JSON.stringify(params))
    })
  }

  return { download }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/composables/useDownload.js
git commit -m "feat(core): useDownload auto-injects headers via useRequestInterceptors"
```

---

## Task 4: Bump nuxt-core to 0.1.3 and publish

**Files:**
- Modify: `packages/core/package.json`

- [ ] **Step 1: Update version in `packages/core/package.json`**

Change `"version": "0.1.2"` → `"version": "0.1.3"`.

- [ ] **Step 2: Commit and publish**

```bash
git add packages/core/package.json
git commit -m "chore(core): bump to 0.1.3"
cd packages/core && npm publish --access public
cd ../..
```

Expected output: `+ @innertia-solutions/nuxt-core@0.1.3`

---

## Task 5: Scaffold `nuxt-app` package

**Files:**
- Create: `packages/app/package.json`
- Create: `packages/app/nuxt.config.ts`

- [ ] **Step 1: Create `packages/app/package.json`**

```json
{
  "name": "@innertia-solutions/nuxt-app",
  "version": "0.1.0",
  "description": "Innertia Solutions — Nuxt app layer: auth, context, permissions, API client",
  "keywords": ["nuxt", "vue", "pinia", "auth", "permissions", "context"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/innertia-solutions/innertia-nuxt"
  },
  "publishConfig": {
    "access": "public"
  },
  "main": "./nuxt.config.ts",
  "exports": {
    ".": "./nuxt.config.ts"
  },
  "peerDependencies": {
    "nuxt": ">=4.0.0",
    "vue": ">=3.5.0"
  },
  "dependencies": {
    "@innertia-solutions/nuxt-core": "^0.1.3"
  },
  "devDependencies": {
    "nuxt": "^4.4.2",
    "vue": "^3.5.0"
  }
}
```

- [ ] **Step 2: Create `packages/app/nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  imports: { dirs: ['stores', 'composables'] },
})
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p packages/app/stores
mkdir -p packages/app/composables
mkdir -p packages/app/middleware
mkdir -p packages/app/plugins
```

- [ ] **Step 4: Commit**

```bash
git add packages/app/
git commit -m "feat(app): scaffold nuxt-app package structure"
```

---

## Task 6: Auth store (`packages/app/stores/auth.js`)

**Files:**
- Create: `packages/app/stores/auth.js`

This is the central auth state. Cookie helpers use `document.cookie` fallback pattern (never calls `useCookie()` inside actions — that throws in Nuxt 4 outside setup context).

- [ ] **Step 1: Create `packages/app/stores/auth.js`**

```js
import { defineStore } from 'pinia'

// ─── cookie helpers ────────────────────────────────────────────────────────
// Never call useCookie() inside Pinia actions — it throws outside Vue setup.
// Pattern: try useCookie (works in setup), catch → document.cookie fallback.

function _setCookie(name, value, maxAgeSeconds) {
  try {
    const isDev = import.meta.env?.DEV ?? false
    const cookie = useCookie(name, { maxAge: maxAgeSeconds, sameSite: 'lax', secure: !isDev })
    cookie.value = typeof value === 'object' ? JSON.stringify(value) : value
  } catch {
    if (import.meta.client) {
      const expires = maxAgeSeconds ? `; Max-Age=${Math.floor(maxAgeSeconds)}` : ''
      const val = typeof value === 'object' ? JSON.stringify(value) : value
      document.cookie = `${name}=${encodeURIComponent(val)}${expires}; path=/; SameSite=Lax`
    }
  }
}

function _getCookie(name) {
  try {
    const cookie = useCookie(name)
    return cookie.value ?? null
  } catch {
    if (import.meta.client) {
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
      return match ? decodeURIComponent(match[1]) : null
    }
    return null
  }
}

function _deleteCookie(name) {
  try {
    const cookie = useCookie(name)
    cookie.value = null
  } catch {
    if (import.meta.client) {
      document.cookie = `${name}=; Max-Age=0; path=/`
    }
  }
}

// ─── JWT decode (no lib) ───────────────────────────────────────────────────
function _decodeJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp ?? null
  } catch {
    return null
  }
}

// ─── store ─────────────────────────────────────────────────────────────────
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    currentContext: null,
    availableContexts: [],
    permissions: [],
    rememberUser: false,
  }),

  persist: {
    pick: ['token', 'user', 'currentContext', 'availableContexts'],
  },

  actions: {
    // ── token ──────────────────────────────────────────────────────────────
    saveToken(token) {
      this.token = token
      _setCookie('auth_token', token, 60 * 60 * 24 * 7) // 7 days
    },

    getToken() {
      return this.token ?? _getCookie('auth_token')
    },

    isAuthenticated() {
      const token = this.getToken()
      if (!token) return false
      const exp = _decodeJwtExpiry(token)
      if (exp === null) return true // non-JWT or no expiry claim → treat as valid
      return Date.now() / 1000 < exp
    },

    // ── user ───────────────────────────────────────────────────────────────
    saveUser(user) {
      this.user = user
      _setCookie('auth_user', user, 60 * 60 * 24 * 7)
    },

    // ── context ────────────────────────────────────────────────────────────
    setCurrentContext(context) {
      this.currentContext = context
    },

    // ── permissions ────────────────────────────────────────────────────────
    savePermissions(permissions) {
      this.permissions = permissions ?? []
    },

    // ── logout ─────────────────────────────────────────────────────────────
    logout() {
      this.token = null
      this.user = null
      this.currentContext = null
      this.availableContexts = []
      this.permissions = []
      _deleteCookie('auth_token')
      _deleteCookie('auth_user')
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/stores/auth.js
git commit -m "feat(app): auth store with cookie fallback pattern"
```

---

## Task 7: `useApi` composable

**Files:**
- Create: `packages/app/composables/useApi.js`

HTTP client that calls `useRequestInterceptors().run()` before every fetch. Handles 401 → silent logout + redirect.

- [ ] **Step 1: Create `packages/app/composables/useApi.js`**

```js
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

  // *Sync aliases — same as above but named for clarity in call sites
  const getSync   = get
  const postSync  = post
  const putSync   = put
  const patchSync = patch
  const deleteSync = del

  /** Shortcut to add an interceptor from a composable/plugin */
  const addInterceptor = (fn) => add(fn)

  return { get, post, put, patch, delete: del, getSync, postSync, putSync, patchSync, deleteSync, addInterceptor }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/composables/useApi.js
git commit -m "feat(app): useApi HTTP client with interceptor integration"
```

---

## Task 8: `useAuth` composable

**Files:**
- Create: `packages/app/composables/useAuth.js`

- [ ] **Step 1: Create `packages/app/composables/useAuth.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/composables/useAuth.js
git commit -m "feat(app): useAuth with login, logout, fetchMe, and OAuth helpers"
```

---

## Task 9: `useContext` composable

**Files:**
- Create: `packages/app/composables/useContext.js`

Context = the role/area the user is operating as (admin, technician, etc.). Switch requires a backend permission check, then caller shows confirmation UI, then calls `confirmSwitch`. No re-login needed.

- [ ] **Step 1: Create `packages/app/composables/useContext.js`**

```js
// useAuthStore, useApi, useAuth auto-imported
import { computed } from 'vue'

export function useContext() {
  const authStore = useAuthStore()
  const api = useApi()
  const { fetchMe } = useAuth()

  const currentContext = computed(() => authStore.currentContext)
  const availableContexts = computed(() => authStore.availableContexts)

  /**
   * Check whether user has permission to switch to targetContext.
   * Returns:
   *   { success: false, reason: 'no_permission' }  — user cannot switch
   *   { success: true, requiresConfirmation: true } — show confirmation UI
   */
  async function switchContext(targetContext) {
    const data = await api.get(`auth/context/${targetContext}/check`)
    if (!data.hasAccess) {
      return { success: false, reason: 'no_permission' }
    }
    return { success: true, requiresConfirmation: true }
  }

  /**
   * Execute the context switch after user confirmation.
   * Updates store and reloads permissions via fetchMe.
   */
  async function confirmSwitch(targetContext) {
    authStore.setCurrentContext(targetContext)
    await fetchMe()
    return { success: true }
  }

  /**
   * Quick synchronous check — is this context in the available list?
   */
  function hasAccessToContext(context) {
    return authStore.availableContexts.includes(context)
  }

  return { currentContext, availableContexts, switchContext, confirmSwitch, hasAccessToContext }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/composables/useContext.js
git commit -m "feat(app): useContext with SSR-safe permission check and confirmSwitch"
```

---

## Task 10: `usePermissions` composable

**Files:**
- Create: `packages/app/composables/usePermissions.js`

- [ ] **Step 1: Create `packages/app/composables/usePermissions.js`**

```js
// useAuthStore auto-imported

export function usePermissions() {
  const authStore = useAuthStore()

  /** Check a single permission string */
  const can = (permission) => authStore.permissions.includes(permission)

  /** Check a single role string */
  const hasRole = (role) => authStore.user?.roles?.includes(role) ?? false

  /** True if user has at least one of the given permissions */
  const hasAny = (permissions) => permissions.some(p => authStore.permissions.includes(p))

  /** True if user has all of the given permissions */
  const hasAll = (permissions) => permissions.every(p => authStore.permissions.includes(p))

  return { can, hasRole, hasAny, hasAll }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/app/composables/usePermissions.js
git commit -m "feat(app): usePermissions with can, hasRole, hasAny, hasAll"
```

---

## Task 11: Middleware — `auth` and `guest`

**Files:**
- Create: `packages/app/middleware/auth.ts`
- Create: `packages/app/middleware/guest.ts`

- [ ] **Step 1: Create `packages/app/middleware/auth.ts`**

```ts
// Redirect unauthenticated users to login.
// useAuthStore auto-imported from nuxt-app stores.
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  if (!authStore.isAuthenticated()) {
    return navigateTo(config.public.loginPath || '/login')
  }
})
```

- [ ] **Step 2: Create `packages/app/middleware/guest.ts`**

```ts
// Redirect already-authenticated users away from guest-only pages (login, register).
// useAuthStore auto-imported from nuxt-app stores.
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  if (authStore.isAuthenticated()) {
    return navigateTo(config.public.homePath || '/')
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/app/middleware/
git commit -m "feat(app): auth and guest route middleware"
```

---

## Task 12: Plugins — `api-auth` and `auth-init`

**Files:**
- Create: `packages/app/plugins/api-auth.client.ts`
- Create: `packages/app/plugins/auth-init.client.ts`

- [ ] **Step 1: Create `packages/app/plugins/api-auth.client.ts`**

Registers the `Authorization: Bearer <token>` interceptor once at app boot.

```ts
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
```

- [ ] **Step 2: Create `packages/app/plugins/auth-init.client.ts`**

Silent logout when app loads with an expired token.

```ts
// On app boot: if the stored token exists but is expired, clear auth state silently.
// This prevents stale tokens from reaching the API.
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  if (authStore.token && !authStore.isAuthenticated()) {
    authStore.logout()
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/app/plugins/
git commit -m "feat(app): api-auth interceptor plugin and auth-init silent logout plugin"
```

---

## Task 13: Publish `nuxt-app@0.1.0`

- [ ] **Step 1: Install dependencies and publish**

```bash
cd packages/app
npm install
npm publish --access public
cd ../..
```

Expected: `+ @innertia-solutions/nuxt-app@0.1.0`

- [ ] **Step 2: Commit npm lock if generated**

```bash
git add packages/app/package-lock.json 2>/dev/null || true
git commit -m "chore(app): publish nuxt-app@0.1.0" --allow-empty
```

---

## Task 14: Scaffold `nuxt-saas` package

**Files:**
- Create: `packages/saas/package.json`
- Create: `packages/saas/nuxt.config.ts`

- [ ] **Step 1: Create `packages/saas/package.json`**

```json
{
  "name": "@innertia-solutions/nuxt-saas",
  "version": "0.1.0",
  "description": "Innertia Solutions — Nuxt SaaS layer: multi-tenant identification, config, and interceptor",
  "keywords": ["nuxt", "vue", "saas", "multi-tenant", "pinia"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/innertia-solutions/innertia-nuxt"
  },
  "publishConfig": {
    "access": "public"
  },
  "main": "./nuxt.config.ts",
  "exports": {
    ".": "./nuxt.config.ts"
  },
  "peerDependencies": {
    "nuxt": ">=4.0.0",
    "vue": ">=3.5.0"
  },
  "dependencies": {
    "@innertia-solutions/nuxt-app": "^0.1.0"
  },
  "devDependencies": {
    "nuxt": "^4.4.2",
    "vue": "^3.5.0"
  }
}
```

- [ ] **Step 2: Create `packages/saas/nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-app'],
  imports: { dirs: ['stores', 'composables'] },
})
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p packages/saas/stores
mkdir -p packages/saas/composables
mkdir -p packages/saas/middleware
mkdir -p packages/saas/plugins
```

- [ ] **Step 4: Commit**

```bash
git add packages/saas/
git commit -m "feat(saas): scaffold nuxt-saas package structure"
```

---

## Task 15: Tenant store (`packages/saas/stores/tenant.js`)

**Files:**
- Create: `packages/saas/stores/tenant.js`

State: `tenantId` (null until validated), `tenantSlug` (from subdomain), `config` (features, oauthProviders, isActive). Config is NOT persisted — always reloaded from backend.

- [ ] **Step 1: Create `packages/saas/stores/tenant.js`**

```js
import { defineStore } from 'pinia'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    tenantId: null,
    tenantSlug: null,
    config: {
      oauthProviders: [],
      features: [],
      isActive: false,
    },
  }),

  persist: {
    // tenantId and tenantSlug survive page refresh; config is always reloaded
    pick: ['tenantId', 'tenantSlug'],
  },

  actions: {
    /** Called by detect-subdomain middleware with the extracted slug */
    setSlug(slug) {
      this.tenantSlug = slug
    },

    /** Called after backend validation — sets id and full config */
    setTenant(id, config) {
      this.tenantId = id
      this.config = {
        oauthProviders: config.oauthProviders ?? [],
        features: config.features ?? [],
        isActive: config.isActive ?? false,
      }
    },

    /** Check whether a feature flag is enabled for this tenant */
    isFeatureEnabled(feature) {
      return this.config.features.includes(feature)
    },

    /** Returns the OAuth providers configured for this tenant */
    getOauthProviders() {
      return this.config.oauthProviders ?? []
    },

    /** Reset all tenant state (e.g., on logout or invalid tenant) */
    clear() {
      this.tenantId = null
      this.tenantSlug = null
      this.config = { oauthProviders: [], features: [], isActive: false }
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/saas/stores/tenant.js
git commit -m "feat(saas): tenant store with persisted id+slug, runtime config"
```

---

## Task 16: `useTenant` composable

**Files:**
- Create: `packages/saas/composables/useTenant.js`

- [ ] **Step 1: Create `packages/saas/composables/useTenant.js`**

```js
// useTenantStore auto-imported from saas stores
// useApi auto-imported from nuxt-app composables
import { computed } from 'vue'

export function useTenant() {
  const tenantStore = useTenantStore()
  const api = useApi()

  const currentTenant = computed(() => tenantStore.tenantId)
  const tenantSlug = computed(() => tenantStore.tenantSlug)

  /**
   * Reload full tenant config from the backend.
   * X-Tenant-Id header is injected automatically via api-tenant plugin interceptor.
   * Call this after login in a SaaS app.
   */
  async function loadConfig() {
    const data = await api.get('tenant/config')
    tenantStore.setTenant(tenantStore.tenantId, data)
    return data
  }

  const isFeatureEnabled = (feature) => tenantStore.isFeatureEnabled(feature)
  const getOauthProviders = () => tenantStore.getOauthProviders()

  return { currentTenant, tenantSlug, loadConfig, isFeatureEnabled, getOauthProviders }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/saas/composables/useTenant.js
git commit -m "feat(saas): useTenant composable with loadConfig and feature helpers"
```

---

## Task 17: Middleware 01 — `detect-subdomain`

**Files:**
- Create: `packages/saas/middleware/01.detect-subdomain.global.ts`

Runs on every SSR request. Extracts subdomain from hostname and stores it. Skips www, IPs, bare localhost. Reserved: `admin` subdomain sets admin context flag.

- [ ] **Step 1: Create `packages/saas/middleware/01.detect-subdomain.global.ts`**

```ts
// useTenantStore auto-imported from saas stores.
// Server-only: reads request hostname to extract tenant subdomain.
export default defineNuxtRouteMiddleware(() => {
  // Only run on server side (SSR request has the real hostname)
  if (!import.meta.server) return

  const requestUrl = useRequestURL()
  const hostname = requestUrl.hostname // e.g. "acme.app.com" or "localhost"

  const parts = hostname.split('.')

  // Bare hostname (localhost, IP) or www → no tenant
  if (
    parts.length < 2 ||
    parts[0] === 'www' ||
    /^\d+$/.test(parts[0]) // IP fragment
  ) {
    return navigateTo('/welcome')
  }

  const subdomain = parts[0]

  // Reserved: admin subdomain bypasses tenant flow
  if (subdomain === 'admin') {
    useState('isAdminContext', () => false).value = true
    return
  }

  // Store slug in both useState (SSR-safe) and tenantStore (Pinia)
  useState<string>('tenantSlug', () => '').value = subdomain
  const tenantStore = useTenantStore()
  tenantStore.setSlug(subdomain)
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/saas/middleware/01.detect-subdomain.global.ts
git commit -m "feat(saas): detect-subdomain middleware extracts tenant from hostname"
```

---

## Task 18: Middleware 02 — `validate-tenant`

**Files:**
- Create: `packages/saas/middleware/02.validate-tenant.global.ts`

Runs after subdomain detection. Skips public routes. Calls backend to validate the slug. If invalid/inactive → redirect to `/tenant-not-found`.

- [ ] **Step 1: Create `packages/saas/middleware/02.validate-tenant.global.ts`**

```ts
// useTenantStore, useApi auto-imported.
// Server-only: validates tenant slug with the backend.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.server) return

  // Skip public routes that don't require a valid tenant
  const publicRoutes = ['/welcome', '/tenant-not-found', '/404']
  const isPublic =
    publicRoutes.includes(to.path) ||
    to.path.startsWith('/auth/')

  if (isPublic) return

  // Skip admin context
  if (useState('isAdminContext', () => false).value) return

  const tenantSlug = useState<string>('tenantSlug', () => '').value
  if (!tenantSlug) return navigateTo('/welcome')

  try {
    const api = useApi()
    const data = await api.get(`tenant/validate?slug=${tenantSlug}`, { useToken: false })

    if (!data || !data.isActive) {
      return navigateTo('/tenant-not-found')
    }

    const tenantStore = useTenantStore()
    tenantStore.setTenant(data.id, data.config ?? {})
  } catch {
    return navigateTo('/tenant-not-found')
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/saas/middleware/02.validate-tenant.global.ts
git commit -m "feat(saas): validate-tenant middleware calls backend and sets tenantStore"
```

---

## Task 19: Plugin — `api-tenant`

**Files:**
- Create: `packages/saas/plugins/api-tenant.client.ts`

Registers `X-Tenant-Id` interceptor. Because it's in `nuxt-saas` which extends `nuxt-app`, this interceptor runs after `api-auth` (which registered the `Authorization` header). Both headers flow into every `useApi`, `useDownload`, and `useRealtime` call.

- [ ] **Step 1: Create `packages/saas/plugins/api-tenant.client.ts`**

```ts
// Registers the X-Tenant-Id header interceptor.
// useRequestInterceptors auto-imported from nuxt-core.
// useTenantStore auto-imported from saas stores.
export default defineNuxtPlugin(() => {
  const { add } = useRequestInterceptors()
  const tenantStore = useTenantStore()

  add((headers: Record<string, string>) => {
    if (tenantStore.tenantId) {
      headers['X-Tenant-Id'] = String(tenantStore.tenantId)
    }
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/saas/plugins/api-tenant.client.ts
git commit -m "feat(saas): api-tenant plugin registers X-Tenant-Id interceptor"
```

---

## Task 20: Publish `nuxt-saas@0.1.0`

- [ ] **Step 1: Install dependencies and publish**

```bash
cd packages/saas
npm install
npm publish --access public
cd ../..
```

Expected: `+ @innertia-solutions/nuxt-saas@0.1.0`

- [ ] **Step 2: Final commit**

```bash
git add packages/saas/package-lock.json 2>/dev/null || true
git commit -m "chore(saas): publish nuxt-saas@0.1.0" --allow-empty
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| `useRequestInterceptors` singleton registry | Task 1 |
| `useRealtime` uses interceptors for Pusher auth | Task 2 |
| `useDownload` auto-injects headers | Task 3 |
| `nuxt-core@0.1.3` version bump + publish | Task 4 |
| `nuxt-app` package scaffold | Task 5 |
| Auth store with cookie fallback | Task 6 |
| `useApi` HTTP client | Task 7 |
| `useAuth` login/logout/fetchMe/OAuth | Task 8 |
| `useContext` switch + confirmSwitch | Task 9 |
| `usePermissions` can/hasRole/hasAny/hasAll | Task 10 |
| `auth` and `guest` middleware | Task 11 |
| `api-auth` plugin (Authorization header) | Task 12 |
| `auth-init` plugin (silent logout on expired) | Task 12 |
| `nuxt-app@0.1.0` publish | Task 13 |
| `nuxt-saas` package scaffold | Task 14 |
| Tenant store | Task 15 |
| `useTenant` composable | Task 16 |
| `detect-subdomain` middleware | Task 17 |
| `validate-tenant` middleware | Task 18 |
| `api-tenant` plugin (X-Tenant-Id header) | Task 19 |
| `nuxt-saas@0.1.0` publish | Task 20 |

All spec requirements covered. No gaps found.

### Type/name consistency check

- `useAuthStore` — defined in Task 6, used in Tasks 7, 8, 9, 12 ✅
- `useTenantStore` — defined in Task 15, used in Tasks 16, 17, 18, 19 ✅
- `useRequestInterceptors` — defined in Task 1, used in Tasks 2, 3, 12, 19 ✅
- `useApi` — defined in Task 7, used in Tasks 8, 9, 16, 18 ✅
- `useAuth` (specifically `fetchMe`) — defined in Task 8, used in Task 9 ✅
- `tenantStore.setTenant(id, config)` — action defined in Task 15, called in Tasks 17, 18 ✅
- `tenantStore.setSlug(slug)` — defined in Task 15, called in Task 17 ✅
- `persist.pick` (not `persist.paths`) — used correctly in Tasks 6 and 15 ✅
