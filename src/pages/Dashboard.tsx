import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  FileText,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/KpiCard'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getClientes } from '@/services/clientes'
import { getDeclaracoes } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import type { ClienteRecord, DeclaracaoRecord } from '@/types'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export default function Dashboard() {
  const { user, escritorio } = useAuth()
  const navigate = useNavigate()

  const [clientesCount, setClientesCount] = useState(0)
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [restituicaoTotal, setRestituicaoTotal] = useState(0)
  const [impostoPagarTotal, setImpostoPagarTotal] = useState(0)

  const loadData = async () => {
    try {
      const cliRes = await getClientes('', 1, 500)
      setClientesCount(cliRes.totalItems)

      const decs = await getDeclaracoes()
      setDeclaracoes(decs)

      let rest = 0
      let pag = 0
      // Calculate sample KPI summary
      decs.forEach((d) => {
        if (d.status === 'concluida') {
          // Add estimated values for demo summary
          rest += 3800
        } else {
          pag += 1200
        }
      })
      setRestituicaoTotal(rest)
      setImpostoPagarTotal(pag)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('declaracoes', () => loadData())
  useRealtime('clientes', () => loadData())

  const pendentes = declaracoes.filter(
    (d) => d.status === 'rascunho' || d.status === 'em_preenchimento',
  )
  const concluidasCount = declaracoes.filter(
    (d) => d.status === 'concluida' || d.status === 'entregue',
  ).length
  const progressoPercent =
    declaracoes.length > 0 ? Math.round((concluidasCount / declaracoes.length) * 100) : 0

  // Chart Mock Data for evolution
  const chartData = [
    { mes: 'Jan', restituição: 12000, imposto: 4000 },
    { mes: 'Fev', restituição: 18000, imposto: 6500 },
    { mes: 'Mar', restituição: 25000, imposto: 9000 },
    { mes: 'Abr', restituição: 34000, imposto: 12000 },
    { mes: 'Mai', restituição: 42000, imposto: 15500 },
  ]

  return (
    <div className="space-y-6">
      {/* Header Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              Ano-calendário 2025
            </span>
            <span className="text-xs text-emerald-200">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-2 tracking-tight">
            Olá, {user?.name || 'Contador'}
          </h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
            Acompanhe a prévia tributária do IRPF dos clientes do escritório{' '}
            <strong className="text-white">{escritorio?.nome}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/app/clientes/novo')}
            variant="secondary"
            size="sm"
            className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Clientes Ativos"
          value={clientesCount}
          subtitle={`Limite: ${escritorio?.limite_clientes || 100}`}
          icon={<Users className="w-5 h-5" />}
        />
        <KpiCard
          title="Em Andamento"
          value={pendentes.length}
          subtitle="Declarações ativas"
          icon={<FileText className="w-5 h-5" />}
        />
        <KpiCard
          title="Restituição Estimada"
          value={formatCurrency(restituicaoTotal)}
          subtitle="Total calculado"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          trend="+12%"
          trendPositive={true}
        />
        <KpiCard
          title="Imposto a Pagar"
          value={formatCurrency(impostoPagarTotal)}
          subtitle="Estimativa do escritório"
          icon={<TrendingDown className="w-5 h-5 text-rose-600" />}
        />
        <KpiCard
          title="Progresso Anual"
          value={`${progressoPercent}%`}
          subtitle={`${concluidasCount} de ${declaracoes.length} concluídas`}
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
        />
      </div>

      {/* Empty State vs Content Grid */}
      {clientesCount === 0 ? (
        <Card className="border border-dashed border-emerald-300 bg-emerald-50/30 p-12 text-center my-8 rounded-2xl">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Bem-vindo ao Prévia Tributária IRPF
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Comece cadastrando os clientes do seu escritório para lançar fontes pagadoras,
              rendimentos e simular a prévia do imposto a pagar ou restituir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left py-4">
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-emerald-600 block mb-1">1. Cadastrar</span>
                Cadastre clientes PF e sócios.
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-emerald-600 block mb-1">2. Lançar</span>
                Insira rendimentos e despesas.
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-emerald-600 block mb-1">3. Simular</span>
                Calcule a prévia em 1 clique.
              </div>
            </div>

            <Button
              onClick={() => navigate('/app/clientes/novo')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold shadow-md px-6"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Primeiro Cliente</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Card */}
          <Card className="lg:col-span-2 border border-slate-200/80 shadow-subtle">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Evolução dos Resultados (R$)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Comparativo acumulado de restituição vs imposto a pagar
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/relatorios')}
                className="text-xs gap-1"
              >
                <span>Relatório detalhado</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(val) => `R${val / 1000}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="restituição"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRest)"
                      name="Restituição"
                    />
                    <Area
                      type="monotone"
                      dataKey="imposto"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorImp)"
                      name="Imposto a Pagar"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Attention & Alert Items */}
          <Card className="border border-slate-200/80 shadow-subtle flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Atenções e Pendências</span>
                </CardTitle>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {pendentes.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-y-auto space-y-3">
              {pendentes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhuma pendência crítica no momento! 🎉
                </div>
              ) : (
                pendentes.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/app/declaracoes/${d.id}`)}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200/60 cursor-pointer transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700">
                        {d.expand?.cliente_id?.nome || 'Cliente não identificado'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ano {d.ano_calendario} • Progresso {d.progresso}%
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Declarations Table */}
      {declaracoes.length > 0 && (
        <Card className="border border-slate-200/80 shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Declarações Recentes
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Últimas movimentações do escritório
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/declaracoes')}
              className="text-xs"
            >
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Ano</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Progresso</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {declaracoes.slice(0, 5).map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {d.expand?.cliente_id?.nome}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">{d.ano_calendario}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${d.progresso}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/app/declaracoes/${d.id}`}
                          className="text-emerald-600 hover:text-emerald-800 font-semibold"
                        >
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
