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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
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
import { getTabelaPorAno, getTabelas, salvarTabela } from '@/services/tabelas'
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
// Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56".
function parseNumber(raw: string): number | null {
  if (raw === null || raw === undefined) return null
  const cleaned = String(raw)
    .replace(/[R$\s%]/g, '')
    .trim()
  if (cleaned === '') return null
  // Se tem vírgula, assume pt-BR: pontos = milhar, vírgula = decimal
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
  const { isAdmin } = useAuth()
  const [anos, setAnos] = useState<number[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState<string>('')
  const [tabela, setTabela] = useState<TabelaResponse | null>(null)
  const [loadingAnos, setLoadingAnos] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(false)

  // modo edição
  const [modoEdicao, setModoEdicao] = useState(false)
  const [faixasEdit, setFaixasEdit] = useState<FaixaEdit[]>([])
  const [descricaoEdit, setDescricaoEdit] = useState('')
  const [vigInicioEdit, setVigInicioEdit] = useState('')
  const [vigFimEdit, setVigFimEdit] = useState('')
  const [saving, setSaving] = useState(false)

  // dialog novo ano
  const [novoAnoOpen, setNovoAnoOpen] = useState(false)
  const [novoAnoValue, setNovoAnoValue] = useState('')
  const [novoAnoCopiar, setNovoAnoCopiar] = useState(true)

  const carregarAnos = async () => {
    setLoadingAnos(true)
    try {
      const list = await getTabelas()
      const anosUnicos = Array.from(new Set(list.map((t) => t.ano_calendario))).sort(
        (a, b) => b - a,
      )
      setAnos(anosUnicos)
      if (anosUnicos.length > 0 && !anoSelecionado) {
        setAnoSelecionado(String(anosUnicos[0]))
      }
    } catch (err) {
      toast({
        title: 'Falha ao carregar anos disponíveis',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoadingAnos(false)
    }
  }

  useEffect(() => {
    carregarAnos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carregarTabela = async (ano: number) => {
    setLoading(true)
    setErro(false)
    try {
      const res = await getTabelaPorAno(ano)
      setTabela(res)
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
    if (!anoSelecionado) return
    if (modoEdicao) setModoEdicao(false) // trocou de ano -> sai da edição
    carregarTabela(Number(anoSelecionado))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSelecionado])

  // ---------- edição ----------
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
    setDescricaoEdit(tabela.descricao ?? '')
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
      // a faixa que era "última" deixa de ser aberta — mantemos o limite_superior dela
      // como está (null) se não houver; ao adicionar nova última, a anterior passa a
      // precisar de um limite superior preenchido pelo admin.
      return [...prev, EMPTY_FAIXA(novoLimiteInferior)]
    })
  }

  const removerFaixa = (uid: string) => {
    setFaixasEdit((prev) => prev.filter((f) => f._uid !== uid))
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

  const salvar = async () => {
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
      await carregarAnos()
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

  // ---------- novo ano ----------
  const abrirNovoAno = () => {
    setNovoAnoValue('')
    setNovoAnoCopiar(true)
    setNovoAnoOpen(true)
  }

  const confirmarNovoAno = async () => {
    const ano = Number(novoAnoValue)
    if (!ano || !Number.isInteger(ano) || ano < 1900 || ano > 2100) {
      toast({
        title: 'Ano inválido',
        description: 'Informe um ano válido (ex.: 2026).',
        variant: 'destructive',
      })
      return
    }
    if (anos.includes(ano)) {
      toast({
        title: 'Ano já existe',
        description: `Já existe uma tabela para ${ano}.`,
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      let faixasNovas: FaixaProgressiva[] = []
      if (novoAnoCopiar) {
        // copia do ano mais recente existente
        try {
          const maisRecente = await getTabelaPorAno(anos[0])
          faixasNovas = (maisRecente.faixas ?? []).map((f) => ({
            limite_inferior: f.limite_inferior ?? 0,
            limite_superior: f.limite_superior ?? null,
            aliquota: f.aliquota ?? 0,
            parcela_deduzir: f.parcela_deduzir ?? f.deducao ?? 0,
          }))
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
      await carregarAnos()
      setAnoSelecionado(String(ano))
      setTabela(res)
      toast({
        title: 'Ano adicionado',
        description: faixasNovas.length
          ? `${ano} criado com ${faixasNovas.length} faixas (copiadas de ${anos[0]}).`
          : `${ano} criado vazio. Edite para adicionar faixas.`,
      })
    } catch (err) {
      toast({
        title: 'Falha ao adicionar ano',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tabela Progressiva IRPF
            </h1>
            {modoEdicao && (
              <Badge className="ml-1 text-[10px] font-semibold border-amber-400/50 text-amber-700 bg-amber-50">
                Modo edição
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Tabelas oficiais de incidência mensal do imposto de renda da pessoa física, por
            ano-calendário. Consulte alíquotas e parcelas a deduzir aplicáveis a cada faixa de base
            de cálculo.
          </p>
        </div>

        {/* Seletor de ano + ações admin */}
        <div className="flex items-center gap-2 shrink-0">
          <CalendarRange className="w-4 h-4 text-slate-400" />
          <Select
            value={anoSelecionado}
            onValueChange={setAnoSelecionado}
            disabled={loadingAnos || modoEdicao}
          >
            <SelectTrigger className="w-[140px] h-10 text-xs">
              <SelectValue placeholder="Ano-calendário" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((ano) => (
                <SelectItem key={ano} value={String(ano)} className="text-xs">
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && !modoEdicao && (
            <Button
              size="sm"
              variant="outline"
              className="h-10 text-xs gap-1.5"
              onClick={abrirNovoAno}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo ano
            </Button>
          )}

          {isAdmin && !modoEdicao && tabela && !loading && !erro && (
            <Button
              size="sm"
              variant="default"
              className="h-10 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={entrarEdicao}
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar tabela
            </Button>
          )}
        </div>
      </div>

      {/* Vigência */}
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
          onSalvar={salvar}
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
            Nenhuma tabela cadastrada para {anoSelecionado}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Selecione outro ano-calendário para consultar as faixas disponíveis.
          </p>
          {isAdmin && (
            <Button
              onClick={entrarEdicao}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Criar faixas
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Tabela — Desktop */}
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
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
          </Card>

          {/* Cards — Mobile */}
          <div className="md:hidden space-y-3">
            {faixas.map((faixa, idx) => (
              <FaixaCard key={idx} faixa={faixa} index={idx} />
            ))}
          </div>

          {/* Nota informativa */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Os valores exibidos correspondem à base anual. O cálculo do imposto devido em cada
              faixa é feito aplicando a alíquota sobre a parcela da base de cálculo que ultrapassar
              o limite inferior, deduzindo-se a parcela correspondente.
            </p>
          </div>
        </>
      )}

      {/* Dialog Novo Ano */}
      <Dialog open={novoAnoOpen} onOpenChange={setNovoAnoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
              Adicionar novo ano-calendário
            </DialogTitle>
            <DialogDescription>
              Crie uma nova tabela progressiva. Você poderá editar as faixas em seguida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="novo-ano" className="text-xs">
                Ano-calendário
              </Label>
              <Input
                id="novo-ano"
                inputMode="numeric"
                placeholder="ex.: 2026"
                value={novoAnoValue}
                onChange={(e) => setNovoAnoValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            {anos.length > 0 && (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-emerald-600"
                  checked={novoAnoCopiar}
                  onChange={(e) => setNovoAnoCopiar(e.target.checked)}
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  Copiar faixas do ano mais recente ({anos[0]}). Desmarque para começar vazio.
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNovoAnoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={confirmarNovoAno}
              disabled={saving || !novoAnoValue}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Criar ano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Modo edição
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
          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
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
  // estado de string local para permitir digitação livre
  const [text, setText] = useState<string>(() => formatCurrencyInput(value))

  useEffect(() => {
    // sincroniza quando o valor externo muda (ex.: copiar de ano)
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
            // reformata ao sair
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
        {formatCurrency(faixa.parcela_deduzir)}
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
            {formatCurrency(faixa.parcela_deduzir)}
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
