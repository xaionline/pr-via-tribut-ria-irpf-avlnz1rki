import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  Percent,
  TrendingDown,
  Mail,
  MailCheck,
  MailX,
  Send,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building2,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Info,
  Loader2,
  Settings,
  Bell,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import type {
  AlertaEmpresaGlobal,
  AlertasConfigRecord,
  TipoAlertaEmpresa,
  SeveridadeAlerta,
} from '@/types'
import { dispararAlertaEmail, saveAlertasConfig } from '@/services/alertasGlobais'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface BlocoAlertasEmpresasProps {
  alertas: AlertaEmpresaGlobal[]
  loading: boolean
  escritorioId?: string
  config: AlertasConfigRecord | null
  onRefresh: () => void
  onConfigUpdated: (config: AlertasConfigRecord) => void
  proprietarioEmail?: string
}

export function BlocoAlertasEmpresas({
  alertas,
  loading,
  escritorioId,
  config,
  onRefresh,
  onConfigUpdated,
  proprietarioEmail = '',
}: BlocoAlertasEmpresasProps) {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>('todos')
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [enviandoEmailAlertaId, setEnviandoEmailAlertaId] = useState<string | null>(null)
  const [enviandoTodosEmails, setEnviandoTodosEmails] = useState(false)

  // Configurações do modal
  const [emailDestino, setEmailDestino] = useState(
    config?.email_proprietario || proprietarioEmail || '',
  )
  const [envioGeral, setEnvioGeral] = useState(config?.enviar_email_geral !== false)
  const [envioFatorR, setEnvioFatorR] = useState(config?.enviar_fator_r !== false)
  const [envioProLabore, setEnvioProLabore] = useState(config?.enviar_pro_labore !== false)
  const [envioAltasRendas, setEnvioAltasRendas] = useState(config?.enviar_altas_rendas !== false)
  const [envioAnexoSimples, setEnvioAnexoSimples] = useState(config?.enviar_anexo_simples !== false)
  const [customAlertsMap, setCustomAlertsMap] = useState<Record<string, boolean>>(
    config?.config_alertas_custom || {},
  )
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  // Sincronizar estados locais se o config externo mudar
  React.useEffect(() => {
    if (config) {
      setEmailDestino(config.email_proprietario || proprietarioEmail || '')
      setEnvioGeral(config.enviar_email_geral !== false)
      setEnvioFatorR(config.enviar_fator_r !== false)
      setEnvioProLabore(config.enviar_pro_labore !== false)
      setEnvioAltasRendas(config.enviar_altas_rendas !== false)
      setEnvioAnexoSimples(config.enviar_anexo_simples !== false)
      setCustomAlertsMap(config.config_alertas_custom || {})
    }
  }, [config, proprietarioEmail])

  // Contadores
  const criticosCount = alertas.filter((a) => a.severidade === 'critico').length
  const atencaoCount = alertas.filter((a) => a.severidade === 'atencao').length

  // Filtragem dos alertas exibidos
  const alertasFiltrados = alertas.filter((a) => {
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false
    if (filtroSeveridade !== 'todos' && a.severidade !== filtroSeveridade) return false
    return true
  })

  // Checa se o alerta específico tem envio por e-mail ativado
  const isEnvioEmailAtivoParaAlerta = (alerta: AlertaEmpresaGlobal): boolean => {
    if (!envioGeral) return false
    // Checa override individual no customAlertsMap se existir
    if (customAlertsMap[alerta.id] !== undefined) {
      return customAlertsMap[alerta.id]
    }
    // Checa por tipo
    if (alerta.tipo === 'fator_r') return envioFatorR
    if (alerta.tipo === 'pro_labore') return envioProLabore
    if (alerta.tipo === 'altas_rendas') return envioAltasRendas
    if (alerta.tipo === 'anexo_simples') return envioAnexoSimples
    return true
  }

  // Toggle rápido de envio de e-mail por alerta
  const handleToggleAlertaEmail = async (e: React.MouseEvent, alerta: AlertaEmpresaGlobal) => {
    e.stopPropagation()
    if (!escritorioId) return

    const estadoAtual = isEnvioEmailAtivoParaAlerta(alerta)
    const novoEstado = !estadoAtual
    const novoMap = { ...customAlertsMap, [alerta.id]: novoEstado }
    setCustomAlertsMap(novoMap)

    try {
      const updated = await saveAlertasConfig(escritorioId, {
        config_alertas_custom: novoMap,
      })
      onConfigUpdated(updated)
      toast({
        title: novoEstado
          ? 'E-mail ativado para este alerta'
          : 'E-mail desativado para este alerta',
        description: novoEstado
          ? `O proprietário receberá notificações deste alerta (${alerta.empresa_nome}).`
          : `Notificações por e-mail pausadas para este alerta.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar preferência',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // Disparar envio de e-mail individual
  const handleDispararEmailIndividual = async (
    e: React.MouseEvent,
    alerta: AlertaEmpresaGlobal,
  ) => {
    e.stopPropagation()
    setEnviandoEmailAlertaId(alerta.id)
    try {
      const resp = await dispararAlertaEmail({
        alertas: [alerta],
        email_destinatario: emailDestino,
        empresa_nome: alerta.empresa_nome,
        tipo_alerta: alerta.tipo,
        assunto: `[URGENTE] Alerta Tributário: ${alerta.empresa_nome} — ${alerta.titulo}`,
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
    } catch (err) {
      toast({
        title: 'Falha no disparo de e-mail',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setEnviandoEmailAlertaId(null)
    }
  }

  // Disparar envio de e-mail com todos os alertas críticos/filtrados
  const handleDispararTodosEmails = async () => {
    if (alertas.length === 0) return
    setEnviandoTodosEmails(true)
    try {
      const alertasParaEnviar = alertas.filter(isEnvioEmailAtivoParaAlerta)
      const lista = alertasParaEnviar.length > 0 ? alertasParaEnviar : alertas

      const resp = await dispararAlertaEmail({
        alertas: lista,
        email_destinatario: emailDestino,
        assunto: `⚠️ Resumo de Alertas Fiscais das Empresas (${lista.length} pendências)`,
      })

      if (resp.success) {
        toast({
          title: 'Relatório de alertas disparado com sucesso!',
          description: resp.message || `Enviado para ${resp.email_destinatario}`,
        })
      }
    } catch (err) {
      toast({
        title: 'Erro ao enviar alertas por e-mail',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setEnviandoTodosEmails(false)
    }
  }

  // Salvar configurações no modal
  const handleSalvarConfigModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escritorioId) return

    setSalvandoConfig(true)
    try {
      const updated = await saveAlertasConfig(escritorioId, {
        email_proprietario: emailDestino.trim().toLowerCase(),
        enviar_email_geral: envioGeral,
        enviar_fator_r: envioFatorR,
        enviar_pro_labore: envioProLabore,
        enviar_altas_rendas: envioAltasRendas,
        enviar_anexo_simples: envioAnexoSimples,
        config_alertas_custom: customAlertsMap,
      })
      onConfigUpdated(updated)
      setConfigModalOpen(false)
      toast({
        title: 'Preferências de alertas salvas!',
        description: 'Os parâmetros de sinalização e e-mails foram atualizados.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar configurações',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSalvandoConfig(false)
    }
  }

  // Ícone por tipo de alerta
  const getIconeAlerta = (tipo: TipoAlertaEmpresa) => {
    switch (tipo) {
      case 'fator_r':
        return <Percent className="w-5 h-5 text-amber-500" />
      case 'pro_labore':
        return <ShieldAlert className="w-5 h-5 text-rose-500" />
      case 'altas_rendas':
        return <Flame className="w-5 h-5 text-purple-500" />
      case 'anexo_simples':
        return <Sparkles className="w-5 h-5 text-emerald-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* CABEÇALHO DO BLOCO COM DESTAQUE VISUAL FORTE E SENSO DE URGÊNCIA */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/80 bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 p-5 sm:p-6 text-white shadow-xl">
          {/* Efeito luminoso de fundo */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider animate-bounce shadow-md">
                  <Flame className="w-4 h-4 fill-white" />
                  Painel de Alertas Automáticos Globais
                </span>

                {criticosCount > 0 ? (
                  <Badge className="bg-red-500 text-white font-extrabold text-xs px-2.5 py-1 border-0 gap-1.5 animate-pulse shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {criticosCount} URGÊNCIAS CRÍTICAS
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-1 border-0 gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Zero urgências críticas
                  </Badge>
                )}

                {atencaoCount > 0 && (
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-xs px-2.5 py-1 border-0 gap-1">
                    {atencaoCount} pontos de atenção
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Alertas Tributários das suas Empresas
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Monitoramento contínuo em tempo real de <strong>Fator R (28%)</strong>,{' '}
                <strong>Piso de Pró-labore Legal</strong>,{' '}
                <strong>Teto Altas Rendas (R$ 600k)</strong> e{' '}
                <strong>Mudanças de Anexo do Simples</strong> agregados de todas as empresas do seu
                escritório.
              </p>
            </div>

            {/* Ações Rápidas no Cabeçalho */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs h-9 gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigModalOpen(true)}
                className="bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white text-xs h-9 gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Configurar E-mails</span>
              </Button>

              <Button
                size="sm"
                onClick={handleDispararTodosEmails}
                disabled={enviandoTodosEmails || alertas.length === 0}
                className="bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs h-9 gap-1.5 shadow-lg border-0"
              >
                {enviandoTodosEmails ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Disparar Resumo por E-mail</span>
              </Button>
            </div>
          </div>

          {/* SINALIZADOR GLOBAL DO PROPRIETÁRIO */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">E-mail do Proprietário:</span>
              <span className="font-mono font-bold text-amber-300">
                {emailDestino || 'Nenhum e-mail configurado'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">Status de Envio Global:</span>
              {envioGeral ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                  <MailCheck className="w-3.5 h-3.5" /> E-mails Ativados
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                  <MailX className="w-3.5 h-3.5" /> Envio Desativado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FILTROS E BARRA DE STATUS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          {/* Filtro de Tipo */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              Filtrar:
            </span>

            {[
              { id: 'todos', label: 'Todos os Alertas' },
              { id: 'fator_r', label: 'Fator R (28%)' },
              { id: 'pro_labore', label: 'Pró-labore Mínimo' },
              { id: 'altas_rendas', label: 'Altas Rendas' },
              { id: 'anexo_simples', label: 'Regime / Anexo' },
            ].map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={filtroTipo === f.id ? 'default' : 'ghost'}
                onClick={() => setFiltroTipo(f.id)}
                className={`h-7 text-xs px-2.5 rounded-lg ${
                  filtroTipo === f.id
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Filtro de Severidade */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              size="sm"
              variant={filtroSeveridade === 'todos' ? 'outline' : 'ghost'}
              onClick={() => setFiltroSeveridade('todos')}
              className="h-7 text-[11px] px-2 text-slate-600"
            >
              Todos ({alertas.length})
            </Button>
            <Button
              size="sm"
              variant={filtroSeveridade === 'critico' ? 'default' : 'ghost'}
              onClick={() => setFiltroSeveridade('critico')}
              className={`h-7 text-[11px] px-2 gap-1 ${
                filtroSeveridade === 'critico'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Flame className="w-3 h-3 fill-current" />
              Críticos ({criticosCount})
            </Button>
            <Button
              size="sm"
              variant={filtroSeveridade === 'atencao' ? 'default' : 'ghost'}
              onClick={() => setFiltroSeveridade('atencao')}
              className={`h-7 text-[11px] px-2 gap-1 ${
                filtroSeveridade === 'atencao'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Atenção ({atencaoCount})
            </Button>
          </div>
        </div>

        {/* LISTA DE CARDS DE ALERTAS DAS EMPRESAS */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 bg-white animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : alertasFiltrados.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-emerald-200 bg-emerald-50/40">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhum alerta pendente para o filtro selecionado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Todas as empresas da carteira estão em conformidade com as regras de Fator R, piso
              salarial dos sócios e limites de distribuição.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {alertasFiltrados.map((alerta) => {
              const isCritico = alerta.severidade === 'critico'
              const emailAtivo = isEnvioEmailAtivoParaAlerta(alerta)
              const enviando = enviandoEmailAlertaId === alerta.id

              return (
                <div
                  key={alerta.id}
                  onClick={() => navigate(alerta.link)}
                  className={`group relative p-4 sm:p-5 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                    isCritico
                      ? 'border-red-400 bg-gradient-to-r from-red-50/90 via-rose-50/50 to-white hover:border-red-500 hover:bg-red-50'
                      : 'border-amber-300 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white hover:border-amber-400 hover:bg-amber-50/80'
                  }`}
                >
                  {/* Faixa de Urgência à esquerda */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-2 rounded-l-xl ${
                      isCritico ? 'bg-red-600 animate-pulse' : 'bg-amber-500'
                    }`}
                  />

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pl-2">
                    {/* Conteúdo Principal do Alerta */}
                    <div className="space-y-2 flex-1">
                      {/* Linha 1: Empresa + Badges de Urgência */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5 group-hover:text-rose-700 transition-colors">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          {alerta.empresa_nome}
                        </span>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono text-slate-500 bg-white"
                        >
                          CNPJ: {alerta.empresa_cnpj}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold ${
                            isCritico
                              ? 'bg-red-600 text-white border-red-600 animate-pulse'
                              : 'bg-amber-500 text-white border-amber-500'
                          }`}
                        >
                          {isCritico ? 'CRÍTICO / URGENTE' : 'ATENÇÃO'}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize font-semibold bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {alerta.empresa_regime.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Linha 2: Título e Ícone */}
                      <div className="flex items-center gap-2">
                        {getIconeAlerta(alerta.tipo)}
                        <h4 className="text-sm font-bold text-slate-900">{alerta.titulo}</h4>
                      </div>

                      {/* Linha 3: Descrição detalhada */}
                      <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                        {alerta.descricao}
                      </p>

                      {/* Linha 4: Impacto e Ação recomendada */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-1 text-xs">
                        {alerta.impacto && (
                          <span className="text-rose-700 font-semibold flex items-center gap-1">
                            <strong>Impacto:</strong> {alerta.impacto}
                          </span>
                        )}
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <strong>Ação:</strong> {alerta.acao}
                        </span>
                      </div>
                    </div>

                    {/* LADO DIREITO: SINALIZADOR DE E-MAIL + BOTÃO DE ACESSO AO PLANEJADOR */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/80">
                      {/* SINALIZADOR DE ENVIO DE E-MAIL (LIGADO/DESLIGADO) */}
                      <div className="flex items-center gap-2 bg-white/90 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => handleToggleAlertaEmail(e, alerta)}
                              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                                emailAtivo
                                  ? 'text-emerald-700 hover:text-emerald-800'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {emailAtivo ? (
                                <MailCheck className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <MailX className="w-4 h-4 text-slate-400" />
                              )}
                              <span>{emailAtivo ? 'Envia p/ Proprietário' : 'E-mail Pausado'}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {emailAtivo
                                ? 'Clique para desativar o envio de e-mail deste alerta'
                                : 'Clique para ativar o envio de e-mail deste alerta ao proprietário'}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Botão de Disparo Instantâneo deste Alerta */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={enviando}
                              onClick={(e) => handleDispararEmailIndividual(e, alerta)}
                              className="h-6 w-6 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            >
                              {enviando ? (
                                <Loader2 className="w-3 h-3 animate-spin text-rose-600" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Enviar este alerta por e-mail agora</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Botão para Abrir o Planejador da Empresa */}
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(alerta.link)
                        }}
                        className={`text-xs gap-1.5 h-8 font-bold shadow-sm ${
                          isCritico
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>Abrir Planejador</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MODAL DE CONFIGURAÇÃO DE E-MAILS DO ESCRITÓRIO */}
        <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSalvarConfigModal}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Mail className="w-5 h-5 text-emerald-600" />
                  Configurar Notificações de Alertas por E-mail
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Defina o endereço do proprietário do escritório e quais tipos de alertas
                  tributários devem disparar e-mails automáticos.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* E-mail do Proprietário */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email-proprietario"
                    className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                  >
                    <span>E-mail do Proprietário / Administrador *</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Destinatário principal
                    </span>
                  </Label>
                  <Input
                    id="email-proprietario"
                    type="email"
                    value={emailDestino}
                    onChange={(e) => setEmailDestino(e.target.value)}
                    placeholder="contador@seuescritorio.com.br"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                {/* Master Switch: Envio Geral */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <Label
                      htmlFor="switch-envio-geral"
                      className="text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      Ativar envio de e-mails para o escritório
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Chave mestre para habilitar/desabilitar disparos
                    </p>
                  </div>
                  <Switch
                    id="switch-envio-geral"
                    checked={envioGeral}
                    onCheckedChange={setEnvioGeral}
                  />
                </div>

                {/* Switches por Tipo de Alerta */}
                <div className="space-y-2.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Tipos de Alerta Habilitados
                  </span>

                  {/* Fator R */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-500" />
                      <div>
                        <Label
                          htmlFor="switch-fator-r"
                          className="text-xs font-semibold text-slate-800 cursor-pointer"
                        >
                          Fator R abaixo de 28%
                        </Label>
                        <p className="text-[10px] text-slate-400">Risco de tributação no Anexo V</p>
                      </div>
                    </div>
                    <Switch
                      id="switch-fator-r"
                      checked={envioFatorR}
                      disabled={!envioGeral}
                      onCheckedChange={setEnvioFatorR}
                    />
                  </div>

                  {/* Pró-labore Mínimo */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      <div>
                        <Label
                          htmlFor="switch-pro-labore"
                          className="text-xs font-semibold text-slate-800 cursor-pointer"
                        >
                          Piso Salarial dos Sócios (&lt; 1 SM)
                        </Label>
                        <p className="text-[10px] text-slate-400">Prevenção de autuações do INSS</p>
                      </div>
                    </div>
                    <Switch
                      id="switch-pro-labore"
                      checked={envioProLabore}
                      disabled={!envioGeral}
                      onCheckedChange={setEnvioProLabore}
                    />
                  </div>

                  {/* Altas Rendas */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-purple-500" />
                      <div>
                        <Label
                          htmlFor="switch-altas-rendas"
                          className="text-xs font-semibold text-slate-800 cursor-pointer"
                        >
                          Teto Altas Rendas (&gt; R$ 600k)
                        </Label>
                        <p className="text-[10px] text-slate-400">
                          Incidência de imposto mínimo nos dividendos
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="switch-altas-rendas"
                      checked={envioAltasRendas}
                      disabled={!envioGeral}
                      onCheckedChange={setEnvioAltasRendas}
                    />
                  </div>

                  {/* Anexo Simples / Regime */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <div>
                        <Label
                          htmlFor="switch-anexo-simples"
                          className="text-xs font-semibold text-slate-800 cursor-pointer"
                        >
                          Mudança de Anexo / Economia PJ
                        </Label>
                        <p className="text-[10px] text-slate-400">
                          Oportunidades de redução tributária
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="switch-anexo-simples"
                      checked={envioAnexoSimples}
                      disabled={!envioGeral}
                      onCheckedChange={setEnvioAnexoSimples}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfigModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoConfig}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {salvandoConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Preferências
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
