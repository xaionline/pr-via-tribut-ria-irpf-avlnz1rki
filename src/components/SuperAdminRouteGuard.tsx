import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useEffect, useRef } from 'react'

/**
 * Bloqueia o acesso a rotas administrativas.
 * Apenas usuários com cargo "super_admin" podem acessar; demais cargos
 * são redirecionados ao dashboard com toast "Acesso restrito".
 */
export function SuperAdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  const warned = useRef(false)

  useEffect(() => {
    if (!loading && !isSuperAdmin && !warned.current) {
      warned.current = true
      toast({ title: 'Acesso restrito', variant: 'destructive' })
    }
  }, [loading, isSuperAdmin, toast])

  if (loading) return null

  if (!isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
