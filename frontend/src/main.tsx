import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/error-boundary'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="inventario-theme">
      <ErrorBoundary global>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster/>
    </ThemeProvider>
  </StrictMode>,
)