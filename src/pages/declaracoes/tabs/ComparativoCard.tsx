import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import type { CenarioCalculo } from '@/types'

interface ScenarioCardProps {
  scenario: CenarioCalculo
  isRecomendada: boolean
  isEscolhida: boolean
  isVisualizador: boolean
  selecting: boolean
  onSelect: () => void
}

function ScenarioCard({
  scenario,
  isRecomendada,
  isEscolhida,
  isVisualizador,
  selecting,
  onSelect,
}: ScenarioCardProps) {
  const isRestituicao = scenario.saldo_imposto < 0
  return (
    <Card
      className={`relative border ${isRecomendada ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200/80'}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold capitalize">
            {scenario.modalidade === 'legal' ? 'Legal (Deduções)' : 'Simplificada'}
          </CardTitle>
          {isRecomendada && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1">
              <Check className="w-3 h-3" /> Recomendada
            </Badge>
          )}
          {isEscolhida && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
              Selecionada
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        <Row label="Base de cálculo" value={formatCurrency(scenario.base_calculo)} />
        <Row label="Total de deduções" value={formatCurrency(scenario.total_deducoes)} />
        <Row label="IRRF devido" value={formatCurrency(scenario.irrf_devido)} />
        <Row label="IRRF retido" value={formatCurrency(scenario.irrf_retido)} />
        <Row label="Destinações" value={formatCurrency(scenario.destinacoes_aplicadas)} />
        <div className="flex justify-between items-center pt-2 border-t mt-2">
          <span
            className={`font-semibold flex items-center gap-1 ${isRestituicao ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {isRestituicao ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {isRestituicao ? 'Restituição' : 'Imposto a pagar'}
          </span>
          <span
            className={`font-mono font-bold text-sm ${isRestituicao ? 'text-emerald-700' : 'text-rose-700'}`}
          >
            {formatCurrency(Math.abs(scenario.saldo_imposto))}
          </span>
        </div>
        {!isEscolhida && !isVisualizador && (
          <Button
            onClick={onSelect}
            disabled={selecting}
            size="sm"
            className={`w-full mt-3 text-xs ${isRecomendada ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-700 hover:bg-slate-800 text-white'}`}
          >
            {selecting
              ? 'Aplicando...'
              : `Escolher ${scenario.modalidade === 'legal' ? 'Legal' : 'Simplificada'}`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono font-semibold text-slate-800">{value}</span>
    </div>
  )
}

interface ComparativoCardProps {
  legal: CenarioCalculo
  simplificada: CenarioCalculo
  recomendada: 'legal' | 'simplificada'
  modalidadeEscolhida?: string
  onSelect: (modalidade: 'legal' | 'simplificada') => void
  isVisualizador: boolean
  selecting: boolean
}

export function ComparativoCard({
  legal,
  simplificada,
  recomendada,
  modalidadeEscolhida,
  onSelect,
  isVisualizador,
  selecting,
}: ComparativoCardProps) {
  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold">Comparativo: Legal vs. Simplificada</CardTitle>
        <p className="text-xs text-slate-500">
          Escolha a modalidade mais vantajosa. A recomendada oferece o menor saldo de imposto.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScenarioCard
            scenario={legal}
            isRecomendada={recomendada === 'legal'}
            isEscolhida={modalidadeEscolhida === 'legal'}
            isVisualizador={isVisualizador}
            selecting={selecting}
            onSelect={() => onSelect('legal')}
          />
          <ScenarioCard
            scenario={simplificada}
            isRecomendada={recomendada === 'simplificada'}
            isEscolhida={modalidadeEscolhida === 'simplificada'}
            isVisualizador={isVisualizador}
            selecting={selecting}
            onSelect={() => onSelect('simplificada')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
