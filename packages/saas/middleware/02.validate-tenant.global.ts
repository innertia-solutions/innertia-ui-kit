// useTenantStore, useApi auto-imported.
// Server-only: valida el slug del tenant con el backend (timeout 5s).
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.server) return

  const config = useRuntimeConfig()
  const tenantSlugEarly = useState<string>('tenantSlug', () => '').value

  // Rutas públicas que no requieren tenant válido
  const publicRoutes = ['/tenant-error', '/404']
  const isPublic =
    publicRoutes.some(r => to.path.startsWith(r)) ||
    to.path.startsWith('/auth/')

  if (isPublic) return

  // Skip en contexto admin
  if (useState('isAdminContext', () => false).value) return

  const tenantSlug = useState<string>('tenantSlug', () => '').value
  if (!tenantSlug) return navigateTo('/tenant-error?reason=no-subdomain')

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000)
  )

  try {
    const api = useApi()
    const data = await Promise.race([
      api.get(`tenant/validate?slug=${tenantSlug}`, { useToken: false }),
      timeout,
    ])

    if (!data || !data.isActive) {
      return navigateTo('/tenant-error?reason=inactive')
    }

    const tenantStore = useTenantStore()
    tenantStore.setTenant(data.id, data.config ?? {})
  } catch (e: any) {
    const reason = e?.message === 'timeout' ? 'timeout' : 'unreachable'
    return navigateTo(`/tenant-error?reason=${reason}`)
  }
})
