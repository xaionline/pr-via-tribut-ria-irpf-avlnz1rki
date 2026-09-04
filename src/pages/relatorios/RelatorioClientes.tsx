import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  FileEdit,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, maskCpf, formatDate } from '@/lib/formatters'
import {
  buildDocumentoPdfHtml,
  imprimirDocumentoHtml,
  exportarParaCsv,
} from '@/services/relatoriosExport'
import type { ClienteRecord, DeclaracaoRecord, ResultadoRecord } from '@/types'

export interface ClienteRelatorioItem {
  id: string
  nome: string
  cpf: string
  email?: string
  telefone?: string
  anoCalendario: number
  situacaoIrpf: 'declarado' | 'pendente' | 'rascunho' | 'sem_declaracao'
  regimeTributacao: 'legal' | 'simplificada' | 'indefinido'
  impostoPagar: number
  impostoRestituir: number
  saldoFinal: number // negativo = pagar, positivo = restituir
  declaracaoId?: string
  atualizadoEm?: string
}

export function RelatorioClientes() {
  const { escritorio } = useAuth()
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [resultados, setResultados] = useState<ResultadoRecord[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos')
  const [filtroRegime, setFiltroRegime] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('ano_atual') // 'ano_atual' | 'ano_anterior' | 'todos' | 'mes_atual' | 'trimestre_atual'
  const [anoBase, setAnoBase] = useState<number>(new Date().getFullYear() - 1)

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [cls, decs, res] = await Promise.all([
        pb.collection('clientes').getFullList<ClienteRecord>({ sort: 'nome' }),
        pb.collection('declaracoes').getFullList<DeclaracaoRecord>({
          sort: '-ano_calendario,-updated',
          expand: 'cliente_id',
        }),
        pb.collection('resultados').getFullList<ResultadoRecord>({
          expand: 'declaracao_id',
        }),
      ])
      setClientes(cls)
      setDeclaracoes(decs)
      setResultados(res)
    } catch (err) {
      console.error('Erro ao carregar dados do relatório de clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Mapa rápido de resultados por declaracao_id
  const mapaResultados = useMemo(() => {
    const map = new Map<string, ResultadoRecord>()
    for (const r of resultados) {
      if (r.declaracao_id) {
        map.set(r.declaracao_id, r)
      }
    }
    return map
  }, [resultados])

  // Processa dados dos clientes consolidando com as declarações
  const itensRelatorio = useMemo<ClienteRelatorioItem[]>(() => {
    return clientes.map((cli) => {
      // Busca declaração do cliente de acordo com o ano base ou a mais recente
      let decsCli = declaracoes.filter((d) => d.cliente_id === cli.id)

      if (filtroPeriodo === 'ano_atual') {
        decsCli = decsCli.filter((d) => d.ano_calendario === anoBase)
      } else if (filtroPeriodo === 'ano_anterior') {
        decsCli = decsCli.filter((d) => d.ano_calendario === anoBase - 1)
      }

      const dec = decsCli[0] // declaração mais relevante do período
      const res = dec ? mapaResultados.get(dec.id) : null

      let situacao: ClienteRelatorioItem['situacaoIrpf'] = 'sem_declaracao'
      if (dec) {
        if (dec.status === 'apresentada' || dec.status === 'retificada') {
          situacao = 'declarado'
        } else if (dec.status === 'calculada' || dec.status === 'revisada') {
          situacao = 'pendente'
        } else {
          situacao = 'rascunho'
        }
      }

      let regime: ClienteRelatorioItem['regimeTributacao'] = 'indefinido'
      if (dec?.modalidade === 'legal') regime = 'legal'
      else if (dec?.modalidade === 'simplificada') regime = 'simplificada'

      const saldoImposto = Number(res?.saldo_imposto) || 0
      // saldo_imposto positivo = a pagar, negativo = a restituir
      const impostoPagar = saldoImposto > 0 ? saldoImposto : Number(res?.irrf_devido) || 0
      const impostoRestituir = saldoImposto < 0 ? Math.abs(saldoImposto) : 0
      const saldoFinal = impostoRestituir > 0 ? impostoRestituir : -impostoPagar

      return {
        id: cli.id,
        nome: cli.nome,
        cpf: cli.cpf,
        email: cli.email,
        telefone: cli.telefone,
        anoCalendario: dec?.ano_calendario || anoBase,
        situacaoIrpf: situacao,
        regimeTributacao: regime,
        impostoPagar,
        impostoRestituir,
        saldoFinal,
        declaracaoId: dec?.id,
        atualizadoEm: dec?.updated || cli.updated,
      }
    })
  }, [clientes, declaracoes, mapaResultados, filtroPeriodo, anoBase])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itensRelatorio.filter((item) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const matchNome = item.nome.toLowerCase().includes(termo)
        const matchCpf = item.cpf?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
        const matchEmail = item.email?.toLowerCase().includes(termo)
        if (!matchNome && !matchCpf && !matchEmail) return false
      }

      if (filtroSituacao !== 'todos') {
        if (filtroSituacao === 'declarado' && item.situacaoIrpf !== 'declarado') return false
        if (filtroSituacao === 'pendente' && item.situacaoIrpf !== 'pendente') return false
        if (filtroSituacao === 'rascunho' && item.situacaoIrpf !== 'rascunho') return false
        if (filtroSituacao === 'sem_declaracao' && item.situacaoIrpf !== 'sem_declaracao')
          return false
      }

      if (filtroRegime !== 'todos') {
        if (filtroRegime !== item.regimeTributacao) return false
      }

      return true
    })
  }, [itensRelatorio, busca, filtroSituacao, filtroRegime])

  // KPIs
  const totais = useMemo(() => {
    const totalClientes = itensFiltrados.length
    const declarados = itensFiltrados.filter((i) => i.situacaoIrpf === 'declarado').length
    const pendentes = itensFiltrados.filter(
      (i) => i.situacaoIrpf === 'pendente' || i.situacaoIrpf === 'rascunho',
    ).length
    const totalPagar = itensFiltrados.reduce((sum, i) => sum + i.impostoPagar, 0)
    const totalRestituir = itensFiltrados.reduce((sum, i) => sum + i.impostoRestituir, 0)
    const saldoLiquido = totalRestituir - totalPagar

    return {
      totalClientes,
      declarados,
      pendentes,
      totalPagar,
      totalRestituir,
      saldoLiquido,
    }
  }, [itensFiltrados])

  // Rótulo legível do período selecionado
  const rotuloPeriodo = useMemo(() => {
    if (filtroPeriodo === 'ano_atual') return `Ano-Calendário ${anoBase}`
    if (filtroPeriodo === 'ano_anterior') return `Ano-Calendário ${anoBase - 1}`
    if (filtroPeriodo === 'mes_atual')
      return `Mês Vigente (${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`
    if (filtroPeriodo === 'trimestre_atual') return `Trimestre Vigente (${anoBase})`
    return 'Todos os Períodos'
  }, [filtroPeriodo, anoBase])

  // Exportação PDF
  const handleExportarPdf = () => {
    const colunas = [
      { titulo: 'Nome do Cliente PF', width: '28%' },
      { titulo: 'CPF', width: '16%' },
      { titulo: 'Situação IRPF', width: '14%' },
      { titulo: 'Regime Adotado', width: '14%' },
      { titulo: 'Imposto a Pagar', align: 'right' as const, width: '14%' },
      { titulo: 'A Restituir', align: 'right' as const, width: '14%' },
    ]

    const linhas = itensFiltrados.map((item) => [
      item.nome,
      maskCpf(item.cpf),
      item.situacaoIrpf === 'declarado'
        ? 'Transmitida / Ok'
        : item.situacaoIrpf === 'pendente'
          ? 'Em Revisão / Pendente'
          : item.situacaoIrpf === 'rascunho'
            ? 'Em Rascunho'
            : 'Sem Declaração',
      item.regimeTributacao === 'legal'
        ? 'Deduções Legais'
        : item.regimeTributacao === 'simplificada'
          ? 'Desconto Simplificado'
          : 'Não Definido',
      formatCurrency(item.impostoPagar),
      formatCurrency(item.impostoRestituir),
    ])

    const totaisLinha = [
      `Total: ${totais.totalClientes} clientes`,
      '',
      `${totais.declarados} transmitidas`,
      '',
      formatCurrency(totais.totalPagar),
      formatCurrency(totais.totalRestituir),
    ]

    const html = buildDocumentoPdfHtml({
      titulo: 'Relatório Analítico de Clientes PF',
      subtitulo: 'Carteira de Pessoa Física • Situação da Declaração IRPF e Impostos Apurados',
      tipoRelatorio: 'Relatório de Clientes',
      periodo: rotuloPeriodo,
      escritorio,
      kpis: [
        { label: 'Total Clientes', valor: String(totais.totalClientes) },
        { label: 'Declarados', valor: String(totais.declarados), sub: 'Entregues' },
        { label: 'Pendentes/Rascunho', valor: String(totais.pendentes) },
        { label: 'Total a Pagar', valor: formatCurrency(totais.totalPagar) },
        { label: 'Total a Restituir', valor: formatCurrency(totais.totalRestituir) },
      ],
      colunas,
      linhas,
      totais: totaisLinha,
      observacoes: [
        'Valores baseados nas apurações salvas e calculadas no sistema para o ano-calendário correspondente.',
        'Clientes com situação "Sem Declaração" ainda não possuem declaração iniciada para o período de apuração.',
      ],
    })

    imprimirDocumentoHtml(html)
  }

  // Exportação CSV
  const handleExportarCsv = () => {
    const colunasCsv = [
      'Nome do Cliente',
      'CPF',
      'E-mail',
      'Telefone',
      'Ano Calendário',
      'Situação IRPF',
      'Regime de Tributação',
      'Imposto a Pagar (R$)',
      'Imposto a Restituir (R$)',
      'Saldo Líquido (R$)',
      'Atualizado Em',
    ]

    const linhasCsv = itensFiltrados.map((item) => [
      item.nome,
      maskCpf(item.cpf),
      item.email || '',
      item.telefone || '',
      item.anoCalendario,
      item.situacaoIrpf,
      item.regimeTributacao,
      item.impostoPagar.toFixed(2).replace('.', ','),
      item.impostoRestituir.toFixed(2).replace('.', ','),
      item.saldoFinal.toFixed(2).replace('.', ','),
      formatDate(item.atualizadoEm),
    ])

    exportarParaCsv(
      `Relatorio_Clientes_PF_${filtroPeriodo}_${new Date().toISOString().slice(0, 10)}`,
      colunasCsv,
      linhasCsv,
    )
  }

  const renderBadgeSituacao = (situacao: ClienteRelatorioItem['situacaoIrpf']) => {
    switch (situacao) {
      case 'declarado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 gap-1 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Declarado
          </Badge>
        )
      case 'pendente':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300 gap-1 text-[11px] font-semibold">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </Badge>
        )
      case 'rascunho':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300 gap-1 text-[11px] font-semibold">
            <FileEdit className="w-3 h-3 text-blue-600" />
            Rascunho
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-500 border-slate-300 text-[11px]">
            Sem declaração
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Relatório de Clientes PF
              </h1>
              <p className="text-xs text-slate-500">
                Acompanhamento completo de CPF, situação do IRPF, regime de tributação e saldo de
                imposto.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
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
            className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
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
              Total de Clientes
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {totais.totalClientes}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Filtrados na visualização</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Declarados / Entregues
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {totais.declarados}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totais.totalClientes > 0
                ? `${((totais.declarados / totais.totalClientes) * 100).toFixed(0)}% da carteira`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Total Imposto a Pagar
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1 font-mono">
              {formatCurrency(totais.totalPagar)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Soma a recolher</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Total a Restituir
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1 font-mono">
              {formatCurrency(totais.totalRestituir)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Valor devolvido aos clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, CPF ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* Filtro Período */}
            <div>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Período" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ano_atual">Ano-Calendário {anoBase}</SelectItem>
                  <SelectItem value="ano_anterior">Ano-Calendário {anoBase - 1}</SelectItem>
                  <SelectItem value="mes_atual">Mês Vigente</SelectItem>
                  <SelectItem value="trimestre_atual">Trimestre Vigente</SelectItem>
                  <SelectItem value="todos">Todos os Períodos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Situação IRPF */}
            <div>
              <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Situação IRPF" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Situações</SelectItem>
                  <SelectItem value="declarado">Declarado / Entregue</SelectItem>
                  <SelectItem value="pendente">Pendente / Em Revisão</SelectItem>
                  <SelectItem value="rascunho">Em Rascunho</SelectItem>
                  <SelectItem value="sem_declaracao">Sem Declaração</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Regime */}
            <div>
              <Select value={filtroRegime} onValueChange={setFiltroRegime}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Regime de Tributação" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Regimes</SelectItem>
                  <SelectItem value="legal">Deduções Legais</SelectItem>
                  <SelectItem value="simplificada">Desconto Simplificado</SelectItem>
                  <SelectItem value="indefinido">Ainda não Definido</SelectItem>
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
                <th className="px-4 py-3">Cliente / CPF</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Situação IRPF</th>
                <th className="px-4 py-3">Regime</th>
                <th className="px-4 py-3 text-right">Imposto a Pagar</th>
                <th className="px-4 py-3 text-right">A Restituir</th>
                <th className="px-4 py-3 text-right">Saldo Final</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Carregando dados dos clientes...
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum cliente encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/app/clientes/${item.id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-600 hover:underline flex items-center gap-1.5"
                      >
                        {item.nome}
                      </Link>
                      <div className="text-[11px] font-mono text-slate-500">
                        {maskCpf(item.cpf) || 'Sem CPF'}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600 font-mono">{item.anoCalendario}</td>

                    <td className="px-4 py-3">{renderBadgeSituacao(item.situacaoIrpf)}</td>

                    <td className="px-4 py-3 text-slate-700">
                      {item.regimeTributacao === 'legal' ? (
                        <span className="font-medium text-slate-800">Deduções Legais</span>
                      ) : item.regimeTributacao === 'simplificada' ? (
                        <span className="font-medium text-slate-800">Simplificado</span>
                      ) : (
                        <span className="text-slate-400 italic">Não definido</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-semibold text-rose-600">
                      {item.impostoPagar > 0 ? formatCurrency(item.impostoPagar) : '—'}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      {item.impostoRestituir > 0 ? formatCurrency(item.impostoRestituir) : '—'}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {item.saldoFinal > 0 ? (
                        <span className="text-emerald-700">+{formatCurrency(item.saldoFinal)}</span>
                      ) : item.saldoFinal < 0 ? (
                        <span className="text-rose-700">
                          -{formatCurrency(Math.abs(item.saldoFinal))}
                        </span>
                      ) : (
                        <span className="text-slate-400">R$ 0,00</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {item.declaracaoId ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-700 hover:bg-emerald-50 px-2"
                        >
                          <Link to={`/app/declaracoes/${item.declaracaoId}/resumo`}>
                            <span>Ver Resumo</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-slate-500 hover:bg-slate-100 px-2"
                        >
                          <Link to={`/app/clientes/${item.id}`}>
                            <span>Ver Ficha</span>
                          </Link>
                        </Button>
                      )}
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
