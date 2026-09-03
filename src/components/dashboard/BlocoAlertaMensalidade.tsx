import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CreditCard,
  Mail,
  MailCheck,
  MailX,
  Send,
  Timer,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { dispararAlertaEmail, getAlertasConfig, saveAlertasConfig } from '@/services/alertasGlobais'
import { calcularSituacaoAcesso } from '@/services/assinatura'
import type { AlertasConfigRecord, EscritorioRecord } from '@/types'

// =========================================================================
// ALERTA "MENSALIDADE / ASSINATURA" DO PAINEL DE ALERTAS GLOBAIS
// 3 níveis:
//  - "trial expirando"        → 2 dias antes do fim do trial (âmbar)
//  - "mensalidade próxima"    → até 5 dias antes do vencimento (âmbar)
//  - "mensalidade vencida"    → dentro das 24h do bloqueio, com CRONÔMETRO
//                                REGRESSIVO das horas até o bloqueio (vermelho)
// =========================================================================

interface AlertaMensalidade {
  nivel: 'trial_expirando' | 'mensalidade_proxima' | 'mensalidade_vencida'
  severidade: 'critico' | 'atencao'
  titulo: string
  descricao: string
  acao: string
  /** Data ISO alvo (vencimento ou bloqueio) para o cronômetro */
  dataAlvo?: string
}

function calcularAlertaMensalidade(escritorio: EscritorioRecord | null): AlertaMensalidade | null {
  if (!escritorio) return null
  const agora = Date.now()
  const status = escritorio.assinatura_status || 'trial'

  // 1. MENSALIDADE VENCIDA — dentro das 24h (cronômetro regressivo até o bloqueio)
  if (status === 'atrasado' && escritorio.data_bloqueio) {
    const restanteMs = new Date(escritorio.data_bloqueio).getTime() - agora
    if (restanteMs > 0) {
      const horas = Math.floor(restanteMs / (60 * 60 * 1000))
      const minutos = Math.floor((restanteMs % (60 * 60 * 1000)) / (60 * 1000))
      return {
        nivel: 'mensalidade_vencida',
        severidade: 'critico',
        titulo: `Mensalidade VENCIDA — bloqueio em ${horas}h ${minutos}min`,
        descricao:
          'O pagamento da assinatura falhou. Você tem 24 horas para regularizar antes que o acesso ao sistema seja bloqueado automaticamente.',
        acao: 'Regularizar pagamento agora no Customer Portal',
        dataAlvo: escritorio.data_bloqueio,
      }
    }
  }

  // 2. TRIAL EXPIRANDO — 2 dias antes
  if (status === 'trial' && escritorio.trial_ate) {
    const restanteMs = new Date(escritorio.trial_ate).getTime() - agora
    const diasRestantes = Math.ceil(restanteMs / (24 * 60 * 60 * 1000))
    if (restanteMs > 0 && diasRestantes <= 2) {
      return {
        nivel: 'trial_expirando',
        severidade: 'atencao',
        titulo:
          diasRestantes <= 1
            ? 'Trial expira em menos de 24h!'
            : `Trial expira em ${diasRestantes} dias`,
        descricao:
          'Seu período de teste de 14 dias está acabando. Assine um plano para não perder o acesso aos dados do escritório.',
        acao: 'Escolher plano e assinar',
        dataAlvo: escritorio.trial_ate,
      }
    }
  }

  // 3. MENSALIDADE PRÓXIMA DO VENCIMENTO — até 5 dias antes
  if (status === 'ativo' && escritorio.data_vencimento) {
    const restanteMs = new Date(escritorio.data_vencimento).getTime() - agora
    const diasRestantes = Math.ceil(restanteMs / (24 * 60 * 60 * 1000))
    if (restanteMs > 0 && diasRestantes <= 5) {
      return {
        nivel: 'mensalidade_proxima',
        severidade: 'atencao',
        titulo: `Mensalidade vence em ${diasRestantes} dia(s)`,
        descricao: `A próxima cobrança do plano ${escritorio.plano.toUpperCase()} está prevista para ${new Date(escritorio.data_vencimento).toLocaleDateString('pt-BR')}. Confira o cartão cadastrado para evitar falha de pagamento.`,
        acao: 'Revisar forma de pagamento no Customer Portal',
        dataAlvo: escritorio.data_vencimento,
      }
    }
  }

  return null
}

/** Cronômetro regressivo HH:MM:SS até a data alvo. */
function useCronometro(dataAlvo?: string) {
  const [restante, setRestante] = useState('--:--:--')

  useEffect(() => {
    if (!dataAlvo) {
      setRestante('--:--:--')
      return
    }
    const tick = () => {
      const diff = new Date(dataAlvo).getTime() - Date.now()
      if (diff <= 0) {
        setRestante('00:00:00')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      setRestante(`${pad(h)}:${pad(m)}:${pad(s)}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [dataAlvo])

  return restante
}

interface BlocoAlertaMensalidadeProps {
  escritorio: EscritorioRecord | null
  /** Nome do painel pai (usado só para contexto de navegação) */
  onIrParaPlanos: () => void
}

export function BlocoAlertaMensalidade({
  escritorio,
  onIrParaPlanos,
}: BlocoAlertaMensalidadeProps) {
  const { toast } = useToast()
  const alerta = calcularAlertaMensalidade(escritorio)
  const cronometro = useCronometro(alerta?.dataAlvo)

  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [envioMensalidade, setEnvioMensalidade] = useState(true)
  const [emailDestino, setEmailDestino] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const escId = escritorio?.id
    if (!escId) return
    getAlertasConfig(escId)
      .then((cfg) => {
        if (cfg) {
          setEnvioMensalidade(cfg.enviar_mensalidade !== false)
          setEmailDestino(cfg.email_proprietario || '')
        }
      })
      .catch(() => {})
  }, [escritorio?.id])

  if (!alerta) return null

  const isCritico = alerta.severidade === 'critico'
  const isVencida = alerta.nivel === 'mensalidade_vencida'

  const handleSalvarConfig = async (valor: boolean) => {
    setEnvioMensalidade(valor)
    if (!escritorio?.id) return
    try {
      const cfg = await saveAlertasConfig(escritorio.id, { enviar_mensalidade: valor })
      toast({
        title: valor ? 'E-mail da mensalidade ativado' : 'E-mail da mensalidade desativado',
        description: valor
          ? 'O proprietário receberá alertas de vencimento e falha de pagamento.'
          : 'Alertas de mensalidade por e-mail pausados.',
      })
      void cfg
    } catch {
      toast({
        title: 'Erro ao salvar preferência',
        description: 'Não foi possível salvar o sinalizador de e-mail.',
        variant: 'destructive',
      })
    }
  }

  const handleDispararEmail = async () => {
    setEnviando(true)
    try {
      const resp = await dispararAlertaEmail({
        alertas: [],
        email_destinatario: emailDestino,
        tipo_alerta: 'mensalidade',
        assunto: `[${isCritico ? 'URGENTE' : 'ATENÇÃO'}] Mensalidade/Assinatura — ${alerta.titulo}`,
      })
      if (resp.success) {
        toast({
          title: 'Notificação enviada!',
          description: resp.message || `E-mail enviado para ${resp.email_destinatario}`,
        })
      } else {
        toast({
          title: 'Aviso de Envio',
          description: resp.message || 'Não foi possível concluir o envio.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Falha no disparo de e-mail',
        description: 'Erro de comunicação com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 shadow-lg ${
        isCritico
          ? 'border-red-500 bg-gradient-to-r from-red-50 via-rose-50 to-amber-50'
          : 'border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50'
      }`}
      role="alert"
    >
      {/* Faixa de urgência */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-2 ${isCritico ? 'bg-red-600 animate-pulse' : 'bg-amber-500'}`}
      />

      <div className="pl-4 pr-4 py-4 sm:pl-5 sm:pr-5 space-y-3">
        {/* Linha 1: categoria + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={`gap-1.5 text-[10px] font-black uppercase tracking-wider border-0 ${
              isCritico ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500 text-white'
            }`}
          >
            {isCritico ? <Bell className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            Mensalidade/Assinatura
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] uppercase font-bold ${
              isCritico
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-amber-500 text-white border-amber-500'
            }`}
          >
            {isCritico ? 'CRÍTICO / URGENTE' : 'ATENÇÃO'}
          </Badge>
        </div>

        {/* Linha 2: título + cronômetro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {isVencida ? (
              <Timer
                className={`w-6 h-6 shrink-0 ${isCritico ? 'text-red-600' : 'text-amber-600'}`}
              />
            ) : (
              <CalendarClock
                className={`w-6 h-6 shrink-0 ${isCritico ? 'text-red-600' : 'text-amber-600'}`}
              />
            )}
            <h4 className="text-base font-black text-slate-900">{alerta.titulo}</h4>
          </div>

          {/* CRONÔMETRO REGRESSIVO DAS 24H */}
          {isVencida && alerta.dataAlvo && (
            <div className="flex items-center gap-3 bg-slate-950 rounded-xl px-4 py-2.5 shadow-md">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                  Bloqueio em
                </p>
                <p className="font-mono font-black text-2xl text-white tabular-nums leading-none mt-0.5">
                  {cronometro}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">horas · minutos · segundos</p>
              </div>
              <Clock className="w-6 h-6 text-red-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Linha 3: descrição */}
        <p className="text-sm text-slate-700 leading-relaxed max-w-3xl">{alerta.descricao}</p>

        {/* Linha 4: ações + sinalizador de e-mail */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/70">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={onIrParaPlanos}
              className={`gap-1.5 h-8 font-bold text-xs shadow-sm ${
                isCritico
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              {isVencida ? 'Regularizar pagamento' : 'Gerenciar assinatura'}
            </Button>

            {/* Sinalizador de envio de e-mail (mesmo padrão dos outros alertas) */}
            <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-lg border border-slate-200">
              {envioMensalidade ? (
                <MailCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <MailX className="w-4 h-4 text-slate-400" />
              )}
              <Label
                htmlFor="switch-email-mensalidade"
                className="text-xs font-bold cursor-pointer text-slate-700"
              >
                {envioMensalidade ? 'Envia p/ Proprietário' : 'E-mail Pausado'}
              </Label>
              <Switch
                id="switch-email-mensalidade"
                checked={envioMensalidade}
                onCheckedChange={handleSalvarConfig}
              />
            </div>

            <Button
              size="icon"
              variant="ghost"
              disabled={enviando}
              onClick={handleDispararEmail}
              className="h-7 w-7 text-slate-600 hover:text-red-600 hover:bg-red-50"
              title="Enviar este alerta por e-mail agora"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
          >
            <Mail className="w-3.5 h-3.5" />
            Configurar e-mails
          </button>
        </div>
      </div>

      {/* Modal de configuração de e-mail (mesmo padrão do modal "Configurar E-mails") */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Mail className="w-5 h-5 text-emerald-600" />
              Alerta Mensalidade/Assinatura
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure o sinalizador de e-mail deste alerta, no mesmo padrão dos demais alertas do
              painel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between py-2 rounded-xl bg-slate-50 border border-slate-200 px-3">
              <div>
                <Label
                  htmlFor="cfg-envio-mensalidade"
                  className="text-xs font-bold text-slate-900 cursor-pointer"
                >
                  Enviar e-mails de mensalidade
                </Label>
                <p className="text-[11px] text-slate-500">
                  Vencimento próximo, vencida (24h) e trial expirando
                </p>
              </div>
              <Switch
                id="cfg-envio-mensalidade"
                checked={envioMensalidade}
                onCheckedChange={handleSalvarConfig}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Destinatário: {emailDestino || 'e-mail do proprietário/administrador do escritório'} —
              alterável no modal "Configurar E-mails" do painel de alertas.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Helper exportado para o Dashboard saber se o alerta existe (badge no menu, etc). */
export function temAlertaMensalidade(escritorio: EscritorioRecord | null): boolean {
  return calcularAlertaMensalidade(escritorio) !== null
}

// Reexporta o cálculo de acesso para uso do painel
export { calcularSituacaoAcesso }
