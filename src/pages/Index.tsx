import { Navigate, Link } from 'react-router-dom'
import { Building2, ArrowRight, ShieldCheck, Users, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Index() {
  const { isAuthenticated, loading, isCliente } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={isCliente ? '/app/cliente' : '/app/dashboard'} replace />
  }

  // Landing pública para visitantes não autenticados.
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-900 relative overflow-hidden flex flex-col">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">Prévia Tributária IRPF</span>
        </div>
        <Link
          to="/login"
          className="text-sm text-emerald-100/80 hover:text-white transition-colors font-medium"
        >
          Entrar
        </Link>
      </header>

      {/* Conteúdo */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 text-center text-white">
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight max-w-3xl">
          Prévia tributária do IRPF para o seu escritório de contabilidade
        </h1>
        <p className="mt-5 text-emerald-100/80 text-sm sm:text-lg max-w-xl leading-relaxed">
          Plataforma multi-tenant para contadores e consultores. Cadastre seu escritório, gerencie
          clientes e declarações com isolamento total entre organizações.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-colors"
          >
            <span>Criar meu escritório</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Já tenho conta
          </Link>
        </div>

        {/* Destaques */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
            <ShieldCheck className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Isolamento total</h3>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              Cada escritório é independente. Dados nunca compartilhados entre organizações.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
            <Users className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Equipe e clientes</h3>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              RBAC por cargo: admin, consultor, visualizador e cliente.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
            <FileText className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Declarações</h3>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              Prévia do IRPF, simulador tributário e demonstrativo de cálculo.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-6 text-xs text-emerald-100/50">
        © {new Date().getFullYear()} Prévia Tributária IRPF. Todos os direitos reservados.
      </footer>
    </div>
  )
}
