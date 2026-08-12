import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: string
  trendPositive?: boolean
}

export function KpiCard({ title, value, subtitle, icon, trend, trendPositive }: KpiCardProps) {
  return (
    <Card className="border border-slate-200/80 shadow-subtle hover:shadow-elevation transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">{icon}</div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</div>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <span
                  className={`text-xs font-semibold ${
                    trendPositive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {trend}
                </span>
              )}
              {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
