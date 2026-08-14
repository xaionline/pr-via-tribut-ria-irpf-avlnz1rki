import { useEffect, useState } from 'react'
import { Calculator, Table2, RefreshCw, CalendarRange, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useToast } from '@/hooks/use-toast'
import { getTabelaPorAno, getTabelas } from '@/services/tabelas'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { FaixaProgressiva, TabelaProgressivaRecord } from '@/types'

type TabelaResponse = Awaited<ReturnType<typeof getTabelaPorAno>>

export default function TabelaProgressiva() {
  const { toast } = useToast()
  const [anos, setAnos] = useState<number[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState<string>('')
  const [tabela, setTabela] = useState<TabelaResponse | null>(null)
  const [loadingAnos, setLoadingAnos] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(false)

  // Carrega os anos disponíveis na collection
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoadingAnos(true)
      try {
        const list = await getTabelas()
        if (!active) return
        const anosUnicos = Array.from(
          new Set(list.map((t: TabelaProgressivaRecord) => t.ano_calendario)),
        ).sort((a, b) => b - a)
        setAnos(anosUnicos)
        if (anosUnicos.length > 0 && !anoSelecionado) {
          setAnoSelecionado(String(anosUnicos[0]))
        }
      } catch (err) {
        if (!active) return
        toast({
          title: 'Falha ao carregar anos disponíveis',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      } finally {
        if (active) setLoadingAnos(false)
      }
    })()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carrega a tabela do ano selecionado via hook de backend
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
    carregarTabela(Number(anoSelecionado))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSelecionado])

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
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Tabelas oficiais de incidência mensal do imposto de renda da pessoa física, por
            ano-calendário. Consulte alíquotas e parcelas a deduzir aplicáveis a cada faixa de base
            de cálculo.
          </p>
        </div>

        {/* Seletor de ano */}
        <div className="flex items-center gap-2 shrink-0">
          <CalendarRange className="w-4 h-4 text-slate-400" />
          <Select value={anoSelecionado} onValueChange={setAnoSelecionado} disabled={loadingAnos}>
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
        </div>
      </div>

      {/* Vigência */}
      {(vigenciaInicio || descricao) && !loading && !erro && (
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
      {loading ? (
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
    </div>
  )
}

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

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0%'
  const v = value.toFixed(value % 1 === 0 ? 0 : 2).replace('.', ',')
  return `${v}%`
}
