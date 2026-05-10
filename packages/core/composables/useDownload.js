/**
 * Descarga un archivo usando XHR con soporte de progreso.
 * Los headers de autenticación los provee el app consumidor.
 */
export function useDownload() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl

  /**
   * @param {string} url - ruta relativa al baseUrl
   * @param {object} params - query params (GET) o body (POST)
   * @param {object} options - { onProgress, method, headers }
   * @returns {Promise<{ blob: Blob, headers: object }>}
   */
  function download(url, params = {}, options = {}) {
    const {
      onProgress = null,
      method = 'GET',
      headers = {},
    } = options

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      let query = ''
      if (method === 'GET' && Object.keys(params).length) {
        query = '?' + new URLSearchParams(params).toString()
      }
      xhr.open(method, `${baseUrl}/${url}${query}`)
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))
      xhr.responseType = 'blob'
      xhr.onload = function () {
        const responseHeaders = {}
        xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
          const [key, value] = line.split(': ')
          if (key) responseHeaders[key.toLowerCase()] = value
        })
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ blob: xhr.response, headers: responseHeaders })
        } else {
          reject(new Error(`Download failed: ${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100), event)
        }
      }
      xhr.send(method === 'GET' ? null : JSON.stringify(params))
    })
  }

  return { download }
}
