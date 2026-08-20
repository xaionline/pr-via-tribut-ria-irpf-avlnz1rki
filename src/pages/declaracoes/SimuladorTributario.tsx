import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { SimulationControls } from '@/components/simulador/SimulationControls'
import { ComparativoCard } from '@/components/simulador/ComparativoCard'
import { SensibilidadeChart } from '@/components/simulador/SensibilidadeChart'
import { BreakdownTable } from '@/components/simulador/BreakdownTable'
import { RecomendacaoCard } from '@/components/simulador/RecomendacaoCard'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useDebounce } from '@/hooks/use-debounce'
import { useToast } from '@/hooks/use-toast'
import {
  getDeclaracao,
  getRendimentos,
  getDespesas,
  getDependentes,
  getAtividadesRurais,
  getDestinacoes,
  getResultado,
  calcularDeclaracao,
} from '@/services/declaracoes'
import { getTabelas } from '@/services/tabelas'
import { getCenarios, createCenario, aplicarCenario } from '@/services/simulacao'
import {
  simulate,
  getPgblLimit,
  getDestinacaoLimit,
  computeSensitivityData,
  type SimulationBaseData,
} from '@/lib/irpf-simulation'
import type { DeclaracaoRecord, SimulacaoParams, CenarioSimulacaoRecord } from '@/types'

const DEFAULT_PARAMS: SimulacaoParams = {
  pgbl_adicional: 0,
  destinacao: 0,
  dependentes: 0,
  despesas_medicas: 0,
  pensao_alimenticia: 0,
}

export default function SimuladorTributario() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isVisualizador } = useAuth()

  const [loading, setLoading] = useState(true)
  const [declaracao, setDeclaracao] = useState<DeclaracaoRecord | null>(null)
  const [baseData, setBaseData] = useState<SimulationBaseData | null>(null)
  const [isCalculated, setIsCalculated] = useState(false)
  const [cenarios, setCenarios] = useState<CenarioSimulacaoRecord[]>([])
  const [params, setParams] = useState<SimulacaoParams>(DEFAULT_PARAMS)
  const [showMedicas, setShowMedicas] = useState(false)
  const [showPensao, setShowPensao] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applying, setApplying] = useState(false)

  const debouncedParams = useDebounce(params, 300)

  const pgblLimit = useMemo(
    () => (baseData ? getPgblLimit(baseData.rendTributavel, baseData.previdenciaAtual) : 0),
    [baseData],
  )
  const destinacaoLimit = useMemo(
    () => (baseData ? getDestinacaoLimit(baseData.irrfDevidoAtual) : 0),
    [baseData],
  )

  const simResult = useMemo(
    () => (baseData ? simulate(baseData, debouncedParams) : null),
    [baseData, debouncedParams],
  )

  const sensitivityData = useMemo(
    () => (baseData ? computeSensitivityData(baseData, debouncedParams, pgblLimit) : []),
    [baseData, debouncedParams, pgblLimit],
  )

  const loadData = async () => {
    if (!id) return
    try {
      const [dec, rends, desps, deps, rurais, dests, tabs, cens] = await Promise.all([
        getDeclaracao(id),
        getRendimentos(id),
        getDespesas(id),
        getDependentes(id),
        getAtividadesRurais(id),
        getDestinacoes(id),
        getTabelas(),
        getCenarios(id),
      ])
      let res = null
      try {
        res = await getResultado(id)
      } catch {
        res = null
      }

      setDeclaracao(dec)
      setCenarios(cens)
      setIsCalculated(
        !!res && ['calculada', 'revisada', 'apresentada', 'retificada'].includes(dec.status),
      )

      const rendTributavelSemRural = rends
        .filter((r) => r.tipo === 'tributavel')
        .reduce((s, r) => s + r.valor, 0)
      const ruralTributavel = rurais.reduce(
        (s, a) => s + (a.receita_bruta > 0 ? a.receita_bruta * 0.2 : 0),
        0,
      )
      const rendTributavel =
        res?.detalhamento?.rendimento_tributavel ?? rendTributavelSemRural + ruralTributavel
      const deducoesAtuais = desps.reduce((s, d) => s + d.valor, 0)
      const previdenciaAtual = desps
        .filter((d) => d.categoria === 'previdencia')
        .reduce((s, d) => s + d.valor, 0)
      const destinacoesAtuais = dests.reduce((s, d) => s + d.valor, 0)
      const tabela = tabs.find((t) => (t.ano_calendario || t.ano) === dec.ano_calendario)
      setBaseData({
        rendTributavel,
        deducoesAtuais,
        previdenciaAtual,
        destinacoesAtuais,
        irrfDevidoAtual: res?.irrf_devido || 0,
        irrfRetidoAtual: res?.irrf_retido || 0,
        faixas: tabela?.faixas || [],
      })
    } catch {
      toast({
        title: 'Falha ao carregar dados',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('declaracoes', () => loadData())
  useRealtime('cenarios_simulacao', () => {
    if (id)
      getCenarios(id)
        .then(setCenarios)
        .catch(() => {})
  })

  const handleSave = async () => {
    if (!id || !simResult) return
    try {
      await createCenario({
        declaracao_id: id,
        nome: `Cenário ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        params,
        resultados: simResult,
      })
      toast({ title: 'Cenário salvo' })
      setSaveOpen(false)
      getCenarios(id).then(setCenarios)
    } catch {
      toast({
        title: 'Falha ao salvar cenário',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    }
  }

  const handleApply = async () => {
    if (!id) return
    setApplying(true)
    try {
      await aplicarCenario(id, params)
      await calcularDeclaracao(id)
      toast({ title: 'Cenário aplicado', description: 'Declaração recalculada' })
      setApplyOpen(false)
      loadData()
    } catch {
      toast({
        title: 'Falha ao aplicar cenário',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  const loadCenario = (c: CenarioSimulacaoRecord) => {
    setParams(c.params)
    setShowMedicas(c.params.despesas_medicas > 0)
    setShowPensao(c.params.pensao_alimenticia > 0)
    toast({ title: `Cenário "${c.nome}" carregado` })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <div className="md:col-span-3 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    )
  }

  if (!declaracao || !isCalculated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Calculator className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Declaração ainda não calculada</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Calcule a declaração primeiro para acessar o simulador tributário.
        </p>
        <Button
          onClick={() => navigate(`/app/declaracoes/${id}`)}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
        >
          <Calculator className="w-4 h-4" />
          Calcule a declaração primeiro
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/app/declaracoes/${id}`)}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Simulador Tributário — {declaracao.expand?.cliente_id?.nome} — Ano{' '}
            {declaracao.ano_calendario}
          </h1>
          <p className="text-xs text-slate-500">Otimize o IRPF com simulações em tempo real</p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-2">
          <SimulationControls
            params={params}
            onParamsChange={setParams}
            pgblLimit={pgblLimit}
            destinacaoLimit={destinacaoLimit}
            showMedicas={showMedicas}
            showPensao={showPensao}
            onShowMedicasChange={(v) => {
              setShowMedicas(v)
              if (!v) setParams({ ...params, despesas_medicas: 0 })
            }}
            onShowPensaoChange={(v) => {
              setShowPensao(v)
              if (!v) setParams({ ...params, pensao_alimenticia: 0 })
            }}
            isVisualizador={isVisualizador}
            cenarios={cenarios}
            onLoadCenario={loadCenario}
            onSave={() => setSaveOpen(true)}
            onApply={() => setApplyOpen(true)}
          />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <ComparativoCard result={simResult} />
          <SensibilidadeChart
            data={sensitivityData}
            currentPgbl={debouncedParams.pgbl_adicional}
            currentEconomia={simResult?.economia || 0}
          />
          <BreakdownTable result={simResult} />
          <RecomendacaoCard result={simResult} />
        </div>
      </div>

      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar cenário</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja salvar este cenário de simulação para uso futuro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={applyOpen} onOpenChange={setApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar à declaração</AlertDialogTitle>
            <AlertDialogDescription>
              Os parâmetros otimizados serão adicionados à declaração (PGBL, destinações,
              dependentes, despesas médicas e pensão) e a declaração será recalculada. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} disabled={applying}>
              {applying ? 'Aplicando...' : 'Aplicar à declaração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
