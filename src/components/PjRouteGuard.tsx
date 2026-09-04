import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

interface PjRouteGuardProps {
  children: ReactNode
}

/**
 * Guarda de rotas do módulo Pessoa Jurídica (PJ).
 * Se o escritório estiver no plano 'starter' ativo (sem trial),
 * exibe uma tela amigável explicando que o recurso é exclusivo do plano Pro
 * e oferecendo botão para upgrade em /app/planos.
 */
export function PjRouteGuard({ children }: PjRouteGuardProps) {
  const { podeAcessarPJ, isStarterPFOnly, loading } = useAuth()

  if (loading) {
    return null
  }

  if (podeAcessarPJ) {
    return <>{children}</>
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 border-blue-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-white text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto shadow-md">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <Badge className="bg-amber-400 text-slate-900 font-bold hover:bg-amber-400 border-0 text-[10px] uppercase tracking-wider">
            Exclusivo Plano Pro
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black">Módulo Pessoa Jurídica (PJ)</h2>
          <p className="text-xs text-blue-100 max-w-sm mx-auto">
            Seu plano atual é o <strong>Starter (apenas Pessoa Física)</strong>.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6 text-center">
          <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
            <p>
              O <strong>Plano Starter</strong> contempla 100% da inteligência para{' '}
              <strong>Pessoa Física (IRPF)</strong>: declarações, apurações legais × simplificadas,
              Altas Rendas e simuladores.
            </p>
            <p>
              Para acessar o módulo de{' '}
              <strong>
                Empresas PJ, Comparador de Regimes (Simples vs Presumido vs Real), Simulador PJ,
                Planejador de Retiradas e Obrigações Acessórias
              </strong>
              , faça o upgrade para o <strong>Plano Pro</strong>.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              O que você ganha com o Plano Pro:
            </p>
            <ul className="space-y-1.5 pl-5 list-disc text-slate-600">
              <li>Gestão completa de Empresas PJ (Simples Nacional, Lucro Presumido e Real)</li>
              <li>Comparador automático de regimes tributários</li>
              <li>Simulador PJ e apuração mensal de faturamentos</li>
              <li>Planejador de Retiradas (Pró-labore vs Dividendos) e relatórios executivos</li>
              <li>Calendário e controle de Obrigações Acessórias (DAS, DCTF, etc.)</li>
              <li>Até 50 empresas e 150 clientes PF</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-xs sm:text-sm gap-2 shadow-sm"
            >
              <Link to="/app/planos">
                <span>Fazer upgrade para o Pro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-300 text-slate-700 h-11 text-xs"
            >
              <Link to="/app/dashboard">Voltar ao Dashboard</Link>
            </Button>
          </div>

          <p className="text-[11px] text-slate-400">
            Dados de empresas cadastradas anteriormente são mantidos em segurança e serão reexibidos
            imediatamente após o upgrade.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
