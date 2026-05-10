# nuxt-app + nuxt-saas Design

**Goal:** Two Nuxt layer packages covering app behaviour — auth, context, permissions, API client — for single-client apps (`nuxt-app`) and multi-tenant SaaS (`nuxt-saas`).

**Architecture:** `nuxt-core` ← `nuxt-app` ← `nuxt-saas`. Each layer only adds what is exclusive to it. A shared interceptor registry in `nuxt-core` is consumed by `useApi`, `useRealtime`, and `useDownload` so auth and tenant headers flow automatically everywhere.

**Tech Stack:** Nuxt 4, Vue 3, Pinia 3, pinia-plugin-persistedstate v4, `document.cookie` fallback pattern (no `useCookie` in Pinia actions), fetch API.

---

## Package dependency chain

```
@innertia-solutions/nuxt-core    → Preline, Pinia, Pusher, utility composables
  ↑ extends
@innertia-solutions/nuxt-app     → useApi, auth, context, permissions
  ↑ extends
@innertia-solutions/nuxt-saas    → tenant identification, tenant config, tenant interceptor
```

---

## 1. `useRequestInterceptors` — shared registry (nuxt-core)

Lives in `packages/core/composables/useRequestInterceptors.js`.
Module-level singleton array. Used by `useApi`, `useRealtime` (Pusher auth headers), and `useDownload`.

```js
const interceptors = []

export function useRequestInterceptors() {
  const add = (fn) => {
    if (!interceptors.includes(fn)) interceptors.push(fn)
  }
  const run = (headers, options = {}) => {
    for (const fn of interceptors) fn(headers, options)
  }
  return { add, run }
}
```

`useRealtime.connect()` calls `run({})` to build Pusher auth headers.
`useDownload.download()` calls `run({})` to build XHR headers automatically (no longer needs caller to pass headers manually).
`useApi.makeRequest()` calls `run(headers, options)` before each fetch.

---

## 2. `@innertia-solutions/nuxt-app`

### File map

```
packages/app/
├── package.json                        # @innertia-solutions/nuxt-app ^0.1.0
├── nuxt.config.ts
├── stores/
│   └── auth.js                         # Pinia: token, user, currentContext, availableContexts, permissions
├── composables/
│   ├── useApi.js                       # HTTP client consuming useRequestInterceptors
│   ├── useAuth.js                      # performLogin, logout, fetchMe, oauth
│   ├── useContext.js                   # switchContext, confirmSwitch, hasAccessToContext
│   └── usePermissions.js              # can(), hasRole(), hasAny(), hasAll()
├── middleware/
│   ├── auth.ts                         # unauthenticated → runtimeConfig.public.loginPath
│   └── guest.ts                        # authenticated → runtimeConfig.public.homePath
└── plugins/
    ├── api-auth.client.ts              # registers Authorization interceptor
    └── auth-init.client.ts            # silent logout if token expired on mount
```

### nuxt.config.ts

```ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  imports: { dirs: ['stores', 'composables'] },
})
```

### Auth store (`stores/auth.js`)

State: `token`, `user`, `currentContext`, `availableContexts`, `permissions`, `rememberUser`.

Cookie management uses `document.cookie` fallback — never calls `useCookie()` inside Pinia actions (avoids Nuxt 4 context error). Same pattern applied in olimpo.

Actions:
- `saveToken(token)` — saves to state + cookie (document.cookie fallback)
- `saveUser(user)` — saves to state + cookie
- `setCurrentContext(context)` — updates currentContext, persists
- `savePermissions(permissions)` — updates permissions array
- `getToken()` — state first, cookie fallback
- `isAuthenticated()` — checks token + expiry via JWT decode
- `logout()` — clears state + cookies

Persist: `pick: ['token', 'user', 'currentContext', 'availableContexts']`

### useApi (`composables/useApi.js`)

HTTP client. Reads `runtimeConfig.public.apiBaseUrl`. Calls `useRequestInterceptors().run(headers, options)` before every request. Handles 401 → silent logout + redirect to loginPath.

Methods: `get`, `post`, `put`, `patch`, `delete` + `*Sync` aliases.
Extra: `addInterceptor(fn)` — shortcut to `useRequestInterceptors().add(fn)`.

### useAuth (`composables/useAuth.js`)

```
performLogin(context, email, password, remember)
  → POST /{context}/auth/login
  → saveToken, setCurrentContext, fetchMe

fetchMe()
  → GET /auth/me
  → saveUser, savePermissions, sets availableContexts

logout()
  → POST /auth/logout (best-effort)
  → authStore.logout()
  → navigateTo(loginPath)

getOauthRedirectUrl(context, provider)
  → GET /{context}/auth/oauth/{provider}/redirect
  → returns url

handleOauthCallback(context, provider, code)
  → POST /{context}/auth/oauth/{provider}/callback
  → same flow as performLogin success path
```

OAuth providers configured via `runtimeConfig.public.oauthProviders: ['google']`.
In nuxt-saas this list comes from tenant config instead.

### useContext (`composables/useContext.js`)

```
currentContext   → computed from authStore.currentContext
availableContexts → computed from authStore.availableContexts

switchContext(targetContext)
  → GET /auth/context/{targetContext}/check (SSR-safe)
  → { hasAccess: false } → return { success: false, reason: 'no_permission' }
  → { hasAccess: true }  → return { success: true, requiresConfirmation: true }

confirmSwitch(targetContext)
  → authStore.setCurrentContext(targetContext)
  → fetchMe() to reload permissions for new context
  → return { success: true }

hasAccessToContext(context) → authStore.availableContexts.includes(context)
```

The confirmation UI (alert/modal) lives in the app or nuxt-themes — `useContext` only returns the result, never renders anything.

### usePermissions (`composables/usePermissions.js`)

```
can(permission)           → authStore.permissions.includes(permission)
hasRole(role)             → authStore.user?.roles?.includes(role)
hasAny(permissions[])     → any match
hasAll(permissions[])     → all match
```

### Middleware

`auth.ts` — if not `isAuthenticated()` → `navigateTo(runtimeConfig.public.loginPath || '/login')`.
`guest.ts` — if `isAuthenticated()` → `navigateTo(runtimeConfig.public.homePath || '/')`.

### Plugins

`api-auth.client.ts`:
```ts
export default defineNuxtPlugin(() => {
  const { add } = useRequestInterceptors()
  const authStore = useAuthStore()
  add((headers, options) => {
    if (options.useToken !== false) {
      const token = authStore.getToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
  })
})
```

`auth-init.client.ts`:
```ts
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  // Token exists in store but is expired → silent logout
  if (authStore.token && !authStore.isAuthenticated()) {
    authStore.logout()
  }
})
```

### Backend API contract (nuxt-app expects)

```
POST   /{context}/auth/login              → { access_token, user }
POST   /{context}/auth/oauth/{p}/callback → { access_token }
GET    /{context}/auth/oauth/{p}/redirect → { url }
GET    /auth/me                           → { user, permissions, availableContexts, roles }
GET    /auth/context/{context}/check      → { hasAccess: boolean }
POST   /auth/logout
```

---

## 3. `@innertia-solutions/nuxt-saas`

### File map

```
packages/saas/
├── package.json                        # @innertia-solutions/nuxt-saas ^0.1.0
├── nuxt.config.ts
├── stores/
│   └── tenant.js                       # tenantId, tenantSlug, config
├── composables/
│   └── useTenant.js                    # loadConfig, isFeatureEnabled, oauthProviders
├── middleware/
│   ├── 01.detect-subdomain.global.ts  # server: hostname → tenantSlug → useState
│   └── 02.validate-tenant.global.ts   # GET /tenant/validate → redirect if invalid
└── plugins/
    └── api-tenant.client.ts           # registers X-Tenant-Id interceptor
```

### nuxt.config.ts

```ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-app'],
  imports: { dirs: ['stores', 'composables'] },
})
```

### Tenant store (`stores/tenant.js`)

State: `tenantId` (null until validated by backend), `tenantSlug` (from subdomain), `config` (oauthProviders, features, isActive).

Actions:
- `setSlug(slug)` — from subdomain middleware
- `setTenant(id, config)` — after backend validation
- `isFeatureEnabled(feature)` — `config.features.includes(feature)`
- `getOauthProviders()` — `config.oauthProviders ?? []`
- `clear()` — reset all

Persist: `pick: ['tenantId', 'tenantSlug']` — config is always reloaded from backend.

### Middleware 01 — detect-subdomain (server only)

Runs on every SSR request. Reads `useRequestURL().hostname`, extracts subdomain. Stores in `useState('tenantSlug')` + `useTenantStore().setSlug(slug)`.

Skips: `www`, IPs, localhost without subdomain → redirects to `/welcome`.
Reserved: `admin` subdomain sets `useState('isAdminContext', true)` and skips tenant flow.

### Middleware 02 — validate-tenant (server only)

Skips public routes: `/welcome`, `/tenant-not-found`, `/auth/*`, `/404`.
If `tenantSlug` is set: calls backend `GET /tenant/validate?slug={slug}`.
- Valid → `tenantStore.setTenant(id, config)`.
- Invalid/inactive → `navigateTo('/tenant-not-found')`.

### useTenant (`composables/useTenant.js`)

```
loadConfig()
  → GET /tenant/config (needs X-Tenant-Id in header already set)
  → tenantStore.setTenant(id, config)

currentTenant    → computed tenantStore.tenantId
tenantSlug       → computed tenantStore.tenantSlug
isFeatureEnabled(feature) → tenantStore.isFeatureEnabled(feature)
getOauthProviders()       → tenantStore.getOauthProviders()
```

After login in a SaaS app: `useAuth().performLogin(...)` then `useTenant().loadConfig()`.

### Plugin — api-tenant

```ts
export default defineNuxtPlugin(() => {
  const { add } = useRequestInterceptors()
  const tenantStore = useTenantStore()
  add((headers) => {
    if (tenantStore.tenantId) headers['X-Tenant-Id'] = String(tenantStore.tenantId)
  })
})
```

`useRealtime.connect()` also uses `useRequestInterceptors().run()` → Pusher auth headers include `X-Tenant-Id` automatically.

### Backend API contract (nuxt-saas adds)

```
GET  /tenant/validate?slug={slug}   → { id, isActive, config }
GET  /tenant/config                 → { oauthProviders[], features[], isActive }
```

---

## 4. Changes to nuxt-core (this sprint)

- Add `composables/useRequestInterceptors.js` — shared registry
- Update `useRealtime.js` — call `useRequestInterceptors().run({})` to build Pusher auth headers
- Update `useDownload.js` — call `useRequestInterceptors().run({})` instead of requiring caller to pass headers
- Bump to `0.1.3`

---

## 5. App configuration

Both packages read from `runtimeConfig.public`:

| Key | Default | Used by |
|-----|---------|---------|
| `apiBaseUrl` | `/api` | useApi |
| `loginPath` | `/login` | auth middleware, 401 handler |
| `homePath` | `/` | guest middleware |
| `oauthProviders` | `[]` | useAuth (overridden in nuxt-saas by tenant config) |
| `timeZone` | `America/Santiago` | useDate (nuxt-core) |

---

## 6. Version plan

| Package | Current | After this sprint |
|---------|---------|-------------------|
| nuxt-core | 0.1.2 | 0.1.3 |
| nuxt-themes | 0.1.1 | — |
| nuxt-app | — | 0.1.0 |
| nuxt-saas | — | 0.1.0 |
