# innertia-nuxt Architecture Design

## Goal

Reestructurar el monorepo `innertia-ui-kit` en `innertia-nuxt`: tres paquetes Nuxt Layer independientes que, combinados, proveen el toolkit completo para construir apps SaaS multitenant y single-app sobre Nuxt 4.

---

## Monorepo

**Renombrar directorio:** `innertia-ui-kit/` → `innertia-nuxt/`

```
innertia-nuxt/
├── packages/
│   ├── core/          # @innertia-solutions/nuxt-core
│   ├── themes/        # @innertia-solutions/nuxt-themes
│   └── auth/          # @innertia-solutions/nuxt-auth
├── pnpm-workspace.yaml
└── package.json
```

Los paquetes actuales `packages/ui` y `packages/theme` se eliminan. Todo su contenido migra a la nueva estructura.

**Grafo de dependencias:**
```
nuxt-core              ← sin deps propias del kit
nuxt-themes → nuxt-core
nuxt-auth   → nuxt-core
app         → nuxt-core + nuxt-themes + nuxt-auth
```

`nuxt-themes` nunca depende de `nuxt-auth`. El app conecta ambos.

---

## Paquete 1 — `@innertia-solutions/nuxt-core`

**Propósito:** Infraestructura pura del frontend. Sin CSS, sin componentes, sin layouts. Instala y configura todo lo que cualquier app Nuxt de Innertia necesita desde el día cero.

### Estructura

```
packages/core/
├── plugins/
│   └── preline.client.ts    # autoInit + MutationObserver para HSSelect, HSOverlay, etc.
├── composables/
│   ├── useRealtime.js        # Pusher/Socketi: connect, subscribe, unsubscribe, disconnect
│   ├── useDownload.js        # descarga de archivos blob con nombre
│   ├── useDevice.js          # deviceId persistente, isMobile
│   ├── useDate.js            # formateo de fechas (date-fns + dayjs)
│   ├── useTimeAgo.js         # "hace 3 minutos" reactivo
│   └── useRutFormatter.js    # validación y formato RUT chileno
├── public/
│   └── init-theme.js         # script inline anti-flash dark mode (va en <head>)
└── nuxt.config.ts            # registra plugin preline, pinia, seo, auto-imports
```

### Dependencias que instala

```json
{
  "peerDependencies": {
    "nuxt": ">=4.0.0",
    "vue": ">=3.5.0"
  },
  "dependencies": {
    "preline": "^3.2.3",
    "pinia": "^3.0.0",
    "pinia-plugin-persistedstate": "^4.0.0",
    "pusher-js": "^8.5.0",
    "uuid": "^13.0.0",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "dayjs": "^1.11.0",
    "@nuxt/seo": "^3.4.0"
  }
}
```

### `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@nuxtjs/seo'],
  imports: { dirs: ['composables'] },
})
```

### Uso en el app

```ts
// nuxt.config.ts del app
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  runtimeConfig: {
    public: {
      apiBaseUrl: '/api',
      pusherAppKey: '',
      pusherAppCluster: '',
    }
  }
})
```

```html
<!-- app.vue o layout — script anti-flash en el head -->
<script src="/init-theme.js" />
```

### `useRealtime` — interfaz pública

```js
const { connect, disconnect, subscribe, unsubscribe, connected, error } = useRealtime()

// Conectar al iniciar la app
connect()

// Suscribir a un canal
subscribe('tenant.123', {
  'order.created': (data) => console.log(data),
})

// Desuscribir al destruir el componente
onUnmounted(() => unsubscribe('tenant.123'))
```

La configuración de host/puerto de Socketi se lee de `runtimeConfig.public`. No hay lógica de negocio dentro.

### Lo que NO tiene

- Componentes Vue
- CSS o tokens visuales
- Layouts
- Lógica de autenticación
- Stores de UI (toast, sidebar)

---

## Paquete 2 — `@innertia-solutions/nuxt-themes`

**Propósito:** Capa visual. Componentes, layouts y estilos organizados por tema. Un mismo app puede usar Vantage para el admin y Slim para la parte mobile importando layouts distintos. No depende de `nuxt-auth`.

### Estructura

```
packages/themes/
├── nuxt.config.ts             # registra shared + todos los temas
├── shared/
│   ├── composables/
│   │   ├── useForm.js         # lógica pura: rules, errors, validate, reset, addError
│   │   ├── useToast.js        # API: alert.success, notification, process
│   │   └── useTable.ts        # cache, search persistente, filters persistentes
│   └── stores/
│       └── toast.js           # estado de toasts por posición
└── themes/
    ├── vantage/
    │   ├── components/        # prefijo Vantage → VantageAdminBase, VantageFormsInput, etc.
    │   ├── layouts/
    │   │   ├── vantage-admin.vue    # shell completo: sidebar fijo + header + slot
    │   │   ├── vantage-auth.vue     # split-screen: imagen izq + form der
    │   │   └── vantage-config.vue   # layout con tabs horizontales de configuración
    │   └── vantage.css        # tokens CSS (colores, radios, tipografía del tema)
    ├── slim/
    │   ├── components/        # prefijo Slim → SlimShellBase, SlimFormsInput, etc.
    │   ├── layouts/
    │   │   ├── slim-app.vue         # shell mobile: bottom nav + slot
    │   │   └── slim-auth.vue        # login mobile centrado
    │   └── slim.css
    └── spark/                 # futuro — landing pages, marketing
        ├── components/
        ├── layouts/
        └── spark.css
```

### Convención de nombres

**Componentes:** el `pathPrefix: true` en Nuxt genera el prefijo automáticamente desde la carpeta.
```
themes/vantage/components/Admin/Base.vue    → <VantageAdminBase>
themes/vantage/components/Forms/Input.vue  → <VantageFormsInput>
themes/slim/components/Shell/Base.vue      → <SlimShellBase>
```

**Layouts:** nombrados con prefijo del tema para evitar colisiones.
```
vantage-admin.vue  →  definePageMeta({ layout: 'vantage-admin' })
slim-app.vue       →  definePageMeta({ layout: 'slim-app' })
```

### Vantage — componentes (migrados desde `packages/ui`)

```
themes/vantage/components/
├── Admin/
│   ├── Base.vue          # sidebar + backdrop mobile + slot principal
│   ├── Header.vue        # barra superior con slots: left, right
│   ├── Page.vue          # wrapper con padding estándar
│   └── PageHeader.vue    # título + breadcrumb + slot de acciones
├── Forms/
│   ├── Input.vue         # label, input, hint, error prop
│   ├── Select.vue        # HSSelect + label, error prop
│   ├── SelectServer.vue  # lazy load + search + infinite scroll
│   └── DatePicker.vue
├── App/
│   ├── Button.vue
│   ├── Tag.vue
│   ├── Dropdown.vue
│   ├── EmptyState.vue
│   ├── LoadingState.vue
│   └── PageLoadingSpinner.vue
├── Modal/
│   └── DeleteConfirm.vue
├── Nav/
│   └── Tabs.vue
├── Table/
│   ├── DownloadDropdown.vue
│   └── FilterDropdown.vue
└── Toast/
    ├── Alert.vue
    ├── Notification.vue
    └── Process.vue
```

### Vantage — layouts

**`vantage-admin.vue`** — shell del panel administrador:
- Sidebar fijo (w-65), colapsable en mobile via store `useSidebar()`
- Slots: `#logo`, `#menu`, `#user-footer` — el app pone su propio contenido
- No sabe quién es el usuario; el app provee los datos via `#user-footer`

**`vantage-auth.vue`** — login split-screen:
- Columna izquierda: imagen + slot `#welcome`
- Columna derecha: formulario centrado + slot default

**`vantage-config.vue`** — sección de configuración:
- Tabs horizontales (lista de rutas)
- Slot default para el contenido de cada tab

### Shared — `useForm` (lógica pura, sin DOM)

```js
const { form, errors, validate, reset, addError, loadFromObject } = useForm({
  name:  { value: '', rules: ['required'] },
  email: { value: '', rules: ['required', 'email'] },
})

// validate() retorna true/false
// errors.name → array de strings
// Los componentes (FormsInput) muestran errors via prop, no useForm
```

**Reglas disponibles:** `required`, `email`, `min`, `int`, `rut`, `same`

`useForm` no toca el DOM. Los componentes de cada tema reciben `error` prop y renderizan el estilo que corresponde.

### Shared — `useToast`

```js
const toast = useToast()

toast.alert.success('Guardado correctamente')
toast.alert.error('No se pudo guardar')
toast.notification('Nuevo mensaje', 'Juan te escribió')
const id = toast.process('Exportando PDF...')
toast.updateProgress(id, 50, 'Procesando...')
toast.completeProcess(id)
```

### Uso mixto de temas en un mismo app

```ts
// pages/admin/users/index.vue
definePageMeta({ layout: 'vantage-admin' })

// pages/app/dashboard.vue
definePageMeta({ layout: 'slim-app' })

// pages/landing/index.vue
definePageMeta({ layout: 'spark-landing' })  // futuro
```

---

## Paquete 3 — `@innertia-solutions/nuxt-auth`

**Propósito:** Lógica de autenticación, autorización, contexto multitenant y gestión de sesión. Sin componentes visuales.

### Estructura

```
packages/auth/
├── composables/
│   ├── useAuth.js          # login, logout, getUser, token
│   ├── usePermissions.js   # can('users.edit'), hasRole('admin')
│   └── useContext.js       # tenant actual, subdomain detection
├── stores/
│   ├── auth.js             # user, token, isAuthenticated
│   └── permissions.js      # permisos cacheados
├── middleware/
│   ├── auth.js             # redirect si no autenticado
│   └── guest.js            # redirect si ya autenticado
└── nuxt.config.ts
```

> **Scope de este paquete:** Definido en spec separado. Se implementa después de `nuxt-core` y `nuxt-themes`.

---

## Criterio de clasificación

| ¿Lo necesita un app sin UI? | ¿Cambia si cambia el tema visual? | Paquete |
|---|---|---|
| Sí | No | `nuxt-core` |
| No | Sí | `nuxt-themes` |
| No | No, pero es lógica de negocio auth | `nuxt-auth` |

---

## Migración desde `packages/ui` + `packages/theme`

| Archivo actual | Destino |
|---|---|
| `packages/ui/components/**` | `packages/themes/themes/vantage/components/` |
| `packages/ui/composables/useForm.js` | `packages/themes/shared/composables/` (sin DOM) |
| `packages/ui/composables/useToast.js` | `packages/themes/shared/composables/` |
| `packages/ui/composables/useTable.ts` | `packages/themes/shared/composables/` |
| `packages/ui/composables/useDownload.js` | `packages/core/composables/` |
| `packages/ui/composables/useDate.js` | `packages/core/composables/` |
| `packages/ui/composables/useDevice.js` | `packages/core/composables/` |
| `packages/ui/composables/useRutFormatter.js` | `packages/core/composables/` |
| `packages/ui/composables/useTimeAgo.js` | `packages/core/composables/` |
| `packages/ui/stores/toast.js` | `packages/themes/shared/stores/` |
| `packages/theme/plugins/preline.client.ts` | `packages/core/plugins/` |
| `packages/theme/theme.css` | `packages/themes/themes/vantage/vantage.css` |

---

## Orden de implementación

1. **`nuxt-core`** — base que los demás necesitan. Publish como `0.1.0`.
2. **`nuxt-themes`** con solo Vantage — migrar componentes existentes + layouts. Publish como `0.1.0`.
3. **`nuxt-auth`** — spec separado.
4. Migrar `olimpo` y `asetio` a los nuevos paquetes.
