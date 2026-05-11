// Registra el interceptor del header X-Tenant-Id.
// useRequestInterceptors auto-imported desde nuxt-core.
// useTenantStore auto-imported desde saas stores.
export default defineNuxtPlugin(() => {
  const { add } = useRequestInterceptors()
  const tenantStore = useTenantStore()

  add((headers: Record<string, string>) => {
    if (tenantStore.tenantId) {
      headers['X-Tenant-Id'] = String(tenantStore.tenantId)
    }
  })
})
