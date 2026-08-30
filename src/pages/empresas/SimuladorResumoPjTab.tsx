import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  Percent,
  Sliders,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
  Users,
  ShieldCheck,
  PiggyBank,
  ArrowRight,
  Calculator,
  RotateCcw,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatNumber, maskCpf } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  simularCenarioPj,
  getCenariosPj,
  createCenarioPj,
  deleteCenarioPj,
} from '@/services/simulacaoPj'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  EmpresaFaturamentoRecord,
  SimulacaoPjParams,
  SimulacaoPjResultados,
  CenarioSimulacaoPjRecord,
} from '@/types'

interface SimuladorResumoPjTabProps {
  empresa: EmpresaRecord
  socios: EmpresaSocioRecord[]
  faturamentos: EmpresaFaturamentoRecord[]
  ano: number
}

export function SimuladorResumoPjTab({
  empresa,
  socios,
  faturamentos,
  ano,
}: SimuladorResumoPjTabProps) {
  const { toast } = useToast()

  // Estado dos parâmetros interativos
  const [sociosParams, setSociosParams] = useState<
    {
      socio_id: string
      cliente_id: string
      cliente_nome: string
      pro_labore_mensal: number
      percentual_distribuicao_lucros: number
    }[]
  >([])

  const [resultados, setResultados] = useState<SimulacaoPjResultados | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  // Cenários salvos
  const [cenarios, setCenarios] = useState<CenarioSimulacaoPjRecord[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [cenarioNome, setCenarioNome] = useState('')
  const [savingCenario, setSavingCenario] = useState(false)

  // Inicializar parâmetros com base nos sócios cadastrados
  useEffect(() => {
    if (socios && socios.length > 0) {
      const initial = socios.map((s) => ({
        socio_id: s.id,
        cliente_id: s.cliente_id,
        cliente_nome: s.expand?.cliente_id?.nome || 'Sócio',
        pro_labore_mensal: Number(s.pro_labore_mensal) || 0,
        percentual_distribuicao_lucros: 100, // Padrão 100% de distribuição
      }))
      setSociosParams(initial)
    } else {
      setSociosParams([])
    }
  }, [socios])

  // Executar simulação sempre que os sliders mudam
  useEffect(() => {
    let active = true

    async function runSim() {
      if (sociosParams.length === 0 && socios.length > 0) return
      setCalculating(true)
      try {
        const params: SimulacaoPjParams = {
          socios_params: sociosParams,
        }
        const res = await simularCenarioPj(empresa, faturamentos, socios, ano, params)
        if (active) {
          setResultados(res)
        }
      } catch (err) {
        console.error('Erro na simulação PJ:', err)
      } finally {
        if (active) {
          setCalculating(false)
          setLoading(false)
        }
      }
    }

    runSim()
    return () => {
      active = false
    }
  }, [empresa, faturamentos, socios, ano, sociosParams])

  // Carregar lista de cenários salvos
  const carregarCenarios = async () => {
    try {
      const list = await getCenariosPj(empresa.id, ano)
      setCenarios(list)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    carregarCenarios()
  }, [empresa.id, ano])

  // Handlers de sliders
  const handleProLaboreChange = (socioId: string, val: number) => {
    setSociosParams((prev) =>
      prev.map((p) => (p.socio_id === socioId ? { ...p, pro_labore_mensal: val } : p)),
    )
  }

  const handleDistribuicaoChange = (socioId: string, val: number) => {
    setSociosParams((prev) =>
      prev.map((p) => (p.socio_id === socioId ? { ...p, percentual_distribuicao_lucros: val } : p)),
    )
  }

  const handleReset = () => {
    if (socios && socios.length > 0) {
      setSociosParams(
        socios.map((s) => ({
          socio_id: s.id,
          cliente_id: s.cliente_id,
          cliente_nome: s.expand?.cliente_id?.nome || 'Sócio',
          pro_labore_mensal: Number(s.pro_labore_mensal) || 0,
          percentual_distribuicao_lucros: 100,
        })),
      )
    }
  }

  // Otimização Rápida (Smart Auto-Tune)
  // No Simples Anexo V, eleva o pró-labore para atingir Fator R de 28% (migra para Anexo III economizando impostos)
  const handleOtimizacaoFatorR = () => {
    const faturamentoTotal = faturamentos
      .filter((f) => f.ano_calendario === ano)
      .reduce((s, f) => s + (Number(f.receita_bruta) || 0), 0)

    if (faturamentoTotal <= 0 || socios.length === 0) {
      toast({
        title: 'Sem faturamento lançado',
        description: 'Lance os faturamentos da empresa para otimizar.',
        variant: 'destructive',
      })
      return
    }

    // Folha ideal para Fator R = 28% do faturamento anual
    const folhaIdealAnual = faturamentoTotal * 0.285
    const folhaIdealMensal = folhaIdealAnual / 12
    const proLaborePorSocio = Math.round(folhaIdealMensal / socios.length)

    setSociosParams((prev) =>
      prev.map((p) => ({
        ...p,
        pro_labore_mensal: proLaborePorSocio,
        percentual_distribuicao_lucros: 100,
      })),
    )

    toast({
      title: 'Otimização de Fator R aplicada!',
      description: `Pró-labore ajustado para ${formatCurrency(proLaborePorSocio)}/mês por sócio (Fator R ~28.5%).`,
    })
  }

  // Salvar Cenário
  const handleSaveCenario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cenarioNome.trim() || !resultados) return

    setSavingCenario(true)
    try {
      await createCenarioPj({
        empresa_id: empresa.id,
        ano_calendario: ano,
        nome: cenarioNome.trim(),
        params: { socios_params: sociosParams },
        resultados,
      })
      toast({ title: `Cenário "${cenarioNome}" salvo com sucesso!` })
      setCenarioNome('')
      setSaveDialogOpen(false)
      await carregarCenarios()
    } catch (err) {
      toast({
        title: 'Erro ao salvar cenário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingCenario(false)
    }
  }

  // Carregar Cenário
  const handleCarregarCenario = (cenario: CenarioSimulacaoPjRecord) => {
    if (cenario.params?.socios_params) {
      setSociosParams(cenario.params.socios_params)
      toast({ title: `Cenário "${cenario.nome}" carregado nos sliders!` })
    }
  }

  // Excluir Cenário
  const handleDeleteCenario = async (id: string, nome: string) => {
    try {
      await deleteCenarioPj(id)
      toast({ title: `Cenário "${nome}" excluído!` })
      await carregarCenarios()
    } catch (err) {
      toast({
        title: 'Erro ao excluir cenário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  if (socios.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed border-slate-300">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Nenhum sócio vinculado</h3>
        <p className="text-xs text-slate-500 mt-1">
          Cadastre os sócios e percentuais de participação na aba <strong>Sócios e Quotas</strong>{' '}
          para habilitar o simulador interativo.
        </p>
      </Card>
    )
  }

  const faturamentoTotalAnual = faturamentos
    .filter((f) => f.ano_calendario === ano)
    .reduce((s, f) => s + (Number(f.receita_bruta) || 0), 0)

  // Cálculos de Teto
  const tetoProLaboreDedutivel = faturamentoTotalAnual * 0.5 // teto de segurança 50%
  const proLaboreAtualTotalAnual = sociosParams.reduce(
    (s, p) => s + (Number(p.pro_labore_mensal) || 0) * 12,
    0,
  )
  const percTetoProLaboreUsado =
    tetoProLaboreDedutivel > 0
      ? Math.min(100, (proLaboreAtualTotalAnual / tetoProLaboreDedutivel) * 100)
      : 0

  const lucroDistribuivelMax = resultados?.empresa.lucro_distribuivel_total || 0
  const lucrosDistribuidosSimulados =
    resultados?.socios.reduce((s, r) => s + r.lucros_distribuidos, 0) || 0
  const percTetoLucroUsado =
    lucroDistribuivelMax > 0
      ? Math.min(100, (lucrosDistribuidosSimulados / lucroDistribuivelMax) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* 4 CARDS KPI NO TOPO ESPELHANDO O RESUMO DASHBOARD DA PF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Tributos PJ */}
        <Card className="p-4 border-slate-200/80 bg-white shadow-subtle hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total de Tributos PJ
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {formatCurrency(resultados?.empresa.tributos_pj_otimizado || 0)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <span>Original:</span>
            <span className="font-mono line-through">
              {formatCurrency(resultados?.empresa.tributos_pj_atual || 0)}
            </span>
          </div>
        </Card>

        {/* Card 2: Carga Tributária Efetiva */}
        <Card className="p-4 border-slate-200/80 bg-white shadow-subtle hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Carga Efetiva PJ
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-700 mt-2">
            {formatNumber(resultados?.empresa.carga_tributaria_otimizada || 0)}%
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>Carga Global (PJ + Sócios):</span>
            <span className="font-mono font-bold text-slate-700">
              {formatNumber(resultados?.consolidado.carga_global_perc || 0)}%
            </span>
          </div>
        </Card>

        {/* Card 3: Economia Potencial */}
        <Card className="p-4 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 shadow-subtle hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Economia Potencial
            </span>
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 mt-2">
            {formatCurrency(resultados?.empresa.economia_pj || 0)}
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-800 mt-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Redução na apuração anual</span>
          </div>
        </Card>

        {/* Card 4: Tributos Totais do Grupo (PJ + IRPF Sócios) */}
        <Card className="p-4 border-slate-200/80 bg-white shadow-subtle hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tributos Grupo (PJ + Sócios)
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-2">
            {formatCurrency(resultados?.consolidado.total_tributos_grupo || 0)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>Distribuição Total:</span>
            <span className="font-mono font-bold text-emerald-700">
              {formatCurrency(lucrosDistribuidosSimulados)}
            </span>
          </div>
        </Card>
      </div>

      {/* PAINEL DE CONTROLE DE SIMULAÇÃO & SLIDERS INTERATIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA (2/3): SLIDERS E CONTROLES */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    Simulador Interativo: Pró-Labore & Distribuição de Lucros
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Ajuste os valores por sócio para verificar o impacto no Fator R, deduções e
                    IRPF.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOtimizacaoFatorR}
                    className="h-8 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Otimizar Fator R (28%)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8 text-xs text-slate-600 gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resetar
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {sociosParams.map((sp) => {
                const socioOrig = socios.find((s) => s.id === sp.socio_id)
                const cotaMax =
                  (lucroDistribuivelMax * (Number(socioOrig?.percentual_participacao) || 0)) / 100
                const resSocio = resultados?.socios.find((r) => r.socio_id === sp.socio_id)

                return (
                  <div
                    key={sp.socio_id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 space-y-4"
                  >
                    {/* Header do Sócio */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{sp.cliente_nome}</h4>
                        <span className="text-[11px] text-slate-500">
                          Quota:{' '}
                          <strong className="text-slate-700">
                            {formatNumber(socioOrig?.percentual_participacao || 0)}%
                          </strong>{' '}
                          | Cota Máx. de Lucro:{' '}
                          <strong className="text-emerald-700 font-mono">
                            {formatCurrency(cotaMax)}
                          </strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          IRPF Estimado do Sócio
                        </span>
                        <span className="text-sm font-bold font-mono text-purple-700">
                          {formatCurrency(resSocio?.total_irpf_socio || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Slider 1: Pró-Labore Mensal */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>Pró-Labore Mensal</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                Remuneração tributável mensal do sócio administrador. Dedutível na
                                apuração PJ e compõe a folha para o Fator R.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="font-mono font-bold text-sm text-blue-700">
                          {formatCurrency(sp.pro_labore_mensal)}
                          <span className="text-[11px] font-normal text-slate-500">
                            {' '}
                            ({formatCurrency(sp.pro_labore_mensal * 12)}/ano)
                          </span>
                        </span>
                      </div>
                      <Slider
                        value={[sp.pro_labore_mensal]}
                        min={0}
                        max={50000}
                        step={500}
                        onValueChange={([val]) => handleProLaboreChange(sp.socio_id, val)}
                        className="py-1"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>R$ 0,00</span>
                        <span>R$ 25.000,00</span>
                        <span>R$ 50.000,00</span>
                      </div>
                    </div>

                    {/* Slider 2: % de Distribuição de Lucros */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <Label className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>Distribuição da Cota de Lucros (%)</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                Percentual do lucro distribuível atribuído ao sócio que será
                                repassado como rendimento isento no IRPF.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="font-mono font-bold text-sm text-emerald-700">
                          {sp.percentual_distribuicao_lucros}%
                          <span className="text-[11px] font-normal text-slate-500">
                            {' '}
                            ({formatCurrency(resSocio?.lucros_distribuidos || 0)})
                          </span>
                        </span>
                      </div>
                      <Slider
                        value={[sp.percentual_distribuicao_lucros]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={([val]) => handleDistribuicaoChange(sp.socio_id, val)}
                        className="py-1"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0% (Reter na PJ)</span>
                        <span>50%</span>
                        <span>100% (Distribuir total)</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  onClick={() => setSaveDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm h-9"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Cenário
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA (1/3): INDICADORES DE TETO E CENÁRIOS SALVOS */}
        <div className="space-y-6">
          {/* INDICADORES DE TETO E ECONOMIA */}
          <Card className="border border-slate-200/80 shadow-subtle">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Indicadores de Teto e Conformidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Teto de Pró-Labore */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Pró-Labore / Folha Anual:</span>
                  <span className="font-mono text-slate-900">
                    {formatCurrency(proLaboreAtualTotalAnual)}
                  </span>
                </div>
                <Progress value={percTetoProLaboreUsado} className="h-2" />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Utilização de teto prudencial:</span>
                  <span className="font-mono font-bold">
                    {formatNumber(percTetoProLaboreUsado)}%
                  </span>
                </div>
              </div>

              {/* Teto de Distribuição de Lucros */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Lucros Distribuídos / Disponível:</span>
                  <span className="font-mono text-emerald-700">
                    {formatCurrency(lucrosDistribuidosSimulados)}
                  </span>
                </div>
                <Progress value={percTetoLucroUsado} className="h-2" />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Disponível: {formatCurrency(lucroDistribuivelMax)}</span>
                  <span className="font-mono font-bold">{formatNumber(percTetoLucroUsado)}%</span>
                </div>
              </div>

              {/* Barra de Progresso de Economia Potencial */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Economia Anual Alcançada:</span>
                  <span className="font-mono">
                    {formatCurrency(resultados?.empresa.economia_pj || 0)}
                  </span>
                </div>
                <Progress
                  value={
                    resultados && resultados.empresa.tributos_pj_atual > 0
                      ? Math.min(
                          100,
                          (resultados.empresa.economia_pj / resultados.empresa.tributos_pj_atual) *
                            100 *
                            3,
                        )
                      : 0
                  }
                  className="h-2 bg-emerald-200"
                />
                <p className="text-[10px] text-emerald-800 leading-tight">
                  Otimização no Simples e deduções de pró-labore na PJ geram ganho fiscal líquido.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* LISTA DE CENÁRIOS SALVOS */}
          <Card className="border border-slate-200/80 shadow-subtle">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Cenários Salvos ({cenarios.length})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveDialogOpen(true)}
                  className="h-7 text-[11px] text-emerald-700 border-emerald-300 gap-1 px-2"
                >
                  <Plus className="w-3 h-3" /> Salvar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cenarios.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Nenhum cenário salvo ainda. Ajuste os sliders e clique em &quot;Salvar
                  Cenário&quot;.
                </p>
              ) : (
                <div className="space-y-2">
                  {cenarios.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="font-bold text-xs text-slate-900 truncate">{c.nome}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Tributos PJ:{' '}
                          <strong className="text-slate-800">
                            {formatCurrency(c.resultados?.empresa?.tributos_pj_otimizado || 0)}
                          </strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCarregarCenario(c)}
                          className="h-7 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 px-2"
                        >
                          Aplicar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteCenario(c.id, c.nome)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL SALVAR CENÁRIO */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveCenario}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Save className="w-5 h-5 text-emerald-600" />
                Salvar Cenário de Simulação PJ
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Dê um nome a este cenário para recuperar e comparar propostas no futuro.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="cenario-nome" className="text-xs font-semibold text-slate-700">
                  Nome do Cenário *
                </Label>
                <Input
                  id="cenario-nome"
                  type="text"
                  value={cenarioNome}
                  onChange={(e) => setCenarioNome(e.target.value)}
                  placeholder="Ex: Pró-labore Otimizado Fator R 2025"
                  className="h-10 text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={savingCenario}
              >
                {savingCenario && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                Salvar Cenário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
