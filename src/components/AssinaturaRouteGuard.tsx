import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AlertTriangle, CreditCard, Clock, ExternalLink, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import {
  calcularSituacaoAcesso,
  criarPortalSession,
  type SituacaoAcesso,
} from '@/services/assinatura'
import type { EscritorioRecord } from '@/types'

/**
 * Guarda de rota de assinatura: valida `ativo` + `assinatura_status` do
 * escritório antes de renderizar o app. Se bloqueado/atrasado além do prazo,
 * exibe a TELA DE REATIVAÇÃO com link para o Customer Portal / pagamento.
 */
export function AssinaturaRouteGuard() {
  const { escritorio, isSuperAdmin, signOut } = useAuth()
  const location = useLocation()
  const [portalAbrindo, setPortalAbrindo] = useState(false)

  // Super administrador da plataforma nunca é bloqueado
  if (isSuperAdmin) return <Outlet />

  const situacao: SituacaoAcesso = calcularSituacaoAcesso(escritorio as EscritorioRecord | null)

  // A tela de planos/checkout fica sempre acessível para permitir a reativação
  if (situacao.liberado || location.pathname.startsWith('/app/planos')) return <Outlet />

  const abrirPortal = async () => {
    setPortalAbrindo(true)
    try {
      const res = await criarPortalSession()
      if (res.success && res.portal_url) {
        window.open(res.portal_url, '_blank')
      } else if (res.message) {
        window.alert(res.message)
      }
    } catch {
      window.alert('Não foi possível abrir o portal de pagamentos agora.')
    } finally {
      setPortalAbrindo(false)
    }
  }

  const isAtrasado = situacao.status === 'atrasado'
  const isTrialExpirado = situacao.status === 'trial'
  const corTema = isAtrasado
    ? { bg: 'from-red-50 via-orange-50 to-amber-50', badge: 'bg-red-600', icon: Clock }
    : isTrialExpirado
      ? {
          bg: 'from-amber-50 via-orange-50 to-yellow-50',
          badge: 'bg-amber-600',
          icon: AlertTriangle,
        }
      : { bg: 'from-slate-50 via-slate-100 to-slate-50', badge: 'bg-slate-600', icon: ShieldAlert }
  const Icone = corTema.icon

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${corTema.bg} flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border-2 border-red-200 shadow-xl p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <Icone className="w-8 h-8" />
          </div>
        </div>

        <div className="flex justify-center">
          <span
            className={`${corTema.badge} text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full`}
          >
            Mensalidade / Assinatura
          </span>
        </div>

        <h1 className="text-2xl font-black text-slate-900">
          {isAtrasado
            ? 'Pagamento em atraso'
            : isTrialExpirado
              ? 'Período de teste encerrado'
              : 'Acesso suspenso'}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed">{situacao.motivo}</p>

        {situacao.dataBloqueio && isAtrasado && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            <p className="font-bold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Prazo de regularização: 24 horas após a falha
            </p>
            {new Date(situacao.dataBloqueio).getTime() < Date.now() && (
              <p className="text-xs mt-1 text-red-600 font-semibold">
                O prazo de 24h expirou em {new Date(situacao.dataBloqueio).toLocaleString('pt-BR')}.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <Button
            onClick={abrirPortal}
            disabled={portalAbrindo}
            className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 h-11"
          >
            <CreditCard className="w-4 h-4" />
            {portalAbrindo ? 'Abrindo portal...' : 'Regularizar pagamento / Gerenciar assinatura'}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              signOut()
              window.location.href = '/app/planos'
            }}
            className="gap-2 h-11 border-slate-300 text-slate-700"
          >
            <ExternalLink className="w-4 h-4" />
            Ver planos e assinar
          </Button>
        </div>

        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Precisa de ajuda? Fale com o suporte em suporte@inteligenciatributaria.com.br
        </p>
      </div>
    </div>
  )
}

/** Wrapper para rotas fora do Layout (redireciona autenticados bloqueados). */
export function AssinaturaRedirect() {
  const { escritorio, isSuperAdmin } = useAuth()
  if (isSuperAdmin) return <Outlet />
  const situacao = calcularSituacaoAcesso(escritorio as EscritorioRecord | null)
  if (!situacao.liberado) return <Navigate to="/app/planos" replace />
  return <Outlet />
}
