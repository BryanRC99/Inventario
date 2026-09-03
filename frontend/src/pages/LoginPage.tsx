import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import logo from '@/assets/logo.png'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 pb-6">
          <img src={logo} alt="Logo de la empresa" className="h-55 w-auto object-contain" />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-zinc-900">Sistema de Inventario</h1>
            <p className="text-sm text-zinc-500">Ingresa con tu cuenta para continuar</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="username" className="text-zinc-900">
              Usuario
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="border-zinc-300 bg-white text-zinc-900"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-zinc-900">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="border-zinc-300 bg-white text-zinc-900"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
            disabled={submitting}
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  )
}