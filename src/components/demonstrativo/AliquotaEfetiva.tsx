import { formatCurrency } from '@/lib/formatters'
import type { ResultadoRecord, TabelaProgressivaRecord } from '@/types'

interface Props {
  resultado: ResultadoRecord
  tabela?: TabelaProgressivaRecord
}

export function AliquotaEfetiva({ resultado, tabela }: Props) {
  const det = resultado?.detalhamento || {}
  const legal = det.legal || {}
  const rendTrib = det.rendimento_tributavel ?? det.demonstrativo?.rendimento_tributavel ?? 0
  const irrfDevido = legal.irrf_devido ?? resultado.irrf_devido ?? 0
  const aliquotaEfetiva = rendTrib > 0 ? (irrfDevido / rendTrib) * 100 : 0

  const faixas = tabela?.faixas || []
  const maxAliquota = faixas.length > 0 ? Math.max(...faixas.map((f) => f.aliquota || 0)) : 27.5

  return (
    <section className="demo-section">
      <h2 className="text-sm font-bold text-slate-800 mb-3">Alíquota Efetiva</h2>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xs text-slate-500">Alíquota Efetiva:</span>
          <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'serif' }}>
            {aliquotaEfetiva.toFixed(2).replace('.', ',')}%
          </span>
        </div>
        <div className="space-y-1.5">
          {faixas.map((faixa, i) => {
            const pct = ((faixa.aliquota || 0) / maxAliquota) * 100
            const isCurrent =
              aliquotaEfetiva >= (faixa.limite_inferior || 0) * 12 &&
              (i === faixas.length - 1 ||
                aliquotaEfetiva < (faixas[i + 1].limite_inferior || 0) * 12)
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-20 truncate hidden sm:inline">
                  {formatCurrency((faixa.limite_inferior || 0) * 12)}
                </span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isCurrent ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-600 w-10 text-right">
                  {(faixa.aliquota || 0).toFixed(1)}%
                </span>
              </div>
            )
          })}
          {faixas.length === 0 && (
            <p className="text-xs text-slate-400">Tabela progressiva não disponível.</p>
          )}
        </div>
      </div>
    </section>
  )
}
