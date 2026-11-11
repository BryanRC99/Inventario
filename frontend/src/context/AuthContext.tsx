import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../api/client'
import {
  ACCESS_TOKEN_KEY,
  LAST_ACTIVITY_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredSession,
} from '../api/session'

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000
const ACTIVITY_STORAGE_INTERVAL_MS = 5 * 1000
const IDLE_CHECK_INTERVAL_MS = 5 * 1000

function readLastActivity(): number | null {
  const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
  return Number.isFinite(value) && value > 0 ? value : null
}

interface Usuario {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  rol: string
  nombre_completo: string
  /** Empresas que este usuario puede gestionar (todas si es admin). */
  empresas: { id: string; nombre: string }[]
}

interface AuthContextType {
  usuario: Usuario | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refrescarUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  const cerrarSesionLocal = useCallback((revocarToken = false) => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (revocarToken && refreshToken) {
      api.post('/auth/logout/', { refresh: refreshToken }).catch(() => {})
    }
    clearStoredSession()
    setUsuario(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    // Las sesiones creadas antes de este control no tienen marca de actividad:
    // se pide iniciar sesión una vez al actualizar la aplicación.
    const lastActivity = readLastActivity()
    if (!lastActivity || Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
      cerrarSesionLocal(true)
      return
    }

    api
      .get('/auth/me/')
      .then(({ data }) => setUsuario(data))
      .catch(() => cerrarSesionLocal())
      .finally(() => setLoading(false))
  }, [cerrarSesionLocal])

  useEffect(() => {
    if (!usuario) return

    let lastActivity = readLastActivity() ?? Date.now()
    let lastPersistedActivity = lastActivity

    const checkIdleTimeout = () => {
      const savedActivity = readLastActivity()
      if (savedActivity && savedActivity > lastActivity) {
        lastActivity = savedActivity
        lastPersistedActivity = savedActivity
      }

      if (Date.now() - lastActivity >= IDLE_TIMEOUT_MS) {
        cerrarSesionLocal(true)
      }
    }

    const recordActivity = () => {
      if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return

      const now = Date.now()
      lastActivity = now
      if (now - lastPersistedActivity >= ACTIVITY_STORAGE_INTERVAL_MS) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
        lastPersistedActivity = now
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const savedActivity = Number(event.newValue)
        if (Number.isFinite(savedActivity) && savedActivity > lastActivity) {
          lastActivity = savedActivity
          lastPersistedActivity = savedActivity
        }
      }
      if (
        (event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY) &&
        !event.newValue
      ) {
        cerrarSesionLocal(false)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkIdleTimeout()
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove'] as const
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    )
    window.addEventListener('focus', checkIdleTimeout)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibility)
    const idleTimer = window.setInterval(checkIdleTimeout, IDLE_CHECK_INTERVAL_MS)

    checkIdleTimeout()

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity))
      window.removeEventListener('focus', checkIdleTimeout)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(idleTimer)
    }
  }, [usuario, cerrarSesionLocal])

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login/', { username, password })
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh)
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    try {
      const { data: perfilCompleto } = await api.get('/auth/me/')
      setUsuario(perfilCompleto)
    } catch (error) {
      cerrarSesionLocal()
      throw error
    }
  }

  const logout = useCallback(() => {
    cerrarSesionLocal(true)
  }, [cerrarSesionLocal])

  const refrescarUsuario = async () => {
    const { data } = await api.get('/auth/me/')
    setUsuario(data)
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, refrescarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
