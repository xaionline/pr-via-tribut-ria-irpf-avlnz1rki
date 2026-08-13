import { useState, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface RangeSliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange?: (value: number) => void
  label?: string
  unit?: string
  markers?: { value: number; label: string }[]
  className?: string
}

export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = 'R$',
  markers,
  className,
}: RangeSliderProps) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0]
    onChange?.(newValue)
    setInputValue(String(newValue))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    const numValue = Number(e.target.value)
    if (!Number.isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange?.(numValue)
    }
  }

  const handleInputBlur = () => {
    const numValue = Number(inputValue)
    if (Number.isNaN(numValue) || numValue < min) {
      setInputValue(String(min))
      onChange?.(min)
    } else if (numValue > max) {
      setInputValue(String(max))
      onChange?.(max)
    } else {
      setInputValue(String(numValue))
    }
  }

  return (
    <div className={cn('w-full space-y-3', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1">
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              min={min}
              max={max}
              step={step}
              className="h-8 w-24 text-right text-sm"
            />
          </div>
        </div>
      )}
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={handleSliderChange} />
      {markers && markers.length > 0 && (
        <div className="flex justify-between px-1">
          {markers.map((marker) => (
            <span
              key={marker.value}
              className={cn(
                'text-xs text-muted-foreground transition-colors duration-150',
                value >= marker.value && 'text-foreground font-medium',
              )}
            >
              {marker.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
