import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumbs() {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x && x !== 'app')

  const nameMap: Record<string, string> = {
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    declaracoes: 'Declarações',
    tabelas: 'Tabela Progressiva',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações',
    perfil: 'Perfil',
    equipe: 'Equipe',
    limites: 'Limites Anuais',
    novo: 'Novo',
    nova: 'Nova',
    editar: 'Editar',
  }

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 overflow-x-auto py-1">
      <Link
        to="/app/dashboard"
        className="hover:text-emerald-700 flex items-center gap-1 transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Escritório</span>
      </Link>
      {pathnames.map((value, index) => {
        const to = `/app/${pathnames.slice(0, index + 1).join('/')}`
        const isLast = index === pathnames.length - 1
        const displayName =
          nameMap[value] || (value.length > 10 ? `${value.slice(0, 8)}...` : value)

        return (
          <div key={to} className="flex items-center space-x-1.5 shrink-0">
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 capitalize">{displayName}</span>
            ) : (
              <Link to={to} className="hover:text-emerald-700 transition-colors capitalize">
                {displayName}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
