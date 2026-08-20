import { useState, ReactNode } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  title: string
  value: string | number
  microcopy: string
  icon: ReactNode
  trend?: string
  trendPositive?: boolean
  sparklineData: number[]
  alert?: boolean
  sparkColor?: string
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function KpiCard({
  title,
  value,
  microcopy,
  icon,
  trend,
  trendPositive,
  sparklineData,
  alert,
  sparkColor,
}: KpiCardProps) {
  const color = alert ? '#ef4444' : sparkColor || '#3b82f6'
  return (
    <Card
      className={cn(
        'border shadow-sm',
        alert ? 'bg-red-50 border-red-400' : 'bg-white border-slate-200',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              'text-[11px] font-medium uppercase tracking-wider',
              alert ? 'text-red-700' : 'text-slate-500',
            )}
          >
            {title}
          </span>
          <div
            className={cn(
              'p-1.5 rounded-md',
              alert ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600',
            )}
          >
            {icon}
          </div>
        </div>
        <div className="text-[1.3rem]">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-slate-400">{microcopy}</span>
          {trend && (
            <span
              className={cn(
                'text-[11px] font-semibold',
                trendPositive ? 'text-green-600' : 'text-red-500',
              )}
            >
              {trend}
            </span>
          )}
        </div>
        <div className="mt-2 h-8">
          <Sparkline data={sparklineData} color={color} />
        </div>
      </CardContent>
    </Card>
  )
}

export function KpiCarousel({ kpis }: { kpis: KpiCardProps[] }) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1"
        onScroll={(e) => {
          setActive(Math.round(e.currentTarget.scrollLeft / (280 + 12)))
        }}
      >
        {kpis.map((kpi, i) => (
          <div key={i} className="snap-center shrink-0 w-[280px]">
            <KpiCard {...kpi} />
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {kpis.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === active ? 'w-4 bg-slate-800' : 'w-1.5 bg-slate-300',
            )}
          />
        ))}
      </div>
    </div>
  )
}
