import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getResultado, updateDeclaracao, setModalidade } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import type { DeclaracaoRecord, ResultadoRecord, CalcularResponse, CenarioCalculo } from '@/types'
import { TrendingDown, TrendingUp, DollarSign, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ComparativoCard } from './ComparativoCard'
import { DemonstrativoCard } from './DemonstrativoCard'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface TabVisaoGeralProps {
  declaracao: DeclaracaoRecord
  onRefresh: () => void
  calcResult?: CalcularResponse | null
  isVisualizador: boolean
}

export default function TabVisaoGeral({
  declaracao,
  onRefresh,
  calcResult,
  isVisualizador,
}: TabVisaoGeralProps) {
  const [resultado, setResultado] = useState<ResultadoRecord | null>(null)
  const [selectingModalidade, setSelectingModalidade] = useState(false)
  const [trocarModalidade, setTrocarModalidade] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    getResultado(declaracao.id)
      .then(setResultado)
      .catch(() => setResultado(null))
  }, [declaracao.id, calcResult])

  const detalhamentoRaw = resultado?.detalhamento
  const detalhamento =
    typeof detalhamentoRaw === 'string'
      ? (() => {
          try {
            return JSON.parse(detalhamentoRaw)
          } catch (_) {
            return undefined
          }
        })()
      : detalhamentoRaw
  const legalScenario: CenarioCalculo | undefined = calcResult?.legal || detalhamento?.legal
  const simpScenario: CenarioCalculo | undefined =
    calcResult?.simplificada || detalhamento?.simplificada
  const recomendada = calcResult?.recomendada || detalhamento?.recomendada
  const hasComparative = !!(legalScenario && simpScenario)
  const modalidadeEscolhida = declaracao.modalidade || ''
  const showComparative = hasComparative && (!modalidadeEscolhida || trocarModalidade)
  const showDemonstrativo = hasComparative && modalidadeEscolhida && !trocarModalidade

  const displaySaldo = modalidadeEscolhida
    ? resultado?.saldo_imposto
    : recomendada === 'simplificada'
      ? simpScenario?.saldo_imposto
      : legalScenario?.saldo_imposto
  const isRestituicao = displaySaldo !== undefined && displaySaldo < 0
  const resultLabel = modalidadeEscolhida
    ? isRestituicao
      ? 'Restituição a receber'
      : 'Imposto a pagar'
    : hasComparative
      ? 'Aguardando escolha'
      : 'Aguardando cálculo'

  const handleStatusChange = async (newStatus: string) => {
    if (isVisualizador) return
    try {
      await updateDeclaracao(declaracao.id, { status: newStatus as any })
      toast({ title: 'Status atualizado' })
      onRefresh()
    } catch (err) {
      toast({
        title: 'Falha ao atualizar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleSelectModalidade = async (modalidade: 'legal' | 'simplificada') => {
    setSelectingModalidade(true)
    try {
      await setModalidade(declaracao.id, modalidade)
      toast({ title: 'Modalidade selecionada', description: 'Status atualizado para Calculada' })
      setTrocarModalidade(false)
      onRefresh()
    } catch (err) {
      toast({
        title: 'Falha ao selecionar modalidade',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSelectingModalidade(false)
    }
  }

  return (
    <div className="space-y-6">
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1"
      >
        <CheckCircle2 className="w-3 h-3" /> Salvo automaticamente
      </Badge>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Status Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={declaracao.status}
              onValueChange={handleStatusChange}
              disabled={isVisualizador}
            >
              <SelectTrigger className="h-9 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="calculada">Calculada</SelectItem>
                <SelectItem value="revisada">Revisada</SelectItem>
                <SelectItem value="apresentada">Apresentada</SelectItem>
                <SelectItem value="retificada">Retificada</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {declaracao.progresso}%
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${declaracao.progresso}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border ${isRestituicao ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5">
              {isRestituicao ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              )}
              <span>Resultado da Prévia</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${isRestituicao ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              {displaySaldo !== undefined ? formatCurrency(Math.abs(displaySaldo)) : 'R$ 0,00'}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">{resultLabel}</p>
          </CardContent>
        </Card>
      </div>

      {showComparative && legalScenario && simpScenario && recomendada && (
        <ComparativoCard
          legal={legalScenario}
          simplificada={simpScenario}
          recomendada={recomendada}
          modalidadeEscolhida={modalidadeEscolhida}
          onSelect={handleSelectModalidade}
          isVisualizador={isVisualizador}
          selecting={selectingModalidade}
        />
      )}

      {showDemonstrativo && detalhamento && (
        <DemonstrativoCard
          detalhamento={detalhamento}
          modalidade={modalidadeEscolhida}
          onTrocar={() => setTrocarModalidade(true)}
          isVisualizador={isVisualizador}
        />
      )}

      {resultado && !showComparative && !showDemonstrativo && (
        <Card className="border border-slate-200/80 shadow-subtle">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Detalhamento do Cálculo IRPF</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">Base de Cálculo</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.base_calculo)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">IRRF Devido</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.irrf_devido)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">IRRF Retido na Fonte</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.irrf_retido)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">Destinações Aplicadas</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.destinacoes_aplicadas)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
