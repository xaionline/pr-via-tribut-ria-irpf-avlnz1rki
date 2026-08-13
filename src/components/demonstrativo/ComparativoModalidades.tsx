import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters'
import type { ResultadoRecord } from '@/types'

interface Props {
  resultado: ResultadoRecord
}

export function ComparativoModalidades({ resultado }: Props) {
  const det = resultado?.detalhamento || {}
  const legal = det.legal || {}
  const simplificada = det.simplificada || {}

  const legalSaldo = legal.saldo_imposto ?? 0
  const simplSaldo = simplificada.saldo_imposto ?? 0
  const recomendada = legalSaldo <= simplSaldo ? 'legal' : 'simplificada'
  const economia = Math.abs(legalSaldo - simplSaldo)
  const recLabel = recomendada === 'legal' ? 'Dedução Legal' : 'Desconto Simplif.'

  const rows = [
    {
      modalidade: 'Dedução Legal',
      base: legal.base_calculo ?? 0,
      devido: legal.irrf_devido ?? 0,
      resultado: legalSaldo,
    },
    {
      modalidade: 'Desconto Simplif.',
      base: simplificada.base_calculo ?? 0,
      devido: simplificada.irrf_devido ?? 0,
      resultado: simplSaldo,
    },
  ]

  return (
    <section className="demo-section">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-800">Comparativo de Modalidades</h2>
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
          Modalidade recomendada: {recLabel} (economia de {formatCurrency(economia)})
        </Badge>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-100 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
              <th className="px-3 py-2 text-left">Modalidade</th>
              <th className="px-3 py-2 text-right">Base de Cálculo</th>
              <th className="px-3 py-2 text-right">Imposto Devido</th>
              <th className="px-3 py-2 text-right">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : ''}>
                <td className="px-3 py-2 font-semibold text-slate-700">{row.modalidade}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">
                  {formatCurrency(row.base)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">
                  {formatCurrency(row.devido)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-mono font-bold ${row.resultado < 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {formatCurrency(Math.abs(row.resultado))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
