export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    em_preenchimento: 'Em Preenchimento',
    calculada: 'Calculada',
    revisada: 'Revisada',
    concluida: 'Concluída',
    apresentada: 'Apresentada',
    entregue: 'Entregue',
    retificada: 'Retificada',
    ativo: 'Ativo',
    inativo: 'Inativo',
  }
  return labels[status] || status
}

export function getDeadline(anoCalendario: number): Date {
  return new Date(anoCalendario + 1, 4, 31)
}

export function daysUntilDeadline(anoCalendario: number): number {
  const deadline = getDeadline(anoCalendario)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = deadline.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getNextDeadlineInfo(): { date: Date; days: number } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const deadline = getDeadline(currentYear - 1)
  if (deadline.getTime() > now.getTime()) {
    return { date: deadline, days: daysUntilDeadline(currentYear - 1) }
  }
  const nextDeadline = getDeadline(currentYear)
  const diff = nextDeadline.getTime() - now.getTime()
  return { date: nextDeadline, days: Math.ceil(diff / (1000 * 60 * 60 * 24)) }
}

export function getStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'calculada':
    case 'revisada':
      return 'default'
    case 'concluida':
    case 'entregue':
    case 'apresentada':
      return 'secondary'
    case 'rascunho':
    case 'inativo':
      return 'outline'
    default:
      return 'default'
  }
}
