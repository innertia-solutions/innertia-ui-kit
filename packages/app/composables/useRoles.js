export function useRoles() {
  const api = useApi()

  const index = (params = {}) =>
    api.get('backoffice/roles', { params })

  const show = (id) =>
    api.get(`backoffice/roles/${id}`)

  const store = (data) =>
    api.post('backoffice/roles', data)

  const update = (id, data) =>
    api.put(`backoffice/roles/${id}`, data)

  const destroy = (id) =>
    api.delete(`backoffice/roles/${id}`)

  const syncPermissions = (id, permissions) =>
    api.post(`backoffice/roles/${id}/permissions`, { permissions })

  return { index, show, store, update, destroy, syncPermissions }
}
