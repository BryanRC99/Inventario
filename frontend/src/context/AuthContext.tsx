import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../api/client'

interface Usuario {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  rol: string
  nombre_completo: string
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

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }

    api
      .get('/auth/me/')
      .then(({ data }) => setUsuario(data))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login/', { username, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    const { data: perfilCompleto } = await api.get('/auth/me/')
    setUsuario(perfilCompleto)
  }

  const logout = () => {
    localStorage.clear()
    setUsuario(null)
    window.location.href = '/login'
  }

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