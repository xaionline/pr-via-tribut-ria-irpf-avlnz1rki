import { useEffect, useState } from 'react'
import {
  getRendimentos,
  getDependentes,
  getDespesas,
  getAtividadesRurais,
} from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface InlineLimitAlertsProps {
  declaracaoId: string
  refreshKey?: number
}

interface AlertItem {
  key: string
  message: string
}

const EDU_LIMIT_PER_DEPENDENT = 3561.5

export function InlineLimitAlerts({ declaracaoId, refreshKey }: InlineLimitAlertsProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    if (!declaracaoId) return
    let cancelled = false
    const fetchData = async () => {
      try {
        const [rends, deps, desps, rurais] = await Promise.all([
          getRendimentos(declaracaoId),
          getDependentes(declaracaoId),
          getDespesas(declaracaoId),
          getAtividadesRurais(declaracaoId),
        ])

        if (cancelled) return

        const rendTributavelSemRural = rends
          .filter((r) => r.tipo === 'tributavel')
          .reduce((s, r) => s + r.valor, 0)
        const ruralTributavel = rurais.reduce(
          (s, a) => s + (a.receita_bruta > 0 ? a.receita_bruta * 0.2 : 0),
          0,
        )
        const rendTributavel = rendTributavelSemRural + ruralTributavel

        const eduTotal = desps
          .filter((d) => d.categoria === 'educacao')
          .reduce((s, d) => s + d.valor, 0)

        const prevTotal = desps
          .filter((d) => d.categoria === 'previdencia')
          .reduce((s, d) => s + d.valor, 0)

        const newAlerts: AlertItem[] = []

        const eduLimit = deps.length * EDU_LIMIT_PER_DEPENDENT
        if (eduLimit > 0 && eduTotal < eduLimit) {
          newAlerts.push({
            key: 'edu',
            message: `Faltam ${formatCurrency(eduLimit - eduTotal)} para atingir o limite de instrução (${formatCurrency(EDU_LIMIT_PER_DEPENDENT)} por dependente)`,
          })
        }

        const prevLimit = rendTributavel * 0.12
        if (prevTotal > 0 && prevLimit > 0) {
          const pct = Math.min(100, Math.round((prevTotal / prevLimit) * 100))
          newAlerts.push({
            key: 'prev',
            message: `Aporte atual aproveita ${pct}% do limite de previdência privada`,
          })
        }

        setAlerts(newAlerts)
      } catch {
        /* intentionally ignored */
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [declaracaoId, refreshKey])

  if (alerts.length === 0) return null

  return (
    <div className="space-y-1.5 mb-3">
      {alerts.map((a) => (
        <Alert key={a.key} className="py-2 px-3 border-slate-200 bg-slate-50">
          <AlertDescription className="text-[11px] text-slate-600">{a.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
