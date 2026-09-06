import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Sparkles, ArrowRight, ShieldCheck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

interface EnterpriseRouteGuardProps {
  children: ReactNode
}

/**
 * Guarda de rotas e tela de bloqueio para o Assistente IA Tribby.
 * Se o escritório NÃO tiver plano Enterprise ativo NEM estiver em período de trial (14 dias),
 * exibe o selo "Recurso Enterprise" com explicações, vantagens e link para /app/planos.
 */
export function EnterpriseRouteGuard({ children }: EnterpriseRouteGuardProps) {
  const { podeAcessarIA, escritorio, loading } = useAuth()

  if (loading) {
    return null
  }

  if (podeAcessarIA) {
    return <>{children}</>
  }

  const planoAtualNome = escritorio?.plano ? escritorio.plano.toUpperCase() : 'STARTER'

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2 border-indigo-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 p-6 text-white text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto shadow-md">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <Badge className="bg-amber-400 text-slate-900 font-bold hover:bg-amber-400 border-0 text-[10px] uppercase tracking-wider">
            Exclusivo Plano Enterprise
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black">Assistente IA Nativo (Tribby)</h2>
          <p className="text-xs text-indigo-100 max-w-sm mx-auto">
            Seu plano atual é o <strong>{planoAtualNome}</strong>.
          </p>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6 text-center">
          <div className="space-y-2 text-slate-600 text-xs sm:text-sm leading-relaxed">
            <p>
              O <strong>Tribby</strong> é o consultor tributário e suporte inteligente do
              escritório, treinado na legislação tributária brasileira e com acesso seguro aos dados
              dos seus clientes PF, empresas PJ, declarações e obrigações.
            </p>
            <p>
              Para liberar o <strong>Assistente IA</strong> e respostas em tempo real sobre Fator R,
              planejamento tributário, deduções e prazos fiscais, faça o upgrade para o{' '}
              <strong>Plano Enterprise</strong>.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left space-y-2 text-xs text-slate-700">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              O que você ganha com o Plano Enterprise:
            </p>
            <ul className="space-y-1.5 pl-5 list-disc text-slate-600">
              <li>
                <strong>Assistente IA Tribby nativo</strong> no app com histórico de conversas e
                botão flutuante
              </li>
              <li>
                Análise automática de <strong>Fator R</strong> e enquadramento de Simples Nacional
              </li>
              <li>
                Consultoria sobre <strong>comparador de regimes</strong> (Simples vs Presumido vs
                Real)
              </li>
              <li>
                Auditoria de deduções legais e cruzamento de dados IRPF com informes de rendimentos
              </li>
              <li>
                <strong>Empresas PJ e clientes PF ilimitados</strong> para todo o seu escritório
              </li>
              <li>Suporte prioritário e onboarding dedicado</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-11 text-xs sm:text-sm gap-2 shadow-sm"
            >
              <Link to="/app/planos">
                <span>Fazer upgrade para o Enterprise</span>
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
            Durante o período de <strong>14 dias de teste grátis</strong>, o Tribby fica 100%
            liberado para novos escritórios experimentarem.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
