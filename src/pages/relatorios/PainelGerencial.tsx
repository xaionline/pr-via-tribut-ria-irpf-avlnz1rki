import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Activity,
  ShieldCheck,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import {
  buildDocumentoPdfHtml,
  imprimirDocumentoHtml,
  exportarParaCsv,
} from '@/services/relatoriosExport'
import { processarApuracaoEmpresa } from '@/services/apuracaoPj'
import { calcularAlertasGlobaisDasEmpresas } from '@/services/alertasGlobais'
import { getAllObrigacoesEscritorio } from '@/services/obrigacoes'
import type { ClienteRecord, EmpresaRecord, DeclaracaoRecord, ResultadoRecord } from '@/types'

export function PainelGerencial() {
  const { escritorio, podeAcessarPJ } = useAuth()
  const [loading, setLoading] = useState(true)

  // Dados brutos
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [resultados, setResultados] = useState<ResultadoRecord[]>([])

  // Métricas agregadas de empresas
  const [empresasInfo, setEmpresasInfo] = useState<{
    faturamentoTotal: number
    tributosPjTotal: number
    simplesCount: number
    presumidoCount: number
    realCount: number
    subotimasCount: number
    economiaPotencial: number
  }>({
    faturamentoTotal: 0,
    tributosPjTotal: 0,
    simplesCount: 0,
    presumidoCount: 0,
    realCount: 0,
    subotimasCount: 0,
    economiaPotencial: 0,
  })

  // Alertas
  const [alertasAbertosCount, setAlertasAbertosCount] = useState<number>(0)
  const [alertasCriticosCount, setAlertasCriticosCount] = useState<number>(0)

  // Filtro de Ano-Calendário
  const [anoBase, setAnoBase] = useState<number>(new Date().getFullYear())

  const carregarDadosCompletos = async () => {
    setLoading(true)
    try {
      const [cls, decs, res] = await Promise.all([
        pb.collection('clientes').getFullList<ClienteRecord>(),
        pb.collection('declaracoes').getFullList<DeclaracaoRecord>({
          sort: '-ano_calendario',
        }),
        pb.collection('resultados').getFullList<ResultadoRecord>(),
      ])

      setClientes(cls)
      setDeclaracoes(decs)
      setResultados(res)

      // Se tiver acesso a PJ, busca empresas e obrigações
      if (podeAcessarPJ) {
        const emps = await pb.collection('empresas').getFullList<EmpresaRecord>()
        setEmpresas(emps)

        let fatTotal = 0
        let tribPjTotal = 0
        let simples = 0
        let pres = 0
        let real = 0
        let subotimas = 0
        let econPot = 0

        await Promise.all(
          emps.map(async (emp) => {
            if (emp.regime === 'simples') simples++
            else if (emp.regime === 'presumido') pres++
            else real++

            try {
              const apuracao = await processarApuracaoEmpresa(emp, anoBase)
              const rec = apuracao.faturamentos.reduce(
                (sum, f) => sum + (Number(f.receita_bruta) || 0),
                0,
              )
              fatTotal += rec

              const trib =
                emp.regime === 'simples'
                  ? apuracao.apuracaoSimples?.total_das || 0
                  : emp.regime === 'presumido'
                    ? apuracao.apuracaoPresumido?.total_tributos_pj || 0
                    : apuracao.apuracaoReal?.total_tributos_pj || 0
              tribPjTotal += trib

              if (
                apuracao.comparativoRegimes &&
                apuracao.comparativoRegimes.melhorRegime !== emp.regime &&
                apuracao.comparativoRegimes.economiaAnualEstimada > 100
              ) {
                subotimas++
                econPot += apuracao.comparativoRegimes.economiaAnualEstimada
              }
            } catch {
              /* ignora erro de processamento individual */
            }
          }),
        )

        setEmpresasInfo({
          faturamentoTotal: fatTotal,
          tributosPjTotal: tribPjTotal,
          simplesCount: simples,
          presumidoCount: pres,
          realCount: real,
          subotimasCount: subotimas,
          economiaPotencial: econPot,
        })

        // Motor de alertas
        const resAlertas = await calcularAlertasGlobaisDasEmpresas(emps, anoBase)
        const obrs = await getAllObrigacoesEscritorio(anoBase)
        const atrasadas = obrs.filter((o) => o.statusCalculado === 'atrasado').length

        setAlertasAbertosCount(resAlertas.alertas.length + atrasadas)
        setAlertasCriticosCount(resAlertas.totalCriticos + atrasadas)
      } else {
        setEmpresas([])
        setEmpresasInfo({
          faturamentoTotal: 0,
          tributosPjTotal: 0,
          simplesCount: 0,
          presumidoCount: 0,
          realCount: 0,
          subotimasCount: 0,
          economiaPotencial: 0,
        })
        setAlertasAbertosCount(0)
        setAlertasCriticosCount(0)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel gerencial:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosCompletos()
  }, [anoBase, podeAcessarPJ])

  // Processamento das métricas de IRPF (Clientes PF)
  const metricasPf = useMemo(() => {
    const decsAno = declaracoes.filter((d) => d.ano_calendario === anoBase)
    const decsAnoAnterior = declaracoes.filter((d) => d.ano_calendario === anoBase - 1)

    const entreguesAno = decsAno.filter(
      (d) => d.status === 'apresentada' || d.status === 'retificada',
    ).length
    const pendentesAno = decsAno.filter(
      (d) => d.status === 'calculada' || d.status === 'revisada' || d.status === 'rascunho',
    ).length
    const taxaEmDia = clientes.length > 0 ? (entreguesAno / clientes.length) * 100 : 0

    // Soma de impostos apurados
    const resMap = new Map<string, ResultadoRecord>()
    for (const r of resultados) {
      if (r.declaracao_id) resMap.set(r.declaracao_id, r)
    }

    let impostoPagarAno = 0
    let impostoRestituirAno = 0
    for (const d of decsAno) {
      const res = resMap.get(d.id)
      if (res) {
        const saldo = Number(res.saldo_imposto) || 0
        if (saldo > 0) {
          impostoPagarAno += saldo
        } else if (saldo < 0) {
          impostoRestituirAno += Math.abs(saldo)
        } else {
          impostoPagarAno += Number(res.irrf_devido) || 0
        }
      }
    }

    let impostoPagarAnoAnt = 0
    let impostoRestituirAnoAnt = 0
    for (const d of decsAnoAnterior) {
      const res = resMap.get(d.id)
      if (res) {
        const saldo = Number(res.saldo_imposto) || 0
        if (saldo > 0) {
          impostoPagarAnoAnt += saldo
        } else if (saldo < 0) {
          impostoRestituirAnoAnt += Math.abs(saldo)
        } else {
          impostoPagarAnoAnt += Number(res.irrf_devido) || 0
        }
      }
    }

    return {
      totalClientes: clientes.length,
      declaracoesAno: decsAno.length,
      entreguesAno,
      pendentesAno,
      taxaEmDia,
      impostoPagarAno,
      impostoRestituirAno,
      impostoPagarAnoAnt,
      impostoRestituirAnoAnt,
      totalGerenciadoPf: impostoPagarAno + impostoRestituirAno,
      totalGerenciadoPfAnoAnt: impostoPagarAnoAnt + impostoRestituirAnoAnt,
    }
  }, [clientes, declaracoes, resultados, anoBase])

  // Imposto Total Gerenciado pelo Escritório (PF + PJ)
  const impostoTotalGerenciado = metricasPf.totalGerenciadoPf + empresasInfo.tributosPjTotal

  // Composição da Carteira
  const totalCarteira = metricasPf.totalClientes + empresas.length
  const pctPf =
    totalCarteira > 0 ? ((metricasPf.totalClientes / totalCarteira) * 100).toFixed(0) : '0'
  const pctPj = totalCarteira > 0 ? ((empresas.length / totalCarteira) * 100).toFixed(0) : '0'

  // Variação em relação ao período anterior (PF)
  const variacaoPf =
    metricasPf.totalGerenciadoPfAnoAnt > 0
      ? ((metricasPf.totalGerenciadoPf - metricasPf.totalGerenciadoPfAnoAnt) /
          metricasPf.totalGerenciadoPfAnoAnt) *
        100
      : 0

  // Exportação PDF
  const handleExportarPdf = () => {
    const kpis = [
      {
        label: 'Clientes PF',
        valor: String(metricasPf.totalClientes),
        sub: `${metricasPf.entreguesAno} entregues no ano`,
      },
      {
        label: 'Empresas PJ',
        valor: podeAcessarPJ ? String(empresas.length) : 'Bloqueado (Starter)',
        sub: podeAcessarPJ ? `${empresasInfo.subotimasCount} em regime subótimo` : '',
      },
      {
        label: 'Imposto Total Gerenciado',
        valor: formatCurrency(impostoTotalGerenciado),
        sub: 'Soma IRPF + Tributos PJ',
      },
      {
        label: 'Taxa em Dia (IRPF)',
        valor: `${metricasPf.taxaEmDia.toFixed(1)}%`,
        sub: `${metricasPf.pendentesAno} declarações pendentes`,
      },
      {
        label: 'Alertas Abertos',
        valor: String(alertasAbertosCount),
        sub: `${alertasCriticosCount} urgências críticas`,
      },
    ]

    const colunas = [
      { titulo: 'Indicador / Métrica Gerencial', width: '38%' },
      { titulo: 'Período Atual (Ano ' + anoBase + ')', align: 'right' as const, width: '31%' },
      { titulo: 'Período Anterior', align: 'right' as const, width: '31%' },
    ]

    const linhas = [
      ['Carteira de Clientes Pessoa Física (PF)', `${metricasPf.totalClientes} clientes`, '—'],
      [
        'Declarações IRPF Transmitidas',
        `${metricasPf.entreguesAno} declarações`,
        `${declaracoes.filter((d) => d.ano_calendario === anoBase - 1 && (d.status === 'apresentada' || d.status === 'retificada')).length} declarações`,
      ],
      [
        'Imposto IRPF Apurado (a Pagar)',
        formatCurrency(metricasPf.impostoPagarAno),
        formatCurrency(metricasPf.impostoPagarAnoAnt),
      ],
      [
        'Restituição IRPF Conquistada',
        formatCurrency(metricasPf.impostoRestituirAno),
        formatCurrency(metricasPf.impostoRestituirAnoAnt),
      ],
      [
        'Empresas Pessoa Jurídica (PJ)',
        podeAcessarPJ ? `${empresas.length} empresas` : 'Exclusivo Plano Pro',
        '—',
      ],
      [
        'Faturamento Gerenciado PJ',
        podeAcessarPJ ? formatCurrency(empresasInfo.faturamentoTotal) : 'Exclusivo Plano Pro',
        '—',
      ],
      [
        'Tributos PJ Apurados',
        podeAcessarPJ ? formatCurrency(empresasInfo.tributosPjTotal) : 'Exclusivo Plano Pro',
        '—',
      ],
      [
        'Economia Potencial em Regimes PJ',
        podeAcessarPJ ? formatCurrency(empresasInfo.economiaPotencial) : 'Exclusivo Plano Pro',
        '—',
      ],
    ]

    const html = buildDocumentoPdfHtml({
      titulo: 'Painel Gerencial do Escritório Contábil',
      subtitulo: 'Visão Executiva da Carteira, Volume Financeiro Gerenciado e Saúde Operacional',
      tipoRelatorio: 'Painel Gerencial',
      periodo: `Ano-Calendário ${anoBase}`,
      escritorio,
      kpis,
      colunas,
      linhas,
      observacoes: [
        'Métricas calculadas dinamicamente com base nas declarações IRPF e apurações das empresas cadastradas no escritório.',
        'Imposto gerenciado reflete a soma de imposto devido apurado dos clientes PF somado à arrecadação tributária apurada da carteira PJ.',
      ],
    })

    imprimirDocumentoHtml(html)
  }

  // Exportação CSV
  const handleExportarCsv = () => {
    const colunasCsv = ['Métrica', 'Valor Atual', 'Observação']
    const linhasCsv = [
      ['Total Clientes PF', metricasPf.totalClientes, 'Base cadastrada'],
      ['Declarações Entregues (Ano ' + anoBase + ')', metricasPf.entreguesAno, 'Status entregue'],
      ['Declarações Pendentes', metricasPf.pendentesAno, 'Em revisão ou rascunho'],
      ['Imposto IRPF a Pagar (R$)', metricasPf.impostoPagarAno.toFixed(2), ''],
      ['Restituição IRPF a Receber (R$)', metricasPf.impostoRestituirAno.toFixed(2), ''],
      ['Empresas PJ Cadastradas', empresas.length, ''],
      ['Faturamento Anual Gerenciado PJ (R$)', empresasInfo.faturamentoTotal.toFixed(2), ''],
      ['Tributos PJ Apurados (R$)', empresasInfo.tributosPjTotal.toFixed(2), ''],
      ['Empresas em Regime Subótimo', empresasInfo.subotimasCount, 'Oportunidade de migração'],
      ['Economia Anual Potencial PJ (R$)', empresasInfo.economiaPotencial.toFixed(2), ''],
      ['Alertas Operacionais Abertos', alertasAbertosCount, 'Total geral'],
      ['Alertas Críticos', alertasCriticosCount, 'Ação imediata'],
    ]

    exportarParaCsv(
      `Painel_Gerencial_Escritorio_${anoBase}_${new Date().toISOString().slice(0, 10)}`,
      colunasCsv,
      linhasCsv,
    )
  }

  return (
    <div className="space-y-6">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Painel Gerencial do Escritório
              </h1>
              <p className="text-xs text-slate-500">
                Visão de negócio para o proprietário: composição da carteira, imposto total
                gerenciado e saúde operacional.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-36">
            <Select value={String(anoBase)} onValueChange={(val) => setAnoBase(Number(val))}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <SelectValue placeholder="Ano Base" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024, 2023].map((ano) => (
                  <SelectItem key={ano} value={String(ano)}>
                    Ano {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarDadosCompletos}
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
            className="h-9 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportarPdf}
            className="h-9 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </Button>
        </div>
      </div>

      {/* Grid de 4 KPIs Gerenciais Mestres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Imposto Total Gerenciado */}
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-900 to-slate-950 text-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Imposto Gerenciado
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                PF + PJ
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono mt-2 tracking-tight">
              {formatCurrency(impostoTotalGerenciado)}
            </p>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>PF: {formatCurrency(metricasPf.totalGerenciadoPf)}</span>
              {podeAcessarPJ && <span>• PJ: {formatCurrency(empresasInfo.tributosPjTotal)}</span>}
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Tamanho da Carteira */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Tamanho da Carteira
              </span>
              <span className="text-xs font-bold text-slate-700">{totalCarteira} entidades</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-2">
              {metricasPf.totalClientes}{' '}
              <span className="text-sm font-normal text-slate-500">PF</span>
              {podeAcessarPJ && (
                <>
                  {' '}
                  • {empresas.length} <span className="text-sm font-normal text-slate-500">PJ</span>
                </>
              )}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Mix: {pctPf}% PF {podeAcessarPJ ? `• ${pctPj}% PJ` : ''}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Saúde Operacional IRPF */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Saúde Operacional IRPF
              </span>
              <Badge
                className={
                  metricasPf.taxaEmDia >= 70
                    ? 'bg-emerald-100 text-emerald-800 border-0'
                    : 'bg-amber-100 text-amber-800 border-0'
                }
              >
                {metricasPf.taxaEmDia.toFixed(0)}% em dia
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 mt-2">
              {metricasPf.entreguesAno}{' '}
              <span className="text-sm font-normal text-slate-500">entregues</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {metricasPf.pendentesAno} declarações ainda pendentes no ano {anoBase}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Alertas em Aberto */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Alertas do Escritório
              </span>
              {alertasCriticosCount > 0 ? (
                <Badge className="bg-red-600 text-white border-0 animate-pulse text-[10px]">
                  {alertasCriticosCount} Críticos
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                  Sem Críticos
                </Badge>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-rose-600 mt-2">
              {alertasAbertosCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Obrigações, Fator R e assinaturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção 1: Composição da Carteira e Distribuição por Regime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Composição e Distribuição dos Regimes PJ */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Distribuição da Carteira por Regime
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {podeAcessarPJ ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase">Simples</p>
                    <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
                      {empresasInfo.simplesCount}
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      {empresas.length > 0
                        ? `${((empresasInfo.simplesCount / empresas.length) * 100).toFixed(0)}% PJ`
                        : '0%'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-[11px] font-bold text-blue-800 uppercase">Presumido</p>
                    <p className="text-2xl font-black text-blue-700 font-mono mt-1">
                      {empresasInfo.presumidoCount}
                    </p>
                    <p className="text-[10px] text-blue-600 mt-0.5">
                      {empresas.length > 0
                        ? `${((empresasInfo.presumidoCount / empresas.length) * 100).toFixed(0)}% PJ`
                        : '0%'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                    <p className="text-[11px] font-bold text-purple-800 uppercase">Lucro Real</p>
                    <p className="text-2xl font-black text-purple-700 font-mono mt-1">
                      {empresasInfo.realCount}
                    </p>
                    <p className="text-[10px] text-purple-600 mt-0.5">
                      {empresas.length > 0
                        ? `${((empresasInfo.realCount / empresas.length) * 100).toFixed(0)}% PJ`
                        : '0%'}
                    </p>
                  </div>
                </div>

                {/* Subótimas e Oportunidades */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Otimização Tributária na Carteira PJ:
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-800 bg-amber-50 text-[11px]"
                    >
                      {empresasInfo.subotimasCount} empresas pagando a mais
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Potencial de economia total estimado em{' '}
                    <strong className="text-emerald-700 font-bold font-mono">
                      {formatCurrency(empresasInfo.economiaPotencial)}/ano
                    </strong>{' '}
                    para os clientes caso migrem para o regime sugerido pelo comparador.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-blue-700 p-0 font-bold hover:underline"
                  >
                    <Link to="/app/relatorios/empresas">
                      Abrir Relatório de Empresas com Regimes Ótimos →
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">
                  Módulo PJ Bloqueado no Plano Starter
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sua assinatura atual contempla apenas Pessoa Física. Faça o upgrade para o Plano
                  Pro para gerenciar a carteira PJ e seus regimes.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  <Link to="/app/planos">Fazer Upgrade para Pro</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Evolução e Comparativo com Período Anterior */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Evolução Tributária vs Ano Anterior
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <p className="text-[11px] font-bold text-slate-500 uppercase">
                  Imposto Devido IRPF ({anoBase})
                </p>
                <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(metricasPf.impostoPagarAno)}
                </p>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Ano ant: {formatCurrency(metricasPf.impostoPagarAnoAnt)}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <p className="text-[11px] font-bold text-slate-500 uppercase">
                  Restituição IRPF ({anoBase})
                </p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  {formatCurrency(metricasPf.impostoRestituirAno)}
                </p>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>Ano ant: {formatCurrency(metricasPf.impostoRestituirAnoAnt)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Crescimento do Volume Gerenciado:
                </span>
                <span
                  className={`text-xs font-bold flex items-center gap-0.5 ${variacaoPf >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}
                >
                  {variacaoPf >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {variacaoPf >= 0 ? `+${variacaoPf.toFixed(1)}%` : `${variacaoPf.toFixed(1)}%`}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                O volume financeiro total declarado e gerenciado na Pessoa Física passou de{' '}
                <strong>{formatCurrency(metricasPf.totalGerenciadoPfAnoAnt)}</strong> para{' '}
                <strong>{formatCurrency(metricasPf.totalGerenciadoPf)}</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos Rápidos para os 3 Relatórios Específicos */}
      <Card className="border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Explore os Relatórios Detalhados</h4>
              <p className="text-xs text-slate-500">
                Acesse a listagem analítica com filtros avançados e exportação de cada módulo.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                <Link to="/app/relatorios/clientes">Relatório de Clientes PF</Link>
              </Button>
              {podeAcessarPJ && (
                <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                  <Link to="/app/relatorios/empresas">Relatório de Empresas PJ</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="text-xs font-semibold">
                <Link to="/app/relatorios/alertas">Relatório de Alertas</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
