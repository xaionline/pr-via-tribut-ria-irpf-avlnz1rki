import React, { useState } from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Edit2,
  Check,
  RotateCcw,
  Info,
  CalendarDays,
  ListFilter,
  Sparkles,
  Download,
  Building2,
  Send,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import type {
  EmpresaRecord,
  ObrigacaoAcessoriaComStatus,
  ResumoObrigacoesAno,
  TipoObrigacaoAcessoria,
  StatusObrigacaoAcessoria,
} from '@/types'
import {
  marcarObrigacaoEntregue,
  desmarcarObrigacaoEntregue,
  atualizarDataVencimentoObrigacao,
  gerarObrigacoesParaEmpresa,
  REGRAS_OBRIGACOES,
} from '@/services/obrigacoes'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface EmpresaObrigacoesTabProps {
  empresa: EmpresaRecord
  anoCalendario: number
  obrigacoes: ObrigacaoAcessoriaComStatus[]
  resumo: ResumoObrigacoesAno
  loading: boolean
  onRefresh: () => void
  onAnoChange?: (ano: number) => void
}

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function EmpresaObrigacoesTab({
  empresa,
  anoCalendario,
  obrigacoes,
  resumo,
  loading,
  onRefresh,
  onAnoChange,
}: EmpresaObrigacoesTabProps) {
  const { toast } = useToast()

  const [modoVisao, setModoVisao] = useState<'calendario' | 'lista'>('calendario')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [gerandoAuto, setGerandoAuto] = useState(false)

  // Modais de Edição / Entrega
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false)
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false)
  const [modalInfoRegrasOpen, setModalInfoRegrasOpen] = useState(false)
  const [selectedObrigacao, setSelectedObrigacao] = useState<ObrigacaoAcessoriaComStatus | null>(
    null,
  )

  // Formulário Modal Entrega
  const [dataEntregaInput, setDataEntregaInput] = useState<string>('')
  const [reciboInput, setReciboInput] = useState<string>('')
  const [observacaoEntregaInput, setObservacaoEntregaInput] = useState<string>('')
  const [salvandoEntrega, setSalvandoEntrega] = useState(false)

  // Formulário Modal Edição Vencimento
  const [dataVencimentoInput, setDataVencimentoInput] = useState<string>('')
  const [observacaoEdicaoInput, setObservacaoEdicaoInput] = useState<string>('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Gerar obrigações do ano automaticamente se não houver registros
  const handleGerarObrigacoes = async () => {
    setGerandoAuto(true)
    try {
      await gerarObrigacoesParaEmpresa(empresa, anoCalendario)
      toast({
        title: 'Calendário de Obrigações gerado!',
        description: `Obrigações de ${empresa.regime.toUpperCase()} para o ano ${anoCalendario} foram criadas com sucesso.`,
      })
      onRefresh()
    } catch (err) {
      toast({
        title: 'Erro ao gerar obrigações',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setGerandoAuto(false)
    }
  }

  // Abertura Modal Entrega
  const handleOpenEntrega = (obrigacao: ObrigacaoAcessoriaComStatus) => {
    setSelectedObrigacao(obrigacao)
    const hojeStr = new Date().toISOString().slice(0, 10)
    setDataEntregaInput(obrigacao.data_entrega ? obrigacao.data_entrega.slice(0, 10) : hojeStr)
    setReciboInput(obrigacao.codigo_recibo || '')
    setObservacaoEntregaInput(obrigacao.observacao || '')
    setModalEntregaOpen(true)
  }

  // Salvar Entrega
  const handleConfirmarEntrega = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedObrigacao) return

    setSalvandoEntrega(true)
    try {
      const dataIso = new Date(`${dataEntregaInput}T12:00:00.000Z`).toISOString()
      await marcarObrigacaoEntregue(
        selectedObrigacao.id,
        dataIso,
        reciboInput.trim(),
        observacaoEntregaInput.trim(),
      )
      toast({
        title: 'Obrigação marcada como Entregue!',
        description: `${selectedObrigacao.tipo} (${selectedObrigacao.competencia}) atualizada com sucesso.`,
      })
      setModalEntregaOpen(false)
      onRefresh()
    } catch (err) {
      toast({
        title: 'Erro ao registrar entrega',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSalvandoEntrega(false)
    }
  }

  // Reverter Entrega (Desmarcar)
  const handleReverterEntrega = async (obrigacao: ObrigacaoAcessoriaComStatus) => {
    try {
      await desmarcarObrigacaoEntregue(obrigacao.id)
      toast({
        title: 'Status revertido para Pendente',
        description: `${obrigacao.tipo} (${obrigacao.competencia}) está pendente de entrega.`,
      })
      onRefresh()
    } catch (err) {
      toast({
        title: 'Erro ao reverter status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // Abertura Modal Edição Vencimento
  const handleOpenEdicao = (obrigacao: ObrigacaoAcessoriaComStatus) => {
    setSelectedObrigacao(obrigacao)
    setDataVencimentoInput(
      obrigacao.data_vencimento
        ? obrigacao.data_vencimento.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    )
    setObservacaoEdicaoInput(obrigacao.observacao || '')
    setModalEdicaoOpen(true)
  }

  // Salvar Edição Vencimento
  const handleConfirmarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedObrigacao) return

    setSalvandoEdicao(true)
    try {
      const dataIso = new Date(`${dataVencimentoInput}T12:00:00.000Z`).toISOString()
      await atualizarDataVencimentoObrigacao(
        selectedObrigacao.id,
        dataIso,
        observacaoEdicaoInput.trim(),
      )
      toast({
        title: 'Data de vencimento ajustada!',
        description: `${selectedObrigacao.tipo} (${selectedObrigacao.competencia}) atualizada para ${formatDate(dataIso)}.`,
      })
      setModalEdicaoOpen(false)
      onRefresh()
    } catch (err) {
      toast({
        title: 'Erro ao ajustar data de vencimento',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Filtragem dos registros
  const obrigacoesFiltradas = obrigacoes.filter((o) => {
    if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) return false
    if (filtroStatus === 'entregue' && o.status !== 'entregue') return false
    if (filtroStatus === 'atrasado' && o.statusCalculado !== 'atrasado') return false
    if (
      filtroStatus === 'proximo' &&
      o.statusCalculado !== 'vence_hoje' &&
      o.statusCalculado !== 'vence_em_breve'
    )
      return false
    if (filtroStatus === 'em_dia' && o.statusCalculado !== 'em_dia') return false
    return true
  })

  // Agrupamento por mês para a visão mensal / calendário
  const obrigacoesPorMes = React.useMemo(() => {
    const mapa: Record<number, ObrigacaoAcessoriaComStatus[]> = {}
    for (let m = 1; m <= 12; m++) {
      mapa[m] = []
    }
    const anuais: ObrigacaoAcessoriaComStatus[] = []

    obrigacoesFiltradas.forEach((o) => {
      if (o.mes_competencia && o.mes_competencia >= 1 && o.mes_competencia <= 12) {
        mapa[o.mes_competencia].push(o)
      } else {
        anuais.push(o)
      }
    })

    return { mapa, anuais }
  }, [obrigacoesFiltradas])

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* =========================================================================
            1. BANNER DE CONTROLE DO ESCRITÓRIO & TAXA DE CONFORMIDADE
            ========================================================================= */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 border-0 shadow-sm gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  Calendário de Obrigações Acessórias
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs capitalize font-semibold border-slate-700 bg-slate-800/80 text-slate-200"
                >
                  Regime:{' '}
                  {empresa.regime === 'simples'
                    ? 'Simples Nacional'
                    : empresa.regime === 'presumido'
                      ? 'Lucro Presumido'
                      : 'Lucro Real'}
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Painel de Controle Tributário — {empresa.razao_social}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Acompanhamento das obrigações federais (
                <strong>DAS, DCTF, EFD-Reinf, ECD, ECF</strong>) por competência, com controle de
                entrega e monitoramento rigoroso de prazos e multas.
              </p>
            </div>

            {/* Ações e Seletor de Ano */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              {onAnoChange && (
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1">
                  <span className="text-xs text-slate-400 font-semibold">Ano:</span>
                  <select
                    value={anoCalendario}
                    onChange={(e) => onAnoChange(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-white border-0 focus:outline-hidden cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((ano) => (
                      <option key={ano} value={ano} className="bg-slate-900 text-white">
                        {ano}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalInfoRegrasOpen(true)}
                className="bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs h-9 gap-1.5"
              >
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Regras de Vencimento</span>
              </Button>

              {obrigacoes.length === 0 && (
                <Button
                  size="sm"
                  onClick={handleGerarObrigacoes}
                  disabled={gerandoAuto}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 shadow-md border-0"
                >
                  {gerandoAuto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Gerar Calendário {anoCalendario}</span>
                </Button>
              )}
            </div>
          </div>

          {/* =========================================================================
              2. RESUMO DE KPIS DE CONFORMIDADE NO TOPO
              ========================================================================= */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Card 1: Em Dia */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Entregues
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-white">{resumo.entregues}</span>
                <span className="text-[10px] text-slate-400">de {resumo.total}</span>
              </div>
            </div>

            {/* Card 2: Atrasadas (Urgência Máxima) */}
            <div
              className={`rounded-xl p-3 flex flex-col justify-between border-2 transition-all ${
                resumo.atrasadas > 0
                  ? 'bg-rose-950/80 border-rose-500 shadow-md animate-pulse'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-rose-500" /> Atrasadas
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span
                  className={`text-xl font-black ${resumo.atrasadas > 0 ? 'text-rose-300' : 'text-white'}`}
                >
                  {resumo.atrasadas}
                </span>
                <span className="text-[10px] text-rose-300/80">Risco de MAED</span>
              </div>
            </div>

            {/* Card 3: Vence Hoje / Em Breve */}
            <div
              className={`rounded-xl p-3 flex flex-col justify-between border transition-all ${
                resumo.venceHoje > 0 || resumo.venceEmBreve > 0
                  ? 'bg-amber-950/60 border-amber-500'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Próx. Vencimento
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-amber-300">
                  {resumo.venceHoje + resumo.venceEmBreve}
                </span>
                <span className="text-[10px] text-amber-400/80">
                  {resumo.venceHoje > 0 ? `${resumo.venceHoje} HOJE` : 'Nos próx. 15d'}
                </span>
              </div>
            </div>

            {/* Card 4: Pendentes Futuras */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" /> Em Dia / Futuras
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-black text-white">{resumo.emDia}</span>
                <span className="text-[10px] text-slate-400">Prazos ok</span>
              </div>
            </div>

            {/* Card 5: Taxa de Conformidade */}
            <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Conformidade
              </span>
              <div className="mt-1 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-emerald-400">
                    {resumo.taxaConformidade}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {resumo.entregues}/{resumo.total}
                  </span>
                </div>
                <Progress value={resumo.taxaConformidade} className="h-1.5 bg-slate-800" />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. BARRA DE FILTROS E ALTERNÂNCIA DE VISÃO (GRADE MENSAL VS LISTA)
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          {/* Alternância de Visão */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={modoVisao === 'calendario' ? 'default' : 'outline'}
              onClick={() => setModoVisao('calendario')}
              className={`h-8 text-xs gap-1.5 ${
                modoVisao === 'calendario' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Visão Calendário Mensal</span>
            </Button>
            <Button
              size="sm"
              variant={modoVisao === 'lista' ? 'default' : 'outline'}
              onClick={() => setModoVisao('lista')}
              className={`h-8 text-xs gap-1.5 ${
                modoVisao === 'lista' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Visão em Lista</span>
            </Button>
          </div>

          {/* Filtros por Tipo e Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Obrigação */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-500">Tipo:</span>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="DAS">DAS (Simples)</SelectItem>
                  <SelectItem value="DCTF">DCTF</SelectItem>
                  <SelectItem value="EFD_REINF">EFD-Reinf</SelectItem>
                  <SelectItem value="ECD">ECD</SelectItem>
                  <SelectItem value="ECF">ECF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-500">Status:</span>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="atrasado">🔴 Atrasados</SelectItem>
                  <SelectItem value="proximo">🟡 Vence em breve</SelectItem>
                  <SelectItem value="em_dia">🔵 Em dia</SelectItem>
                  <SelectItem value="entregue">🟢 Entregues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. VISÃO EM CALENDÁRIO / GRADE MENSAL (12 MESES + ANUAIS)
            ========================================================================= */}
        {modoVisao === 'calendario' && (
          <div className="space-y-6">
            {/* Bloco de Obrigações Anuais (ECD e ECF) */}
            {obrigacoesPorMes.anuais.length > 0 && (
              <Card className="border border-purple-200 bg-purple-50/30 shadow-subtle">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-purple-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Obrigações Anuais do Exercício (ECD & ECF)
                  </CardTitle>
                  <CardDescription className="text-xs text-purple-800/80">
                    Declarações contábeis e fiscais transmitidas anualmente via SPED
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {obrigacoesPorMes.anuais.map((obrigacao) => (
                      <ObrigacaoCardItem
                        key={obrigacao.id}
                        obrigacao={obrigacao}
                        onMarcarEntrega={handleOpenEntrega}
                        onReverterEntrega={handleReverterEntrega}
                        onEditarVencimento={handleOpenEdicao}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grade de 12 Meses */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MESES_NOMES.map((nomeMes, index) => {
                const mesNum = index + 1
                const itensMes = obrigacoesPorMes.mapa[mesNum] || []
                const temAtrasada = itensMes.some((o) => o.statusCalculado === 'atrasado')
                const temVenceHoje = itensMes.some((o) => o.statusCalculado === 'vence_hoje')
                const todasEntregues =
                  itensMes.length > 0 && itensMes.every((o) => o.status === 'entregue')

                return (
                  <div
                    key={mesNum}
                    className={`rounded-xl border-2 transition-all p-3.5 flex flex-col justify-between ${
                      temAtrasada
                        ? 'border-rose-400 bg-rose-50/40 shadow-xs'
                        : temVenceHoje
                          ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                          : todasEntregues
                            ? 'border-emerald-300 bg-emerald-50/30'
                            : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Cabeçalho do Mês */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900">{nomeMes}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          ({String(mesNum).padStart(2, '0')}/{anoCalendario})
                        </span>
                      </div>

                      {todasEntregues ? (
                        <Badge className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0 border-0 gap-1">
                          <Check className="w-3 h-3" /> Concluído
                        </Badge>
                      ) : temAtrasada ? (
                        <Badge className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0 border-0 animate-pulse">
                          Atraso
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {itensMes.length} {itensMes.length === 1 ? 'item' : 'itens'}
                        </span>
                      )}
                    </div>

                    {/* Lista de Obrigações do Mês */}
                    <div className="space-y-2 flex-1">
                      {itensMes.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          Nenhuma obrigação registrada
                        </div>
                      ) : (
                        itensMes.map((obrigacao) => (
                          <ObrigacaoCardItem
                            key={obrigacao.id}
                            obrigacao={obrigacao}
                            onMarcarEntrega={handleOpenEntrega}
                            onReverterEntrega={handleReverterEntrega}
                            onEditarVencimento={handleOpenEdicao}
                            compact={true}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            5. VISÃO EM LISTA DETALHADA
            ========================================================================= */}
        {modoVisao === 'lista' && (
          <div className="space-y-3">
            {obrigacoesFiltradas.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-slate-300">
                <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700">Nenhuma obrigação encontrada</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Não há registros que correspondam aos filtros selecionados.
                </p>
              </Card>
            ) : (
              obrigacoesFiltradas.map((obrigacao) => (
                <ObrigacaoCardItem
                  key={obrigacao.id}
                  obrigacao={obrigacao}
                  onMarcarEntrega={handleOpenEntrega}
                  onReverterEntrega={handleReverterEntrega}
                  onEditarVencimento={handleOpenEdicao}
                  compact={false}
                />
              ))
            )}
          </div>
        )}

        {/* =========================================================================
            MODAL DE REGISTRO DE ENTREGA / TRANSMISSÃO
            ========================================================================= */}
        <Dialog open={modalEntregaOpen} onOpenChange={setModalEntregaOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleConfirmarEntrega}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Confirmar Entrega de Obrigação Acessória
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Registre a data em que a declaração foi transmitida à Receita Federal e os dados
                  do recibo de entrega.
                </DialogDescription>
              </DialogHeader>

              {selectedObrigacao && (
                <div className="space-y-4 py-3">
                  {/* Detalhes da Obrigação */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Obrigação:</span>
                      <strong className="text-slate-900">
                        {selectedObrigacao.tipo} — {selectedObrigacao.competencia}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vencimento Oficial:</span>
                      <strong className="text-slate-900">
                        {formatDate(selectedObrigacao.data_vencimento)}
                      </strong>
                    </div>
                  </div>

                  {/* Data de Entrega */}
                  <div className="space-y-1.5">
                    <Label htmlFor="data-entrega" className="text-xs font-semibold text-slate-700">
                      Data da Entrega / Transmissão *
                    </Label>
                    <Input
                      id="data-entrega"
                      type="date"
                      value={dataEntregaInput}
                      onChange={(e) => setDataEntregaInput(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Código do Recibo */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="recibo-entrega"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Número do Recibo / Protocolo SPED (Opcional)
                    </Label>
                    <Input
                      id="recibo-entrega"
                      placeholder="Ex: REC-DAS-202501-8923 ou 12.34.56.78.90"
                      value={reciboInput}
                      onChange={(e) => setReciboInput(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* Observação */}
                  <div className="space-y-1.5">
                    <Label htmlFor="obs-entrega" className="text-xs font-semibold text-slate-700">
                      Observações internas do escritório (Opcional)
                    </Label>
                    <Input
                      id="obs-entrega"
                      placeholder="Ex: Transmitido com certificado A1 da matriz"
                      value={observacaoEntregaInput}
                      onChange={(e) => setObservacaoEntregaInput(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEntregaOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoEntrega}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {salvandoEntrega && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Entrega
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            MODAL DE AJUSTE / EDIÇÃO MANUAL DA DATA DE VENCIMENTO
            ========================================================================= */}
        <Dialog open={modalEdicaoOpen} onOpenChange={setModalEdicaoOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleConfirmarEdicao}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                  Ajustar Data de Vencimento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Permite antecipar ou ajustar a data de vencimento conforme feriados locais ou
                  cronograma de fechamento do escritório contábil.
                </DialogDescription>
              </DialogHeader>

              {selectedObrigacao && (
                <div className="space-y-4 py-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Obrigação:</span>
                      <strong className="text-slate-900">{selectedObrigacao.nome}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Competência:</span>
                      <strong className="text-slate-900">{selectedObrigacao.competencia}</strong>
                    </div>
                  </div>

                  {/* Nova Data de Vencimento */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="nova-data-vencimento"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Nova Data de Vencimento *
                    </Label>
                    <Input
                      id="nova-data-vencimento"
                      type="date"
                      value={dataVencimentoInput}
                      onChange={(e) => setDataVencimentoInput(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Justificativa / Observação */}
                  <div className="space-y-1.5">
                    <Label htmlFor="obs-edicao" className="text-xs font-semibold text-slate-700">
                      Motivo da alteração / Observação (Opcional)
                    </Label>
                    <Input
                      id="obs-edicao"
                      placeholder="Ex: Antecipação por feriado bancário municipal"
                      value={observacaoEdicaoInput}
                      onChange={(e) => setObservacaoEdicaoInput(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalEdicaoOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoEdicao}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {salvandoEdicao && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Nova Data
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            MODAL DE INFORMAÇÕES DE REGRAS E PRAZOS OFICIAIS
            ========================================================================= */}
        <Dialog open={modalInfoRegrasOpen} onOpenChange={setModalInfoRegrasOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Info className="w-5 h-5 text-blue-600" />
                Regras de Vencimento das Obrigações Acessórias
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Padrões e legislações federais aplicáveis por regime tributário
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {(Object.keys(REGRAS_OBRIGACOES) as TipoObrigacaoAcessoria[]).map((tipo) => {
                const regra = REGRAS_OBRIGACOES[tipo]
                return (
                  <div
                    key={tipo}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-slate-900">{regra.nome}</strong>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {regra.periodicidade}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">{regra.descricao}</p>
                    <div className="pt-1 text-[11px] text-slate-700 flex flex-col gap-0.5">
                      <span>
                        <strong>Vencimento Legal:</strong> {regra.regraVencimento}
                      </span>
                      <span className="text-slate-500">
                        <strong>Órgão:</strong> {regra.orgao}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalInfoRegrasOpen(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

// =========================================================================
// SUB-COMPONENTE: CARD DA OBRIGAÇÃO ACESSÓRIA
// =========================================================================

interface ObrigacaoCardItemProps {
  obrigacao: ObrigacaoAcessoriaComStatus
  onMarcarEntrega: (o: ObrigacaoAcessoriaComStatus) => void
  onReverterEntrega: (o: ObrigacaoAcessoriaComStatus) => void
  onEditarVencimento: (o: ObrigacaoAcessoriaComStatus) => void
  compact?: boolean
}

function ObrigacaoCardItem({
  obrigacao,
  onMarcarEntrega,
  onReverterEntrega,
  onEditarVencimento,
  compact = false,
}: ObrigacaoCardItemProps) {
  const isEntregue = obrigacao.status === 'entregue'
  const isAtrasado = obrigacao.statusCalculado === 'atrasado'
  const isHoje = obrigacao.statusCalculado === 'vence_hoje'

  if (compact) {
    return (
      <div
        className={`p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between gap-1.5 ${
          isEntregue
            ? 'bg-emerald-50/60 border-emerald-200'
            : isAtrasado
              ? 'bg-rose-50/90 border-rose-300 shadow-2xs'
              : isHoje
                ? 'bg-red-50/90 border-red-300 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge
              variant="outline"
              className={`text-[10px] font-black px-1.5 py-0 shrink-0 ${
                obrigacao.tipo === 'DAS'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : obrigacao.tipo === 'DCTF'
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : obrigacao.tipo === 'EFD_REINF'
                      ? 'bg-teal-100 text-teal-800 border-teal-300'
                      : 'bg-purple-100 text-purple-800 border-purple-300'
              }`}
            >
              {obrigacao.tipo}
            </Badge>
            <span className="font-semibold text-slate-800 truncate">{obrigacao.competencia}</span>
          </div>

          <Badge
            className={`text-[9px] px-1.5 py-0 border-0 shrink-0 ${obrigacao.urgenciaBadge.cor}`}
          >
            {obrigacao.urgenciaBadge.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Venc: <strong>{formatDate(obrigacao.data_vencimento)}</strong>
          </span>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEditarVencimento(obrigacao)}
                  className="h-5 w-5 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Ajustar data de vencimento</p>
              </TooltipContent>
            </Tooltip>

            {isEntregue ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onReverterEntrega(obrigacao)}
                    className="h-5 w-5 text-emerald-600 hover:text-amber-600 hover:bg-amber-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Desmarcar / reverter status</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onMarcarEntrega(obrigacao)}
                    className={`h-5 w-5 ${
                      isAtrasado
                        ? 'text-rose-600 hover:text-white hover:bg-rose-600'
                        : 'text-emerald-600 hover:text-white hover:bg-emerald-600'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Marcar como transmitida/entregue</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Visão em Lista Completa
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isEntregue
          ? 'bg-emerald-50/40 border-emerald-300'
          : isAtrasado
            ? 'bg-rose-50/90 border-rose-400'
            : isHoje
              ? 'bg-red-50/90 border-red-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge
            className={`text-xs font-black px-2 py-0.5 border-0 ${
              obrigacao.tipo === 'DAS'
                ? 'bg-blue-600 text-white'
                : obrigacao.tipo === 'DCTF'
                  ? 'bg-indigo-600 text-white'
                  : obrigacao.tipo === 'EFD_REINF'
                    ? 'bg-teal-600 text-white'
                    : 'bg-purple-600 text-white'
            }`}
          >
            {obrigacao.tipo}
          </Badge>

          <span className="font-bold text-sm text-slate-900">{obrigacao.nome}</span>

          <Badge variant="outline" className="text-xs font-mono bg-white">
            Competência: {obrigacao.competencia}
          </Badge>

          <Badge
            className={`text-xs px-2 py-0.5 border-0 font-bold ${obrigacao.urgenciaBadge.cor}`}
          >
            {obrigacao.urgenciaBadge.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-0.5">
          <span>
            Vencimento:{' '}
            <strong className="text-slate-800">{formatDate(obrigacao.data_vencimento)}</strong>
          </span>

          {obrigacao.data_entrega && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Entregue em:{' '}
              {formatDate(obrigacao.data_entrega)}
            </span>
          )}

          {obrigacao.codigo_recibo && (
            <span className="font-mono text-slate-600">
              Recibo: <strong>{obrigacao.codigo_recibo}</strong>
            </span>
          )}

          {obrigacao.observacao && (
            <span className="text-slate-500 italic">Obs: {obrigacao.observacao}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditarVencimento(obrigacao)}
          className="text-xs h-8 gap-1 text-slate-600 hover:text-slate-900"
        >
          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Ajustar Data</span>
        </Button>

        {isEntregue ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReverterEntrega(obrigacao)}
            className="text-xs h-8 gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Desmarcar</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onMarcarEntrega(obrigacao)}
            className={`text-xs h-8 gap-1 font-bold ${
              isAtrasado
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Marcar como Entregue</span>
          </Button>
        )}
      </div>
    </div>
  )
}
