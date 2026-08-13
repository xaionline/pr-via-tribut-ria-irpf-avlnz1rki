import { cn } from '@/lib/utils'
import type { CalcStep } from '@/lib/demonstrativo-calc'

interface Props {
  steps: CalcStep[]
}

export function CalculationSteps({ steps }: Props) {
  return (
    <section className="demo-section">
      <h2 className="text-sm font-bold text-slate-800 mb-3">Cálculo Passo a Passo</h2>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[3rem_1fr_140px] gap-2 px-3 py-2 bg-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
          <span>Nº</span>
          <span>Descrição</span>
          <span className="text-right">Valor</span>
        </div>
        <div className="divide-y divide-slate-100">
          {steps.map((step) => (
            <CalcRow key={step.num} step={step} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CalcRow({ step }: { step: CalcStep }) {
  return (
    <div
      className={cn(
        'calc-row group grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[3rem_1fr_140px] gap-2 px-3 py-2 transition-colors',
        step.isFinal ? 'bg-emerald-50' : 'even:bg-slate-50/50 hover:bg-slate-100',
      )}
    >
      <span className="text-xs font-mono text-slate-400">{step.num}</span>
      <span
        className={cn(
          'text-xs',
          step.isFinal
            ? 'font-bold text-emerald-800 text-sm'
            : step.isResult
              ? 'font-bold text-slate-800'
              : 'text-slate-600',
        )}
      >
        {step.label}
      </span>
      <span
        className={cn(
          'text-right font-mono',
          step.isFinal
            ? 'text-lg font-bold text-emerald-700'
            : step.isResult
              ? 'text-sm font-bold text-slate-800'
              : 'text-xs text-slate-700',
        )}
        style={{ fontFamily: 'serif' }}
      >
        {step.value}
      </span>
      {step.breakdown && step.breakdown.length > 0 && (
        <div className="col-span-3 hidden group-hover:block bg-slate-50 border-t border-slate-100 px-3 py-2 space-y-1">
          {step.breakdown.map((item, i) => (
            <div key={i} className="flex justify-between text-[10px] text-slate-500">
              <span>{item.label}</span>
              <span className="font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
