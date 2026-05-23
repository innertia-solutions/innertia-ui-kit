// useTenantStore auto-imported from saas stores.
// Server-only: lee el hostname de la request para extraer el subdomain del tenant.
export default defineNuxtRouteMiddleware((to) => {
  // Evitar loop infinito: si ya estamos en la página de error de tenant, no redirigir de nuevo.
  if (to.path === '/tenant-error') return

  if (!import.meta.server) return

  const config = useRuntimeConfig()
  const requestUrl = useRequestURL()
  const hostname = requestUrl.hostname // ej. "acme.app.com" o "localhost"

  const parts = hostname.split('.')

  // Hostname bare (localhost, IP) sin subdominio → usar slug de NUXT_PUBLIC_DEV_TENANT si está definido, error si no
  const isBareLocalhost = hostname === 'localhost' || /^\d+(\.\d+){3}$/.test(hostname)

  if (isBareLocalhost) {
    const devTenant = (config.public as any).devTenant as string | undefined
    if (devTenant) {
      useState<string>('tenantSlug', () => '').value = devTenant
      const tenantStore = useTenantStore()
      tenantStore.setSlug(devTenant)
      return
    }
    return navigateTo('/tenant-error?reason=no-subdomain')
  }

  // Hostname bare sin subdominio (ej. "tudominio.com") → sin tenant
  if (parts.length < 2 || parts[0] === 'www' || /^\d+$/.test(parts[0])) {
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
