import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useEffect, useRef } from 'react'

/**
 * Bloqueia o acesso de clientes a rotas do contador.
 * Se o cargo for "cliente" e a rota não começar com /app/cliente,
 * redireciona para /app/cliente com toast "Acesso restrito."
 */
export function ClienteRouteGuard({ children }: { children: React.ReactNode }) {
  const { isCliente, loading } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  const warned = useRef(false)

  useEffect(() => {
    if (!loading && isCliente && !location.pathname.startsWith('/app/cliente') && !warned.current) {
      warned.current = true
      toast({ title: 'Acesso restrito.', variant: 'destructive' })
    }
  }, [loading, isCliente, location.pathname, toast])

  if (loading) return null

  if (isCliente && !location.pathname.startsWith('/app/cliente')) {
    return <Navigate to="/app/cliente" replace />
  }

  return <>{children}</>
}
