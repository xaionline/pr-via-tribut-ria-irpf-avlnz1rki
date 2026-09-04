import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Percent,
  Sparkles,
  CreditCard,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Calendar,
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
import { formatCurrency, maskCnpj, formatDate } from '@/lib/formatters'
import {
  buildDocumentoPdfHtml,
  imprimirDocumentoHtml,
  exportarParaCsv,
} from '@/services/relatoriosExport'
import { calcularAlertasGlobaisDasEmpresas } from '@/services/alertasGlobais'
import { getAllObrigacoesEscritorio } from '@/services/obrigacoes'
import type { EmpresaRecord } from '@/types'

export interface ItemAlertaRelatorio {
  id: string
  origem: 'empresa' | 'assinatura' | 'obrigacao' | 'calculo'
  categoria:
    | 'fator_r'
    | 'pro_labore'
    | 'altas_rendas'
    | 'anexo_simples'
    | 'obrigacao'
    | 'mensalidade'
    | 'inconsistencia'
    | 'outro'
  entidadeNome: string
  documento?: string
  titulo: string
  descricao: string
  severidade: 'critico' | 'atencao' | 'informativo'
  dataVencimento?: string
  prazoTexto: string
  impacto?: string
  acaoSugerida: string
  linkAcao?: string
}

export function RelatorioAlertas() {
  const { escritorio, podeAcessarPJ } = useAuth()
  const [loading, setLoading] = useState(true)
  const [alertas, setAlertas] = useState<ItemAlertaRelatorio[]>([])

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos') // 'todos' | 'vencidos' | 'proximos_7_dias' | 'proximos_30_dias'
  const [anoBase, setAnoBase] = useState<number>(new Date().getFullYear())

  const carregarAlertas = async () => {
    setLoading(true)
    const listaConsolidada: ItemAlertaRelatorio[] = []

    try {
      // 1. Alertas de Mensalidade / Assinatura do Escritório (sempre acessível, mesmo no Starter)
      if (escritorio) {
        const agora = Date.now()
        const status = escritorio.assinatura_status || 'trial'

        if (status === 'atrasado' && escritorio.data_bloqueio) {
          listaConsolidada.push({
            id: `assinatura_atrasada_${escritorio.id}`,
            origem: 'assinatura',
            categoria: 'mensalidade',
            entidadeNome: escritorio.nome,
            documento: escritorio.cnpj,
            titulo: 'Mensalidade VENCIDA — Risco Iminente de Bloqueio',
            descricao:
              'A cobrança da assinatura falhou. O sistema entrará em bloqueio de segurança em breve se não houver regularização.',
            severidade: 'critico',
            dataVencimento: escritorio.data_bloqueio,
            prazoTexto: 'Bloqueio Iminente',
            impacto: 'Suspensão do acesso de todos os operadores do escritório',
            acaoSugerida: 'Atualizar dados de pagamento na aba Planos e Assinatura',
            linkAcao: '/app/planos',
          })
        } else if (status === 'trial' && escritorio.trial_ate) {
          const diffMs = new Date(escritorio.trial_ate).getTime() - agora
          const diasRestantes = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
          if (diasRestantes <= 5) {
            listaConsolidada.push({
              id: `trial_expirando_${escritorio.id}`,
              origem: 'assinatura',
              categoria: 'mensalidade',
              entidadeNome: escritorio.nome,
              documento: escritorio.cnpj,
              titulo: `Trial Pro expira em ${diasRestantes} dia(s)`,
              descricao:
                'O período de degustação de 14 dias está no fim. Selecione um plano para manter o escritório ativo.',
              severidade: diasRestantes <= 2 ? 'critico' : 'atencao',
              dataVencimento: escritorio.trial_ate,
              prazoTexto: `${diasRestantes} dia(s) restantes`,
              impacto: 'Interrupção dos recursos Pro ao término do teste',
              acaoSugerida: 'Assinar plano Pro em /app/planos',
              linkAcao: '/app/planos',
            })
          }
        } else if (status === 'ativo' && escritorio.data_vencimento) {
          const diffMs = new Date(escritorio.data_vencimento).getTime() - agora
          const diasRestantes = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
          if (diasRestantes <= 5 && diasRestantes >= 0) {
            listaConsolidada.push({
              id: `mensalidade_proxima_${escritorio.id}`,
              origem: 'assinatura',
              categoria: 'mensalidade',
              entidadeNome: escritorio.nome,
              documento: escritorio.cnpj,
              titulo: `Renovação de Assinatura em ${diasRestantes} dia(s)`,
              descricao: `Próximo débito automático da assinatura agendado para ${formatDate(escritorio.data_vencimento)}.`,
              severidade: 'informativo',
              dataVencimento: escritorio.data_vencimento,
              prazoTexto: `${diasRestantes} dia(s) restantes`,
              impacto: 'Renovação automática do período de uso',
              acaoSugerida: 'Verificar cartão cadastrado',
              linkAcao: '/app/planos',
            })
          }
        }
      }

      // 2. Alertas de Empresas PJ (apenas se podeAcessarPJ for verdadeiro)
      if (podeAcessarPJ) {
        const empresas = await pb
          .collection('empresas')
          .getFullList<EmpresaRecord>({ sort: 'razao_social' })

        // Motor de alertas globais das empresas
        const resultadoAlertas = await calcularAlertasGlobaisDasEmpresas(empresas, anoBase)
        for (const a of resultadoAlertas.alertas) {
          // Ignora alertas com status 'ok' para não poluir pendências
          if (a.severidade === 'ok') continue

          const sevMapeada: 'critico' | 'atencao' | 'informativo' =
            a.severidade === 'critico'
              ? 'critico'
              : a.severidade === 'atencao'
                ? 'atencao'
                : 'informativo'

          listaConsolidada.push({
            id: a.id,
            origem: 'empresa',
            categoria: (a.tipo as ItemAlertaRelatorio['categoria']) || 'outro',
            entidadeNome: a.empresa_nome,
            documento: a.empresa_cnpj,
            titulo: a.titulo,
            descricao: a.descricao,
            severidade: sevMapeada,
            prazoTexto: sevMapeada === 'critico' ? 'Ação Imediata' : 'Acompanhamento',
            impacto: a.impacto,
            acaoSugerida: a.acao || 'Verificar detalhes',
            linkAcao: a.link,
          })
        }

        // Obrigações Acessórias vencidas ou vencendo no mês
        const obrigacoes = await getAllObrigacoesEscritorio(anoBase)
        const atrasadas = obrigacoes.filter((o) => o.statusCalculado === 'atrasado')
        const hoje = obrigacoes.filter((o) => o.statusCalculado === 'vence_hoje')
        const emBreve = obrigacoes.filter(
          (o) => o.statusCalculado === 'vence_em_breve' && o.diasAteVencimento <= 7,
        )

        for (const o of atrasadas) {
          listaConsolidada.push({
            id: `obrigacao_atrasada_${o.id}`,
            origem: 'obrigacao',
            categoria: 'obrigacao',
            entidadeNome: o.expand?.empresa_id?.razao_social || 'Empresa PJ',
            documento: o.expand?.empresa_id?.cnpj ? maskCnpj(o.expand.empresa_id.cnpj) : undefined,
            titulo: `Obrigação Acessória ATRASADA: ${o.tipo} (${o.competencia})`,
            descricao: `Vencimento expirado em ${formatDate(o.data_vencimento)}. Declaração não entregue sujeita a MAED.`,
            severidade: 'critico',
            dataVencimento: o.data_vencimento,
            prazoTexto: 'Vencida',
            impacto: 'Multa automática da Receita Federal e perda de CND',
            acaoSugerida: 'Transmitir e anexar recibo no Calendário de Obrigações',
            linkAcao: `/app/empresas/${o.empresa_id}/obrigacoes`,
          })
        }

        for (const o of hoje) {
          listaConsolidada.push({
            id: `obrigacao_hoje_${o.id}`,
            origem: 'obrigacao',
            categoria: 'obrigacao',
            entidadeNome: o.expand?.empresa_id?.razao_social || 'Empresa PJ',
            documento: o.expand?.empresa_id?.cnpj ? maskCnpj(o.expand.empresa_id.cnpj) : undefined,
            titulo: `Obrigação VENCE HOJE: ${o.tipo} (${o.competencia})`,
            descricao: `Prazo fatal de transmissão até 23:59 de hoje (${formatDate(o.data_vencimento)}).`,
            severidade: 'critico',
            dataVencimento: o.data_vencimento,
            prazoTexto: 'Vence Hoje',
            impacto: 'Evitar incidência de multa por atraso no fechamento',
            acaoSugerida: 'Emitir comprovante de envio',
            linkAcao: `/app/empresas/${o.empresa_id}/obrigacoes`,
          })
        }

        for (const o of emBreve) {
          listaConsolidada.push({
            id: `obrigacao_embreve_${o.id}`,
            origem: 'obrigacao',
            categoria: 'obrigacao',
            entidadeNome: o.expand?.empresa_id?.razao_social || 'Empresa PJ',
            documento: o.expand?.empresa_id?.cnpj ? maskCnpj(o.expand.empresa_id.cnpj) : undefined,
            titulo: `Obrigação a Vencer: ${o.tipo} (${o.competencia})`,
            descricao: `Vencimento previsto para ${formatDate(o.data_vencimento)} (${o.diasAteVencimento} dia(s) restantes).`,
            severidade: 'atencao',
            dataVencimento: o.data_vencimento,
            prazoTexto: `${o.diasAteVencimento} dia(s) restantes`,
            impacto: 'Conferência prévia da apuração e guias',
            acaoSugerida: 'Agendar envio no calendário',
            linkAcao: `/app/empresas/${o.empresa_id}/obrigacoes`,
          })
        }
      }

      // Ordena por severidade (crítico primeiro) e depois por prazo
      const ordemSev: Record<string, number> = {
        critico: 1,
        atencao: 2,
        informativo: 3,
      }

      listaConsolidada.sort((a, b) => {
        const diff = (ordemSev[a.severidade] || 4) - (ordemSev[b.severidade] || 4)
        if (diff !== 0) return diff
        return a.entidadeNome.localeCompare(b.entidadeNome)
      })

      setAlertas(listaConsolidada)
    } catch (err) {
      console.error('Erro ao carregar relatório de alertas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarAlertas()
  }, [anoBase, podeAcessarPJ])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return alertas.filter((item) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const matchEnt = item.entidadeNome.toLowerCase().includes(termo)
        const matchTit = item.titulo.toLowerCase().includes(termo)
        const matchDesc = item.descricao.toLowerCase().includes(termo)
        if (!matchEnt && !matchTit && !matchDesc) return false
      }

      if (filtroSeveridade !== 'todos') {
        if (item.severidade !== filtroSeveridade) return false
      }

      if (filtroCategoria !== 'todos') {
        if (item.categoria !== filtroCategoria) return false
      }

      if (filtroPeriodo === 'vencidos') {
        if (
          !item.prazoTexto.toLowerCase().includes('vencid') &&
          !item.prazoTexto.toLowerCase().includes('hoje')
        ) {
          return false
        }
      } else if (filtroPeriodo === 'proximos_7_dias') {
        if (
          !item.prazoTexto.toLowerCase().includes('restante') &&
          !item.prazoTexto.toLowerCase().includes('hoje')
        ) {
          return false
        }
      }

      return true
    })
  }, [alertas, busca, filtroSeveridade, filtroCategoria, filtroPeriodo])

  // KPIs
  const totais = useMemo(() => {
    const totalAlertas = itensFiltrados.length
    const criticos = itensFiltrados.filter((i) => i.severidade === 'critico').length
    const atencao = itensFiltrados.filter((i) => i.severidade === 'atencao').length
    const informativos = itensFiltrados.filter((i) => i.severidade === 'informativo').length
    const obrigacoesVencidas = itensFiltrados.filter(
      (i) => i.categoria === 'obrigacao' && i.severidade === 'critico',
    ).length

    return {
      totalAlertas,
      criticos,
      atencao,
      informativos,
      obrigacoesVencidas,
    }
  }, [itensFiltrados])

  const rotuloPeriodo = `Ano ${anoBase} • Monitoramento Ativo`

  // Exportação PDF
  const handleExportarPdf = () => {
    const colunas = [
      { titulo: 'Entidade / Alvo', width: '22%' },
      { titulo: 'Severidade', width: '13%' },
      { titulo: 'Tipo do Alerta', width: '15%' },
      { titulo: 'Descrição da Ocorrência', width: '32%' },
      { titulo: 'Prazo / Vencimento', width: '18%' },
    ]

    const linhas = itensFiltrados.map((item) => [
      item.entidadeNome,
      item.severidade === 'critico'
        ? 'CRÍTICO'
        : item.severidade === 'atencao'
          ? 'ATENÇÃO'
          : 'INFORMATIVO',
      item.categoria.toUpperCase(),
      `${item.titulo}: ${item.descricao}`,
      item.dataVencimento ? formatDate(item.dataVencimento) : item.prazoTexto,
    ])

    const totaisLinha = [
      `Total: ${totais.totalAlertas} alertas`,
      `${totais.criticos} críticos`,
      '',
      `${totais.atencao} atenção`,
      `${totais.obrigacoesVencidas} obrigações vencidas`,
    ]

    const html = buildDocumentoPdfHtml({
      titulo: 'Relatório Executivo de Alertas e Pendências',
      subtitulo: 'Raio-X de Obrigações, Fator R, Assinatura e Inconsistências Tributárias',
      tipoRelatorio: 'Relatório de Alertas',
      periodo: rotuloPeriodo,
      escritorio,
      kpis: [
        { label: 'Alertas Totais', valor: String(totais.totalAlertas) },
        { label: 'Urgências Críticas', valor: String(totais.criticos), sub: 'Ação Imediata' },
        { label: 'Pontos de Atenção', valor: String(totais.atencao) },
        { label: 'Obrigações Vencidas', valor: String(totais.obrigacoesVencidas) },
      ],
      colunas,
      linhas,
      totais: totaisLinha,
      observacoes: [
        'Documento ordenado decrescentemente por nível de criticidade e risco fiscal.',
        'Pendências críticas de obrigações acessórias demandam transmissão urgente para prevenir imposição de MAED.',
      ],
    })

    imprimirDocumentoHtml(html)
  }

  // Exportação CSV
  const handleExportarCsv = () => {
    const colunasCsv = [
      'Entidade',
      'Documento',
      'Origem',
      'Categoria',
      'Severidade',
      'Título do Alerta',
      'Descrição',
      'Prazo / Vencimento',
      'Impacto Fiscal',
      'Ação Sugerida',
    ]

    const linhasCsv = itensFiltrados.map((item) => [
      item.entidadeNome,
      item.documento || '',
      item.origem,
      item.categoria,
      item.severidade,
      item.titulo,
      item.descricao,
      item.dataVencimento ? formatDate(item.dataVencimento) : item.prazoTexto,
      item.impacto || '',
      item.acaoSugerida,
    ])

    exportarParaCsv(
      `Relatorio_Alertas_Globais_${new Date().toISOString().slice(0, 10)}`,
      colunasCsv,
      linhasCsv,
    )
  }

  const renderBadgeSeveridade = (sev: ItemAlertaRelatorio['severidade']) => {
    if (sev === 'critico') {
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-600 border-0 text-[10px] font-black uppercase tracking-wider animate-pulse gap-1">
          <AlertTriangle className="w-3 h-3" />
          Crítico
        </Badge>
      )
    }
    if (sev === 'atencao') {
      return (
        <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-0 text-[10px] font-bold uppercase tracking-wider gap-1">
          <AlertTriangle className="w-3 h-3" />
          Atenção
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider"
      >
        Informativo
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Topo / Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Relatório de Alertas Globais
              </h1>
              <p className="text-xs text-slate-500">
                Raio-X unificado de todas as obrigações vencidas/próximas, Fator R, mensalidade e
                inconsistências.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarAlertas}
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
            className="h-9 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
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
              Total de Alertas
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {totais.totalAlertas}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Pendências ativas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Urgências Críticas
            </p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">
              {totais.criticos}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Exigem ação imediata</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Pontos de Atenção
            </p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1 font-mono">
              {totais.atencao}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Vencimentos em breve</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Obrigações Vencidas
            </p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">
              {totais.obrigacoesVencidas}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Risco de MAED/Multas</p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso Starter caso usuário tenha plano Starter (explicando alcance) */}
      {!podeAcessarPJ && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between text-xs text-blue-900">
          <div>
            <strong>Modo Starter Ativo:</strong> Exibindo alertas de mensalidade/assinatura do
            escritório e PF. Para visualizar alertas corporativos PJ (Fator R, piso pró-labore,
            obrigações acessórias DAS/DCTF), faça upgrade para o plano Pro.
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-800 shrink-0 ml-3"
          >
            <Link to="/app/planos">Fazer Upgrade</Link>
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
                placeholder="Buscar alerta, empresa..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* Filtro Severidade */}
            <div>
              <Select value={filtroSeveridade} onValueChange={setFiltroSeveridade}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Severidade" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Severidades</SelectItem>
                  <SelectItem value="critico">Crítico / Urgente</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="informativo">Informativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Categoria */}
            <div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Categoria de Alerta" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Categorias</SelectItem>
                  <SelectItem value="obrigacao">Obrigações Acessórias</SelectItem>
                  <SelectItem value="fator_r">Fator R (Simples)</SelectItem>
                  <SelectItem value="pro_labore">Piso Pró-Labore</SelectItem>
                  <SelectItem value="altas_rendas">Teto Altas Rendas</SelectItem>
                  <SelectItem value="anexo_simples">Otimização de Regime</SelectItem>
                  <SelectItem value="mensalidade">Mensalidade / Assinatura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Prazo */}
            <div>
              <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Prazo / Vencimento" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Prazos</SelectItem>
                  <SelectItem value="vencidos">Vencidos / Vence Hoje</SelectItem>
                  <SelectItem value="proximos_7_dias">Próximos 7 dias</SelectItem>
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
                <th className="px-4 py-3">Severidade</th>
                <th className="px-4 py-3">Entidade Alvo</th>
                <th className="px-4 py-3">Título & Ocorrência</th>
                <th className="px-4 py-3">Impacto Estimado</th>
                <th className="px-4 py-3">Prazo / Vencimento</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Analisando alertas e pendências do escritório...
                  </td>
                </tr>
              ) : itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum alerta registrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">{renderBadgeSeveridade(item.severidade)}</td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.entidadeNome}</div>
                      {item.documento && (
                        <div className="text-[11px] font-mono text-slate-500">
                          {maskCnpj(item.documento)}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-sm">
                      <div className="font-bold text-slate-900">{item.titulo}</div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                        {item.descricao}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      <span className="text-[11px] font-medium text-rose-700">
                        {item.impacto || 'Acompanhamento de rotina'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono">
                      {item.dataVencimento ? (
                        <div>
                          <span className="font-semibold text-slate-900">
                            {formatDate(item.dataVencimento)}
                          </span>
                          <div className="text-[10px] text-slate-500">{item.prazoTexto}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-sans">{item.prazoTexto}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {item.linkAcao ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-rose-700 hover:bg-rose-50 px-2 font-semibold"
                        >
                          <Link to={item.linkAcao}>
                            <span>Resolver</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-slate-400">—</span>
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
