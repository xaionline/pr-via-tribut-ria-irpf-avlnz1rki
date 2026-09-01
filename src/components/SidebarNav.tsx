import { useState, useEffect } from 'react'
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
  ChevronRight,
  TrendingUp,
  Percent,
  Landmark,
  Coins,
  Sliders,
  CalendarDays,
  type LucideIcon,
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

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  exact?: boolean
}

interface NavGroup {
  id: string
  title: string
  iconEmoji?: string
  superAdminOnly?: boolean
  adminOnly?: boolean
  clienteOnly?: boolean
  items: NavItem[]
}

const STORAGE_KEY = 'sidebar_nav_collapsed_groups_v1'

export function SidebarNav() {
  const location = useLocation()
  const { user, escritorio, isAdmin, isCliente, isSuperAdmin, signOut } = useAuth()
  const [hovered, setHovered] = useState(false)

  // Estado dos grupos abertos/fechados persistido em localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups))
    } catch {
      // Ignora erro de quota do localStorage
    }
  }, [collapsedGroups])

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Definição dos grupos conforme a especificação desejada
  const groups: NavGroup[] = isCliente
    ? [
        {
          id: 'cliente_visao_geral',
          title: 'VISÃO GERAL',
          iconEmoji: '📊',
          items: [
            { label: 'Dashboard', path: '/app/cliente', icon: LayoutDashboard, exact: true },
            { label: 'Demonstrativo', path: '/app/cliente/demonstrativo', icon: FileText },
          ],
        },
      ]
    : [
        {
          id: 'visao_geral',
          title: 'VISÃO GERAL',
          iconEmoji: '📊',
          items: [
            { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, exact: true },
          ],
        },
        {
          id: 'cadastros',
          title: 'CADASTROS',
          iconEmoji: '👥',
          items: [
            { label: 'Clientes PF', path: '/app/clientes', icon: Users },
            { label: 'Empresas PJ', path: '/app/empresas', icon: Building2 },
            {
              label: 'Obrigações Acessórias',
              path: '/app/obrigacoes',
              icon: CalendarDays,
            },
            { label: 'Declarações', path: '/app/declaracoes', icon: FileText },
          ],
        },
        {
          id: 'tributos_tabelas',
          title: 'TRIBUTOS & TABELAS',
          iconEmoji: '📐',
          items: [
            {
              label: 'Tabela Progressiva (IRPF)',
              path: '/app/tabela-progressiva',
              icon: Calculator,
            },
            {
              label: 'Altas Rendas (IRPF-M)',
              path: '/app/configuracoes/altas-rendas',
              icon: Percent,
            },
            { label: 'IBS / CBS', path: '/app/configuracoes/ibs-cbs', icon: Calculator },
            {
              label: 'Simples Nacional',
              path: '/app/configuracoes/simples-nacional',
              icon: Landmark,
            },
            {
              label: 'Lucro Presumido',
              path: '/app/configuracoes/lucro-presumido',
              icon: Building2,
            },
            {
              label: 'Lucro Real (PIS/COFINS)',
              path: '/app/configuracoes/lucro-real',
              icon: Coins,
            },
            {
              label: 'IRPJ / CSLL',
              path: '/app/configuracoes/irpj-csll',
              icon: Calculator,
            },
            { label: 'Tabelas ISS', path: '/app/configuracoes/iss', icon: Calculator },
          ],
        },
        {
          id: 'analise_relatorios',
          title: 'ANÁLISE & RELATÓRIOS',
          iconEmoji: '📈',
          items: [
            {
              label: 'Planejador de Retiradas',
              path: '/app/planejador-retiradas',
              icon: Sliders,
            },
            { label: 'Relatórios', path: '/app/relatorios', icon: BarChart3 },
          ],
        },
        {
          id: 'administracao',
          title: 'ADMINISTRAÇÃO',
          iconEmoji: '🛡️',
          superAdminOnly: true,
          items: [{ label: 'Administração', path: '/app/admin', icon: ShieldCheck, exact: true }],
        },
        {
          id: 'configuracoes',
          title: 'CONFIGURAÇÕES',
          iconEmoji: '⚙️',
          items: [
            {
              label: 'Configurações do escritório',
              path: '/app/configuracoes/escritorio',
              icon: Settings,
            },
          ],
        },
      ]

  // Filtra grupos baseado no papel do usuário
  const visibleGroups = groups.filter((g) => {
    if (g.superAdminOnly && !isSuperAdmin) return false
    if (g.adminOnly && !isAdmin && !isSuperAdmin) return false
    if (g.clienteOnly && !isCliente) return false
    return true
  })

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path
    }
    // Caso especial para rotas de configuração
    if (item.path.startsWith('/app/configuracoes/')) {
      return location.pathname === item.path
    }
    // Para rotas de cliente
    if (item.path === '/app/cliente') {
      return location.pathname === '/app/cliente'
    }
    return location.pathname.startsWith(item.path)
  }

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'hidden md:flex flex-col fixed top-0 left-0 z-30 h-screen bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 overflow-hidden',
        'w-[68px] lg:w-[256px]',
        hovered && 'w-[256px] shadow-2xl',
      )}
    >
      {/* Header do Menu */}
      <div className="p-4 lg:p-4 border-b border-slate-800/80 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div
          className={cn(
            'overflow-hidden transition-opacity duration-200 min-w-0',
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
              {isSuperAdmin ? 'SUPER ADMIN' : `Plano ${escritorio?.plano?.toUpperCase() || 'PRO'}`}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navegação por Grupos */}
      <nav className="flex-1 p-2 lg:p-2.5 space-y-3 overflow-y-auto overflow-x-hidden">
        {visibleGroups.map((group) => {
          const isCollapsed = !!collapsedGroups[group.id]
          const hasActiveChild = group.items.some((item) => isItemActive(item))

          return (
            <div key={group.id} className="space-y-1">
              {/* Cabeçalho do Grupo (Expansível/Colapsável) */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-semibold tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors uppercase select-none group',
                )}
                title={group.title}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs shrink-0 select-none" aria-hidden="true">
                    {group.iconEmoji || '📁'}
                  </span>
                  <span
                    className={cn(
                      'truncate transition-opacity duration-200 text-left',
                      'opacity-0 lg:opacity-100',
                      hovered && 'opacity-100',
                      hasActiveChild && 'text-emerald-400 font-bold',
                    )}
                  >
                    {group.title}
                  </span>
                </div>

                <div
                  className={cn(
                    'transition-opacity duration-200 shrink-0 ml-1',
                    'opacity-0 lg:opacity-100',
                    hovered && 'opacity-100',
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform" />
                  )}
                </div>
              </button>

              {/* Itens do Grupo */}
              {!isCollapsed && (
                <div className="space-y-0.5 pl-0 lg:pl-1">
                  {group.items.map((item) => {
                    const active = isItemActive(item)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={item.label}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all touch-target',
                          active
                            ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60',
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            active ? 'text-white' : 'text-slate-400',
                          )}
                        />
                        <span
                          className={cn(
                            'truncate transition-opacity duration-200',
                            'opacity-0 lg:opacity-100',
                            hovered && 'opacity-100',
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Rodapé do Menu com Usuário Logado e Dropdown */}
      <div className="p-2 lg:p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left touch-target"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="h-8 w-8 bg-emerald-700 text-white border border-emerald-500/30 shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-emerald-800">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'overflow-hidden transition-opacity duration-200 min-w-0',
                    'opacity-0 lg:opacity-100',
                    hovered && 'opacity-100',
                  )}
                >
                  <p className="text-xs font-medium text-slate-200 truncate">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize truncate">
                    {isSuperAdmin ? 'Super Admin' : user?.cargo || 'Admin'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 text-slate-400 shrink-0 transition-opacity ml-1',
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
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            {isAdmin && (
              <DropdownMenuItem
                asChild
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 text-xs"
              >
                <Link to="/app/configuracoes/escritorio" className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurações do escritório</span>
                </Link>
              </DropdownMenuItem>
            )}
            {isSuperAdmin && (
              <DropdownMenuItem
                asChild
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800 text-xs"
              >
                <Link to="/app/admin" className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Painel de Administração</span>
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
