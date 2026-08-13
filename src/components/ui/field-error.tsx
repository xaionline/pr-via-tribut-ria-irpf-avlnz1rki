import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FieldErrorProps {
  message?: string
  className?: string
}

export function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null
  return (
    <div className={cn('flex items-center gap-1.5 mt-1 animate-fade-in', className)}>
      <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
      <p className="text-xs text-destructive">{message}</p>
    </div>
  )
}

export interface FieldWarningProps {
  message?: string
  className?: string
}

export function FieldWarning({ message, className }: FieldWarningProps) {
  if (!message) return null
  return (
    <div className={cn('flex items-center gap-1.5 mt-1 animate-fade-in', className)}>
      <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
      <p className="text-xs text-warning">{message}</p>
    </div>
  )
}
