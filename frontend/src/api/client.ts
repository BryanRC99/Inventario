import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://10.10.10.125:8000/api'

export const api = axios.create({
  baseURL: API_URL,
})

// Adjunta el access token a cada petición saliente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el access token expiró (401), intenta renovarlo una sola vez
// usando el refresh token antes de rendirse y mandar a login.
let isRefreshing = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si el 401 viene del propio endpoint de login, es una contraseña
    // incorrecta normal — no una sesión expirada. Dejamos que LoginPage
    // maneje el error tal cual, sin redirigir ni recargar nada.
    const esPeticionDeLogin = originalRequest?.url?.includes('/auth/login/')

    if (
      error.response?.status === 401 &&
      !esPeticionDeLogin &&
      !originalRequest._retry &&
      !isRefreshing
    ) {
      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken,
        })
        localStorage.setItem('access_token', data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        isRefreshing = false
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)