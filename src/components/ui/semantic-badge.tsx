import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type SemanticBadgeVariant =
  | 'rascunho'
  | 'calculada'
  | 'revisada'
  | 'apresentada'
  | 'retificada'
  | 'em_preenchimento'
  | 'concluida'
  | 'entregue'
  | 'ativo'
  | 'inativo'
  | 'warning'
  | 'success'
  | 'info'
  | 'destructive'
  | 'default'

export interface SemanticBadgeProps {
  variant: SemanticBadgeVariant
  label?: string
  className?: string
}

const variantConfig: Record<SemanticBadgeVariant, { classes: string; defaultLabel: string }> = {
  rascunho: {
    classes: 'bg-muted text-muted-foreground border-border',
    defaultLabel: 'Rascunho',
  },
  calculada: {
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultLabel: 'Calculada',
  },
  revisada: {
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultLabel: 'Revisada',
  },
  apresentada: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultLabel: 'Apresentada',
  },
  retificada: {
    classes: 'bg-red-50 text-red-700 border-red-200',
    defaultLabel: 'Retificada',
  },
  em_preenchimento: {
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultLabel: 'Em Preenchimento',
  },
  concluida: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultLabel: 'Concluída',
  },
  entregue: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultLabel: 'Entregue',
  },
  ativo: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultLabel: 'Ativo',
  },
  inativo: {
    classes: 'bg-muted text-muted-foreground border-border',
    defaultLabel: 'Inativo',
  },
  warning: {
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultLabel: 'Atenção',
  },
  success: {
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultLabel: 'Sucesso',
  },
  info: {
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultLabel: 'Info',
  },
  destructive: {
    classes: 'bg-red-50 text-red-700 border-red-200',
    defaultLabel: 'Erro',
  },
  default: {
    classes: 'bg-muted text-muted-foreground border-border',
    defaultLabel: '',
  },
}

export function SemanticBadge({ variant, label, className }: SemanticBadgeProps) {
  const config = variantConfig[variant] || variantConfig.default
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border text-xs px-2.5 py-0.5 rounded-full transition-colors duration-150',
        config.classes,
        className,
      )}
    >
      {label || config.defaultLabel}
    </Badge>
  )
}
