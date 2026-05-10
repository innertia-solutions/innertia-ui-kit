// useAuthStore auto-imported

export function usePermissions() {
  const authStore = useAuthStore()

  /** Check a single permission string */
  const can = (permission) => authStore.permissions.includes(permission)

  /** Check a single role string */
  const hasRole = (role) => authStore.user?.roles?.includes(role) ?? false

  /** True if user has at least one of the given permissions */
  const hasAny = (permissions) => permissions.some(p => authStore.permissions.includes(p))

  /** True if user has all of the given permissions */
  const hasAll = (permissions) => permissions.every(p => authStore.permissions.includes(p))

  return { can, hasRole, hasAny, hasAll }
}
