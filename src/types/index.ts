export type CargoUser = 'admin' | 'consultor' | 'visualizador' | 'cliente' | 'super_admin'

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
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  logo?: string
  plano: 'starter' | 'pro' | 'enterprise'
  limite_clientes: number
  sessao_inatividade_min?: number
  ultima_revisao_politicas?: string
  ultimo_backup_status?: string
  created: string
  updated: string
}

/** Membro de equipe retornado pela rota de configurações. */
export interface MembroEquipeDTO {
  id: string
  email: string
  name: string
  escritorio_id?: string
  cargo: CargoUser
  ativo: boolean
  verified: boolean
  ultimo_acesso: string | null
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
  user_id?: string
  created: string
  updated: string
  expand?: {
    responsaveis?: UserRecord[]
    user_id?: UserRecord
  }
}

export type StatusDeclaracao = 'rascunho' | 'calculada' | 'revisada' | 'apresentada' | 'retificada'

export type ModalidadeDeclaracao = 'legal' | 'simplificada'

export interface DeclaracaoRecord {
  id: string
  escritorio_id: string
  cliente_id: string
  ano_calendario: number
  status: StatusDeclaracao
  modalidade?: ModalidadeDeclaracao
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
  origem?: 'manual' | 'importado'
  importacao_id?: string
  confianca?: number
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
  /** `null` na última faixa (acima de...). */
  limite_superior: number | null
  aliquota: number
  /** Parcela a deduzir da faixa, em base anual. */
  parcela_deduzir: number
  /** @deprecated use `parcela_deduzir` — mantido para compat com tabelas antigas. */
  deducao?: number
}

export interface TabelaProgressivaRecord {
  id: string
  /** @deprecated use `ano_calendario`. */
  ano?: number
  ano_calendario: number
  descricao?: string
  data_vigencia_inicio: string
  data_vigencia_fim?: string
  /** @deprecated use `data_vigencia_inicio`. */
  vigencia_de?: string
  /** @deprecated use `data_vigencia_fim`. */
  vigencia_ate?: string
  faixas: FaixaProgressiva[]
  created: string
  updated: string
}

export interface CenarioCalculo {
  modalidade: 'legal' | 'simplificada'
  base_calculo: number
  total_deducoes: number
  irrf_devido: number
  irrf_retido: number
  saldo_imposto: number
  destinacoes_aplicadas: number
}

export interface CalcularResponse {
  success: boolean
  legal: CenarioCalculo
  simplificada: CenarioCalculo
  recomendada: 'legal' | 'simplificada'
  resultado: {
    id: string
    base_calculo: number
    irrf_devido: number
    irrf_retido: number
    saldo_imposto: number
    destinacoes_aplicadas: number
  }
}

export interface DemonstrativoData {
  rendimento_tributavel: number
  deducoes: number
  base_calculo: number
  irrf_devido: number
  irrf_retido: number
  destinacoes_aplicadas: number
  saldo_imposto: number
  modalidade: string
}

export interface SetModalidadeResponse {
  success: boolean
  modalidade: string
  status: string
  demonstrativo: DemonstrativoData
}

export interface SimulacaoParams {
  pgbl_adicional: number
  destinacao: number
  dependentes: number
  despesas_medicas: number
  pensao_alimenticia: number
}

export interface SimulacaoBreakdownItem {
  componente: string
  reducao: number
  percentual: number
}

export interface SimulacaoResultados {
  imposto_atual: number
  aliquota_atual: number
  imposto_otimizado: number
  aliquota_otimizada: number
  economia: number
  roi: number
  breakdown: SimulacaoBreakdownItem[]
  recomendacao: string
}

export interface CenarioSimulacaoRecord {
  id: string
  declaracao_id: string
  nome: string
  params: SimulacaoParams
  resultados: SimulacaoResultados
  created: string
  updated: string
}
