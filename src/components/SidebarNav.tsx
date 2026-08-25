import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function SidebarNav() {
  const location = useLocation()
  const { user, escritorio, isAdmin, isCliente, isSuperAdmin, signOut } = useAuth()
  const [hovered, setHovered] = useState(false)

  const navItems = isCliente
    ? [
        { label: 'Dashboard', path: '/app/cliente', icon: LayoutDashboard },
        { label: 'Demonstrativo', path: '/app/cliente/demonstrativo', icon: FileText },
      ]
    : [
        // Super_admin vê itens de administração logo no topo
        ...(isSuperAdmin
          ? [
              { label: 'Administração', path: '/app/admin', icon: ShieldCheck },
              { label: 'Tabelas IRPF', path: '/app/admin/tabelas', icon: Calculator },
            ]
          : []),
        { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
        { label: 'Clientes', path: '/app/clientes', icon: Users },
        { label: 'Declarações', path: '/app/declaracoes', icon: FileText },
        ...(isAdmin
          ? [{ label: 'Tabela Progressiva', path: '/app/tabela-progressiva', icon: Calculator }]
          : []),
        { label: 'Relatórios', path: '/app/relatorios', icon: BarChart3 },
        ...(isAdmin
          ? [
              { label: 'IBS / CBS', path: '/app/configuracoes/ibs-cbs', icon: Calculator },
              { label: 'Configurações', path: '/app/configuracoes/escritorio', icon: Settings },
            ]
          : []),
      ]

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 z-30 h-screen bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 overflow-hidden',
        'w-[68px] lg:w-[250px]',
        hovered && 'w-[250px] shadow-2xl',
      )}
    >
      <div className="p-4 lg:p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div
          className={cn(
            'overflow-hidden transition-opacity duration-200',
            'opacity-0 lg:opacity-100',
            hovered && 'opacity-100',
          )}
        >
          <h1 className="font-semibold text-sm text-white truncate">
            {escritorio?.nome || 'Adapta Tributária'}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-400 bg-emerald-950/30"
            >
              Plano {escritorio?.plano?.toUpperCase() || 'PRO'}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 lg:p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        <div
          className={cn(
            'px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider transition-opacity',
            'opacity-0 lg:opacity-100',
            hovered && 'opacity-100',
          )}
        >
          Módulos
        </div>
        {navItems.map((item) => {
          const isActive =
            item.path === '/app/cliente'
              ? location.pathname === '/app/cliente'
              : location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all touch-target',
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')}
              />
              <span
                className={cn(
                  'whitespace-nowrap transition-opacity duration-200',
                  'opacity-0 lg:opacity-100',
                  hovered && 'opacity-100',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="p-2 lg:p-3 border-t border-slate-800/80 bg-slate-950/40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left touch-target">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="h-8 w-8 bg-emerald-700 text-white border border-emerald-500/30 shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-emerald-800">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'overflow-hidden transition-opacity duration-200',
                    'opacity-0 lg:opacity-100',
                    hovered && 'opacity-100',
                  )}
                >
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.cargo || 'Admin'}</p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-slate-400 shrink-0 transition-opacity',
                  'opacity-0 lg:opacity-100',
                  hovered && 'opacity-100',
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-slate-900 border-slate-800 text-slate-200"
          >
            <div className="p-2 border-b border-slate-800">
              <p className="text-xs font-semibold text-white">{user?.name}</p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            {isAdmin && (
              <DropdownMenuItem
                asChild
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 text-xs"
              >
                <Link to="/app/configuracoes/escritorio" className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Configurações do escritório</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer text-rose-400 hover:bg-rose-950/40 focus:bg-rose-950/40 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              <span>Sair da conta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
