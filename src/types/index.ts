export type CargoUser = 'admin' | 'consultor' | 'visualizador'

export interface UserRecord {
  id: string
  email: string
  name: string
  avatar?: string
  escritorio_id?: string
  cargo: CargoUser
  ativo: boolean
  created: string
  updated: string
}

export interface EscritorioRecord {
  id: string
  nome: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
  plano: 'starter' | 'pro' | 'enterprise'
  limite_clientes: number
  created: string
  updated: string
}

export interface ClienteRecord {
  id: string
  escritorio_id: string
  nome: string
  cpf: string
  email?: string
  telefone?: string
  data_nascimento?: string
  endereco?: string
  tipo: 'pessoa_fisica' | 'socio'
  status: 'ativo' | 'inativo'
  responsaveis?: string[]
  created: string
  updated: string
  expand?: {
    responsaveis?: UserRecord[]
  }
}

export type StatusDeclaracao = 'rascunho' | 'em_preenchimento' | 'concluida' | 'entregue'

export interface DeclaracaoRecord {
  id: string
  escritorio_id: string
  cliente_id: string
  ano_calendario: number
  status: StatusDeclaracao
  progresso: number
  created: string
  updated: string
  expand?: {
    cliente_id?: ClienteRecord
  }
}

export interface FontePagadoraRecord {
  id: string
  declaracao_id: string
  nome: string
  cnpj?: string
  tipo: 'salario' | 'aposentadoria' | 'pro_labore' | 'outros'
  created: string
  updated: string
}

export interface RendimentoRecord {
  id: string
  declaracao_id: string
  fonte_pagadora_id?: string
  descricao: string
  tipo: 'tributavel' | 'isento' | 'exclusiva'
  valor: number
  created: string
  updated: string
  expand?: {
    fonte_pagadora_id?: FontePagadoraRecord
  }
}

export interface DespesaDedutivelRecord {
  id: string
  declaracao_id: string
  categoria: 'saude' | 'educacao' | 'previdencia' | 'pensao' | 'dependentes' | 'outras'
  descricao: string
  valor: number
  created: string
  updated: string
}

export interface DependenteRecord {
  id: string
  declaracao_id: string
  nome: string
  cpf?: string
  data_nascimento?: string
  created: string
  updated: string
}

export interface AtividadeRuralRecord {
  id: string
  declaracao_id: string
  receita_bruta: number
  despesas: number
  resultado: number
  created: string
  updated: string
}

export interface DestinacaoFiscalRecord {
  id: string
  declaracao_id: string
  tipo: 'fundo_idoso' | 'fundo_crianca' | 'incentivos' | 'doacoes'
  valor: number
  created: string
  updated: string
}

export interface ResultadoRecord {
  id: string
  declaracao_id: string
  base_calculo: number
  irrf_devido: number
  irrf_retido: number
  saldo_imposto: number
  destinacoes_aplicadas: number
  detalhamento?: any
  created: string
  updated: string
}

export interface FaixaProgressiva {
  limite_inferior: number
  limite_superior: number
  aliquota: number
  deducao: number
}

export interface TabelaProgressivaRecord {
  id: string
  ano: number
  vigencia_de?: string
  vigencia_ate?: string
  faixas: FaixaProgressiva[]
  created: string
  updated: string
}
