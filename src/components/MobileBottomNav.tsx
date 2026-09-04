import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Menu,
  Settings,
  Calculator,
  LogOut,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export function MobileBottomNav() {
  const location = useLocation()
  const { isAdmin, isCliente, podeAcessarPJ, signOut, user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const mainTabs = isCliente
    ? [
        { label: 'Início', path: '/app/cliente', icon: LayoutDashboard },
        { label: 'Demonstrativo', path: '/app/cliente/demonstrativo', icon: FileText },
      ]
    : [
        { label: 'Inicio', path: '/app/dashboard', icon: LayoutDashboard },
        { label: 'Clientes', path: '/app/clientes', icon: Users },
        ...(podeAcessarPJ ? [{ label: 'Empresas', path: '/app/empresas', icon: Building2 }] : []),
        { label: 'Declarações', path: '/app/declaracoes', icon: FileText },
      ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-elevation px-2 py-1.5 flex items-center justify-around">
      {mainTabs.map((tab) => {
        const isActive =
          tab.path === '/app/cliente'
            ? location.pathname === '/app/cliente'
            : location.pathname === tab.path
        const Icon = tab.icon
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors touch-target ${
              isActive ? 'text-emerald-600 font-semibold' : 'text-slate-500'
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
            />
            <span>{tab.label}</span>
          </Link>
        )
      })}

      {/* Drawer More Option */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-medium text-slate-500 touch-target">
            <Menu className="w-5 h-5 mb-0.5 text-slate-400" />
            <span>Mais</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 py-5">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-base font-semibold text-slate-900">Mais Opções</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {(isAdmin || user?.cargo === 'super_admin') && (
              <Link
                to="/app/tabela-progressiva"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-800"
              >
                <Calculator className="w-5 h-5 text-emerald-600" />
                <span>Tabela Progressiva</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/app/configuracoes/altas-rendas"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-800"
              >
                <Calculator className="w-5 h-5 text-amber-600" />
                <span>Altas Rendas (IRPF-M)</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/app/configuracoes/ibs-cbs"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-800"
              >
                <Calculator className="w-5 h-5 text-emerald-600" />
                <span>IBS / CBS</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/app/configuracoes/escritorio"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-800"
              >
                <Settings className="w-5 h-5 text-slate-600" />
                <span>Configurações do escritório</span>
              </Link>
            )}
            <div className="pt-3 border-t">
              <button
                onClick={() => {
                  setDrawerOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 text-sm font-medium text-rose-600"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair ({user?.name || 'Usuário'})</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
