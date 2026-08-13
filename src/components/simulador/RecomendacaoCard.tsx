import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'
import type { SimulacaoResultados } from '@/types'

interface Props {
  result: SimulacaoResultados | null
}

export function RecomendacaoCard({ result }: Props) {
  return (
    <Card className="border border-violet-200/80 shadow-subtle bg-violet-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-violet-600" />
          Recomendação Automatizada
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-700 leading-relaxed">
          {result?.recomendacao || 'Ajuste os parâmetros para gerar a recomendação.'}
        </p>
      </CardContent>
    </Card>
  )
}
