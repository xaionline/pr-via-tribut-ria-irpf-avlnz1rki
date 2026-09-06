import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import LandingPage from '@/pages/LandingPage'

export default function Index() {
  const { isAuthenticated, loading, isCliente } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Usuário autenticado vai direto para o app correspondente
  if (isAuthenticated) {
    return <Navigate to={isCliente ? '/app/cliente' : '/app/dashboard'} replace />
  }

  // Visitante não autenticado vê a Landing Page pública completa
  return <LandingPage />
}
