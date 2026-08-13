import { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface InteractiveCardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
  onClick?: () => void
}

export function InteractiveCard({
  children,
  className,
  hoverable = true,
  onClick,
}: InteractiveCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'border shadow-subtle transition-all duration-150',
        hoverable && 'hover:shadow-elevation-hover hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </Card>
  )
}

export function InteractiveCardHeader({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <CardHeader className={cn('px-6 pt-6 pb-2', className)}>{children}</CardHeader>
}

export function InteractiveCardBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <CardContent className={cn('px-6 py-4', className)}>{children}</CardContent>
}

export function InteractiveCardFooter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <CardFooter className={cn('px-6 pb-6 pt-2', className)}>{children}</CardFooter>
}

export { CardTitle as InteractiveCardTitle, CardDescription as InteractiveCardDescription }
