import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceDot } from 'recharts'
import { cn } from '@/lib/utils'

interface Props {
  data: Array<{ pgbl: number; economia: number }>
  currentPgbl: number
  currentEconomia: number
}

const chartConfig = {
  economia: { label: 'Economia tributária', color: 'hsl(160, 84%, 39%)' },
}

export function SensibilidadeChart({ data, currentPgbl, currentEconomia }: Props) {
  const [open, setOpen] = useState(false)

  const formatX = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)
  const formatY = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">Gráfico de Sensibilidade</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-7"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <div className={cn(open ? 'block' : 'hidden', 'lg:block')}>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <LineChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="pgbl"
                tickFormatter={formatX}
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
              />
              <YAxis tickFormatter={formatY} tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="economia"
                stroke="var(--color-economia)"
                strokeWidth={2}
                dot={false}
                type="monotone"
              />
              <ReferenceDot
                x={currentPgbl}
                y={currentEconomia}
                r={6}
                fill="#10b981"
                stroke="#fff"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            PGBL (R$) no eixo X • Economia tributária (R$) no eixo Y • Ponto verde = cenário atual
          </p>
        </CardContent>
      </div>
    </Card>
  )
}
