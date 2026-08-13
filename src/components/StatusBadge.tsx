import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { classes: string; label: string }> = {
  rascunho: {
    classes: 'bg-muted text-muted-foreground border-border',
    label: 'Rascunho',
  },
  calculada: {
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Calculada',
  },
  revisada: {
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    label: 'Revisada',
  },
  apresentada: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Apresentada',
  },
  retificada: {
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Retificada',
  },
  ativo: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Ativo',
  },
  inativo: {
    classes: 'bg-muted text-muted-foreground border-border',
    label: 'Inativo',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    classes: 'bg-muted text-muted-foreground border-border',
    label: status,
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border text-xs px-2.5 py-0.5 rounded-full transition-colors duration-150',
        config.classes,
        className,
      )}
    >
      {config.label}
    </Badge>
  )
}
