import { useEffect, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  CalendarRange,
  TableProperties,
  RefreshCw,
  Info,
  CalendarPlus,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getTabelaPorAno, getTabelas, salvarTabela, deleteTabelaPorAno } from '@/services/tabelas'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { FaixaProgressiva } from '@/types'

// Parsing seguro de moeda/percentual (pt-BR)
function parseNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return isNaN(raw) ? null : raw
  const cleaned = String(raw)
    .replace(/[R$\s%]/g, '')
    .trim()
  if (cleaned === '') return null
  let normalized: string
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = cleaned
  }
  const n = Number(normalized)
  return isNaN(n) ? null : n
}

function formatPercentDisplay(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0%'
  const num = Number(val)
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '')
  return `${formatted}%`
}

function formatCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercentInput(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return ''
  return String(value).replace('.', ',')
}

export default function AdminTabelas() {
  const { toast } = useToast()
  const { isSuperAdmin } = useAuth()

  // Estados principais
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState<string>('2025')
  const [loadingAnos, setLoadingAnos] = useState(true)
  const [loadingTabela, setLoadingTabela] = useState(false)
  const [faixas, setFaixas] = useState<FaixaProgressiva[]>([])
  const [tabelaMeta, setTabelaMeta] = useState<{
    descricao?: string
    data_vigencia_inicio?: string
    data_vigencia_fim?: string
  }>({})

  // Modais de Faixa (Criar / Editar / Excluir)
  const [faixaModalOpen, setFaixaModalOpen] = useState(false)
  const [faixaModalMode, setFaixaModalMode] = useState<'create' | 'edit'>('create')
  const [editingFaixaIndex, setEditingFaixaIndex] = useState<number | null>(null)
  const [faixaMin, setFaixaMin] = useState('')
  const [faixaMax, setFaixaMax] = useState('')
  const [faixaIsOpenEnded, setFaixaIsOpenEnded] = useState(false)
  const [faixaAliq, setFaixaAliq] = useState('')
  const [faixaDed, setFaixaDed] = useState('')
  const [savingFaixa, setSavingFaixa] = useState(false)

  // Modal Excluir Faixa
  const [deleteFaixaIndex, setDeleteFaixaIndex] = useState<number | null>(null)
  const [deletingFaixa, setDeletingFaixa] = useState(false)

  // Modal Gerenciar Anos / Novo Ano
  const [novoAnoModalOpen, setNovoAnoModalOpen] = useState(false)
  const [novoAnoInput, setNovoAnoInput] = useState('')
  const [copiarAnoOrigem, setCopiarAnoOrigem] = useState<string>('2025')
  const [creatingAno, setCreatingAno] = useState(false)

  // Modal Excluir Ano Inteiro
  const [deleteAnoModalOpen, setDeleteAnoModalOpen] = useState(false)
  const [deletingAno, setDeletingAno] = useState(false)

  // Carregar lista de anos disponíveis
  const carregarAnos = async (preferredAno?: number) => {
    setLoadingAnos(true)
    try {
      const records = await getTabelas()
      const anos = Array.from(new Set(records.map((r) => r.ano_calendario || r.ano || 0)))
        .filter((y) => y >= 2000)
        .sort((a, b) => a - b)

      // Anos padrão 2023 a 2033 se não houver registros
      const defaultRange = Array.from({ length: 11 }, (_, i) => 2023 + i)
      const allAnos = Array.from(new Set([...defaultRange, ...anos])).sort((a, b) => a - b)
      setAnosDisponiveis(allAnos)

      const targetAno = preferredAno
        ? String(preferredAno)
        : allAnos.includes(2025)
          ? '2025'
          : String(allAnos[0] || 2025)

      setAnoSelecionado(targetAno)
      return targetAno
    } catch (err) {
      toast({
        title: 'Falha ao carregar anos',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      return '2025'
    } finally {
      setLoadingAnos(false)
    }
  }

  // Carregar dados do ano selecionado
  const carregarTabelaAno = async (ano: number) => {
    setLoadingTabela(true)
    try {
      const res = await getTabelaPorAno(ano)
      if (res && res.success && Array.isArray(res.faixas)) {
        // Ordena por limite_inferior
        const sorted = [...res.faixas].sort(
          (a, b) => (a.limite_inferior ?? 0) - (b.limite_inferior ?? 0),
        )
        setFaixas(sorted)
        setTabelaMeta({
          descricao: res.descricao || `Tabela Progressiva Anual IRPF ${ano}`,
          data_vigencia_inicio: res.data_vigencia_inicio || `${ano}-01-01`,
          data_vigencia_fim: res.data_vigencia_fim || `${ano}-12-31`,
        })
      } else {
        setFaixas([])
        setTabelaMeta({
          descricao: `Tabela Progressiva Anual IRPF ${ano}`,
          data_vigencia_inicio: `${ano}-01-01`,
          data_vigencia_fim: `${ano}-12-31`,
        })
      }
    } catch (err) {
      setFaixas([])
      toast({
        title: `Nenhuma tabela encontrada para ${ano}`,
        description: 'Você pode adicionar faixas ou criar uma nova tabela para este ano.',
      })
    } finally {
      setLoadingTabela(false)
    }
  }

  useEffect(() => {
    carregarAnos().then((initialAno) => {
      if (initialAno) carregarTabelaAno(Number(initialAno))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectAno = (novoAno: string) => {
    setAnoSelecionado(novoAno)
    carregarTabelaAno(Number(novoAno))
  }

  // Persiste a lista de faixas para o ano selecionado
  const persistFaixas = async (novasFaixas: FaixaProgressiva[], customMeta?: typeof tabelaMeta) => {
    const ano = Number(anoSelecionado)
    const meta = customMeta || tabelaMeta
    const payload = {
      descricao: meta.descricao || `Tabela Progressiva Anual IRPF ${ano}`,
      data_vigencia_inicio: meta.data_vigencia_inicio
        ? meta.data_vigencia_inicio.includes('T') || meta.data_vigencia_inicio.includes('Z')
          ? meta.data_vigencia_inicio
          : `${meta.data_vigencia_inicio} 00:00:00.000Z`
        : `${ano}-01-01 00:00:00.000Z`,
      data_vigencia_fim: meta.data_vigencia_fim
        ? meta.data_vigencia_fim.includes('T') || meta.data_vigencia_fim.includes('Z')
          ? meta.data_vigencia_fim
          : `${meta.data_vigencia_fim} 23:59:59.000Z`
        : `${ano}-12-31 23:59:59.000Z`,
      faixas: novasFaixas,
    }

    const res = await salvarTabela(ano, payload)
    if (res && res.success && Array.isArray(res.faixas)) {
      const sorted = [...res.faixas].sort(
        (a, b) => (a.limite_inferior ?? 0) - (b.limite_inferior ?? 0),
      )
      setFaixas(sorted)
    } else {
      setFaixas(novasFaixas)
    }
  }

  // ==========================================
  // Handlers de Faixa (Criar / Editar / Excluir)
  // ==========================================
  const abrirNovaFaixa = () => {
    setFaixaModalMode('create')
    setEditingFaixaIndex(null)

    // Sugere o limite inferior baseado na última faixa existente
    let sugeridoMin = 0
    if (faixas.length > 0) {
      const ultima = faixas[faixas.length - 1]
      if (ultima.limite_superior !== null && ultima.limite_superior !== undefined) {
        sugeridoMin = Math.round((ultima.limite_superior + 0.01) * 100) / 100
      }
    }

    setFaixaMin(formatCurrencyInput(sugeridoMin))
    setFaixaMax('')
    setFaixaIsOpenEnded(faixas.length > 0) // se já tem faixas, a nova pode ser a última aberta
    setFaixaAliq('')
    setFaixaDed('0,00')
    setFaixaModalOpen(true)
  }

  const abrirEditarFaixa = (index: number) => {
    const f = faixas[index]
    if (!f) return
    setFaixaModalMode('edit')
    setEditingFaixaIndex(index)
    setFaixaMin(formatCurrencyInput(f.limite_inferior))
    setFaixaMax(
      f.limite_superior !== null && f.limite_superior !== undefined
        ? formatCurrencyInput(f.limite_superior)
        : '',
    )
    setFaixaIsOpenEnded(f.limite_superior === null || f.limite_superior === undefined)
    setFaixaAliq(formatPercentInput(f.aliquota))
    setFaixaDed(formatCurrencyInput(f.parcela_deduzir ?? f.deducao ?? 0))
    setFaixaModalOpen(true)
  }

  const handleSalvarFaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    const minVal = parseNumber(faixaMin)
    const maxVal = faixaIsOpenEnded ? null : parseNumber(faixaMax)
    const aliqVal = parseNumber(faixaAliq)
    const dedVal = parseNumber(faixaDed) ?? 0

    if (minVal === null || minVal < 0) {
      toast({
        title: 'Valor Mínimo inválido',
        description: 'Informe um valor mínimo válido maior ou igual a zero.',
        variant: 'destructive',
      })
      return
    }

    if (!faixaIsOpenEnded && (maxVal === null || maxVal <= minVal)) {
      toast({
        title: 'Valor Máximo inválido',
        description:
          'O valor máximo deve ser maior que o valor mínimo ou marque como faixa sem limite superior.',
        variant: 'destructive',
      })
      return
    }

    if (aliqVal === null || aliqVal < 0 || aliqVal > 100) {
      toast({
        title: 'Alíquota inválida',
        description: 'A alíquota deve estar entre 0% e 100%.',
        variant: 'destructive',
      })
      return
    }

    setSavingFaixa(true)
    try {
      const novaFaixa: FaixaProgressiva = {
        limite_inferior: minVal,
        limite_superior: faixaIsOpenEnded ? null : maxVal,
        aliquota: aliqVal,
        parcela_deduzir: dedVal,
      }

      let nextFaixas = [...faixas]
      if (faixaModalMode === 'create') {
        nextFaixas.push(novaFaixa)
      } else if (editingFaixaIndex !== null && editingFaixaIndex >= 0) {
        nextFaixas[editingFaixaIndex] = novaFaixa
      }

      // Ordenar faixas por limite inferior
      nextFaixas.sort((a, b) => (a.limite_inferior ?? 0) - (b.limite_inferior ?? 0))

      // Se a última faixa antes era aberta e agora tem outra depois, ajustar
      for (let i = 0; i < nextFaixas.length - 1; i++) {
        if (nextFaixas[i].limite_superior === null) {
          nextFaixas[i].limite_superior =
            Math.round(((nextFaixas[i + 1].limite_inferior ?? 0) - 0.01) * 100) / 100
        }
      }

      await persistFaixas(nextFaixas)

      toast({
        title: faixaModalMode === 'create' ? 'Faixa adicionada' : 'Faixa atualizada',
        description: `Tabela de ${anoSelecionado} atualizada com sucesso.`,
      })
      setFaixaModalOpen(false)
    } catch (err) {
      toast({
        title: 'Falha ao salvar faixa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingFaixa(false)
    }
  }

  const handleConfirmExcluirFaixa = async () => {
    if (deleteFaixaIndex === null) return
    setDeletingFaixa(true)
    try {
      const nextFaixas = faixas.filter((_, idx) => idx !== deleteFaixaIndex)
      // Ajusta a nova última faixa se necessário
      if (nextFaixas.length > 0) {
        nextFaixas[nextFaixas.length - 1].limite_superior = null
      }
      await persistFaixas(nextFaixas)
      toast({
        title: 'Faixa excluída',
        description: `A faixa foi removida da tabela de ${anoSelecionado}.`,
      })
      setDeleteFaixaIndex(null)
    } catch (err) {
      toast({
        title: 'Falha ao excluir faixa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeletingFaixa(false)
    }
  }

  // ==========================================
  // Handlers de Gerenciamento de Anos
  // ==========================================
  const abrirCriarAno = () => {
    setNovoAnoInput('')
    setCopiarAnoOrigem(anoSelecionado || '2025')
    setNovoAnoModalOpen(true)
  }

  const handleCriarNovoAno = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = Number(novoAnoInput.replace(/\D/g, ''))
    if (!anoNum || anoNum < 2000 || anoNum > 2099) {
      toast({
        title: 'Ano inválido',
        description: 'Informe um ano de 4 dígitos válido (ex: 2026).',
        variant: 'destructive',
      })
      return
    }

    setCreatingAno(true)
    try {
      // Buscar faixas do ano de origem para clonar como base
      let faixasClonadas: FaixaProgressiva[] = []
      if (copiarAnoOrigem) {
        try {
          const origemRes = await getTabelaPorAno(Number(copiarAnoOrigem))
          if (origemRes && Array.isArray(origemRes.faixas)) {
            faixasClonadas = origemRes.faixas.map((f) => ({
              limite_inferior: f.limite_inferior ?? 0,
              limite_superior: f.limite_superior ?? null,
              aliquota: f.aliquota ?? 0,
              parcela_deduzir: f.parcela_deduzir ?? f.deducao ?? 0,
            }))
          }
        } catch (_) {
          faixasClonadas = []
        }
      }

      await salvarTabela(anoNum, {
        descricao: `Tabela Progressiva Anual IRPF ${anoNum}`,
        data_vigencia_inicio: `${anoNum}-01-01 00:00:00.000Z`,
        data_vigencia_fim: `${anoNum}-12-31 23:59:59.000Z`,
        faixas: faixasClonadas,
      })

      toast({
        title: 'Ano criado com sucesso',
        description: `Tabela para o ano ${anoNum} foi criada com ${faixasClonadas.length} faixas.`,
      })

      setNovoAnoModalOpen(false)
      await carregarAnos(anoNum)
      setAnoSelecionado(String(anoNum))
      await carregarTabelaAno(anoNum)
    } catch (err) {
      toast({
        title: 'Falha ao criar tabela para o ano',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCreatingAno(false)
    }
  }

  const handleExcluirAnoAtual = async () => {
    const anoNum = Number(anoSelecionado)
    setDeletingAno(true)
    try {
      await deleteTabelaPorAno(anoNum)
      toast({
        title: 'Ano excluído',
        description: `Tabela de ${anoNum} foi removida.`,
      })
      setDeleteAnoModalOpen(false)
      const novoAno = await carregarAnos(2025)
      setAnoSelecionado(novoAno)
      await carregarTabelaAno(Number(novoAno))
    } catch (err) {
      toast({
        title: 'Falha ao excluir ano',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeletingAno(false)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tabela IRPF
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold"
            >
              Super Admin
            </Badge>
          </div>
          <p className="text-sm text-slate-500">Faixas do imposto de renda — {anoSelecionado}</p>
        </div>

        {/* Ações do cabeçalho */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Ano */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
            <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">Ano:</span>
            <Select
              value={anoSelecionado}
              onValueChange={handleSelectAno}
              disabled={loadingAnos || loadingTabela}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs border-0 bg-transparent focus:ring-0 shadow-none font-semibold text-slate-800">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {anosDisponiveis.map((ano) => (
                  <SelectItem key={ano} value={String(ano)} className="text-xs">
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gerenciar anos: botão Novo Ano */}
          <Button
            onClick={abrirCriarAno}
            variant="outline"
            size="sm"
            className="h-10 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
            title="Adicionar ou copiar tabela para novo ano"
          >
            <CalendarPlus className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Gerenciar Anos</span>
          </Button>

          {/* Botão Nova Faixa (Verde escuro como na imagem) */}
          <Button
            onClick={abrirNovaFaixa}
            size="sm"
            className="h-10 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white gap-1.5 shadow-sm px-4"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Faixa</span>
          </Button>
        </div>
      </div>

      {/* Card da Tabela Principal */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        {loadingTabela ? (
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        ) : faixas.length === 0 ? (
          <CardContent className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma faixa cadastrada para {anoSelecionado}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Adicione a primeira faixa de incidência do imposto de renda ou copie de outro ano.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={abrirNovaFaixa}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Nova Faixa
              </Button>
              <Button variant="outline" onClick={abrirCriarAno} className="text-xs gap-1.5">
                <CalendarPlus className="w-4 h-4" />
                Copiar de outro ano
              </Button>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-semibold text-slate-600 py-4 px-6">
                    Ordem
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-4 px-6">
                    Valor Mínimo
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-4 px-6">
                    Valor Máximo
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-4 px-6">
                    Alíquota
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-4 px-6">
                    Parcela a Deduzir
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 py-4 px-6 text-right w-[120px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {faixas.map((faixa, index) => {
                  const ordem = index + 1
                  const isLastRow =
                    faixa.limite_superior === null || faixa.limite_superior === undefined
                  const valorMinFormatted = formatCurrency(faixa.limite_inferior ?? 0)
                  const valorMaxFormatted = isLastRow
                    ? '—'
                    : formatCurrency(faixa.limite_superior as number)
                  const aliquotaFormatted = formatPercentDisplay(faixa.aliquota)
                  const deducaoFormatted = formatCurrency(
                    faixa.parcela_deduzir ?? faixa.deducao ?? 0,
                  )

                  return (
                    <TableRow key={index} className="hover:bg-slate-50/70 transition-colors">
                      {/* Ordem */}
                      <TableCell className="py-4 px-6 text-xs text-slate-700 font-medium">
                        {ordem}
                      </TableCell>

                      {/* Valor Mínimo */}
                      <TableCell className="py-4 px-6 text-xs text-slate-800 font-medium font-mono tabular-nums">
                        {valorMinFormatted}
                      </TableCell>

                      {/* Valor Máximo */}
                      <TableCell className="py-4 px-6 text-xs text-slate-800 font-medium font-mono tabular-nums">
                        {valorMaxFormatted}
                      </TableCell>

                      {/* Alíquota */}
                      <TableCell className="py-4 px-6 text-xs text-slate-800 font-medium tabular-nums">
                        {aliquotaFormatted}
                      </TableCell>

                      {/* Parcela a Deduzir */}
                      <TableCell className="py-4 px-6 text-xs text-slate-800 font-medium font-mono tabular-nums">
                        {deducaoFormatted}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditarFaixa(index)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Editar Faixa"
                            aria-label={`Editar faixa ${ordem}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteFaixaIndex(index)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Excluir Faixa"
                            aria-label={`Excluir faixa ${ordem}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Rodapé informativo e ações adicionais de ano */}
        {faixas.length > 0 && !loadingTabela && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Total de {faixas.length} faixa{faixas.length > 1 ? 's' : ''} configurada
                {faixas.length > 1 ? 's' : ''} para o ano-calendário {anoSelecionado}.
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteAnoModalOpen(true)}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2.5"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir ano {anoSelecionado}
            </Button>
          </div>
        )}
      </Card>

      {/* ========================================================
          Modal: Nova Faixa / Editar Faixa
         ======================================================== */}
      <Dialog
        open={faixaModalOpen}
        onOpenChange={(open) => {
          setFaixaModalOpen(open)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-700" />
              {faixaModalMode === 'create'
                ? `Nova Faixa — ${anoSelecionado}`
                : `Editar Faixa ${editingFaixaIndex !== null ? editingFaixaIndex + 1 : ''} — ${anoSelecionado}`}
            </DialogTitle>
            <DialogDescription>
              Configure os limites de base de cálculo, alíquota e parcela a deduzir.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarFaixa} className="space-y-4 py-2">
            {/* Valor Mínimo */}
            <div className="space-y-1.5">
              <Label htmlFor="faixa-min" className="text-xs font-semibold text-slate-700">
                Valor Mínimo (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  R$
                </span>
                <Input
                  id="faixa-min"
                  placeholder="0,00"
                  value={faixaMin}
                  onChange={(e) => setFaixaMin(e.target.value)}
                  className="pl-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Checkbox: Aberto / Sem limite superior */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="faixa-max" className="text-xs font-semibold text-slate-700">
                  Valor Máximo (R$)
                </Label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={faixaIsOpenEnded}
                    onChange={(e) => {
                      setFaixaIsOpenEnded(e.target.checked)
                      if (e.target.checked) setFaixaMax('')
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Sem limite superior (Acima de...)</span>
                </label>
              </div>

              {!faixaIsOpenEnded && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    R$
                  </span>
                  <Input
                    id="faixa-max"
                    placeholder="ex: 60.000,00"
                    value={faixaMax}
                    onChange={(e) => setFaixaMax(e.target.value)}
                    className="pl-9 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Alíquota */}
            <div className="space-y-1.5">
              <Label htmlFor="faixa-aliq" className="text-xs font-semibold text-slate-700">
                Alíquota (%) *
              </Label>
              <div className="relative">
                <Input
                  id="faixa-aliq"
                  placeholder="ex: 7,5 ou 15 ou 27,5"
                  value={faixaAliq}
                  onChange={(e) => setFaixaAliq(e.target.value)}
                  className="pr-8 text-xs font-mono"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  %
                </span>
              </div>
            </div>

            {/* Parcela a Deduzir */}
            <div className="space-y-1.5">
              <Label htmlFor="faixa-ded" className="text-xs font-semibold text-slate-700">
                Parcela a Deduzir (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  R$
                </span>
                <Input
                  id="faixa-ded"
                  placeholder="0,00"
                  value={faixaDed}
                  onChange={(e) => setFaixaDed(e.target.value)}
                  className="pl-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaixaModalOpen(false)}
                disabled={savingFaixa}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs"
                disabled={savingFaixa}
              >
                {savingFaixa ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : faixaModalMode === 'create' ? (
                  'Adicionar Faixa'
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          Modal: Confirmar Exclusão de Faixa
         ======================================================== */}
      <Dialog
        open={deleteFaixaIndex !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteFaixaIndex(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              Excluir Faixa
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a faixa{' '}
              {deleteFaixaIndex !== null ? deleteFaixaIndex + 1 : ''} da tabela de {anoSelecionado}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteFaixaIndex(null)}
              disabled={deletingFaixa}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmExcluirFaixa}
              disabled={deletingFaixa}
              className="text-xs"
            >
              {deletingFaixa ? 'Excluindo...' : 'Excluir Faixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          Modal: Gerenciar Anos / Novo Ano
         ======================================================== */}
      <Dialog open={novoAnoModalOpen} onOpenChange={setNovoAnoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-emerald-700" />
              Criar Tabela para Novo Ano
            </DialogTitle>
            <DialogDescription>
              Crie uma entrada de ano-calendário clonando as faixas de um ano anterior ou iniciando
              vazia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarNovoAno} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-ano-input" className="text-xs font-semibold text-slate-700">
                Ano-calendário *
              </Label>
              <Input
                id="novo-ano-input"
                placeholder="ex: 2026"
                value={novoAnoInput}
                onChange={(e) => setNovoAnoInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Copiar faixas a partir de:
              </Label>
              <Select value={copiarAnoOrigem} onValueChange={setCopiarAnoOrigem}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o ano base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-slate-500">
                    (Não copiar, começar vazia)
                  </SelectItem>
                  {anosDisponiveis.map((ano) => (
                    <SelectItem key={ano} value={String(ano)} className="text-xs">
                      Tabela de {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                As faixas de base de cálculo, alíquotas e parcelas a deduzir serão duplicadas para o
                novo ano.
              </p>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNovoAnoModalOpen(false)}
                disabled={creatingAno}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs"
                disabled={creatingAno || !novoAnoInput}
              >
                {creatingAno ? 'Criando...' : 'Criar Ano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          Modal: Confirmar Exclusão de Ano Inteiro
         ======================================================== */}
      <Dialog open={deleteAnoModalOpen} onOpenChange={setDeleteAnoModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              Excluir Tabela de {anoSelecionado}
            </DialogTitle>
            <DialogDescription>
              Esta ação removerá permanentemente a tabela progressiva do ano-calendário{' '}
              <strong className="text-slate-800">{anoSelecionado}</strong> e todas as suas faixas
              associadas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteAnoModalOpen(false)}
              disabled={deletingAno}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExcluirAnoAtual}
              disabled={deletingAno}
              className="text-xs"
            >
              {deletingAno ? 'Excluindo...' : 'Sim, Excluir Ano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
