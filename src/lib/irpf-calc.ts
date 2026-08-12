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
