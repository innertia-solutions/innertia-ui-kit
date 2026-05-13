export function useUsers() {
  const api = useApi()

  const index = (params = {}) =>
    api.get('backoffice/users', { params })

  const show = (id) =>
    api.get(`backoffice/users/${id}`)

  const store = (data) =>
    api.post('backoffice/users', data)

  const update = (id, data) =>
    api.put(`backoffice/users/${id}`, data)

  const destroy = (id) =>
    api.delete(`backoffice/users/${id}`)

  const reactivate = (id) =>
    api.post(`backoffice/users/${id}/reactivate`)

  const resetPassword = (id, data) =>
    api.post(`backoffice/users/${id}/reset-password`, data)

  const assignRole = (userId, role) =>
    api.post(`backoffice/users/${userId}/roles`, { role })

  const removeRole = (userId, role) =>
    api.delete(`backoffice/users/${userId}/roles/${role}`)

  const getRoles = (userId) =>
    api.get(`backoffice/users/${userId}/roles`)

  const syncApps = (userId, apps) =>
    api.post(`backoffice/users/${userId}/apps/sync`, { apps })

  const getApps = (userId) =>
    api.get(`backoffice/users/${userId}/apps`)

  const getSessions = (userId) =>
    api.get(`backoffice/users/${userId}/sessions`)

  const revokeSession = (userId, sessionId) =>
    api.delete(`backoffice/users/${userId}/sessions/${sessionId}`)

  const revokeAllSessions = (userId) =>
    api.delete(`backoffice/users/${userId}/sessions`)

  const getActivityLog = (userId, params = {}) =>
    api.get(`backoffice/users/${userId}/activity`, { params })

  return {
    index,
    show,
    store,
    update,
    destroy,
    reactivate,
    resetPassword,
    assignRole,
    removeRole,
    getRoles,
    syncApps,
    getApps,
    getSessions,
    revokeSession,
    revokeAllSessions,
    getActivityLog,
  }
}
