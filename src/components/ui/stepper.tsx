import { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StepperStep {
  id: string
  label: string
  description?: string
}

export interface StepperProps {
  steps: StepperStep[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

function StepIndicator({
  state,
  index,
}: {
  state: 'completed' | 'current' | 'upcoming'
  index: number
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full w-8 h-8 text-xs font-semibold transition-all duration-150 shrink-0',
        state === 'completed' && 'bg-primary text-primary-foreground',
        state === 'current' && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
        state === 'upcoming' && 'bg-muted text-muted-foreground border border-border',
      )}
    >
      {state === 'completed' ? <Check className="w-4 h-4" /> : index + 1}
    </div>
  )
}

export function Stepper({
  steps,
  currentStep,
  orientation = 'horizontal',
  className,
}: StepperProps) {
  const isVertical = orientation === 'vertical'

  if (isVertical) {
    return (
      <div className={cn('flex flex-col', className)}>
        {steps.map((step, i) => {
          const state: 'completed' | 'current' | 'upcoming' =
            i < currentStep ? 'completed' : i === currentStep ? 'current' : 'upcoming'
          return (
            <div key={step.id} className="flex gap-3 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <StepIndicator state={state} index={i} />
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 mt-1 min-h-[24px] transition-colors duration-150',
                      i < currentStep ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className="pt-1">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors duration-150',
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
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const state: 'completed' | 'current' | 'upcoming' =
          i < currentStep ? 'completed' : i === currentStep ? 'current' : 'upcoming'
        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <StepIndicator state={state} index={i} />
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-150 whitespace-nowrap',
                  state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-3 transition-colors duration-150',
                  i < currentStep ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
