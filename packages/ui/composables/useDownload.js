// app/composables/useDownload.js
import { useAuthStore } from '@/stores/auth'

export function useDownload() {
    const auth = useAuthStore()
    const config = useRuntimeConfig()
    const baseUrl = config.public.apiBaseUrl

    function buildHeaders(useToken = true) {
        const headers = {}
        if (useToken && auth.getToken()) {
            headers['Authorization'] = `Bearer ${auth.getToken()}`
        }
        return headers
    }

    /**
     * Descarga un archivo usando XHR para obtener progreso y headers
     * @param {string} url
     * @param {object} params
     * @param {object} options { onProgress, useToken, method, headers }
     * @returns {Promise<{ blob: Blob, headers: object }>}
     */
    function download(url, params = {}, options = {}) {
        const {
            onProgress = null,
            useToken = true,
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
            const allHeaders = { ...buildHeaders(useToken), ...headers }
            Object.entries(allHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v))
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
                    reject(new Error('Download failed'))
                }
            }
            xhr.onerror = function () {
                reject(new Error('Network error'))
            }
            xhr.onprogress = function (event) {
                if (onProgress && event.lengthComputable) {
                    onProgress(Math.round((event.loaded / event.total) * 100), event)
                }
            }
            xhr.send(method === 'GET' ? null : JSON.stringify(params))
        })
    }

    return { download }
}
