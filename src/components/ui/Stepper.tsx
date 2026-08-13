import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  className,
}: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {steps.map((step, i) => {
          const state = i < currentStep ? 'completed' : i === currentStep ? 'current' : 'upcoming'
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium border-2 transition-colors',
                    state === 'completed' && 'bg-primary border-primary text-primary-foreground',
                    state === 'current' && 'bg-primary/10 border-primary text-primary',
                    state === 'upcoming' &&
                      'bg-muted border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {state === 'completed' ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 min-h-[24px] mt-1',
                      state === 'completed' ? 'bg-primary' : 'bg-muted-foreground/20',
                    )}
                  />
                )}
              </div>
              <div className="pb-4 pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center w-full', className)}>
      {steps.map((step, i) => {
        const state = i < currentStep ? 'completed' : i === currentStep ? 'current' : 'upcoming'
        return (
          <div key={i} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium border-2 transition-colors shrink-0',
                  state === 'completed' && 'bg-primary border-primary text-primary-foreground',
                  state === 'current' && 'bg-primary/10 border-primary text-primary',
                  state === 'upcoming' &&
                    'bg-muted border-muted-foreground/30 text-muted-foreground',
                )}
              >
                {state === 'completed' ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 transition-colors',
                  state === 'completed' ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
