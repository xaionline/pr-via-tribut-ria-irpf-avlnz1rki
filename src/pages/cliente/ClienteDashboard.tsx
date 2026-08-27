import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  FileText,
  FileX,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { SimulationControls } from '@/components/simulador/SimulationControls'
import { ComparativoCard } from '@/components/simulador/ComparativoCard'
import { SensibilidadeChart } from '@/components/simulador/SensibilidadeChart'
import { BreakdownTable } from '@/components/simulador/BreakdownTable'
import { RecomendacaoCard } from '@/components/simulador/RecomendacaoCard'
import { useAuth } from '@/hooks/use-auth'
import { useDebounce } from '@/hooks/use-debounce'
import { useToast } from '@/hooks/use-toast'
import { getClienteDoUsuario } from '@/services/clientes'
import {
  getDeclaracoes,
  getRendimentos,
  getDespesas,
  getDependentes,
  getAtividadesRurais,
  getDestinacoes,
  getResultado,
} from '@/services/declaracoes'
import { getTabelas } from '@/services/tabelas'
import { registrarAuditoria } from '@/services/configuracoes'
import { formatCurrency } from '@/lib/formatters'
import {
  simulate,
  getPgblLimit,
  getDestinacaoLimit,
  computeSensitivityData,
  type SimulationBaseData,
} from '@/lib/irpf-simulation'
import type { ClienteRecord, DeclaracaoRecord, ResultadoRecord, SimulacaoParams } from '@/types'

const DEFAULT_PARAMS: SimulacaoParams = {
  pgbl_adicional: 0,
  destinacao: 0,
  dependentes: 0,
  despesas_medicas: 0,
  pensao_alimenticia: 0,
}

const ANO_CALENDARIO = new Date().getFullYear() - 1

export default function ClienteDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<ClienteRecord | null>(null)
  const [declaracao, setDeclaracao] = useState<DeclaracaoRecord | null>(null)
  const [resultado, setResultado] = useState<ResultadoRecord | null>(null)
  const [baseData, setBaseData] = useState<SimulationBaseData | null>(null)
  const [isCalculated, setIsCalculated] = useState(false)
  const [params, setParams] = useState<SimulacaoParams>(DEFAULT_PARAMS)
  const [showMedicas, setShowMedicas] = useState(false)
  const [showPensao, setShowPensao] = useState(false)

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

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const cli = await getClienteDoUsuario(user.id)
        setCliente(cli)
        const decs = await getDeclaracoes(cli.id, 2026)
        const dec = decs[0] || null
        setDeclaracao(dec)
        if (dec) {
          let res: ResultadoRecord | null = null
          try {
            res = await getResultado(dec.id)
          } catch {
            res = null
          }
          setResultado(res)
          const calcStatuses = ['calculada', 'revisada', 'apresentada', 'retificada']
          setIsCalculated(!!res && calcStatuses.includes(dec.status))
          // Monta base de simulação a partir dos dados da declaração.
          const [rends, desps, deps, rurais, dests, tabs] = await Promise.all([
            getRendimentos(dec.id),
            getDespesas(dec.id),
            getDependentes(dec.id),
            getAtividadesRurais(dec.id),
            getDestinacoes(dec.id),
            getTabelas(),
          ])
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
        }
      } catch {
        setCliente(null)
        setDeclaracao(null)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleExportar = () => {
    if (!declaracao) return
    registrarAuditoria('exportar_demonstrativo', 'declaracoes', declaracao.id, {
      ano_calendario: declaracao.ano_calendario,
    }).catch(() => {})
    toast({ title: 'Relatório exportado com sucesso' })
    setTimeout(() => window.print(), 200)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full max-w-md" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-slate-200">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Empty state: sem declaração no ano atual.
  if (!cliente || !declaracao) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {user?.name || 'cliente'}</h1>
          <p className="text-xs text-slate-500 mt-1">Ano-calendário {ANO_CALENDARIO}</p>
        </div>
        <Card className="p-12 text-center border-dashed border-slate-300">
          <FileX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma declaração encontrada para {ANO_CALENDARIO}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Entre em contato com seu contador para mais informações.
          </p>
        </Card>
      </div>
    )
  }

  const saldo = resultado?.saldo_imposto ?? 0
  const aPagar = saldo > 0
  const clienteNome = declaracao.expand?.cliente_id?.nome || cliente.nome

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {clienteNome}</h1>
          <p className="text-xs text-slate-500 mt-1">Ano-calendário {declaracao.ano_calendario}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={declaracao.status} />
          {declaracao.modalidade && (
            <span className="text-[11px] text-slate-500 capitalize">
              {declaracao.modalidade === 'legal' ? 'Modalidade legal' : 'Modalidade simplificada'}
            </span>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumoCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="IRRF devido"
          value={formatCurrency(resultado?.irrf_devido)}
          tone="slate"
        />
        <ResumoCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="IRRF retido"
          value={formatCurrency(resultado?.irrf_retido)}
          tone="slate"
        />
        <ResumoCard
          icon={<FileText className="w-4 h-4" />}
          label={aPagar ? 'Saldo a pagar' : 'Saldo a restituir'}
          value={formatCurrency(Math.abs(saldo))}
          tone={aPagar ? 'rose' : 'emerald'}
        />
        <ResumoCard
          icon={<Calculator className="w-4 h-4" />}
          label="Base de cálculo"
          value={formatCurrency(resultado?.base_calculo)}
          tone="slate"
        />
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => navigate(`/app/cliente/demonstrativo/${declaracao.id}`)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
        >
          <FileText className="w-4 h-4" />
          Ver demonstrativo completo
        </Button>
        <Button variant="outline" onClick={handleExportar} className="text-xs gap-1.5">
          <ArrowRight className="w-4 h-4" />
          Exportar relatório
        </Button>
      </div>

      {/* Simulador */}
      {isCalculated && baseData ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Simulador tributário</h2>
              <p className="text-[11px] text-slate-500">
                Simule cenários de PGBL e modalidades. As alterações não são salvas na declaração.
              </p>
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
                isVisualizador={false}
                cenarios={[]}
                onLoadCenario={() => {}}
                onSave={() => {}}
                onApply={() => {}}
                hideActions
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
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed border-slate-300">
          <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">Simulador indisponível</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            O simulador fica disponível após o cálculo da declaração pelo seu contador.
          </p>
        </Card>
      )}
    </div>
  )
}

type Tone = 'slate' | 'rose' | 'emerald'

function ResumoCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: Tone
}) {
  const toneClasses: Record<Tone, string> = {
    slate: 'text-slate-700',
    rose: 'text-rose-700',
    emerald: 'text-emerald-700',
  }
  const iconClasses: Record<Tone, string> = {
    slate: 'text-slate-400',
    rose: 'text-rose-500',
    emerald: 'text-emerald-600',
  }
  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={iconClasses[tone]}>{icon}</span>
          <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">
            {label}
          </span>
        </div>
        <p className={`text-lg font-bold font-mono ${toneClasses[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
