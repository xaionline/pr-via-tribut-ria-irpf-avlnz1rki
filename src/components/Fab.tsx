import { useNavigate, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'

export function Fab() {
  const navigate = useNavigate()
  const location = useLocation()

  const getAction = (() => {
    if (location.pathname.startsWith('/app/clientes')) {
      return () => navigate('/app/clientes/novo')
    }
    if (location.pathname.startsWith('/app/declaracoes')) {
      return () => navigate('/app/declaracoes/nova')
    }
    if (location.pathname === '/app/dashboard' || location.pathname === '/') {
      return () => navigate('/app/declaracoes/nova')
    }
    return null
  })()

  if (!getAction) return null

  return (
    <button
      onClick={getAction}
      className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center touch-target active:scale-95 transition-transform"
      aria-label="Adicionar"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
