import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  Table2,
  RefreshCw,
  CalendarRange,
  Info,
  Pencil,
  Plus,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarPlus,
  TableProperties,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getTabelaPorAno, getTabelas, salvarTabela, deleteTabelaPorAno } from '@/services/tabelas'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { FaixaProgressiva } from '@/types'

type TabelaResponse = Awaited<ReturnType<typeof getTabelaPorAno>>

/** Faixa em edição — adiciona um id local estável para keys React. */
interface FaixaEdit extends FaixaProgressiva {
  _uid: string
}

let _uidCounter = 0
const nextUid = () => `faixa-${++_uidCounter}`

const EMPTY_FAIXA = (limiteInferior = 0): FaixaEdit => ({
  _uid: nextUid(),
  limite_inferior: limiteInferior,
  limite_superior: null,
  aliquota: 0,
  parcela_deduzir: 0,
})

const round2 = (v: number) => Math.round(v * 100) / 100

// ---------- parsing de moeda/percentual digitados em pt-BR ----------
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

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0%'
  const v = value.toFixed(value % 1 === 0 ? 0 : 2).replace('.', ',')
  return `${v}%`
}

// ---------- validação das faixas ----------
interface ValidationError {
  index: number
  field: string
  message: string
}

function validateFaixas(faixas: FaixaEdit[]): ValidationError[] {
  const errors: ValidationError[] = []
  if (faixas.length === 0) {
    return [{ index: -1, field: '', message: 'Adicione ao menos uma faixa.' }]
  }

  faixas.forEach((f, i) => {
    const isLast = i === faixas.length - 1
    if (f.limite_inferior === null || (f.limite_inferior as number) < 0) {
      errors.push({
        index: i,
        field: 'limite_inferior',
        message: `Faixa ${i + 1}: base "de" inválida.`,
      })
    }
    if (f.aliquota === null || (f.aliquota as number) < 0 || (f.aliquota as number) > 100) {
      errors.push({
        index: i,
        field: 'aliquota',
        message: `Faixa ${i + 1}: alíquota deve estar entre 0 e 100.`,
      })
    }
    if (f.parcela_deduzir === null || (f.parcela_deduzir as number) < 0) {
      errors.push({
        index: i,
        field: 'parcela_deduzir',
        message: `Faixa ${i + 1}: parcela a deduzir inválida.`,
      })
    }
    if (!isLast) {
      if (
        f.limite_superior === null ||
        (f.limite_superior as number) <= (f.limite_inferior as number)
      ) {
        errors.push({
          index: i,
          field: 'limite_superior',
          message: `Faixa ${i + 1}: limite superior deve ser maior que o inferior.`,
        })
      }
    } else if (f.limite_superior !== null && f.limite_superior !== undefined) {
      errors.push({
        index: i,
        field: 'limite_superior',
        message: `Faixa ${i + 1}: a última faixa deve ter limite superior vazio.`,
      })
    }
  })

  // contiguidade
  for (let i = 0; i < faixas.length - 1; i++) {
    const cur = faixas[i]
    const nxt = faixas[i + 1]
    if (
      cur.limite_superior === null ||
      nxt.limite_inferior === null ||
      cur.limite_superior === undefined ||
      nxt.limite_inferior === undefined
    )
      continue
    const expectedInf = round2((cur.limite_superior as number) + 0.01)
    if (Math.abs((nxt.limite_inferior as number) - expectedInf) > 0.001) {
      errors.push({
        index: i,
        field: 'limite_superior',
        message: `Faixas ${i + 1} e ${i + 2} não são contíguas: o "até" da faixa ${i + 1} deve ser 0,01 a menos que o "de" da faixa ${i + 2}.`,
      })
    }
  }

  return errors
}

export default function TabelaProgressiva() {
  const { toast } = useToast()
  const { isAdmin, isSuperAdmin } = useAuth()
  const canEdit = isAdmin || isSuperAdmin

  const [anos, setAnos] = useState<number[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState<string>('2025')
  const [tabela, setTabela] = useState<TabelaResponse | null>(null)
  const [loadingAnos, setLoadingAnos] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(false)

  // modo edição inline completa
  const [modoEdicao, setModoEdicao] = useState(false)
  const [faixasEdit, setFaixasEdit] = useState<FaixaEdit[]>([])
  const [descricaoEdit, setDescricaoEdit] = useState('')
  const [vigInicioEdit, setVigInicioEdit] = useState('')
  const [vigFimEdit, setVigFimEdit] = useState('')
  const [saving, setSaving] = useState(false)

  // dialog novo ano
  const [novoAnoOpen, setNovoAnoOpen] = useState(false)
  const [novoAnoValue, setNovoAnoValue] = useState('')
  const [novoAnoOrigem, setNovoAnoOrigem] = useState<string>('')

  // dialog excluir ano inteiro
  const [deleteAnoOpen, setDeleteAnoOpen] = useState(false)
  const [deletingAno, setDeletingAno] = useState(false)

  // dialog adicionar faixa individual rápida
  const [modalFaixaOpen, setModalFaixaOpen] = useState(false)
  const [modalFaixaMin, setModalFaixaMin] = useState('')
  const [modalFaixaMax, setModalFaixaMax] = useState('')
  const [modalFaixaIsOpenEnded, setModalFaixaIsOpenEnded] = useState(false)
  const [modalFaixaAliq, setModalFaixaAliq] = useState('')
  const [modalFaixaDed, setModalFaixaDed] = useState('')
  const [savingModalFaixa, setSavingModalFaixa] = useState(false)

  const carregarAnos = async (preferredAno?: number) => {
    setLoadingAnos(true)
    try {
      const list = await getTabelas()
      const anosRecuperados = Array.from(
        new Set(list.map((t) => t.ano_calendario || t.ano || 0)),
      ).filter((y) => y >= 1900 && y <= 2100)

      // Garantir ao menos 2024 e 2025 se a lista vier vazia
      const baseAnos = [2026, 2025, 2024]
      const anosUnicos = Array.from(new Set([...anosRecuperados, ...baseAnos])).sort(
        (a, b) => b - a,
      )
      setAnos(anosUnicos)

      const targetAno = preferredAno
        ? String(preferredAno)
        : anoSelecionado && anosUnicos.includes(Number(anoSelecionado))
          ? anoSelecionado
          : anosUnicos.includes(2025)
            ? '2025'
            : String(anosUnicos[0] || 2025)

      setAnoSelecionado(targetAno)
      return targetAno
    } catch (err) {
      toast({
        title: 'Falha ao carregar anos disponíveis',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      return '2025'
    } finally {
      setLoadingAnos(false)
    }
  }

  const carregarTabela = async (ano: number) => {
    setLoading(true)
    setErro(false)
    try {
      const res = await getTabelaPorAno(ano)
      if (res && res.success && Array.isArray(res.faixas)) {
        const sorted = [...res.faixas].sort(
          (a, b) => (a.limite_inferior ?? 0) - (b.limite_inferior ?? 0),
        )
        setTabela({ ...res, faixas: sorted })
      } else {
        setTabela({
          success: true,
          ano_calendario: ano,
          descricao: `Tabela Progressiva Anual IRPF ${ano}`,
          data_vigencia_inicio: `${ano}-01-01`,
          data_vigencia_fim: `${ano}-12-31`,
          faixas: [],
        })
      }
    } catch (err) {
      setTabela(null)
      setErro(true)
      toast({
        title: 'Falha ao carregar a tabela progressiva',
        description: getErrorMessage(err),
        variant: 'destructive',
        action: (
          <Button size="sm" variant="outline" onClick={() => carregarTabela(ano)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Repetir
          </Button>
        ),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarAnos().then((initialAno) => {
      if (initialAno) carregarTabela(Number(initialAno))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectAno = (novoAno: string) => {
    if (modoEdicao) setModoEdicao(false)
    setAnoSelecionado(novoAno)
    carregarTabela(Number(novoAno))
  }

  // ---------- modo edição em lote ----------
  const entrarEdicao = () => {
    if (!tabela) return
    setFaixasEdit(
      (tabela.faixas ?? []).map((f) => ({
        _uid: nextUid(),
        limite_inferior: f.limite_inferior ?? 0,
        limite_superior: f.limite_superior ?? null,
        aliquota: f.aliquota ?? 0,
        parcela_deduzir: f.parcela_deduzir ?? f.deducao ?? 0,
      })),
    )
    setDescricaoEdit(tabela.descricao || `Tabela Progressiva Anual IRPF ${anoSelecionado}`)
    setVigInicioEdit((tabela.data_vigencia_inicio ?? '').slice(0, 10) || `${anoSelecionado}-01-01`)
    setVigFimEdit((tabela.data_vigencia_fim ?? '').slice(0, 10) || `${anoSelecionado}-12-31`)
    setModoEdicao(true)
  }

  const cancelarEdicao = () => {
    setModoEdicao(false)
    setFaixasEdit([])
  }

  const updateFaixa = (uid: string, patch: Partial<FaixaEdit>) => {
    setFaixasEdit((prev) => prev.map((f) => (f._uid === uid ? { ...f, ...patch } : f)))
  }

  const adicionarFaixa = () => {
    setFaixasEdit((prev) => {
      const ultimo = prev[prev.length - 1]
      const novoLimiteInferior =
        ultimo && ultimo.limite_superior != null
          ? round2((ultimo.limite_superior as number) + 0.01)
          : 0
      return [...prev, EMPTY_FAIXA(novoLimiteInferior)]
    })
  }

  const removerFaixa = (uid: string) => {
    setFaixasEdit((prev) => {
      const filtradas = prev.filter((f) => f._uid !== uid)
      // Ajusta a nova última faixa para ser aberta
      if (filtradas.length > 0) {
        filtradas[filtradas.length - 1] = {
          ...filtradas[filtradas.length - 1],
          limite_superior: null,
        }
      }
      return filtradas
    })
  }

  const erros = useMemo(
    () => (modoEdicao ? validateFaixas(faixasEdit) : []),
    [modoEdicao, faixasEdit],
  )
  const temErros = erros.length > 0
  const erroPorFaixa = useMemo(() => {
    const map: Record<string, ValidationError[]> = {}
    erros.forEach((e) => {
      if (e.index < 0) return
      const uid = faixasEdit[e.index]?._uid
      if (!uid) return
      ;(map[uid] ||= []).push(e)
    })
    return map
  }, [erros, faixasEdit])

  const salvarModoEdicao = async () => {
    if (temErros) {
      toast({
        title: 'Não foi possível salvar',
        description: erros[0]?.message,
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        descricao: descricaoEdit,
        data_vigencia_inicio: vigInicioEdit ? `${vigInicioEdit} 00:00:00.000Z` : undefined,
        data_vigencia_fim: vigFimEdit ? `${vigFimEdit} 23:59:59.000Z` : undefined,
        faixas: faixasEdit.map(({ _uid, ...rest }) => rest),
      }
      const res = await salvarTabela(Number(anoSelecionado), payload)
      setTabela(res)
      setModoEdicao(false)
      await carregarAnos(Number(anoSelecionado))
      toast({
        title: 'Tabela atualizada',
        description: `As faixas de ${anoSelecionado} foram salvas com sucesso.`,
      })
    } catch (err) {
      toast({
        title: 'Falha ao salvar tabela',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // ---------- modal nova faixa individual ----------
  const abrirNovaFaixaModal = () => {
    const faixasAtuais = tabela?.faixas ?? []
    let sugeridoMin = 0
    if (faixasAtuais.length > 0) {
      const ultima = faixasAtuais[faixasAtuais.length - 1]
      if (ultima.limite_superior !== null && ultima.limite_superior !== undefined) {
        sugeridoMin = round2(Number(ultima.limite_superior) + 0.01)
      }
    }
    setModalFaixaMin(formatCurrencyInput(sugeridoMin))
    setModalFaixaMax('')
    setModalFaixaIsOpenEnded(faixasAtuais.length > 0)
    setModalFaixaAliq('')
    setModalFaixaDed('0,00')
    setModalFaixaOpen(true)
  }

  const salvarNovaFaixaIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    const minVal = parseNumber(modalFaixaMin)
    const maxVal = modalFaixaIsOpenEnded ? null : parseNumber(modalFaixaMax)
    const aliqVal = parseNumber(modalFaixaAliq)
    const dedVal = parseNumber(modalFaixaDed) ?? 0

    if (minVal === null || minVal < 0) {
      toast({
        title: 'Valor Mínimo inválido',
        description: 'Informe um valor mínimo válido maior ou igual a zero.',
        variant: 'destructive',
      })
      return
    }

    if (!modalFaixaIsOpenEnded && (maxVal === null || maxVal <= minVal)) {
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

    setSavingModalFaixa(true)
    try {
      const novaFaixa: FaixaProgressiva = {
        limite_inferior: minVal,
        limite_superior: modalFaixaIsOpenEnded ? null : maxVal,
        aliquota: aliqVal,
        parcela_deduzir: dedVal,
      }

      const lista = [...(tabela?.faixas ?? []), novaFaixa].sort(
        (a, b) => (a.limite_inferior ?? 0) - (b.limite_inferior ?? 0),
      )

      // Se a penúltima era aberta, fecha ela contiguamente
      for (let i = 0; i < lista.length - 1; i++) {
        if (lista[i].limite_superior === null || lista[i].limite_superior === undefined) {
          lista[i].limite_superior = round2((lista[i + 1].limite_inferior ?? 0) - 0.01)
        }
      }

      const res = await salvarTabela(Number(anoSelecionado), {
        descricao: tabela?.descricao || `Tabela Progressiva Anual IRPF ${anoSelecionado}`,
        data_vigencia_inicio:
          tabela?.data_vigencia_inicio || `${anoSelecionado}-01-01 00:00:00.000Z`,
        data_vigencia_fim: tabela?.data_vigencia_fim || `${anoSelecionado}-12-31 23:59:59.000Z`,
        faixas: lista,
      })

      setTabela(res)
      setModalFaixaOpen(false)
      toast({
        title: 'Faixa adicionada',
        description: `Faixa inserida com sucesso na tabela de ${anoSelecionado}.`,
      })
    } catch (err) {
      toast({
        title: 'Falha ao salvar faixa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingModalFaixa(false)
    }
  }

  // ---------- novo ano ----------
  const abrirNovoAno = () => {
    setNovoAnoValue('')
    setNovoAnoOrigem(anoSelecionado || String(anos[0] || '2025'))
    setNovoAnoOpen(true)
  }

  const confirmarNovoAno = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const ano = Number(novoAnoValue.replace(/\D/g, ''))
    if (!ano || ano < 1900 || ano > 2100) {
      toast({
        title: 'Ano inválido',
        description: 'Informe um ano de 4 dígitos válido (ex.: 2026).',
        variant: 'destructive',
      })
      return
    }
    if (anos.includes(ano)) {
      toast({
        title: 'Ano já existe',
        description: `Já existe uma tabela cadastrada para ${ano}.`,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      let faixasNovas: FaixaProgressiva[] = []
      if (novoAnoOrigem) {
        try {
          const origemRes = await getTabelaPorAno(Number(novoAnoOrigem))
          if (origemRes && Array.isArray(origemRes.faixas)) {
            faixasNovas = origemRes.faixas.map((f) => ({
              limite_inferior: f.limite_inferior ?? 0,
              limite_superior: f.limite_superior ?? null,
              aliquota: f.aliquota ?? 0,
              parcela_deduzir: f.parcela_deduzir ?? f.deducao ?? 0,
            }))
          }
        } catch (_) {
          faixasNovas = []
        }
      }

      const res = await salvarTabela(ano, {
        descricao: `Tabela Progressiva Anual IRPF ${ano}`,
        data_vigencia_inicio: `${ano}-01-01 00:00:00.000Z`,
        data_vigencia_fim: `${ano}-12-31 23:59:59.000Z`,
        faixas: faixasNovas,
      })

      setNovoAnoOpen(false)
      await carregarAnos(ano)
      setAnoSelecionado(String(ano))
      setTabela(res)
      toast({
        title: 'Ano criado com sucesso',
        description: faixasNovas.length
          ? `Tabela ${ano} criada com ${faixasNovas.length} faixas clonadas de ${novoAnoOrigem}.`
          : `Tabela ${ano} criada vazia.`,
      })
    } catch (err) {
      toast({
        title: 'Falha ao criar tabela para o ano',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // ---------- excluir ano ----------
  const handleExcluirAnoAtual = async () => {
    const anoNum = Number(anoSelecionado)
    setDeletingAno(true)
    try {
      await deleteTabelaPorAno(anoNum)
      toast({
        title: 'Ano excluído',
        description: `A tabela do ano-calendário ${anoNum} foi excluída.`,
      })
      setDeleteAnoOpen(false)
      const novoAno = await carregarAnos(2025)
      setAnoSelecionado(novoAno)
      await carregarTabela(Number(novoAno))
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

  const faixas = tabela?.faixas ?? []
  const descricao = tabela?.descricao
  const vigenciaInicio = tabela?.data_vigencia_inicio
  const vigenciaFim = tabela?.data_vigencia_fim

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Tabela Progressiva IRPF
            </h1>
            {isSuperAdmin && (
              <Badge
                variant="outline"
                className="ml-1 bg-emerald-50 text-emerald-700 border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                Super Admin
              </Badge>
            )}
            {modoEdicao && (
              <Badge className="ml-1 text-[10px] font-semibold border-amber-400/50 text-amber-700 bg-amber-50">
                Modo edição
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Tabela única oficial de incidência do IRPF por ano-calendário. Alíquotas e parcelas a
            deduzir utilizadas em todas as apurações e simulações do sistema.
          </p>
        </div>

        {/* Seletor de ano + ações */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
            <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">Ano:</span>
            <Select
              value={anoSelecionado}
              onValueChange={handleSelectAno}
              disabled={loadingAnos || modoEdicao}
            >
              <SelectTrigger className="w-[110px] h-8 text-xs border-0 bg-transparent focus:ring-0 shadow-none font-semibold text-slate-800">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {anos.map((ano) => (
                  <SelectItem key={ano} value={String(ano)} className="text-xs">
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && !modoEdicao && (
            <Button
              size="sm"
              variant="outline"
              className="h-10 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
              onClick={abrirNovoAno}
              title="Criar ou clonar tabela para outro ano"
            >
              <CalendarPlus className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Gerenciar Anos</span>
            </Button>
          )}

          {canEdit && !modoEdicao && tabela && (
            <Button
              size="sm"
              variant="outline"
              className="h-10 text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
              onClick={abrirNovaFaixaModal}
            >
              <Plus className="w-4 h-4" />
              <span>Nova Faixa</span>
            </Button>
          )}

          {canEdit && !modoEdicao && tabela && !loading && !erro && (
            <Button
              size="sm"
              variant="default"
              className="h-10 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              onClick={entrarEdicao}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar tabela</span>
            </Button>
          )}
        </div>
      </div>

      {/* Vigência / Metadados */}
      {(vigenciaInicio || descricao) && !loading && !erro && !modoEdicao && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {descricao && (
            <Badge
              variant="outline"
              className="text-[10px] font-medium border-emerald-500/40 text-emerald-700 bg-emerald-50"
            >
              {descricao}
            </Badge>
          )}
          {vigenciaInicio && (
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              Vigência: {formatDate(vigenciaInicio)}
              {vigenciaFim ? ` a ${formatDate(vigenciaFim)}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {modoEdicao ? (
        <TabelaEdicao
          ano={Number(anoSelecionado)}
          faixas={faixasEdit}
          descricao={descricaoEdit}
          vigInicio={vigInicioEdit}
          vigFim={vigFimEdit}
          erroPorFaixa={erroPorFaixa}
          temErros={temErros}
          erros={erros}
          saving={saving}
          onChangeFaixa={updateFaixa}
          onAddFaixa={adicionarFaixa}
          onRemoveFaixa={removerFaixa}
          onChangeDescricao={setDescricaoEdit}
          onChangeVigInicio={setVigInicioEdit}
          onChangeVigFim={setVigFimEdit}
          onSalvar={salvarModoEdicao}
          onCancelar={cancelarEdicao}
        />
      ) : loading ? (
        <TabelaSkeleton />
      ) : erro ? (
        <Card className="p-10 text-center border-dashed border-rose-200 bg-rose-50/40">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-6 h-6 text-rose-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Não foi possível carregar a tabela</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Verifique sua conexão e tente novamente.
          </p>
          <Button
            onClick={() => anoSelecionado && carregarTabela(Number(anoSelecionado))}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Repetir
          </Button>
        </Card>
      ) : faixas.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Table2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma faixa cadastrada para {anoSelecionado}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Adicione faixas de incidência ou copie a tabela de outro ano-calendário.
          </p>
          {canEdit && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                onClick={abrirNovaFaixaModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Faixa
              </Button>
              <Button onClick={entrarEdicao} variant="outline" className="text-xs gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Editar tabela
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Tabela — Desktop */}
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4 w-16">Faixa</th>
                    <th className="py-3 px-4">Base de Cálculo (de / até)</th>
                    <th className="py-3 px-4 text-right">Alíquota</th>
                    <th className="py-3 px-4 text-right">Parcela a Deduzir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faixas.map((faixa, idx) => (
                    <FaixaRow key={idx} faixa={faixa} index={idx} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé informativo / Exclusão de ano */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Total de {faixas.length} faixa{faixas.length > 1 ? 's' : ''} configurada
                  {faixas.length > 1 ? 's' : ''} para o ano-calendário {anoSelecionado}.
                </span>
              </div>

              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteAnoOpen(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2.5"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir ano {anoSelecionado}
                </Button>
              )}
            </div>
          </Card>

          {/* Cards — Mobile */}
          <div className="md:hidden space-y-3">
            {faixas.map((faixa, idx) => (
              <FaixaCard key={idx} faixa={faixa} index={idx} />
            ))}

            {canEdit && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteAnoOpen(true)}
                  className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir ano {anoSelecionado}
                </Button>
              </div>
            )}
          </div>

          {/* Nota explicativa de cálculo */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Os valores exibidos correspondem à base anual. O cálculo do imposto devido em cada
              faixa é feito aplicando a alíquota sobre a parcela da base de cálculo tributável e
              subtraindo a respectiva parcela a deduzir.
            </p>
          </div>
        </>
      )}

      {/* ========================================================
          Modal: Nova Faixa Individual Rápida
         ======================================================== */}
      <Dialog open={modalFaixaOpen} onOpenChange={setModalFaixaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-emerald-700" />
              Nova Faixa — {anoSelecionado}
            </DialogTitle>
            <DialogDescription>
              Insira os limites de base de cálculo, alíquota e parcela a deduzir.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={salvarNovaFaixaIndividual} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mfaixa-min" className="text-xs font-semibold text-slate-700">
                Valor Mínimo (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  R$
                </span>
                <Input
                  id="mfaixa-min"
                  placeholder="0,00"
                  value={modalFaixaMin}
                  onChange={(e) => setModalFaixaMin(e.target.value)}
                  className="pl-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="mfaixa-max" className="text-xs font-semibold text-slate-700">
                  Valor Máximo (R$)
                </Label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modalFaixaIsOpenEnded}
                    onChange={(e) => {
                      setModalFaixaIsOpenEnded(e.target.checked)
                      if (e.target.checked) setModalFaixaMax('')
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Sem limite superior (Acima de...)</span>
                </label>
              </div>

              {!modalFaixaIsOpenEnded && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                    R$
                  </span>
                  <Input
                    id="mfaixa-max"
                    placeholder="ex: 60.000,00"
                    value={modalFaixaMax}
                    onChange={(e) => setModalFaixaMax(e.target.value)}
                    className="pl-9 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mfaixa-aliq" className="text-xs font-semibold text-slate-700">
                Alíquota (%) *
              </Label>
              <div className="relative">
                <Input
                  id="mfaixa-aliq"
                  placeholder="ex: 7,5 ou 15 ou 27,5"
                  value={modalFaixaAliq}
                  onChange={(e) => setModalFaixaAliq(e.target.value)}
                  className="pr-8 text-xs font-mono"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mfaixa-ded" className="text-xs font-semibold text-slate-700">
                Parcela a Deduzir (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                  R$
                </span>
                <Input
                  id="mfaixa-ded"
                  placeholder="0,00"
                  value={modalFaixaDed}
                  onChange={(e) => setModalFaixaDed(e.target.value)}
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
                onClick={() => setModalFaixaOpen(false)}
                disabled={savingModalFaixa}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                disabled={savingModalFaixa}
              >
                {savingModalFaixa ? 'Salvando...' : 'Adicionar Faixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          Modal: Gerenciar Anos / Novo Ano
         ======================================================== */}
      <Dialog open={novoAnoOpen} onOpenChange={setNovoAnoOpen}>
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

          <form onSubmit={confirmarNovoAno} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-ano-input" className="text-xs font-semibold text-slate-700">
                Ano-calendário *
              </Label>
              <Input
                id="novo-ano-input"
                inputMode="numeric"
                placeholder="ex: 2026"
                value={novoAnoValue}
                onChange={(e) => setNovoAnoValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Copiar faixas a partir de:
              </Label>
              <Select value={novoAnoOrigem} onValueChange={setNovoAnoOrigem}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Selecione o ano base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-slate-500">
                    (Não copiar, começar vazia)
                  </SelectItem>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={String(ano)} className="text-xs">
                      Tabela de {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                As faixas de base de cálculo, alíquotas e parcelas a deduzir serão clonadas para o
                novo ano.
              </p>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNovoAnoOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                disabled={saving || !novoAnoValue}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {saving ? 'Criando...' : 'Criar Ano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          Modal: Confirmar Exclusão de Ano
         ======================================================== */}
      <Dialog open={deleteAnoOpen} onOpenChange={setDeleteAnoOpen}>
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
              onClick={() => setDeleteAnoOpen(false)}
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

// ============================================================
// Modo edição inline completo
// ============================================================

interface TabelaEdicaoProps {
  ano: number
  faixas: FaixaEdit[]
  descricao: string
  vigInicio: string
  vigFim: string
  erroPorFaixa: Record<string, ValidationError[]>
  temErros: boolean
  erros: ValidationError[]
  saving: boolean
  onChangeFaixa: (uid: string, patch: Partial<FaixaEdit>) => void
  onAddFaixa: () => void
  onRemoveFaixa: (uid: string) => void
  onChangeDescricao: (v: string) => void
  onChangeVigInicio: (v: string) => void
  onChangeVigFim: (v: string) => void
  onSalvar: () => void
  onCancelar: () => void
}

function TabelaEdicao(props: TabelaEdicaoProps) {
  const {
    ano,
    faixas,
    descricao,
    vigInicio,
    vigFim,
    erroPorFaixa,
    temErros,
    erros,
    saving,
    onChangeFaixa,
    onAddFaixa,
    onRemoveFaixa,
    onChangeDescricao,
    onChangeVigInicio,
    onChangeVigFim,
    onSalvar,
    onCancelar,
  } = props

  const errosGerais = erros.filter((e) => e.index < 0)

  return (
    <div className="space-y-4">
      {/* Meta do ano */}
      <Card className="p-4 border-amber-200 bg-amber-50/30">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-600">Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => onChangeDescricao(e.target.value)}
              placeholder={`Tabela Progressiva Anual IRPF ${ano}`}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-600">Vigência início</Label>
            <Input
              type="date"
              value={vigInicio}
              onChange={(e) => onChangeVigInicio(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-600">Vigência fim</Label>
            <Input
              type="date"
              value={vigFim}
              onChange={(e) => onChangeVigFim(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Tabela editável — Desktop */}
      <Card className="hidden md:block border-amber-300/70 bg-amber-50/20 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-amber-100/60 border-b border-amber-200 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4 w-16">Faixa</th>
                <th className="py-3 px-4 w-48">Base de Cálculo (De)</th>
                <th className="py-3 px-4 w-48">Base de Cálculo (Até)</th>
                <th className="py-3 px-4 w-32">Alíquota (%)</th>
                <th className="py-3 px-4 w-48">Parcela a Deduzir</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {faixas.map((faixa, idx) => {
                const errs = erroPorFaixa[faixa._uid] ?? []
                const errField = (field: string) => errs.find((e) => e.field === field)?.message
                const isLast = idx === faixas.length - 1
                return (
                  <tr key={faixa._uid} className="hover:bg-amber-50/40">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <CurrencyInput
                        value={faixa.limite_inferior}
                        onChange={(v) => onChangeFaixa(faixa._uid, { limite_inferior: v })}
                        error={errField('limite_inferior')}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <CurrencyInput
                        value={faixa.limite_superior}
                        onChange={(v) => onChangeFaixa(faixa._uid, { limite_superior: v })}
                        disabled={isLast}
                        placeholder={isLast ? 'Acima de...' : ''}
                        error={errField('limite_superior')}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <PercentInput
                        value={faixa.aliquota}
                        onChange={(v) => onChangeFaixa(faixa._uid, { aliquota: v })}
                        error={errField('aliquota')}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <CurrencyInput
                        value={faixa.parcela_deduzir}
                        onChange={(v) => onChangeFaixa(faixa._uid, { parcela_deduzir: v })}
                        error={errField('parcela_deduzir')}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => onRemoveFaixa(faixa._uid)}
                        title="Remover faixa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards editáveis — Mobile */}
      <div className="md:hidden space-y-3">
        {faixas.map((faixa, idx) => {
          const errs = erroPorFaixa[faixa._uid] ?? []
          const errField = (field: string) => errs.find((e) => e.field === field)?.message
          const isLast = idx === faixas.length - 1
          return (
            <Card key={faixa._uid} className="p-3 border-amber-300/70 bg-amber-50/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Faixa {idx + 1}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => onRemoveFaixa(faixa._uid)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="space-y-2.5">
                <MobileField label="Base (de)">
                  <CurrencyInput
                    value={faixa.limite_inferior}
                    onChange={(v) => onChangeFaixa(faixa._uid, { limite_inferior: v })}
                    error={errField('limite_inferior')}
                  />
                </MobileField>
                <MobileField label="Base (até)">
                  <CurrencyInput
                    value={faixa.limite_superior}
                    onChange={(v) => onChangeFaixa(faixa._uid, { limite_superior: v })}
                    disabled={isLast}
                    placeholder={isLast ? 'Acima de...' : ''}
                    error={errField('limite_superior')}
                  />
                </MobileField>
                <MobileField label="Alíquota (%)">
                  <PercentInput
                    value={faixa.aliquota}
                    onChange={(v) => onChangeFaixa(faixa._uid, { aliquota: v })}
                    error={errField('aliquota')}
                  />
                </MobileField>
                <MobileField label="Parcela a deduzir">
                  <CurrencyInput
                    value={faixa.parcela_deduzir}
                    onChange={(v) => onChangeFaixa(faixa._uid, { parcela_deduzir: v })}
                    error={errField('parcela_deduzir')}
                  />
                </MobileField>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 border-dashed"
          onClick={onAddFaixa}
          disabled={saving}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar faixa
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5"
          onClick={onCancelar}
          disabled={saving}
        >
          <X className="w-3.5 h-3.5" />
          Cancelar
        </Button>
        <Button
          size="sm"
          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onSalvar}
          disabled={saving || temErros}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>

      {/* Erros de validação */}
      {temErros && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-1">
          {errosGerais.length > 0
            ? errosGerais.map((e, i) => (
                <p key={i} className="text-[11px] text-rose-700 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {e.message}
                </p>
              ))
            : erros.slice(0, 5).map((e, i) => (
                <p key={i} className="text-[11px] text-rose-700 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {e.message}
                </p>
              ))}
          {erros.length > 5 && (
            <p className="text-[11px] text-rose-600">... e mais {erros.length - 5} erro(s).</p>
          )}
        </div>
      )}
    </div>
  )
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-slate-500">{label}</Label>
      {children}
    </div>
  )
}

// ---------- inputs formatados ----------
interface CurrencyInputProps {
  value: number | null
  onChange: (v: number | null) => void
  disabled?: boolean
  placeholder?: string
  error?: string
}

function CurrencyInput({ value, onChange, disabled, placeholder, error }: CurrencyInputProps) {
  const [text, setText] = useState<string>(() => formatCurrencyInput(value))

  useEffect(() => {
    const formatted = formatCurrencyInput(value)
    const parsed = parseNumber(text)
    if ((parsed ?? null) !== (value ?? null)) {
      setText(formatted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="space-y-0.5">
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
          R$
        </span>
        <Input
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            const raw = e.target.value
            setText(raw)
            onChange(parseNumber(raw))
          }}
          onBlur={() => {
            setText(formatCurrencyInput(value))
          }}
          className={`h-8 pl-8 text-xs font-mono tabular-nums ${
            error ? 'border-rose-400 focus-visible:ring-rose-300' : ''
          }`}
        />
      </div>
      {error && <p className="text-[10px] text-rose-600">{error}</p>}
    </div>
  )
}

interface PercentInputProps {
  value: number | null
  onChange: (v: number | null) => void
  error?: string
}

function PercentInput({ value, onChange, error }: PercentInputProps) {
  const [text, setText] = useState<string>(() => formatPercentInput(value))

  useEffect(() => {
    const formatted = formatPercentInput(value)
    const parsed = parseNumber(text)
    if ((parsed ?? null) !== (value ?? null)) {
      setText(formatted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="space-y-0.5">
      <div className="relative">
        <Input
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const raw = e.target.value
            setText(raw)
            onChange(parseNumber(raw))
          }}
          onBlur={() => setText(formatPercentInput(value))}
          className={`h-8 pr-5 text-xs font-mono tabular-nums ${
            error ? 'border-rose-400 focus-visible:ring-rose-300' : ''
          }`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          %
        </span>
      </div>
      {error && <p className="text-[10px] text-rose-600">{error}</p>}
    </div>
  )
}

// ============================================================
// Modo visualização
// ============================================================

function FaixaRow({ faixa, index }: { faixa: FaixaProgressiva; index: number }) {
  const isUltima = faixa.limite_superior === null || faixa.limite_superior === undefined
  const baseStr = isUltima
    ? `Acima de ${formatCurrency(faixa.limite_inferior)}`
    : `${formatCurrency(faixa.limite_inferior)} a ${formatCurrency(faixa.limite_superior)}`

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="py-3 px-4">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
          {index + 1}
        </span>
      </td>
      <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">{baseStr}</td>
      <td className="py-3 px-4 text-right font-semibold text-slate-800 tabular-nums">
        {formatPercent(faixa.aliquota)}
      </td>
      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
        {formatCurrency(faixa.parcela_deduzir ?? faixa.deducao ?? 0)}
      </td>
    </tr>
  )
}

function FaixaCard({ faixa, index }: { faixa: FaixaProgressiva; index: number }) {
  const isUltima = faixa.limite_superior === null || faixa.limite_superior === undefined
  const baseStr = isUltima
    ? `Acima de ${formatCurrency(faixa.limite_inferior)}`
    : `${formatCurrency(faixa.limite_inferior)} a ${formatCurrency(faixa.limite_superior)}`

  return (
    <Card className="p-3 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
            {index + 1}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Faixa {index + 1}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-semibold border-emerald-500/40 text-emerald-700 bg-emerald-50"
        >
          {formatPercent(faixa.aliquota)}
        </Badge>
      </div>
      <dl className="space-y-1.5">
        <div className="flex items-center justify-between">
          <dt className="text-[10px] text-slate-500">Base de cálculo</dt>
          <dd className="text-[11px] font-mono text-slate-700 tabular-nums">{baseStr}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[10px] text-slate-500">Parcela a deduzir</dt>
          <dd className="text-[11px] font-mono text-slate-700 tabular-nums">
            {formatCurrency(faixa.parcela_deduzir ?? faixa.deducao ?? 0)}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

function TabelaSkeleton() {
  return (
    <>
      <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-0">
          <Skeleton className="h-9 w-full rounded-none" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-t border-slate-100 px-4 py-3 flex items-center gap-4">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-12 ml-auto" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </Card>
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    </>
  )
}
