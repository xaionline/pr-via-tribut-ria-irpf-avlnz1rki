export function getStatusLabel(status: string): string {
  switch (status) {
    case 'rascunho':
      return 'Rascunho'
    case 'em_preenchimento':
      return 'Em preenchimento'
    case 'calculada':
      return 'Calculada'
    case 'concluida':
      return 'Concluída'
    case 'entregue':
      return 'Entregue'
    case 'ativo':
      return 'Ativo'
    case 'inativo':
      return 'Inativo'
    case 'pessoa_fisica':
      return 'Pessoa Física'
    case 'socio':
      return 'Sócio de Empresa'
    default:
      return status
  }
}

export function getDeadline(anoCalendario: number): Date {
  return new Date(anoCalendario + 1, 4, 28)
}

export function daysUntilDeadline(anoCalendario: number): number {
  const deadline = getDeadline(anoCalendario)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getNextDeadlineInfo(): { date: Date; days: number } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let year = now.getFullYear()
  let date = new Date(year, 4, 28)
  if (date < now) date = new Date(year + 1, 4, 28)
  const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { date, days }
}

export function getStatusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'calculada':
    case 'concluida':
    case 'ativo':
      return 'default'
    case 'em_preenchimento':
    case 'entregue':
      return 'secondary'
    case 'rascunho':
    case 'inativo':
      return 'outline'
    default:
      return 'secondary'
  }
}
