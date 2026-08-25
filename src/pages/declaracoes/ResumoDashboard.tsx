import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  TrendingDown,
  Sparkles,
  Target,
  ExternalLink,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  Landmark,
  HeartHandshake,
  Users,
  Info,
  Layers,
  Calculator,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { getResumoCompleto, type ResumoDetalhadoData } from '@/services/resumo'
import { calcularDeclaracao } from '@/services/declaracoes'
import { aplicarCenario, createCenario } from '@/services/simulacao'
import { getParametros as getAltasRendasParams } from '@/services/altasRendas'
import type { FaixaProgressiva, SimulacaoParams } from '@/types'

function calcIRPFProg(baseCalculo: number, faixas: FaixaProgressiva[]): number {
  if (!Array.isArray(faixas) || faixas.length === 0) return 0
  for (let i = faixas.length - 1; i >= 0; i--) {
    const f = faixas[i]
    if (baseCalculo > (f.limite_inferior || 0)) {
      const aliq = (f.aliquota || 0) / 100
      const parcelaDeduzir = f.parcela_deduzir != null ? f.parcela_deduzir : (f.deducao || 0) * 12
      return Math.max(0, baseCalculo * aliq - parcelaDeduzir)
    }
  }
  return 0
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

export default function ResumoDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isVisualizador } = useAuth()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ResumoDetalhadoData | null>(null)
  const [altasRendasAliq, setAltasRendasAliq] = useState<number>(10)

  // Sliders da Simulação de Cenário
  const [sliderPgbl, setSliderPgbl] = useState(0)
  const [sliderDestinacao, setSliderDestinacao] = useState(0)
  const [sliderDependentes, setSliderDependentes] = useState(0)

  // Modais de confirmação
  const [saveOpen, setSaveOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [full, arParams] = await Promise.all([
        getResumoCompleto(id),
        getAltasRendasParams().catch(() => []),
      ])
      setData(full)

      // Descobre alíquota de altas rendas para o ano da declaração
      const matchingParam = arParams.find(
        (p) => p.ano_calendario === full.declaracao.ano_calendario,
      )
      if (matchingParam) {
        setAltasRendasAliq(matchingParam.aliquota)
      } else if (arParams.length > 0) {
        setAltasRendasAliq(arParams[0].aliquota)
      } else {
        setAltasRendasAliq(10)
      }

      // Inicializa sliders com valores padrão adequados ou sugeridos
      setSliderPgbl(0)
      setSliderDestinacao(0)
      setSliderDependentes(0)
    } catch (err) {
      toast({
        title: 'Erro ao carregar resumo',
        description: 'Não foi possível carregar os dados consolidados da declaração.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('declaracoes', () => {
    if (id) loadData()
  })
  useRealtime('rendimentos', () => {
    if (id) loadData()
  })
  useRealtime('despesas_dedutiveis', () => {
    if (id) loadData()
  })
  useRealtime('destinacoes_fiscais', () => {
    if (id) loadData()
  })
  useRealtime('irrf', () => {
    if (id) loadData()
  })
  useRealtime('atividades_rurais', () => {
    if (id) loadData()
  })

  // Simulação reativa calculada no cliente
  const simulation = useMemo(() => {
    if (!data) return null

    const {
      resumo,
      baseCalculoIRPF,
      tabela,
      pgblTetoRestante,
      destinacaoTetoRestante,
      dependentes,
      previdenciaAtual,
    } = data

    const faixas = tabela?.faixas || []

    // 1. Simulação com os valores dos sliders
    const deducaoDepSimulada = sliderDependentes * 2275.08
    const novaBaseSimulada = Math.max(0, baseCalculoIRPF - sliderPgbl - deducaoDepSimulada)

    const irpfAntes = resumo.irpfDevido
    const irpfSimuladoSemDest = calcIRPFProg(novaBaseSimulada, faixas)
    // Abatimento direto das destinações simuladas (limitado ao imposto simulado)
    const irpfSimuladoFinal = Math.max(0, irpfSimuladoSemDest - sliderDestinacao)

    // Economia de IRPF gerada pelas deduções (PGBL + dependentes)
    const economiaDeducaoIRPF = Math.max(0, irpfAntes - irpfSimuladoSemDest)
    // Economia das destinações adicionais
    const economiaDestinacao = sliderDestinacao
    // Economia em Altas Rendas (redução de BC: PGBL reduz BC se aplicável)
    const reducaoBcAltasRendas = sliderPgbl
    const economiaAltasRendas = round2((reducaoBcAltasRendas * altasRendasAliq) / 100)

    const economiaTotalSimulada = round2(
      economiaDeducaoIRPF + economiaDestinacao + economiaAltasRendas,
    )

    // Novo Total de Tributos projetado com os sliders
    const novoTotalTributos = Math.max(0, resumo.totalTributos - economiaTotalSimulada)
    const novaCargaTributaria =
      resumo.rendimentosTributaveis > 0
        ? round2((novoTotalTributos / resumo.rendimentosTributaveis) * 100)
        : 0

    // 2. Cálculo do Cenário Saturado Máximo (Potencial de Redução)
    const maxPgblPossivel = pgblTetoRestante
    const maxDestinacaoPossivel = destinacaoTetoRestante
    // Quantos dependentes adicionais podem ser incluídos (ou total cadastrado caso não estejam deduzidos)
    const totalCadastrados = dependentes.length
    const maxDeducaoDepMax = totalCadastrados * 2275.08

    const baseSaturada = Math.max(0, baseCalculoIRPF - maxPgblPossivel - maxDeducaoDepMax)
    const irpfSaturadoSemDest = calcIRPFProg(baseSaturada, faixas)
    const economiaIrpfMax = Math.max(0, irpfAntes - irpfSaturadoSemDest)
    const economiaAltasRendasMax = round2((maxPgblPossivel * altasRendasAliq) / 100)
    const economiaTotalPossivel = round2(
      economiaIrpfMax + maxDestinacaoPossivel + economiaAltasRendasMax,
    )

    // Teto Restante Consolidado (PGBL restante + Destinações restante + Dedução de dependentes possíveis)
    const tetoRestanteTotal = round2(maxPgblPossivel + maxDestinacaoPossivel + maxDeducaoDepMax)

    return {
      irpfAntes,
      irpfSimuladoFinal,
      economiaDeducaoIRPF,
      economiaDestinacao,
      economiaAltasRendas,
      economiaTotalSimulada,
      novoTotalTributos,
      novaCargaTributaria,
      // Tetos e potenciais máximos
      maxPgblPossivel,
      maxDestinacaoPossivel,
      totalCadastrados,
      economiaTotalPossivel,
      tetoRestanteTotal,
    }
  }, [data, sliderPgbl, sliderDestinacao, sliderDependentes, altasRendasAliq])

  // Helpers de cores e badges para Carga Tributária
  const getCargaBadge = (carga: number) => {
    if (carga < 15) {
      return {
        variant: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        dotColor: 'bg-emerald-500',
        label: 'Baixa (< 15%)',
      }
    }
    if (carga <= 27.5) {
      return {
        variant: 'bg-amber-50 text-amber-700 border-amber-300',
        dotColor: 'bg-amber-500',
        label: 'Média (15% - 27,5%)',
      }
    }
    return {
      variant: 'bg-rose-50 text-rose-700 border-rose-300',
      dotColor: 'bg-rose-500',
      label: 'Alta (> 27,5%)',
    }
  }

  const handleSalvarCenario = async () => {
    if (!id || !simulation || !data) return
    setSaving(true)
    try {
      const paramsToSave: SimulacaoParams = {
        pgbl_adicional: sliderPgbl,
        destinacao: sliderDestinacao,
        dependentes: sliderDependentes,
        despesas_medicas: 0,
        pensao_alimenticia: 0,
      }

      const resultadosToSave = {
        imposto_atual: data.resumo.irpfDevido,
        aliquota_atual: data.resumo.cargaTributaria,
        imposto_otimizado: simulation.irpfSimuladoFinal,
        aliquota_otimizada: simulation.novaCargaTributaria,
        economia: simulation.economiaTotalSimulada,
        roi:
          sliderPgbl + sliderDestinacao > 0
            ? round2((simulation.economiaTotalSimulada / (sliderPgbl + sliderDestinacao)) * 100)
            : 0,
        breakdown: [
          {
            componente: 'PGBL / Previdência',
            reducao: round2(simulation.economiaDeducaoIRPF + simulation.economiaAltasRendas),
            percentual:
              simulation.economiaTotalSimulada > 0
                ? round2(
                    ((simulation.economiaDeducaoIRPF + simulation.economiaAltasRendas) /
                      simulation.economiaTotalSimulada) *
                      100,
                  )
                : 0,
          },
          {
            componente: 'Destinações Fiscais',
            reducao: round2(simulation.economiaDestinacao),
            percentual:
              simulation.economiaTotalSimulada > 0
                ? round2((simulation.economiaDestinacao / simulation.economiaTotalSimulada) * 100)
                : 0,
          },
        ],
        recomendacao: `Cenário com PGBL de ${formatCurrency(sliderPgbl)}, Destinações de ${formatCurrency(sliderDestinacao)} e ${sliderDependentes} dependente(s) economiza ${formatCurrency(simulation.economiaTotalSimulada)}.`,
      }

      await createCenario({
        declaracao_id: id,
        nome: `Simulação Resumo ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        params: paramsToSave,
        resultados: resultadosToSave,
      })

      toast({
        title: 'Simulação salva',
        description: 'O cenário foi salvo com sucesso nos registros da declaração.',
      })
      setSaveOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao salvar simulação',
        description: 'Não foi possível salvar o cenário.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAplicarCenario = async () => {
    if (!id || !simulation) return
    setApplying(true)
    try {
      const paramsToApply: SimulacaoParams = {
        pgbl_adicional: sliderPgbl,
        destinacao: sliderDestinacao,
        dependentes: sliderDependentes,
        despesas_medicas: 0,
        pensao_alimenticia: 0,
      }

      await aplicarCenario(id, paramsToApply)
      await calcularDeclaracao(id)

      toast({
        title: 'Cenário aplicado',
        description: 'As despesas e destinações foram incorporadas e a declaração recalculada.',
      })
      setApplyOpen(false)
      loadData()
    } catch (err) {
      toast({
        title: 'Erro ao aplicar cenário',
        description: 'Não foi possível aplicar as deduções à declaração.',
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="w-64 h-5" />
            <Skeleton className="w-40 h-3" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertTriangle className="w-14 h-14 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Declaração não encontrada</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Não foi possível carregar os dados desta declaração para exibir o resumo.
        </p>
        <Button
          onClick={() => navigate('/app/declaracoes')}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Declarações
        </Button>
      </div>
    )
  }

  const {
    resumo,
    declaracao,
    pgblTetoMaximo,
    previdenciaAtual,
    destinacaoTetoMaximo,
    dependentes,
  } = data
  const cargaBadge = getCargaBadge(resumo.cargaTributaria)
  const maxPgblSlider = Math.max(0, pgblTetoMaximo)
  const maxDestSlider = Math.max(0, destinacaoTetoMaximo)
  const maxDepSlider = Math.max(0, dependentes.length)

  // Percentuais de uso atual dos limites
  const pgblPctAtual =
    pgblTetoMaximo > 0 ? Math.min(100, Math.round((previdenciaAtual / pgblTetoMaximo) * 100)) : 0
  const destPctAtual =
    destinacaoTetoMaximo > 0
      ? Math.min(100, Math.round((resumo.destinacoes / destinacaoTetoMaximo) * 100))
      : 0
  const depPctAtual = dependentes.length > 0 ? 100 : 0

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/app/declaracoes/${declaracao.id}`)}
            className="hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                Resumo Final de Apuração — {declaracao.expand?.cliente_id?.nome || 'Cliente'}
              </h1>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 text-xs">
                Ano {declaracao.ano_calendario}
              </Badge>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-xs gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                Simulador Ativo
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visão consolidada de tributos e oportunidades de economia tributária
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs gap-1.5 h-9">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Atualizar Dados
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/declaracoes/${declaracao.id}`)}
            className="text-xs gap-1.5 h-9"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Acessar Abas da Declaração
          </Button>
        </div>
      </div>

      {/* TOPO: 4 CARDS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Tributos */}
        <Card className="rounded-2xl border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 shadow-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-900/80">
                Total Tributos
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-amber-950 font-mono tracking-tight">
                {formatCurrency(resumo.totalTributos)}
              </div>
              <p className="text-[11px] text-amber-800/80 mt-1">
                Soma de todos os impostos e retenções apurados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Carga Tributária */}
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Carga Tributária
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {formatNumber(resumo.cargaTributaria)}%
              </div>
              <Badge variant="outline" className={`text-[10px] font-medium ${cargaBadge.variant}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${cargaBadge.dotColor}`} />
                {cargaBadge.label}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Sobre {formatCurrency(resumo.rendimentosTributaveis)} tributáveis
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Economia Potencial */}
        <Card className="rounded-2xl border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 shadow-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900/80">
                Economia Potencial
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">
                {formatCurrency(simulation?.economiaTotalPossivel ?? 0)}
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-1">
                Saturando 100% dos limites legais
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Teto Restante */}
        <Card className="rounded-2xl border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 shadow-subtle">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-900/80">
                Teto Restante
              </span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-blue-700 font-mono tracking-tight">
                {formatCurrency(simulation?.tetoRestanteTotal ?? 0)}
              </div>
              <p className="text-[11px] text-blue-800/80 mt-1">
                PGBL, destinações e dependentes disponíveis
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LAYOUT PRINCIPAL: 2 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: RESUMO CONSOLIDADO (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-subtle overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Resumo Consolidado
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Demonstrativo consolidado de impostos e retenções
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white">
                  Ano {declaracao.ano_calendario}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* BLOCO: IMPOSTOS APURADOS */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Impostos Apurados
                </span>

                <div className="space-y-1 text-xs">
                  {/* Rendimentos Tributáveis */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-slate-600 font-medium">Rendimentos Tributáveis</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(resumo.rendimentosTributaveis)}
                    </span>
                  </div>

                  {/* IRPF Devido (link para Demonstrativo) */}
                  <button
                    type="button"
                    onClick={() => navigate(`/app/declaracoes/${declaracao.id}?tab=demonstrativo`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/70 transition-colors text-left group"
                  >
                    <span className="font-medium flex items-center gap-1.5">
                      IRPF Devido
                      <ExternalLink className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100" />
                    </span>
                    <span className="font-mono font-bold text-emerald-900">
                      {formatCurrency(resumo.irpfDevido)}
                    </span>
                  </button>

                  {/* Funrural */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <span className="text-slate-600 font-medium">Funrural (Rural)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(resumo.funrural)}
                    </span>
                  </div>

                  {/* Destinações */}
                  <button
                    type="button"
                    onClick={() => navigate(`/app/declaracoes/${declaracao.id}?tab=destinacoes`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      Destinações Fiscais
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(resumo.destinacoes)}
                    </span>
                  </button>

                  {/* IBS/CBS */}
                  <button
                    type="button"
                    onClick={() => navigate(`/app/declaracoes/${declaracao.id}?tab=ibs-cbs`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-teal-800 bg-teal-50/60 hover:bg-teal-100/70 transition-colors text-left group"
                  >
                    <span className="font-medium flex items-center gap-1.5">
                      IBS / CBS (Débito − Crédito)
                      <ExternalLink className="w-3 h-3 text-teal-600 opacity-60 group-hover:opacity-100" />
                    </span>
                    <span className="font-mono font-bold text-teal-900">
                      {formatCurrency(resumo.ibsCbsTotal)}
                    </span>
                  </button>

                  {/* Altas Rendas */}
                  <button
                    type="button"
                    onClick={() => navigate(`/app/declaracoes/${declaracao.id}?tab=altas-rendas`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-amber-900 bg-amber-50/60 hover:bg-amber-100/70 transition-colors text-left group"
                  >
                    <span className="font-medium flex items-center gap-1.5">
                      Altas Rendas (IRPF-M)
                      <ExternalLink className="w-3 h-3 text-amber-700 opacity-60 group-hover:opacity-100" />
                    </span>
                    <span className="font-mono font-bold text-amber-900">
                      {formatCurrency(resumo.altasRendasTotal)}
                    </span>
                  </button>
                </div>
              </div>

              {/* BLOCO: RETENÇÕES */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Retenções
                </span>

                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/declaracoes/${declaracao.id}?tab=ir-retido`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      IRRF Retido na Fonte
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(resumo.irrfRetido)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/app/declaracoes/${declaracao.id}?tab=ir-retido`)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      IRPFM Retido no Exercício
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(resumo.irpfmRetido)}
                    </span>
                  </button>
                </div>
              </div>

              {/* LINHA FINAL DESTACADA: TOTAL TRIBUTOS & CARGA */}
              <div className="pt-4 border-t-2 border-slate-200 bg-slate-50/80 -mx-5 -mb-5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold uppercase text-slate-900">
                    Total Tributos
                  </span>
                  <span className="text-lg font-mono font-extrabold text-amber-950">
                    {formatCurrency(resumo.totalTributos)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Carga Tributária Efetiva</span>
                    <span className="font-mono">{formatNumber(resumo.cargaTributaria)}%</span>
                  </div>
                  {/* Barra de progresso visual colorida (verde -> amarelo -> vermelho) */}
                  <div className="relative h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        resumo.cargaTributaria < 15
                          ? 'bg-emerald-500'
                          : resumo.cargaTributaria <= 27.5
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, resumo.cargaTributaria * 2.5))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0% (Baixa)</span>
                    <span>15%</span>
                    <span>27.5% (Teto IRPF)</span>
                    <span>40%+</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: SIMULADOR DE CENÁRIOS COM SLIDERS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-subtle">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                    Simulador de Otimização Tributária
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Ajuste os parâmetros em tempo real e visualize o impacto imediato na carga
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSliderPgbl(0)
                    setSliderDestinacao(0)
                    setSliderDependentes(0)
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Resetar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* SLIDER 1: PGBL (12% da renda tributável) */}
              <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Aporte PGBL / Previdência Complementar
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              Até 12% dos rendimentos tributáveis ({formatCurrency(pgblTetoMaximo)})
                              deduzem diretamente a base de cálculo do IRPF e Altas Rendas.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Limite 12%: {formatCurrency(pgblTetoMaximo)} • Já aportado:{' '}
                        {formatCurrency(previdenciaAtual)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-blue-700">
                      +{formatCurrency(sliderPgbl)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Slider
                    value={[sliderPgbl]}
                    min={0}
                    max={maxPgblSlider > 0 ? maxPgblSlider : 1000}
                    step={100}
                    onValueChange={(val) => setSliderPgbl(val[0] || 0)}
                    className="py-1"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                  <span>R$ 0</span>
                  <span className="text-blue-700 font-semibold">
                    {maxPgblSlider > 0
                      ? `${Math.round((sliderPgbl / maxPgblSlider) * 100)}% do teto disponível`
                      : 'Sem margem disponível'}
                  </span>
                  <span>Teto: {formatCurrency(maxPgblSlider)}</span>
                </div>
              </div>

              {/* SLIDER 2: Destinações (6% do IR devido) */}
              <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <HeartHandshake className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Destinações Fiscais (Fundos da Criança / Idoso)
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              Até 6% do IRPF devido ({formatCurrency(destinacaoTetoMaximo)}) abatem
                              integralmente do imposto a pagar, sem custo extra para o contribuinte.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Limite 6%: {formatCurrency(destinacaoTetoMaximo)} • Já destinado:{' '}
                        {formatCurrency(resumo.destinacoes)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-emerald-700">
                      +{formatCurrency(sliderDestinacao)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Slider
                    value={[sliderDestinacao]}
                    min={0}
                    max={maxDestSlider > 0 ? maxDestSlider : 500}
                    step={100}
                    onValueChange={(val) => setSliderDestinacao(val[0] || 0)}
                    className="py-1"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                  <span>R$ 0</span>
                  <span className="text-emerald-700 font-semibold">
                    {maxDestSlider > 0
                      ? `${Math.round((sliderDestinacao / maxDestSlider) * 100)}% do limite`
                      : 'Sem margem'}
                  </span>
                  <span>Teto: {formatCurrency(maxDestSlider)}</span>
                </div>
              </div>

              {/* SLIDER 3: Dependentes */}
              <div className="space-y-2.5 p-4 rounded-xl border border-slate-100 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          Dependentes na Simulação
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              Dedução anual de R$ 2.275,08 por dependente legal.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {dependentes.length} dependente(s) cadastrado(s) na declaração
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-violet-700">
                      {sliderDependentes} {sliderDependentes === 1 ? 'dependente' : 'dependentes'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Slider
                    value={[sliderDependentes]}
                    min={0}
                    max={maxDepSlider > 0 ? maxDepSlider : 5}
                    step={1}
                    onValueChange={(val) => setSliderDependentes(val[0] || 0)}
                    className="py-1"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                  <span>0 dependentes</span>
                  <span className="text-violet-700 font-semibold">
                    Dedução: {formatCurrency(sliderDependentes * 2275.08)}
                  </span>
                  <span>Máx: {maxDepSlider > 0 ? maxDepSlider : 5}</span>
                </div>
              </div>

              {/* ÁREA DE IMPACTO EM TEMPO REAL */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-teal-50 border border-emerald-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Impacto Projetado do Cenário
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[11px] font-mono">
                    Economia: {formatCurrency(simulation?.economiaTotalSimulada ?? 0)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 p-3.5 rounded-lg border border-emerald-100">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Nova Carga Tributária
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold font-mono text-emerald-950 transition-all duration-300">
                        {formatNumber(simulation?.novaCargaTributaria ?? 0)}%
                      </span>
                      <span className="text-xs text-emerald-600 font-semibold flex items-center">
                        <TrendingDown className="w-3 h-3 mr-0.5" />-
                        {formatNumber(
                          Math.max(
                            0,
                            resumo.cargaTributaria - (simulation?.novaCargaTributaria ?? 0),
                          ),
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/80 p-3.5 rounded-lg border border-emerald-100">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Novo Total de Tributos
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-950 mt-1 transition-all duration-300">
                      {formatCurrency(simulation?.novoTotalTributos ?? 0)}
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={() => setApplyOpen(true)}
                    disabled={
                      isVisualizador ||
                      (sliderPgbl === 0 && sliderDestinacao === 0 && sliderDependentes === 0)
                    }
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-10 gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aplicar este cenário
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSaveOpen(true)}
                    disabled={sliderPgbl === 0 && sliderDestinacao === 0 && sliderDependentes === 0}
                    className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold h-10 gap-2 border-emerald-200"
                  >
                    <Save className="w-4 h-4 text-emerald-700" />
                    Salvar simulação
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: POTENCIAL DE REDUÇÃO (3 CARDS COM PROGRESS BARS) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Potencial de Redução por Categoria
            </h2>
            <p className="text-xs text-slate-500">
              Aproveitamento dos tetos fiscais disponíveis para esta declaração
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD 1: PGBL */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-subtle">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    PGBL / Previdência
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-blue-700 bg-blue-50">
                  {pgblPctAtual}% Utilizado
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono font-semibold text-slate-800 mb-1.5">
                  <span>{formatCurrency(previdenciaAtual)}</span>
                  <span className="text-slate-400">/ {formatCurrency(pgblTetoMaximo)}</span>
                </div>
                <Progress
                  value={pgblPctAtual}
                  className="h-2.5 bg-slate-100"
                  indicatorClassName="bg-blue-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/60 text-xs text-blue-900 leading-relaxed">
                {simulation?.maxPgblPossivel && simulation.maxPgblPossivel > 0 ? (
                  <>
                    Aportando mais <strong>{formatCurrency(simulation.maxPgblPossivel)}</strong>{' '}
                    reduz até{' '}
                    <strong>
                      {formatCurrency(
                        round2(
                          simulation.maxPgblPossivel * 0.275 +
                            (simulation.maxPgblPossivel * altasRendasAliq) / 100,
                        ),
                      )}
                    </strong>{' '}
                    em IRPF + IRPF-M.
                  </>
                ) : (
                  <>Limite máximo de 12% da renda tributável plenamente aproveitado!</>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: Destinações */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-subtle">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Destinações Fiscais
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-emerald-700 bg-emerald-50"
                >
                  {destPctAtual}% Utilizado
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono font-semibold text-slate-800 mb-1.5">
                  <span>{formatCurrency(resumo.destinacoes)}</span>
                  <span className="text-slate-400">/ {formatCurrency(destinacaoTetoMaximo)}</span>
                </div>
                <Progress
                  value={destPctAtual}
                  className="h-2.5 bg-slate-100"
                  indicatorClassName="bg-emerald-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 text-xs text-emerald-900 leading-relaxed">
                {simulation?.maxDestinacaoPossivel && simulation.maxDestinacaoPossivel > 0 ? (
                  <>
                    Destinando mais{' '}
                    <strong>{formatCurrency(simulation.maxDestinacaoPossivel)}</strong> reduz o IR
                    em <strong>{formatCurrency(simulation.maxDestinacaoPossivel)}</strong>{' '}
                    (abatimento direto).
                  </>
                ) : (
                  <>Limite máximo de 6% do imposto devido plenamente aproveitado!</>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: Dependentes */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-subtle">
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-50 text-violet-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Dependentes
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-violet-700 bg-violet-50"
                >
                  {dependentes.length} Registrado(s)
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono font-semibold text-slate-800 mb-1.5">
                  <span>{dependentes.length} dependente(s)</span>
                  <span className="text-slate-400">
                    Dedução: {formatCurrency(dependentes.length * 2275.08)}
                  </span>
                </div>
                <Progress
                  value={depPctAtual}
                  className="h-2.5 bg-slate-100"
                  indicatorClassName="bg-violet-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100/60 text-xs text-violet-900 leading-relaxed">
                Cada dependente cadastrado reduz a Base de Cálculo em <strong>R$ 2.275,08</strong>{' '}
                (economia de até <strong>{formatCurrency(round2(2275.08 * 0.275))}</strong> no
                IRPF).
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LINHA FINAL DE DESTAQUE */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Economia Total Possível
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
              {formatCurrency(simulation?.economiaTotalPossivel ?? 0)}
            </div>
            <p className="text-xs text-emerald-100/90">
              Se todos os limites legais (PGBL 12%, Destinações 6% e Dependentes) forem plenamente
              saturados
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (simulation) {
                  setSliderPgbl(simulation.maxPgblPossivel)
                  setSliderDestinacao(simulation.maxDestinacaoPossivel)
                  setSliderDependentes(dependentes.length)
                }
              }}
              className="bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold gap-1.5 h-10 px-4 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Saturar todos os tetos no Simulador
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG DE SALVAR CENÁRIO */}
      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar Simulação de Cenário</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja salvar este cenário de otimização (PGBL: {formatCurrency(sliderPgbl)},
              Destinações: {formatCurrency(sliderDestinacao)}, Dependentes: {sliderDependentes})
              para consultas futuras?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSalvarCenario}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {saving ? 'Salvando...' : 'Salvar Cenário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE APLICAR CENÁRIO À DECLARAÇÃO */}
      <AlertDialog open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Parâmetros à Declaração</AlertDialogTitle>
            <AlertDialogDescription>
              As deduções simuladas serão inseridas como lançamentos na declaração e ela será
              recalculada automaticamente. Deseja prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAplicarCenario}
              disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {applying ? 'Aplicando e recalculando...' : 'Sim, aplicar à declaração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
