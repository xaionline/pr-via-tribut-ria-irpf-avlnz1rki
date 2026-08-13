import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  variant?: 'default' | 'error' | 'warning' | 'success'
  inputType?: 'text' | 'number' | 'currency' | 'date'
  label?: string
  error?: string
  hint?: string
}

const variantStyles: Record<string, string> = {
  default: 'border-input focus-visible:ring-ring focus-visible:border-ring',
  error: 'border-destructive focus-visible:ring-destructive focus-visible:border-destructive',
  warning: 'border-warning focus-visible:ring-warning focus-visible:border-warning',
  success: 'border-success focus-visible:ring-success focus-visible:border-success',
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      icon,
      variant = 'default',
      inputType = 'text',
      label,
      error,
      hint,
      onChange,
      ...props
    },
    ref,
  ) => {
    const actualType = inputType === 'currency' ? 'text' : inputType === 'date' ? 'date' : type
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (inputType === 'currency') {
        e.target.value = formatCurrencyInput(e.target.value)
      }
      onChange?.(e)
    }

    const inputEl = (
      <input
        type={actualType}
        className={cn(
          'flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          icon && 'pl-9',
          variantStyles[variant],
          inputType === 'currency' && 'font-mono tabular-nums',
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )

    const wrapped = icon ? (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {inputEl}
      </div>
    ) : (
      inputEl
    )

    if (label || error || hint) {
      return (
        <div className="space-y-1.5">
          {label && <label className="text-sm font-medium text-foreground">{label}</label>}
          {wrapped}
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      )
    }
    return wrapped
  },
)
Input.displayName = 'Input'

export function FloatingInput({
  label,
  className,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input
        className={cn(
          'peer flex h-14 w-full rounded-md border border-input bg-background px-3 pt-4 pb-1 text-sm ring-offset-background placeholder:text-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        placeholder={label}
        {...props}
      />
      <label className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs">
        {label}
      </label>
    </div>
  )
}

export { Input }
