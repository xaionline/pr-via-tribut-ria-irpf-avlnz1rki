import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom'
import {
  Search,
  Bell,
  Plus,
  Menu,
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  TableProperties,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { GlobalSearchModal } from '@/components/GlobalSearchModal'
import { useAuth } from '@/hooks/use-auth'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function Header() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin, isSuperAdmin, signOut } = useAuth()

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
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const navItems = [
    ...(isSuperAdmin
      ? [
          { label: 'Administração', path: '/app/admin', icon: ShieldCheck },
          { label: 'Tabelas IRPF', path: '/app/admin/tabelas', icon: TableProperties },
        ]
      : []),
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Clientes', path: '/app/clientes', icon: Users },
    { label: 'Declarações', path: '/app/declaracoes', icon: FileText },
    ...(isAdmin
      ? [{ label: 'Tabela Progressiva', path: '/app/tabela-progressiva', icon: TableProperties }]
      : []),
    { label: 'Relatórios', path: '/app/relatorios', icon: BarChart3 },
    ...(isAdmin
      ? [
          { label: 'IBS / CBS', path: '/app/configuracoes/ibs-cbs', icon: TableProperties },
          { label: 'Configurações', path: '/app/configuracoes/escritorio', icon: Settings },
        ]
      : []),
  ]

  const currentTitle =
    navItems.find((n) => location.pathname.startsWith(n.path))?.label || 'Prévia Tributária'

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 lg:px-8 h-12 lg:h-auto lg:py-2.5 flex items-center gap-2 lg:gap-3">
        <button
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 transition-colors touch-target flex items-center justify-center"
          onClick={() => setNavOpen(true)}
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>

        <div className="hidden lg:block">
          <Breadcrumbs />
        </div>

        <div className="lg:hidden flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-900 truncate">{currentTitle}</span>
        </div>

        <div className="hidden lg:block flex-1 max-w-md mx-auto">
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

        <button
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors touch-target flex items-center justify-center"
          onClick={() => setSearchOpen(true)}
          aria-label="Buscar"
        >
          <Search className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors touch-target flex items-center justify-center"
            title="Notificações"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          <Button
            onClick={() => navigate('/app/declaracoes/nova')}
            size="sm"
            className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova</span>
          </Button>

          <Avatar className="w-8 h-8 border border-slate-200 shrink-0">
            <AvatarFallback className="bg-slate-100 text-slate-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetHeader className="p-4 border-b border-slate-200">
            <SheetTitle className="text-base font-bold text-slate-900">Navegação</SheetTitle>
          </SheetHeader>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path)
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setNavOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-target',
                    isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <div className="pt-3 border-t border-slate-100">
              {isAdmin && (
                <Link
                  to="/app/configuracoes/escritorio"
                  onClick={() => setNavOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors touch-target"
                >
                  <Settings className="w-5 h-5" />
                  <span>Configurações</span>
                </Link>
              )}
              <button
                onClick={() => {
                  setNavOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors touch-target"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
