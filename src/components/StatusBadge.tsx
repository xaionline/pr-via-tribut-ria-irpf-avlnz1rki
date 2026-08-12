import { Badge } from '@/components/ui/badge'
import { getStatusLabel } from '@/lib/irpf-calc'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200'

  switch (status) {
    case 'calculada':
      colorClasses = 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
      break
    case 'concluida':
    case 'ativo':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
      break
    case 'em_preenchimento':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      break
    case 'entregue':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
      break
    case 'rascunho':
    case 'inativo':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200'
      break
  }

  return (
    <Badge
      variant="outline"
      className={`font-medium border text-xs px-2.5 py-0.5 rounded-full ${colorClasses}`}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}
