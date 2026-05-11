// useTenantStore, useApi auto-imported.
// Server-only: valida el slug del tenant con el backend.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.server) return

  // Rutas públicas que no requieren tenant válido
  const publicRoutes = ['/welcome', '/tenant-not-found', '/404']
  const isPublic =
    publicRoutes.includes(to.path) ||
    to.path.startsWith('/auth/')

  if (isPublic) return

  // Skip en contexto admin
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
