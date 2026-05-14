// useTenantStore, useApi auto-imported.
// Server-only: valida el slug del tenant con el backend (timeout 5s).
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.server) return

  const config = useRuntimeConfig()

  // Rutas públicas que no requieren tenant válido
  const publicRoutes = ['/tenant-error', '/404']
  const isPublic =
    publicRoutes.some(r => to.path.startsWith(r)) ||
    to.path.startsWith('/auth/')

  if (isPublic) return

  // Skip en contexto admin
  if (useState('isAdminContext', () => false).value) return

  const tenantSlug = useState<string>('tenantSlug', () => '').value

  console.log(`[tenant:validate] path=${to.path} slug="${tenantSlug}"`)

  if (!tenantSlug) {
    console.warn('[tenant:validate] sin slug → /tenant-error?reason=no-subdomain')
    return navigateTo('/tenant-error?reason=no-subdomain')
  }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000)
  )

  try {
    const api = useApi()
    const url = `tenant/validate?slug=${tenantSlug}`
    console.log(`[tenant:validate] GET ${url}`)

    const data = await Promise.race([
      api.get(url, { useToken: false }),
      timeout,
    ])

    console.log(`[tenant:validate] respuesta:`, JSON.stringify(data))

    if (!data || !data.isActive) {
      console.warn(`[tenant:validate] tenant inactivo o no encontrado → inactive`)
      return navigateTo('/tenant-error?reason=inactive')
    }

    const tenantStore = useTenantStore()
    tenantStore.setTenant(data.id, data.config ?? {})
    console.log(`[tenant:validate] OK — tenant id=${data.id}`)
  } catch (e: any) {
    const reason = e?.message === 'timeout' ? 'timeout' : 'unreachable'
    console.error(`[tenant:validate] error → ${reason}`, e?.message)
    return navigateTo(`/tenant-error?reason=${reason}`)
  }
})
