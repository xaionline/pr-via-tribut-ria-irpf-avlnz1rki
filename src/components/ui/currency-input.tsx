import { useState, useEffect, useRef, ChangeEvent } from 'react'
import { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps {
  value?: number
  onChange?: (value: number) => void
  placeholder?: string
  disabled?: boolean
  icon?: LucideIcon
  state?: 'default' | 'error' | 'warning' | 'success'
  errorMessage?: string
  className?: string
  id?: string
}

function formatCurrencyInput(val: number): string {
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseCurrencyInput(str: string): number {
  const cleaned = str.replace(/[^\d,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function CurrencyInput({
  value = 0,
  onChange,
  placeholder = '0,00',
  disabled,
  icon: Icon,
  state = 'default',
  errorMessage,
  className,
  id,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(formatCurrencyInput(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) {
      setDisplay(formatCurrencyInput(value))
    }
  }, [value])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const num = parseCurrencyInput(raw)
    setDisplay(raw)
    onChange?.(num)
  }

  const handleBlur = () => {
    focused.current = false
    const num = parseCurrencyInput(display)
    setDisplay(formatCurrencyInput(num))
    onChange?.(num)
  }

  const handleFocus = () => {
    focused.current = true
  }

  const stateClasses = {
    default: 'border-input focus-visible:ring-ring',
    error: 'border-destructive focus-visible:ring-destructive',
    warning: 'border-warning focus-visible:ring-warning',
    success: 'border-success focus-visible:ring-success',
  }

  return (
    <div className="w-full">
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        )}
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none font-mono">
          R$
        </div>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pl-12 text-monetary h-12 transition-colors duration-150',
            stateClasses[state],
            Icon && 'pl-16',
            className,
          )}
        />
      </div>
      {state === 'error' && errorMessage && (
        <p className="text-xs text-destructive mt-1 animate-fade-in">{errorMessage}</p>
      )}
      {state === 'warning' && errorMessage && (
        <p className="text-xs text-warning mt-1 animate-fade-in">{errorMessage}</p>
      )}
    </div>
  )
}
