import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Bell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useAuth } from '@/hooks/use-auth'

export function Header() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
  }, [searchParams])

  const handleSearch = (value: string) => {
    setSearch(value)
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-2.5 flex items-center gap-3">
      <Breadcrumbs />

      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar cliente, CPF, CNPJ..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Notificacoes"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        <Button
          onClick={() => navigate('/app/declaracoes/nova')}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova</span>
        </Button>

        <Avatar className="w-8 h-8 border border-slate-200">
          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
