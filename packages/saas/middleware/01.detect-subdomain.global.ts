// useTenantStore auto-imported from saas stores.
// Server-only: lee el hostname de la request para extraer el subdomain del tenant.
export default defineNuxtRouteMiddleware(() => {
  if (!import.meta.server) return

  const config = useRuntimeConfig()
  const requestUrl = useRequestURL()
  const hostname = requestUrl.hostname // ej. "acme.app.com" o "localhost"

  const parts = hostname.split('.')

  // En local no hay subdominio real — usar slug "local" para no bloquear el dev
  if (config.public.appEnv === 'local') {
    useState<string>('tenantSlug', () => '').value = 'local'
    const tenantStore = useTenantStore()
    tenantStore.setSlug('local')
    return
  }

  // Hostname bare (localhost, IP) o www → sin tenant
  if (
    parts.length < 2 ||
    parts[0] === 'www' ||
    /^\d+$/.test(parts[0]) // fragmento de IP
  ) {
    return navigateTo('/tenant-error?reason=no-subdomain')
  }

  const subdomain = parts[0]

  // Reservado: subdomain admin bypasea el flujo de tenant
  if (subdomain === 'admin') {
    useState('isAdminContext', () => false).value = true
    return
  }

  // Guardar slug en useState (SSR-safe) y en tenantStore (Pinia)
  useState<string>('tenantSlug', () => '').value = subdomain
  const tenantStore = useTenantStore()
  tenantStore.setSlug(subdomain)
})
