import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText,
  TrendingDown,
  TrendingUp,
  CalendarClock,
  Building2,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getAllEmpresas } from '@/services/empresas'
import type { EmpresaRecord } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard, KpiCarousel, type KpiCardProps } from '@/components/dashboard/KpiCard'
import { DeclarationsTable } from '@/components/dashboard/DeclarationsTable'
import { AlertsSidebar } from '@/components/dashboard/AlertsSidebar'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getClientes } from '@/services/clientes'
import { getDeclaracoes, getAllResultados } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import { daysUntilDeadline, getNextDeadlineInfo } from '@/lib/irpf-calc'
import type { ClienteRecord, DeclaracaoRecord, ResultadoRecord } from '@/types'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [resultados, setResultados] = useState<ResultadoRecord[]>([])

  const loadData = async () => {
    try {
      const [cliRes, empRes, decs, res] = await Promise.all([
        getClientes('', 1, 500),
        getAllEmpresas(),
        getDeclaracoes(),
        getAllResultados(),
      ])
      setClientes(cliRes.items)
      setEmpresas(empRes)
      setDeclaracoes(decs)
      setResultados(res)
    } catch {
      toast({
        title: 'Falha ao carregar dashboard',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('declaracoes', () => loadData())
  useRealtime('clientes', () => loadData())
  useRealtime('empresas', () => loadData())

  const resultadosMap = useMemo(
    () => new Map(resultados.map((r) => [r.declaracao_id, r])),
    [resultados],
  )

  const kpis: KpiCardProps[] = useMemo(() => {
    const rascunhoCount = declaracoes.filter((d) => d.status === 'rascunho').length
    const impostoTotal = declaracoes.reduce((sum, d) => {
      const r = resultadosMap.get(d.id)
      return sum + (r && r.saldo_imposto > 0 ? r.saldo_imposto : 0)
    }, 0)

    let economiaTotal = 0
    let economiaPctSum = 0
    let economiaCount = 0
    resultados.forEach((r) => {
      const det = r.detalhamento as any
      if (det?.legal?.irrf_devido != null && det?.simplificada?.irrf_devido != null) {
        const diff = det.simplificada.irrf_devido - det.legal.irrf_devido
        if (diff > 0) {
          economiaTotal += diff
          economiaPctSum +=
            det.simplificada.irrf_devido > 0 ? (diff / det.simplificada.irrf_devido) * 100 : 0
          economiaCount++
        }
      }
    })
    const economiaPct = economiaCount > 0 ? Math.round(economiaPctSum / economiaCount) : 0

    const dlInfo = getNextDeadlineInfo()
    const nearDeadline = declaracoes.filter((d) => {
      const dd = daysUntilDeadline(d.ano_calendario)
      return dd > 0 && dd <= 90
    }).length
    const isUrgent = dlInfo.days < 30

    return [
      {
        title: 'Declarações em rascunho',
        value: rascunhoCount,
        microcopy: 'Declarações em rascunho',
        icon: <FileText className="w-4 h-4" />,
        trend: rascunhoCount > 0 ? `+${Math.min(rascunhoCount, 3)} vs semana` : undefined,
        trendPositive: false,
        sparklineData: [3, 4, 3, 5, 4, 6, rascunhoCount],
        sparkColor: '#64748b',
      },
      {
        title: 'Imposto total a pagar',
        value: formatCurrency(impostoTotal),
        microcopy: 'Imposto total a pagar (carteira)',
        icon: <TrendingDown className="w-4 h-4" />,
        trend: impostoTotal > 0 ? '+8% vs mês' : undefined,
        trendPositive: false,
        sparklineData: [12, 15, 14, 18, 20, 22, Math.max(impostoTotal / 1000, 1)],
        sparkColor: '#ef4444',
      },
      {
        title: 'Economia gerada',
        value: formatCurrency(economiaTotal),
        microcopy: 'Economia gerada aos clientes',
        icon: <TrendingUp className="w-4 h-4" />,
        trend: economiaPct > 0 ? `${economiaPct}% medio` : undefined,
        trendPositive: true,
        sparklineData: [5, 8, 7, 10, 12, 14, Math.max(economiaTotal / 1000, 1)],
        sparkColor: '#10b981',
      },
      {
        title: 'Prazos próximos',
        value: nearDeadline,
        microcopy: isUrgent ? `Faltam ${dlInfo.days} dias` : `Faltam ${dlInfo.days} dias`,
        icon: <CalendarClock className="w-4 h-4" />,
        alert: isUrgent,
        sparklineData: [1, 2, 3, 4, 5, 6, nearDeadline],
        sparkColor: '#f59e0b',
      },
    ]
  }, [declaracoes, resultadosMap, resultados])

  const alertsData = useMemo(() => {
    const dec2024Ids = new Set(
      declaracoes.filter((d) => d.ano_calendario === 2024).map((d) => d.cliente_id),
    )
    const clientesSemDecl = clientes
      .filter((c) => !dec2024Ids.has(c.id) && c.status === 'ativo')
      .map((c) => ({ id: c.id, nome: c.nome }))

    const oportunidades = resultados
      .map((r) => {
        const det = r.detalhamento as any
        if (!det?.legal?.irrf_devido || !det?.simplificada?.irrf_devido) return null
        const diff = det.simplificada.irrf_devido - det.legal.irrf_devido
        if (diff <= 500) return null
        const dec = declaracoes.find((d) => d.id === r.declaracao_id)
        return { clienteNome: dec?.expand?.cliente_id?.nome || 'Cliente', potencial: diff }
      })
      .filter(Boolean) as { clienteNome: string; potencial: number }[]

    const variacoes: {
      clienteNome: string
      prevVal: number
      currentVal: number
      increased: boolean
    }[] = []
    const byCliente = new Map<string, DeclaracaoRecord[]>()
    declaracoes.forEach((d) => {
      const arr = byCliente.get(d.cliente_id) || []
      arr.push(d)
      byCliente.set(d.cliente_id, arr)
    })
    byCliente.forEach((decs, clienteId) => {
      const cur = decs.find((d) => d.ano_calendario === 2024)
      const prev = decs.find((d) => d.ano_calendario === 2023)
      if (!cur || !prev) return
      const curRes = resultadosMap.get(cur.id)
      const prevRes = resultadosMap.get(prev.id)
      if (!curRes || !prevRes) return
      const cv = curRes.saldo_imposto || 0
      const pv = prevRes.saldo_imposto || 0
      if (pv === 0) return
      const diffPct = Math.abs((cv - pv) / pv)
      if (diffPct <= 0.2) return
      const cli = clientes.find((c) => c.id === clienteId)
      variacoes.push({
        clienteNome: cli?.nome || 'Cliente',
        prevVal: pv,
        currentVal: cv,
        increased: cv > pv,
      })
    })

    return { clientesSemDecl, oportunidades, variacoes }
  }, [clientes, declaracoes, resultadosMap])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-slate-200">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="lg:hidden flex gap-3 overflow-hidden">
          <Skeleton className="w-[280px] h-32 shrink-0" />
          <Skeleton className="w-[280px] h-32 shrink-0" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={i} {...kpi} />
        ))}
      </div>
      <div className="lg:hidden">
        <KpiCarousel kpis={kpis} />
      </div>

      {/* Card de Destaque Módulo Pessoa Jurídica (PJ) */}
      <Card className="p-4 sm:p-5 border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Módulo Pessoa Jurídica (PJ & Sócios)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  {empresas.length} empresa(s) cadastrada(s)
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Apure o Simples Nacional e Lucro Presumido e sincronize automaticamente Pró-Labore,
                Lucros Isentos e Dividendos no IRPF dos Sócios.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/empresas')}
              className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1.5"
            >
              <span>Ver Empresas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/app/empresas/nova')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Empresa</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <DeclarationsTable
          declaracoes={declaracoes}
          resultadosMap={resultadosMap}
          userId={user?.id}
          clientes={clientes}
          searchQuery={searchQuery}
          onEdit={(id) => navigate(`/app/declaracoes/${id}`)}
          onSimulate={(id) => navigate(`/app/declaracoes/${id}/simulador`)}
        />
        <AlertsSidebar
          clientesSemDecl={alertsData.clientesSemDecl}
          oportunidades={alertsData.oportunidades}
          variacoes={alertsData.variacoes}
          onIniciar={(clienteId) =>
            navigate(`/app/declaracoes/nova?clienteId=${clienteId}&ano=2024`)
          }
        />
      </div>
    </div>
  )
}
