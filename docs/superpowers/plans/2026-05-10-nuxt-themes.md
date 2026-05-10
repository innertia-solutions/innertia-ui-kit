# nuxt-themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. NO TESTING — ejecutar directo.

**Goal:** Crear `packages/themes` como `@innertia-solutions/nuxt-themes` — capa visual completa con shared composables/stores, y el tema Vantage (componentes con prefijo, layouts y CSS).

**Architecture:** Nuxt Layer con dos áreas: `shared/` (composables y stores usados por todos los temas) y `themes/vantage/` (componentes prefijados `Vantage*`, layouts `vantage-*.vue`, CSS variables). Migra todo de `packages/ui`. Los layouts usan slots para logo, menú y usuario — el app provee esos contenidos.

**Tech Stack:** Nuxt 4, Vue 3, Preline 3, Tailwind CSS 4, @tabler/icons-vue, pnpm workspaces, npm publish.

---

## File Map

```
packages/themes/
├── package.json                              # @innertia-solutions/nuxt-themes
├── nuxt.config.ts                            # registra todo como Nuxt Layer
├── shared/
│   ├── stores/
│   │   └── toast.js                          # estado de toasts por posición
│   └── composables/
│       ├── useToast.js                       # API: alert.success, notification, process
│       ├── useForm.js                        # lógica pura: rules, validate, reset (SIN DOM)
│       └── useTable.ts                       # cache, search, filters persistentes
└── themes/
    └── vantage/
        ├── vantage.css                       # tokens CSS (copia de theme.css)
        └── components/
            ├── Forms/
            │   ├── Input.vue                 # label, input, hint, error
            │   ├── Select.vue                # HSSelect + label, error
            │   ├── SelectServer.vue          # lazy load + search + infinite scroll
            │   └── DatePicker.vue            # vanilla-calendar-pro wrapper
            ├── App/
            │   ├── Button.vue
            │   ├── Tag.vue
            │   ├── Dropdown.vue
            │   ├── EmptyState.vue
            │   ├── LoadingState.vue
            │   ├── PageLoadingSpinner.vue
            │   └── SwitchColorTheme.vue
            ├── Toast/
            │   ├── Alert.vue
            │   ├── Notification.vue
            │   └── Process.vue
            ├── Modal/
            │   └── DeleteConfirm.vue
            ├── Nav/
            │   └── Tabs.vue
            ├── Table/
            │   ├── DownloadDropdown.vue
            │   └── FilterDropdown.vue
            └── Admin/
                ├── Base.vue                  # sidebar shell genérico con slots
                ├── Header.vue                # top bar con slots left/right
                ├── Page.vue                  # wrapper con padding estándar
                └── PageHeader.vue            # título + slot acciones
```

Layouts (auto-descubiertos por Nuxt, nombrados con prefijo):
```
packages/themes/themes/vantage/layouts/
├── vantage-admin.vue                        # shell completo: AdminBase + NuxtPage
└── vantage-auth.vue                         # split-screen: imagen izq + form der
```

---

### Task 1: Scaffold del paquete

**Files:**
- Create: `packages/themes/package.json`
- Create: `packages/themes/nuxt.config.ts`

- [ ] **Crear `packages/themes/package.json`**

```json
{
  "name": "@innertia-solutions/nuxt-themes",
  "version": "0.1.0",
  "description": "Innertia Solutions — Nuxt themes layer: Vantage components, layouts and shared composables",
  "keywords": ["nuxt", "vue", "tailwind", "preline", "theme", "vantage"],
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
    "@innertia-solutions/nuxt-core": "^0.1.1",
    "@tabler/icons-vue": "^3.44.0",
    "uuid": "^13.0.0",
    "vanilla-calendar-pro": "^3.1.0"
  },
  "devDependencies": {
    "nuxt": "^4.4.2",
    "vue": "^3.5.0"
  }
}
```

- [ ] **Crear `packages/themes/nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  components: [
    { path: './themes/vantage/components', pathPrefix: true, prefix: 'Vantage' },
  ],
  imports: {
    dirs: ['shared/composables'],
  },
})
```

- [ ] **Crear directorios**

```bash
mkdir -p packages/themes/shared/stores
mkdir -p packages/themes/shared/composables
mkdir -p packages/themes/themes/vantage/components/Forms
mkdir -p packages/themes/themes/vantage/components/App
mkdir -p packages/themes/themes/vantage/components/Toast
mkdir -p packages/themes/themes/vantage/components/Modal
mkdir -p packages/themes/themes/vantage/components/Nav
mkdir -p packages/themes/themes/vantage/components/Table
mkdir -p packages/themes/themes/vantage/components/Admin
mkdir -p packages/themes/themes/vantage/layouts
```

- [ ] **Instalar deps del workspace**

```bash
cd /Users/guillermofarias/Sites/inertia/innertia-ui-kit
pnpm install
```

- [ ] **Commit**

```bash
git add packages/themes/package.json packages/themes/nuxt.config.ts
git commit --no-gpg-sign -m "feat(themes): scaffold @innertia-solutions/nuxt-themes package"
```

---

### Task 2: Shared — toast store + useToast + useTable

**Files:**
- Create: `packages/themes/shared/stores/toast.js`
- Create: `packages/themes/shared/composables/useToast.js`
- Create: `packages/themes/shared/composables/useTable.ts`

- [ ] **Copiar toast store**

```bash
cp packages/ui/stores/toast.js packages/themes/shared/stores/toast.js
```

- [ ] **Copiar useToast**

```bash
cp packages/ui/composables/useToast.js packages/themes/shared/composables/useToast.js
```

El `useToast.js` importa `@/stores/toast` — cambiarlo a import relativo:

```bash
sed -i '' "s|from '@/stores/toast'|from '../stores/toast'|g" packages/themes/shared/composables/useToast.js
```

- [ ] **Copiar useTable**

```bash
cp packages/ui/composables/useTable.ts packages/themes/shared/composables/useTable.ts
```

- [ ] **Commit**

```bash
git add packages/themes/shared/
git commit --no-gpg-sign -m "feat(themes): add shared toast store + useToast + useTable"
```

---

### Task 3: Shared — useForm (lógica pura, sin DOM)

**Files:**
- Create: `packages/themes/shared/composables/useForm.js`

El `useForm` original manipula clases CSS en el DOM directamente. La nueva versión solo maneja estado: `form`, `errors`, `validate`, `reset`, `addError`, `loadFromObject`. Los componentes del tema muestran los errores via prop `error`.

- [ ] **Crear `packages/themes/shared/composables/useForm.js`**

```js
const rules = {
  required: (value) => {
    if (value === null || value === undefined) return 'Este campo es obligatorio'
    if (typeof value === 'string' && value.trim() === '') return 'Este campo es obligatorio'
    if (Array.isArray(value) && value.length === 0) return 'Este campo es obligatorio'
    return true
  },
  email: (value) => /.+@.+\..+/.test(value) || 'El correo no es válido',
  min: (value, arg) => value.length >= arg || `Debe tener al menos ${arg} caracteres`,
  int: (value) => Number.isInteger(+value) || 'Debe ser un número entero',
  rut: (value) => validateRut(value) || 'El RUT no es válido',
  same: (value, arg, form) => value === form[arg] || 'Los campos no coinciden',
}

const dictionary = {
  unique: 'Ya está registrado',
  required: 'Este campo es obligatorio',
  invalid: 'Dato inválido',
}

function validateRut(rut) {
  if (!rut || typeof rut !== 'string') return false
  rut = rut.replace(/^0+|[^0-9kK]+/g, '').toUpperCase()
  if (rut.length < 8) return false
  const body = rut.slice(0, -1)
  const dv = rut.slice(-1)
  let sum = 0, multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier < 7 ? multiplier + 1 : 2
  }
  const expected = 11 - (sum % 11)
  const expectedDV = expected === 11 ? '0' : expected === 10 ? 'K' : expected.toString()
  return dv === expectedDV
}

export function useForm(formDefinition, options = {}) {
  const zodSchema = options.zodSchema
  const form = reactive({})
  const errors = reactive({})

  for (const field in formDefinition) {
    form[field] = formDefinition[field]?.value ?? ''
    errors[field] = []
  }

  const reset = () => {
    for (const field in formDefinition) {
      form[field] = formDefinition[field]?.value ?? ''
      errors[field] = []
    }
  }

  const resetErrors = () => {
    for (const field in formDefinition) {
      errors[field] = []
    }
  }

  const validateField = (field) => {
    const def = formDefinition[field]
    const value = form[field]
    errors[field] = []
    if (!def?.rules) return true
    def.rules.forEach(rule => {
      const ruleName = typeof rule === 'string' ? rule : rule.name
      const arg = typeof rule === 'object' ? rule.arg : undefined
      const result = rules[ruleName](value, arg, form)
      if (result !== true) {
        const custom = def.messages?.[ruleName]
        errors[field].push(custom || result)
      }
    })
    return errors[field].length === 0
  }

  const validateForm = () => {
    if (zodSchema) {
      const result = zodSchema.safeParse(form)
      resetErrors()
      if (!result.success) {
        for (const issue of result.error.errors) {
          const field = issue.path[0]
          if (errors[field] !== undefined) errors[field].push(issue.message)
        }
        return false
      }
      return true
    }
    for (const field in formDefinition) validateField(field)
    return Object.values(errors).every(e => e.length === 0)
  }

  const addError = (field, message) => {
    if (message.startsWith('validation.')) {
      const key = message.split('.')[1]
      message = dictionary[key] || key
    }
    if (errors[field] !== undefined) errors[field].push(message)
  }

  const loadFromObject = (obj) => {
    for (const field in formDefinition) {
      if (obj[field] !== undefined) form[field] = obj[field]
    }
  }

  return {
    ...toRefs(form),
    values: form,
    errors,
    validate: (field) => field ? validateField(field) : validateForm(),
    reset,
    resetErrors,
    addError,
    loadFromObject,
    config: formDefinition,
  }
}
```

> **Nota:** El primer argumento cambió de `(containerId, formDefinition)` a solo `(formDefinition)`. No hay `containerId` porque ya no manipulamos el DOM. Si el app existente pasa containerId, hay que actualizar las llamadas (ver Task 13).

- [ ] **Commit**

```bash
git add packages/themes/shared/composables/useForm.js
git commit --no-gpg-sign -m "feat(themes): add useForm — pure logic, no DOM manipulation"
```

---

### Task 4: Vantage CSS

**Files:**
- Create: `packages/themes/themes/vantage/vantage.css`

- [ ] **Copiar theme.css**

```bash
cp packages/theme/theme.css packages/themes/themes/vantage/vantage.css
```

- [ ] **Commit**

```bash
git add packages/themes/themes/vantage/vantage.css
git commit --no-gpg-sign -m "feat(themes/vantage): add vantage.css token system"
```

---

### Task 5: Vantage — Forms components

**Files:**
- Create: `packages/themes/themes/vantage/components/Forms/Input.vue`
- Create: `packages/themes/themes/vantage/components/Forms/Select.vue`
- Create: `packages/themes/themes/vantage/components/Forms/SelectServer.vue`
- Create: `packages/themes/themes/vantage/components/Forms/DatePicker.vue`

- [ ] **Copiar Forms components desde packages/ui**

```bash
cp packages/ui/components/Forms/Input.vue packages/themes/themes/vantage/components/Forms/Input.vue
cp packages/ui/components/Forms/Select.vue packages/themes/themes/vantage/components/Forms/Select.vue
cp packages/ui/components/Forms/SelectServer.vue packages/themes/themes/vantage/components/Forms/SelectServer.vue
cp packages/ui/components/Forms/DatePicker.vue packages/themes/themes/vantage/components/Forms/DatePicker.vue
```

- [ ] **Commit**

```bash
git add packages/themes/themes/vantage/components/Forms/
git commit --no-gpg-sign -m "feat(themes/vantage): add Forms components (Input, Select, SelectServer, DatePicker)"
```

---

### Task 6: Vantage — App + Toast + Modal + Nav + Table components

**Files:**
- Create: `packages/themes/themes/vantage/components/App/*.vue`
- Create: `packages/themes/themes/vantage/components/Toast/*.vue`
- Create: `packages/themes/themes/vantage/components/Modal/DeleteConfirm.vue`
- Create: `packages/themes/themes/vantage/components/Nav/Tabs.vue`
- Create: `packages/themes/themes/vantage/components/Table/*.vue`

- [ ] **Copiar todos los componentes restantes**

```bash
cp packages/ui/components/App/Button.vue packages/themes/themes/vantage/components/App/Button.vue
cp packages/ui/components/App/Tag.vue packages/themes/themes/vantage/components/App/Tag.vue
cp packages/ui/components/App/Dropdown.vue packages/themes/themes/vantage/components/App/Dropdown.vue
cp packages/ui/components/App/EmptyState.vue packages/themes/themes/vantage/components/App/EmptyState.vue
cp packages/ui/components/App/LoadingState.vue packages/themes/themes/vantage/components/App/LoadingState.vue
cp packages/ui/components/App/PageLoadingSpinner.vue packages/themes/themes/vantage/components/App/PageLoadingSpinner.vue
cp packages/ui/components/App/SwitchColorTheme.vue packages/themes/themes/vantage/components/App/SwitchColorTheme.vue
cp packages/ui/components/Toast/Alert.vue packages/themes/themes/vantage/components/Toast/Alert.vue
cp packages/ui/components/Toast/Notification.vue packages/themes/themes/vantage/components/Toast/Notification.vue
cp packages/ui/components/Toast/Process.vue packages/themes/themes/vantage/components/Toast/Process.vue
cp packages/ui/components/Modal/DeleteConfirm.vue packages/themes/themes/vantage/components/Modal/DeleteConfirm.vue
cp packages/ui/components/Nav/Tabs.vue packages/themes/themes/vantage/components/Nav/Tabs.vue
cp packages/ui/components/Table/DownloadDropdown.vue packages/themes/themes/vantage/components/Table/DownloadDropdown.vue
cp packages/ui/components/Table/FilterDropdown.vue packages/themes/themes/vantage/components/Table/FilterDropdown.vue
```

- [ ] **Commit**

```bash
git add packages/themes/themes/vantage/components/
git commit --no-gpg-sign -m "feat(themes/vantage): add App, Toast, Modal, Nav, Table components"
```

---

### Task 7: Vantage — Admin shell components (genéricos con slots)

Los componentes de admin son shells genéricos. El app provee logo, menú y datos de usuario via slots — el tema no sabe nada del usuario ni del menú específico.

**Files:**
- Create: `packages/themes/themes/vantage/components/Admin/Base.vue`
- Create: `packages/themes/themes/vantage/components/Admin/Header.vue`
- Create: `packages/themes/themes/vantage/components/Admin/Page.vue`
- Create: `packages/themes/themes/vantage/components/Admin/PageHeader.vue`

- [ ] **Crear `packages/themes/themes/vantage/components/Admin/Base.vue`**

Shell genérico del sidebar. Slots: `#logo`, `#menu`, `#user-footer`.

```vue
<script setup lang="ts">
const isOpen = ref(false)
const open = () => { isOpen.value = true }
const close = () => { isOpen.value = false }

provide('vantage:sidebar', { isOpen, open, close })
</script>

<template>
  <div class="bg-slate-50 dark:bg-slate-900 min-h-screen">

    <!-- Backdrop mobile -->
    <Transition enter-from-class="opacity-0" enter-active-class="transition-opacity duration-300"
                leave-to-class="opacity-0"   leave-active-class="transition-opacity duration-300">
      <div v-if="isOpen" class="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click="close" />
    </Transition>

    <!-- Sidebar -->
    <aside
      tabindex="-1"
      aria-label="Sidebar"
      :class="[
        'fixed inset-y-0 start-0 z-60 w-65 h-full',
        'bg-white dark:bg-slate-800 border-e border-slate-200 dark:border-slate-700',
        'transition-transform duration-300',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : 'max-lg:-translate-x-full',
      ]"
    >
      <div class="flex flex-col h-full pt-3 lg:pt-6">

        <!-- Logo + close mobile -->
        <header class="h-11.5 ps-2 pe-2 lg:ps-5 flex items-center gap-x-1 shrink-0">
          <slot name="logo" />
          <div class="lg:hidden ms-auto">
            <button type="button"
              class="w-6 h-7 inline-flex justify-center items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="close">
              <svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="7 8 3 12 7 16" />
                <line x1="21" x2="11" y1="12" y2="12" />
                <line x1="21" x2="11" y1="6"  y2="6"  />
                <line x1="21" x2="11" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <!-- Menu scrollable -->
        <div class="flex-1 min-h-0 mt-1.5 overflow-y-auto
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-slate-100
          [&::-webkit-scrollbar-thumb]:bg-slate-300
          dark:[&::-webkit-scrollbar-track]:bg-slate-700
          dark:[&::-webkit-scrollbar-thumb]:bg-slate-500">
          <slot name="menu" />
        </div>

        <!-- User footer -->
        <div class="shrink-0 border-t border-slate-200 dark:border-slate-700 p-5">
          <slot name="user-footer" />
        </div>

      </div>
    </aside>

    <!-- Main content -->
    <slot />

  </div>
</template>
```

- [ ] **Crear `packages/themes/themes/vantage/components/Admin/Header.vue`**

Barra superior fija. Provee botón hamburger que abre el sidebar mobile.

```vue
<script setup lang="ts">
defineProps<{
  title?: string
}>()

const sidebar = inject('vantage:sidebar', null) as any
</script>

<template>
  <header class="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 h-14 flex items-center gap-x-3">
    <!-- Hamburger mobile -->
    <button type="button"
      class="lg:hidden size-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      @click="sidebar?.open()">
      <svg class="size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <!-- Left slot -->
    <div class="flex-1 flex items-center gap-x-3">
      <slot name="left">
        <span v-if="title" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ title }}</span>
      </slot>
    </div>

    <!-- Right slot -->
    <div class="flex items-center gap-x-2">
      <slot name="right" />
    </div>
  </header>
</template>
```

- [ ] **Crear `packages/themes/themes/vantage/components/Admin/Page.vue`**

```vue
<template>
  <div class="lg:ps-65">
    <slot />
  </div>
</template>
```

- [ ] **Crear `packages/themes/themes/vantage/components/Admin/PageHeader.vue`**

```vue
<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-xl font-semibold text-slate-800 dark:text-slate-100">{{ title }}</h1>
      <p v-if="description" class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{{ description }}</p>
    </div>
    <div class="flex items-center gap-x-2">
      <slot name="actions" />
    </div>
  </div>
</template>
```

- [ ] **Commit**

```bash
git add packages/themes/themes/vantage/components/Admin/
git commit --no-gpg-sign -m "feat(themes/vantage): add Admin shell components (Base, Header, Page, PageHeader) with slots"
```

---

### Task 8: Vantage — Layouts

**Files:**
- Create: `packages/themes/themes/vantage/layouts/vantage-admin.vue`
- Create: `packages/themes/themes/vantage/layouts/vantage-auth.vue`

- [ ] **Crear `packages/themes/themes/vantage/layouts/vantage-admin.vue`**

Layout base del admin. El app sobreescribe los slots para logo, menú y usuario.

```vue
<script setup>
const showAnimation = ref(false)
onMounted(() => {
  const seen = sessionStorage.getItem('vantage-entered')
  if (!seen) {
    showAnimation.value = true
    sessionStorage.setItem('vantage-entered', 'true')
  }
})
</script>

<template>
  <div :class="{ 'animate-entrance': showAnimation }">
    <VantageAdminBase>
      <template #logo><slot name="logo" /></template>
      <template #menu><slot name="menu" /></template>
      <template #user-footer><slot name="user-footer" /></template>

      <VantageAdminPage>
        <NuxtPage />
      </VantageAdminPage>
    </VantageAdminBase>
  </div>
</template>

<style scoped>
.animate-entrance { animation: fadeInScale 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.96); filter: blur(4px); }
  to   { opacity: 1; transform: scale(1);    filter: blur(0);   }
}
</style>
```

- [ ] **Crear `packages/themes/themes/vantage/layouts/vantage-auth.vue`**

Split-screen: imagen izq + form der.

```vue
<template>
  <div class="bg-slate-50 dark:bg-slate-900">
    <div class="absolute top-4 right-4 z-20">
      <slot name="theme-switch" />
    </div>
    <main class="flex min-h-full">
      <!-- Columna izquierda: imagen/bienvenida -->
      <div class="relative hidden min-h-screen lg:w-200 xl:w-[65%] bg-slate-100 lg:flex flex-col justify-between p-6 dark:bg-slate-950 overflow-hidden">
        <slot name="background" />
        <div class="z-0 p-20 pt-[max(180px,10vh)]">
          <slot name="welcome" />
        </div>
      </div>

      <!-- Columna derecha: formulario -->
      <div class="grow px-12 z-10 -ml-6 pr-6 bg-white dark:bg-slate-900 rounded-tl-[1.5rem] rounded-bl-[1.5rem]">
        <div class="h-full min-h-screen sm:w-112 flex flex-col justify-center mx-auto space-y-5 p-4">
          <div class="flex justify-center mb-6">
            <slot name="logo" />
          </div>
          <Transition name="auth-content" mode="out-in">
            <NuxtPage />
          </Transition>
          <div class="absolute bottom-4 right-4 text-xs text-slate-400">
            <slot name="version" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
```

- [ ] **Commit**

```bash
git add packages/themes/themes/vantage/layouts/
git commit --no-gpg-sign -m "feat(themes/vantage): add vantage-admin and vantage-auth layouts"
```

---

### Task 9: Registrar stores en nuxt.config.ts

Pinia auto-importa stores si se registran los dirs correctos.

**Files:**
- Modify: `packages/themes/nuxt.config.ts`

- [ ] **Actualizar `packages/themes/nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/nuxt-core'],
  components: [
    { path: './themes/vantage/components', pathPrefix: true, prefix: 'Vantage' },
  ],
  imports: {
    dirs: ['shared/composables', 'shared/stores'],
  },
})
```

- [ ] **Commit**

```bash
git add packages/themes/nuxt.config.ts
git commit --no-gpg-sign -m "feat(themes): register shared stores in nuxt.config auto-imports"
```

---

### Task 10: Publicar en npm

- [ ] **Instalar deps**

```bash
cd /Users/guillermofarias/Sites/inertia/innertia-ui-kit
pnpm install
```

- [ ] **Publicar**

```bash
cd packages/themes
pnpm publish --no-git-checks --access public
```

Expected:
```
+ @innertia-solutions/nuxt-themes@0.1.0
```

- [ ] **Commit**

```bash
cd /Users/guillermofarias/Sites/inertia/innertia-ui-kit
git add packages/themes/
git commit --no-gpg-sign -m "feat: publish @innertia-solutions/nuxt-themes@0.1.0"
```

---

### Task 11: Conectar olimpo a nuxt-themes

Olimpo pasa de `@innertia-solutions/ui` (viejo) a `@innertia-solutions/nuxt-themes`.

**Files:**
- Modify: `/Users/guillermofarias/Sites/inertia/olimpo/frontend/package.json`
- Modify: `/Users/guillermofarias/Sites/inertia/olimpo/frontend/nuxt.config.ts`

- [ ] **Agregar nuxt-themes y quitar ui**

```bash
cd /Users/guillermofarias/Sites/inertia/olimpo/frontend
pnpm add @innertia-solutions/nuxt-themes
pnpm remove @innertia-solutions/ui
```

- [ ] **Actualizar `nuxt.config.ts` de olimpo**

```ts
export default defineNuxtConfig({
  extends: [
    '@innertia-solutions/nuxt-core',
    '@innertia-solutions/nuxt-themes',
  ],
  // ... resto igual, quitar modules: [] si está vacío
})
```

- [ ] **Verificar que los componentes siguen funcionando**

Los componentes antes auto-importados como `<FormsInput>`, `<AppButton>` etc. ahora se llaman `<VantageFormsInput>`, `<VantageAppButton>`. **Renombrar todas las referencias en el app:**

```bash
# Ver qué componentes del kit usa olimpo
grep -r "FormsInput\|FormsSelect\|AppButton\|AppTag\|AppDropdown\|AppEmptyState\|AppLoadingState\|ModalDeleteConfirm\|ToastAlert\|NavTabs\|TableDownload\|TableFilter" /Users/guillermofarias/Sites/inertia/olimpo/frontend/app --include="*.vue" -l
```

- [ ] **Reemplazar prefijos en olimpo**

```bash
cd /Users/guillermofarias/Sites/inertia/olimpo/frontend/app

# Forms
find . -name "*.vue" -exec sed -i '' 's/<FormsInput/<VantageFormsInput/g; s/<\/FormsInput>/<\/VantageFormsInput>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<FormsSelect\b/<VantageFormsSelect/g; s/<\/FormsSelect>/<\/VantageFormsSelect>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<FormsSelectServer\b/<VantageFormsSelectServer/g; s/<\/FormsSelectServer>/<\/VantageFormsSelectServer>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<FormsDatePicker\b/<VantageFormsDatePicker/g; s/<\/FormsDatePicker>/<\/VantageFormsDatePicker>/g' {} \;

# App
find . -name "*.vue" -exec sed -i '' 's/<AppButton\b/<VantageAppButton/g; s/<\/AppButton>/<\/VantageAppButton>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<AppTag\b/<VantageAppTag/g; s/<\/AppTag>/<\/VantageAppTag>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<AppDropdown\b/<VantageAppDropdown/g; s/<\/AppDropdown>/<\/VantageAppDropdown>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<AppEmptyState\b/<VantageAppEmptyState/g; s/<\/AppEmptyState>/<\/VantageAppEmptyState>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<AppLoadingState\b/<VantageAppLoadingState/g; s/<\/AppLoadingState>/<\/VantageAppLoadingState>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<AppPageLoadingSpinner\b/<VantageAppPageLoadingSpinner/g; s/<\/AppPageLoadingSpinner>/<\/VantageAppPageLoadingSpinner>/g' {} \;

# Toast
find . -name "*.vue" -exec sed -i '' 's/<ToastAlert\b/<VantageToastAlert/g; s/<\/ToastAlert>/<\/VantageToastAlert>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<ToastNotification\b/<VantageToastNotification/g; s/<\/ToastNotification>/<\/VantageToastNotification>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<ToastProcess\b/<VantageToastProcess/g; s/<\/ToastProcess>/<\/VantageToastProcess>/g' {} \;

# Modal
find . -name "*.vue" -exec sed -i '' 's/<ModalDeleteConfirm\b/<VantageModalDeleteConfirm/g; s/<\/ModalDeleteConfirm>/<\/VantageModalDeleteConfirm>/g' {} \;

# Nav + Table
find . -name "*.vue" -exec sed -i '' 's/<NavTabs\b/<VantageNavTabs/g; s/<\/NavTabs>/<\/VantageNavTabs>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<TableDownloadDropdown\b/<VantageTableDownloadDropdown/g; s/<\/TableDownloadDropdown>/<\/VantageTableDownloadDropdown>/g' {} \;
find . -name "*.vue" -exec sed -i '' 's/<TableFilterDropdown\b/<VantageTableFilterDropdown/g; s/<\/TableFilterDropdown>/<\/VantageTableFilterDropdown>/g' {} \;
```

- [ ] **Levantar dev server y verificar**

```bash
cd /Users/guillermofarias/Sites/inertia/olimpo/frontend
rm -rf .nuxt
pnpm dev
```

Expected: servidor arranca sin errores de componentes no encontrados.

- [ ] **Commit olimpo**

```bash
git add -A
git commit --no-gpg-sign -m "chore: migrate from @innertia-solutions/ui to @innertia-solutions/nuxt-themes"
```
