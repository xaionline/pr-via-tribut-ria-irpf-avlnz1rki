import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, maskCnpj } from '@/lib/formatters'
import {
  buildDocumentoPdfHtml,
  imprimirDocumentoHtml,
  exportarParaCsv,
} from '@/services/relatoriosExport'
import { processarApuracaoEmpresa } from '@/services/apuracaoPj'
import type { EmpresaRecord, RegimeTributarioPJ, ComparativoRegimesResultado } from '@/types'

export interface EmpresaRelatorioItem {
  id: string
  razaoSocial: string
  cnpj: string
  atividade?: string
  regimeAtual: RegimeTributarioPJ
  anexoSimples?: string
  faturamentoPeriodo: number
  totalTributosPeriodo: number
  regimeOtimo: RegimeTributarioPJ
  estaSubotimo: boolean
  economiaEstimada: number
  aliquotaEfetivaAtual: number
  aliquotaEfetivaOtima: number
  comparativo?: ComparativoRegimesResultado
}

export function RelatorioEmpresas() {
  const { escritorio } = useAuth()
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [analises, setAnalises] = useState<
    Record<
      string,
      { faturamento: number; tributos: number; comparativo?: ComparativoRegimesResultado }
    >
  >({})

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroRegime, setFiltroRegime] = useState<string>('todos')
  const [filtroSituacaoRegime, setFiltroSituacaoRegime] = useState<string>('todos')
  const [anoBase, setAnoBase] = useState<number>(new Date().getFullYear())

  const carregarEmpresasEAnalises = async () => {
    setLoading(true)
    try {
      const emps = await pb
        .collection('empresas')
        .getFullList<EmpresaRecord>({ sort: 'razao_social' })
      setEmpresas(emps)

      const mapaAnalises: Record<
        string,
        { faturamento: number; tributos: number; comparativo?: ComparativoRegimesResultado }
      > = {}

      await Promise.all(
        emps.map(async (emp) => {
          try {
            const apuracao = await processarApuracaoEmpresa(emp, anoBase)
            const faturamento = apuracao.faturamentos.reduce(
              (acc, f) => acc + (Number(f.receita_bruta) || 0),
              0,
            )
            const tributos =
              emp.regime === 'simples'
                ? apuracao.apuracaoSimples?.total_das || 0
                : emp.regime === 'presumido'
                  ? apuracao.apuracaoPresumido?.total_tributos_pj || 0
                  : apuracao.apuracaoReal?.total_tributos_pj || 0

            mapaAnalises[emp.id] = {
              faturamento,
              tributos,
              comparativo: apuracao.comparativoRegimes,
            }
          } catch {
            mapaAnalises[emp.id] = {
              faturamento: 0,
              tributos: 0,
            }
          }
        }),
      )

      setAnalises(mapaAnalises)
    } catch (err) {
      console.error('Erro ao carregar relatório de empresas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEmpresasEAnalises()
  }, [anoBase])

  const itensRelatorio = useMemo<EmpresaRelatorioItem[]>(() => {
    return empresas.map((emp) => {
      const info = analises[emp.id]
      const faturamento = info?.faturamento || 0
      const tributos = info?.tributos || 0
      const comp = info?.comparativo

      const regimeOtimo = comp?.melhorRegime || emp.regime
      const estaSubotimo = comp
        ? comp.melhorRegime !== emp.regime && comp.economiaAnualEstimada > 100
        : false
      const economiaEstimada = comp?.economiaAnualEstimada || 0

      const aliqAtual = faturamento > 0 ? (tributos / faturamento) * 100 : 0
      const tributosMelhor = comp ? comp.regimes[regimeOtimo]?.totalTributos || tributos : tributos
      const aliqOtima = faturamento > 0 ? (tributosMelhor / faturamento) * 100 : 0

      return {
        id: emp.id,
        razaoSocial: emp.razao_social,
        cnpj: emp.cnpj,
        atividade: emp.atividade,
        regimeAtual: emp.regime,
        anexoSimples: emp.anexo_simples,
        faturamentoPeriodo: faturamento,
        totalTributosPeriodo: tributos,
        regimeOtimo,
        estaSubotimo,
        economiaEstimada,
        aliquotaEfetivaAtual: aliqAtual,
        aliquotaEfetivaOtima: aliqOtima,
        comparativo: comp,
      }
    })
  }, [empresas, analises])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itensRelatorio.filter((item) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const matchNome = item.razaoSocial.toLowerCase().includes(termo)
        const matchCnpj = item.cnpj?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
        const matchAtiv = item.atividade?.toLowerCase().includes(termo)
        if (!matchNome && !matchCnpj && !matchAtiv) return false
      }

      if (filtroRegime !== 'todos') {
        if (item.regimeAtual !== filtroRegime) return false
      }

      if (filtroSituacaoRegime !== 'todos') {
        if (filtroSituacaoRegime === 'subotimo' && !item.estaSubotimo) return false
        if (filtroSituacaoRegime === 'otimo' && item.estaSubotimo) return false
      }

      return true
    })
  }, [itensRelatorio, busca, filtroRegime, filtroSituacaoRegime])

  // KPIs
  const totais = useMemo(() => {
    const totalEmpresas = itensFiltrados.length
    const totalFaturamento = itensFiltrados.reduce((sum, i) => sum + i.faturamentoPeriodo, 0)
    const totalTributos = itensFiltrados.reduce((sum, i) => sum + i.totalTributosPeriodo, 0)
    const empresasSubotimas = itensFiltrados.filter((i) => i.estaSubotimo)
    const potencialEconomia = empresasSubotimas.reduce((sum, i) => sum + i.economiaEstimada, 0)

    return {
      totalEmpresas,
      totalFaturamento,
      totalTributos,
      empresasSubotimasCount: empresasSubotimas.length,
      potencialEconomia,
    }
  }, [itensFiltrados])

  const rotuloPeriodo = `Ano-Calendário ${anoBase}`

  // Exportação PDF
  const handleExportarPdf = () => {
    const colunas = [
      { titulo: 'Razão Social / CNPJ', width: '30%' },
      { titulo: 'Regime Atual', width: '16%' },
      { titulo: 'Faturamento Período', align: 'right' as const, width: '18%' },
      { titulo: 'Regime Sugerido', width: '18%' },
      { titulo: 'Economia Estimada', align: 'right' as const, width: '18%' },
    ]

    const linhas = itensFiltrados.map((item) => {
      const regimeNome =
        item.regimeAtual === 'simples'
          ? `Simples (${item.anexoSimples || 'III'})`
          : item.regimeAtual === 'presumido'
            ? 'Lucro Presumido'
            : 'Lucro Real'

      const regimeSugeridoNome =
        item.regimeOtimo === 'simples'
          ? 'Simples Nacional'
          : item.regimeOtimo === 'presumido'
            ? 'Lucro Presumido'
            : 'Lucro Real'

      return [
        `${item.razaoSocial} (${maskCnpj(item.cnpj)})`,
        regimeNome,
        formatCurrency(item.faturamentoPeriodo),
        item.estaSubotimo ? `${regimeSugeridoNome} (Oportunidade)` : regimeSugeridoNome,
        item.estaSubotimo ? formatCurrency(item.economiaEstimada) : 'R$ 0,00',
      ]
    })

    const totaisLinha = [
      `Total: ${totais.totalEmpresas} empresas`,
      '',
      formatCurrency(totais.totalFaturamento),
      `${totais.empresasSubotimasCount} empresas pagando a mais`,
      formatCurrency(totais.potencialEconomia),
    ]

    const html = buildDocumentoPdfHtml({
      titulo: 'Relatório da Carteira de Empresas PJ',
      subtitulo: 'Regimes Tributários, Faturamento e Oportunidades de Otimização Fiscal',
      tipoRelatorio: 'Relatório de Empresas',
      periodo: rotuloPeriodo,
      escritorio,
      kpis: [
        { label: 'Empresas Cadastradas', valor: String(totais.totalEmpresas) },
        { label: 'Faturamento Total Gerenciado', valor: formatCurrency(totais.totalFaturamento) },
        { label: 'Tributos PJ Apurados', valor: formatCurrency(totais.totalTributos) },
        {
          label: 'Empresas Subótimas',
          valor: `${totais.empresasSubotimasCount}`,
          sub: 'Pagando a mais',
        },
        {
          label: 'Economia Potencial Total',
          valor: formatCurrency(totais.potencialEconomia),
          sub: 'Ao migrar regimes',
        },
      ],
      colunas,
      linhas,
      totais: totaisLinha,
      observacoes: [
        'Análise realizada pelo Comparador Automático de Regimes com base nos faturamentos lançados no período.',
        'A economia estimada considera Simples Nacional vs Lucro Presumido vs Lucro Real.',
      ],
    })

    imprimirDocumentoHtml(html)
  }

  // Exportação CSV
  const handleExportarCsv = () => {
    const colunasCsv = [
      'Razão Social',
      'CNPJ',
      'Atividade',
      'Regime Atual',
      'Anexo Simples',
      'Faturamento Período (R$)',
      'Tributos Apurados (R$)',
      'Alíquota Efetiva Atual (%)',
      'Regime Ótimo Sugerido',
      'Está Subótimo?',
      'Economia Anual Estimada (R$)',
    ]

    const linhasCsv = itensFiltrados.map((item) => [
      item.razaoSocial,
      maskCnpj(item.cnpj),
      item.atividade || '',
      item.regimeAtual,
      item.anexoSimples || '',
      item.faturamentoPeriodo.toFixed(2).replace('.', ','),
      item.totalTributosPeriodo.toFixed(2).replace('.', ','),
      item.aliquotaEfetivaAtual.toFixed(2).replace('.', ','),
      item.regimeOtimo,
      item.estaSubotimo ? 'SIM' : 'NÃO',
      item.economiaEstimada.toFixed(2).replace('.', ','),
    ])

    exportarParaCsv(
      `Relatorio_Empresas_PJ_${anoBase}_${new Date().toISOString().slice(0, 10)}`,
      colunasCsv,
      linhasCsv,
    )
  }

  const renderBadgeRegime = (regime: RegimeTributarioPJ, anexo?: string) => {
    if (regime === 'simples') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] font-semibold"
        >
          Simples {anexo ? `(Anexo ${anexo})` : ''}
        </Badge>
      )
    }
    if (regime === 'presumido') {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-800 border-blue-300 text-[11px] font-semibold"
        >
          Lucro Presumido
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-purple-50 text-purple-800 border-purple-300 text-[11px] font-semibold"
      >
        Lucro Real
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Relatório de Empresas PJ
              </h1>
              <p className="text-xs text-slate-500">
                Carteira corporativa, faturamento do período e diagnóstico de regime tributário
                ótimo.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarEmpresasEAnalises}
            disabled={loading}
            className="h-9 text-xs gap-1.5 text-slate-700 border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportarCsv}
            disabled={itensFiltrados.length === 0}
            className="h-9 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportarPdf}
            disabled={itensFiltrados.length === 0}
            className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </Button>
        </div>
      </div>

      {/* Grid de KPIs do Relatório */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Empresas na Carteira
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {totais.totalEmpresas}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Empresas filtradas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Faturamento Acumulado
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1 font-mono">
              {formatCurrency(totais.totalFaturamento)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ano {anoBase}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Empresas Pagando a Mais
            </p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">
              {totais.empresasSubotimasCount}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totais.totalEmpresas > 0
                ? `${((totais.empresasSubotimasCount / totais.totalEmpresas) * 100).toFixed(0)}% com oportunidade`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Economia Potencial Total
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {formatCurrency(totais.potencialEconomia)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ganho ao trocar de regime</p>
          </CardContent>
        </Card>
      </div>

      {/* Destaque para empresas subótimas se houver */}
      {totais.empresasSubotimasCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {totais.empresasSubotimasCount} empresa(s) pagando mais imposto que o necessário!
              </h4>
              <p className="text-xs text-slate-600">
                O Comparador de Regimes identificou uma economia anual somada de{' '}
                <strong className="text-amber-700 font-bold font-mono">
                  {formatCurrency(totais.potencialEconomia)}
                </strong>{' '}
                caso migrem para o regime ótimo sugerido.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFiltroSituacaoRegime('subotimo')}
            className="border-amber-400 text-amber-800 hover:bg-amber-100 shrink-0 text-xs font-bold"
          >
            Ver Apenas Subótimas
          </Button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por razão social, CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* Filtro Período / Ano */}
            <div>
              <Select value={String(anoBase)} onValueChange={(val) => setAnoBase(Number(val))}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Ano-Calendário" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {[2026, 2025, 2024, 2023].map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>
                      Ano-Calendário {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Regime Atual */}
            <div>
              <Select value={filtroRegime} onValueChange={setFiltroRegime}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Regime Tributário" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Regimes</SelectItem>
                  <SelectItem value="simples">Simples Nacional</SelectItem>
                  <SelectItem value="presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="real">Lucro Real</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Eficiência / Otimização */}
            <div>
              <Select value={filtroSituacaoRegime} onValueChange={setFiltroSituacaoRegime}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Eficiência do Regime" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="subotimo">Pagando a Mais (Subótimo)</SelectItem>
                  <SelectItem value="otimo">Regime Mais Vantajoso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="px-4 py-3">Razão Social / CNPJ</th>
                <th className="px-4 py-3">Regime Atual</th>
                <th className="px-4 py-3 text-right">Faturamento ({anoBase})</th>
                <th className="px-4 py-3 text-right">Tributos Apurados</th>
                <th className="px-4 py-3 text-center">Regime Ótimo Sugerido</th>
                <th className="px-4 py-3 text-right">Economia Anual</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Processando apurações comparativas das empresas...
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma empresa encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/app/empresas/${item.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1.5"
                      >
                        {item.razaoSocial}
                      </Link>
                      <div className="text-[11px] font-mono text-slate-500">
                        {maskCnpj(item.cnpj)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {renderBadgeRegime(item.regimeAtual, item.anexoSimples)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                      {item.faturamentoPeriodo > 0
                        ? formatCurrency(item.faturamentoPeriodo)
                        : 'R$ 0,00'}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      <div>{formatCurrency(item.totalTributosPeriodo)}</div>
                      <div className="text-[10px] text-slate-400">
                        alíq. {item.aliquotaEfetivaAtual.toFixed(2)}%
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {item.estaSubotimo ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Migrar para {item.regimeOtimo.toUpperCase()}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                          <span>{item.regimeAtual.toUpperCase()} (Ótimo)</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono">
                      {item.estaSubotimo ? (
                        <div>
                          <span className="font-extrabold text-emerald-600 text-sm">
                            +{formatCurrency(item.economiaEstimada)}
                          </span>
                          <div className="text-[10px] text-amber-700 font-semibold">
                            pagando a mais
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-700 hover:bg-blue-50 px-2"
                      >
                        <Link to={`/app/empresas/${item.id}/planejador`}>
                          <span>Planejador</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
