import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { SimulacaoResultados } from '@/types'

interface Props {
  result: SimulacaoResultados | null
}

export function BreakdownTable({ result }: Props) {
  const rows = result?.breakdown || []

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold">Breakdown da Economia</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <th className="py-2 pr-2">Componente</th>
              <th className="py-2 px-2 text-right">Redução no Imposto</th>
              <th className="py-2 pl-2 text-right">% da economia total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  Sem dados de breakdown
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="py-2.5 pr-2 font-medium text-slate-700">{row.componente}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-800">
                    {formatCurrency(row.reducao)}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-mono text-slate-600">
                    {row.percentual}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
