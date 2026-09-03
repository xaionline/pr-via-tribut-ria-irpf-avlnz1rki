import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check,
  CreditCard,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
  AlertCircle,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { criarCheckout, criarPortalSession, getAssinaturaStatus } from '@/services/assinatura'
import { PLANOS_ASSINATURA, type AssinaturaStatusDTO, type PlanoAssinatura } from '@/types'

const iconesPlanos = [Zap, Crown, Sparkles] as const

export default function PlanosPage() {
  const { user, escritorio } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const checkoutStatus = searchParams.get('checkout')

  const [status, setStatus] = useState<AssinaturaStatusDTO | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAssinatura | null>(null)
  const [portalAbrindo, setPortalAbrindo] = useState(false)

  useEffect(() => {
    getAssinaturaStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (checkoutStatus === 'success') {
      toast({
        title: 'Pagamento confirmado!',
        description: 'Sua assinatura foi ativada. Bem-vindo a bordo! 🎉',
      })
    } else if (checkoutStatus === 'cancel') {
      toast({
        title: 'Checkout cancelado',
        description: 'Nenhuma cobrança foi realizada. Você pode tentar novamente quando quiser.',
        variant: 'destructive',
      })
    }
  }, [checkoutStatus, toast])

  const handleAssinar = async (plano: PlanoAssinatura) => {
    setPlanoSelecionado(plano)
    try {
      const res = await criarCheckout(plano)
      if (res.success && res.checkout_url) {
        window.location.href = res.checkout_url
        return
      }
      toast({
        title: 'Pagamento via Stripe não disponível',
        description:
          res.message ||
          'As chaves do Stripe ainda não foram configuradas neste ambiente. O checkout será liberado assim que forem cadastradas.',
        variant: 'destructive',
        duration: 8000,
      })
    } catch {
      toast({
        title: 'Erro ao iniciar checkout',
        description: 'Não foi possível contatar o servidor de pagamentos.',
        variant: 'destructive',
      })
    } finally {
      setPlanoSelecionado(null)
    }
  }

  const handlePortal = async () => {
    setPortalAbrindo(true)
    try {
      const res = await criarPortalSession()
      if (res.success && res.portal_url) {
        window.open(res.portal_url, '_blank')
      } else {
        toast({
          title: 'Portal indisponível',
          description: res.message || 'Não foi possível abrir o Customer Portal.',
          variant: 'destructive',
        })
      }
    } finally {
      setPortalAbrindo(false)
    }
  }

  const assinatura = status?.escritorio
  const limites = status?.limites

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="text-center space-y-2">
        <Badge className="bg-emerald-600 text-white border-0 gap-1.5 px-3 py-1 text-xs font-bold">
          <CreditCard className="w-3.5 h-3.5" />
          Planos e Assinatura
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          Escolha o plano ideal para o seu escritório
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Pagamento mensal com <strong>cartão de crédito ou PIX</strong> via Stripe. Todos os planos
          incluem <strong>14 dias de teste grátis</strong>. Cancele quando quiser.
        </p>
      </div>

      {/* Aviso quando Stripe não está configurado */}
      {status && !status.stripe_configurado && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-900">Checkout temporariamente indisponível</p>
              <p className="text-amber-800 mt-0.5 text-xs leading-relaxed">
                As chaves{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> e{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">STRIPE_PUBLISHABLE_KEY</code>{' '}
                ainda não foram cadastradas neste ambiente. Todo o fluxo de assinatura já está
                pronto — assim que as chaves forem adicionadas, o checkout cartão + PIX funciona
                automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retorno do checkout */}
      {checkoutStatus === 'success' && (
        <Card className="border-emerald-300 bg-emerald-50/80">
          <CardContent className="p-4 flex items-center gap-3 text-sm text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Pagamento recebido! Sua assinatura está sendo ativada (pode levar alguns segundos).
          </CardContent>
        </Card>
      )}

      {/* Estado atual da assinatura */}
      {!carregando && assinatura && (
        <Card className="border-slate-200">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Plano atual: <span className="capitalize">{assinatura.plano}</span>
                </h3>
                <Badge
                  className={`text-[10px] font-bold uppercase border-0 ${
                    assinatura.assinatura_status === 'ativo'
                      ? 'bg-emerald-100 text-emerald-800'
                      : assinatura.assinatura_status === 'trial'
                        ? 'bg-blue-100 text-blue-800'
                        : assinatura.assinatura_status === 'atrasado'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                  }`}
                >
                  {assinatura.assinatura_status}
                </Badge>
                {assinatura.trial_ate && assinatura.assinatura_status === 'trial' && (
                  <span className="text-xs text-slate-500">
                    Trial até {new Date(assinatura.trial_ate).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {assinatura.data_vencimento && assinatura.assinatura_status === 'ativo' && (
                  <span className="text-xs text-slate-500">
                    Próxima cobrança:{' '}
                    {new Date(assinatura.data_vencimento).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              {limites && (
                <p className="text-xs text-slate-500">
                  Uso: {limites.empresas_usadas} de{' '}
                  {limites.empresas === 0 ? '∞' : limites.empresas} empresas ·{' '}
                  {limites.clientes_usados} de {limites.clientes === 0 ? '∞' : limites.clientes}{' '}
                  clientes PF
                </p>
              )}
            </div>

            {assinatura.stripe_customer_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={portalAbrindo}
                className="gap-2 text-xs shrink-0"
              >
                {portalAbrindo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Settings2 className="w-3.5 h-3.5" />
                )}
                Customer Portal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid de planos */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANOS_ASSINATURA.map((plano, idx) => {
          const Icone = iconesPlanos[idx]
          const isDestaque = plano.destaque
          const isPlanoAtual = assinatura?.plano === plano.id
          const emProcessamento = planoSelecionado === plano.id

          return (
            <Card
              key={plano.id}
              className={`relative overflow-hidden transition-all ${
                isDestaque
                  ? 'border-2 border-blue-500 shadow-lg shadow-blue-100 md:-translate-y-2'
                  : 'border border-slate-200'
              }`}
            >
              {isDestaque && (
                <div className="bg-blue-600 text-white text-center text-[11px] font-bold uppercase tracking-wider py-1.5">
                  Mais popular
                </div>
              )}
              <CardContent className={`p-6 space-y-5 ${isDestaque ? 'pt-6' : ''}`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDestaque ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900">{plano.nome}</h3>
                    <p className="text-2xl font-black text-slate-900">
                      {plano.precoTexto}
                      <span className="text-xs font-medium text-slate-400"> /mês</span>
                    </p>
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {plano.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isDestaque ? 'text-blue-600' : 'text-emerald-600'
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleAssinar(plano.id)}
                  disabled={emProcessamento}
                  className={`w-full h-11 font-bold gap-2 ${
                    isDestaque
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {emProcessamento ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {isPlanoAtual ? 'Renovar / Reativar' : `Assinar ${plano.nome}`}
                </Button>

                {isPlanoAtual && (
                  <p className="text-center text-xs text-emerald-700 font-semibold">
                    ✓ Plano atual do escritório
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Trial + portal */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-blue-900">14 dias de teste grátis</p>
              <p className="text-xs text-blue-800 mt-0.5">
                Todo novo escritório começa com trial de 14 dias. Sem compromisso — assine quando
                quiser continuar.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-start gap-3">
            <Settings2 className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="text-sm w-full">
              <p className="font-bold text-slate-900">Gerenciar assinatura</p>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">
                Atualize cartão, baixe faturas, troque de plano ou cancele pelo Customer Portal do
                Stripe.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePortal}
                disabled={portalAbrindo}
                className="gap-1.5 text-xs"
              >
                {portalAbrindo ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Settings2 className="w-3 h-3" />
                )}
                Abrir Customer Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {escritorio && (
        <p className="text-center text-xs text-slate-400">
          Assinatura vinculada ao escritório <strong>{escritorio.nome}</strong>
          {user ? ` · ${user.email}` : ''}
        </p>
      )}
    </div>
  )
}
