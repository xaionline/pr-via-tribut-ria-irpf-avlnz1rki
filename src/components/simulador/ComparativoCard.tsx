import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { useCountUp } from '@/hooks/use-count-up'
import type { SimulacaoResultados } from '@/types'

interface Props {
  result: SimulacaoResultados | null
}

export function ComparativoCard({ result }: Props) {
  const impostoOtimizado = useCountUp(result?.imposto_otimizado || 0, 500)
  const aliquotaOtimizada = useCountUp(result?.aliquota_otimizada || 0, 500)
  const economia = useCountUp(result?.economia || 0, 500)
  const roi = useCountUp(result?.roi || 0, 500)

  const impostoAtual = result?.imposto_atual || 0
  const aliquotaAtual = result?.aliquota_atual || 0
  const maxImposto = Math.max(impostoAtual, impostoOtimizado, 1)
  const atualPct = (impostoAtual / maxImposto) * 100
  const otimPct = (impostoOtimizado / maxImposto) * 100

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold">Comparativo: Antes vs. Depois</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-[420px]">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                Cenário Atual
              </p>
              <p className="text-xs text-slate-500">Imposto Devido</p>
              <p className="text-lg font-bold font-mono text-slate-900">
                {formatCurrency(impostoAtual)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Alíquota Efetiva</p>
              <p className="text-sm font-semibold font-mono text-slate-700">
                {aliquotaAtual.toFixed(2)}%
              </p>
            </div>
            <div className="flex-1 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <p className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider mb-1">
                Cenário Otimizado
              </p>
              <p className="text-xs text-slate-500">Imposto Devido</p>
              <p className="text-lg font-bold font-mono text-emerald-700">
                {formatCurrency(impostoOtimizado)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Alíquota Efetiva</p>
              <p className="text-sm font-semibold font-mono text-emerald-600">
                {aliquotaOtimizada.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-slate-300 rounded-lg transition-all duration-500"
            style={{ width: `${atualPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-lg opacity-70 transition-all duration-500"
            style={{ width: `${otimPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-200">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider">
                Economia
              </p>
              <p className="text-xl font-bold font-mono text-emerald-700">
                {formatCurrency(economia)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">ROI</p>
            <p className="text-lg font-bold font-mono text-slate-800">{roi.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
