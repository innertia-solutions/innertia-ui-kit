# innertia-ui-kit

Shared design system for Innertia Solutions projects — Nuxt components, composables, and base theme.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@innertia-solutions/ui`](./packages/ui) | ![npm](https://img.shields.io/npm/v/@innertia-solutions/ui) | Nuxt layer: components + composables |
| [`@innertia-solutions/theme`](./packages/theme) | ![npm](https://img.shields.io/npm/v/@innertia-solutions/theme) | Tailwind base config + CSS variables |

---

## Installation

```bash
pnpm add @innertia-solutions/ui @innertia-solutions/theme
```

### 1. Nuxt config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@innertia-solutions/ui'],
})
```

### 2. CSS

```css
/* assets/css/main.css */
@import '@innertia-solutions/theme/theme.css';
/* your project-specific styles below */
```

That's it — all components and composables are auto-imported.

---

## Components

### App
| Component | Description |
|-----------|-------------|
| `<AppEmptyState />` | Empty state with icon, title, description and optional action |
| `<AppLoadingState />` | Skeleton loader with optional hint |
| `<AppIcon />` | Animated clock icon with optional digital time |
| `<AppSwitchColorTheme />` | Dark/light mode toggle |

### Forms
| Component | Description |
|-----------|-------------|
| `<FormsSelect />` | Searchable dropdown with clear support |

### Modal
| Component | Description |
|-----------|-------------|
| `<ModalDeleteConfirm />` | Reusable confirmation modal with loading state |

### Table
| Component | Description |
|-----------|-------------|
| `<TableFilterDropdown />` | Filter dropdown with checkbox options |
| `<TableDownloadDropdown />` | Export table to XLSX, CSV, PDF, JSON |

### Toast
| Component | Description |
|-----------|-------------|
| `<ToastAlert />` | Auto-dismiss alert (success, danger, warning, info) |
| `<ToastNotification />` | Persistent notification with actions |
| `<ToastProcess />` | Progress bar for async processes |

---

## Composables

| Composable | Description |
|------------|-------------|
| `useDate()` | Date formatting, timezones, relative time (Chile/UTC) |
| `useDevice()` | Unique device ID stored in localStorage |
| `useDownload()` | XHR downloads with progress tracking |
| `useForm()` | Form validation with Zod schema support |
| `useRutFormatter()` | Chilean RUT formatting (`XX.XXX.XXX-X`) |
| `useTable()` | Table state, filters and cache management |
| `useTimeAgo()` | Relative time from UTC date, auto-refreshes |
| `useToast()` | Toast notifications system |

---

## Theme

The theme package provides CSS custom properties for light/dark mode and a base Tailwind config.

### Colors

All colors are CSS variables overridable per-project:

```css
/* Override primary color in your project */
:root {
  --primary: #your-color;
  --primary-hover: #your-hover;
  --primary-focus: #your-focus;
}
```

Full token list in [`packages/theme/theme.css`](./packages/theme/theme.css).

---

## Playground (Storybook)

```bash
pnpm dev
```

Opens the component playground at `http://localhost:3000`.

---

## Publishing

```bash
# Bump version and publish ui package
cd packages/ui && npm version patch && npm publish --access public

# Bump version and publish theme package
cd packages/theme && npm version patch && npm publish --access public
```

Or from root:
```bash
pnpm publish:ui
pnpm publish:theme
```

---

## Development

```bash
# Install dependencies
pnpm install

# Run playground
pnpm dev
```

### Repo structure

```
innertia-ui-kit/
├── packages/
│   ├── ui/               # @innertia-solutions/ui (Nuxt layer)
│   │   ├── components/
│   │   ├── composables/
│   │   ├── stores/
│   │   └── nuxt.config.ts
│   ├── theme/            # @innertia-solutions/theme
│   │   ├── theme.css
│   │   └── tailwind.config.js
│   └── storybook/        # Component playground
├── pnpm-workspace.yaml
└── package.json
```

---

## Used in

- [sumando](https://github.com/innertia-solutions/sumando)
- [olimpo](https://github.com/innertia-solutions/olimpo)
- [asetio](https://github.com/innertia-solutions/asetio)
- [pomely](https://github.com/innertia-solutions/pomely)
- [freelanceos](https://github.com/innertia-solutions/freelanceos)
