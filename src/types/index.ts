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

export type TipoRendimento = 'tributavel' | 'isento' | 'exclusiva' | 'dividendos' | 'exterior'

export interface RendimentoRecord {
  id: string
  declaracao_id: string
  fonte_pagadora_id?: string
  descricao: string
  tipo: TipoRendimento
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

export type TipoIrrf = 'irrf_comum' | 'irpfm_exercicio'

export interface IrrfRecord {
  id: string
  declaracao_id: string
  fonte_pagadora: string
  cnpj_fonte?: string
  valor: number
  tipo?: TipoIrrf
  created: string
  updated: string
}

export interface AltasRendasParametroRecord {
  id: string
  ano_calendario: number
  aliquota: number
  created: string
  updated: string
}

export interface AltasRendasApuracaoCalculo {
  rendimentos_tributaveis: number
  dividendos: number
  receita_rural: number
  receita_exterior: number
  bc_irpfm: number
  aliquota_perc: number
  irpfm_devido: number
  irrf_retido: number
  irpfm_retido_exercicio: number
  total_a_pagar: number
  total_a_restituir: number
  carga_tributaria_perc: number
  ano_calendario: number
  is_fallback_ano?: boolean
  ano_utilizado?: number
}

export interface IbsCbsParametroRecord {
  id: string
  ano_calendario: number
  iva_padrao: number
  reducao_percentual: number
  presuncao_bc: number
  funrural: number
  created: string
  updated: string
}

export interface IbsCbsApuracaoCalculo {
  receita_bruta: number
  despesa_bruta: number
  resultado_liquido: number
  presuncao_bc_perc: number
  base_calculo: number
  iva_padrao_perc: number
  reducao_percentual: number
  iva_reduzido_perc: number
  debito_ibs_cbs: number
  credito_ibs_cbs: number
  funrural_perc: number
  funrural_valor: number
  total_tributos: number
  carga_tributaria_perc: number
  ano_calendario: number
  is_fallback_ano?: boolean
  ano_utilizado?: number
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

// ==========================================
// MÓDULO PESSOA JURÍDICA (PJ) E TABELAS
// ==========================================

export type RegimeTributarioPJ = 'simples' | 'presumido' | 'real'
export type AnexoSimplesNacional = 'I' | 'II' | 'III' | 'IV' | 'V'

export interface EmpresaRecord {
  id: string
  escritorio_id: string
  razao_social: string
  cnpj: string
  regime: RegimeTributarioPJ
  atividade?: string
  anexo_simples?: AnexoSimplesNacional
  data_abertura?: string
  created: string
  updated: string
  expand?: {
    escritorio_id?: EscritorioRecord
  }
}

export interface EmpresaSocioRecord {
  id: string
  empresa_id: string
  cliente_id: string
  percentual_participacao: number
  pro_labore_mensal?: number
  participa_lucros?: boolean
  participa_jcp?: boolean
  created: string
  updated: string
  expand?: {
    cliente_id?: ClienteRecord
    empresa_id?: EmpresaRecord
  }
}

export type CategoriaInsumoReal = 'comercial_servico' | 'rural_agro' | 'monofasico' | 'imobilizado'

export type TipoCreditoInsumo = 'padrao' | 'presumido' | 'isento_vedado' | 'depreciacao'

export interface InsumoAgroItem {
  produto_codigo: string // ex: 'soja', 'milho', 'cana_de_acucar'
  produto_nome?: string
  valor: number
  percentual_presumido_pis?: number
  percentual_presumido_cofins?: number
  aliquota_efetiva_pis?: number
  aliquota_efetiva_cofins?: number
}

export interface InsumosDetalhadosMes {
  comercial_servico: number
  rural_agro: {
    total: number
    itens: InsumoAgroItem[]
  }
  monofasico: number
  imobilizado: number
  outros_creditos?: number
  observacao?: string
}

export interface EmpresaFaturamentoRecord {
  id: string
  empresa_id: string
  ano_calendario: number
  mes: number
  receita_bruta: number
  folha?: number
  lucro_contabil?: number
  adicoes_lalur?: number
  exclusoes_lalur?: number
  compras_insumos?: number
  outros_creditos_pis_cofins?: number
  insumos_detalhados?: InsumosDetalhadosMes
  created: string
  updated: string
}

export interface TabelaInsumoRealRecord {
  id: string
  ano: number
  categoria: CategoriaInsumoReal
  descricao: string
  aliquota_credito_pis: number
  aliquota_credito_cofins: number
  permite_credito?: boolean
  tipo_credito: TipoCreditoInsumo
  observacao?: string
  created: string
  updated: string
}

export interface TabelaProdutoAgroRecord {
  id: string
  ano: number
  codigo: string
  nome: string
  percentual_presumido_pis: number
  percentual_presumido_cofins: number
  aliquota_efetiva_pis: number
  aliquota_efetiva_cofins: number
  ncm?: string
  base_legal?: string
  created: string
  updated: string
}

export interface FaixaSimplesNacional {
  faixa?: number
  faixa_inicial: number
  faixa_final: number
  aliquota: number
  parcela_deduzir: number
}

export interface TabelaSimplesRecord {
  id: string
  ano: number
  anexo: AnexoSimplesNacional
  faixas: FaixaSimplesNacional[]
  aliquota?: number
  parcela_deduzir?: number
  created: string
  updated: string
}

export interface TabelaPresumidoRecord {
  id: string
  ano: number
  atividade: string
  presuncao_irpj: number
  presuncao_csll: number
  created: string
  updated: string
}

export interface TabelaIrpjCsllRecord {
  id: string
  ano: number
  aliquota_irpj: number
  adicional_irpj: number
  limite_adicional: number
  aliquota_csll: number
  created: string
  updated: string
}

export interface TabelaIssRecord {
  id: string
  ano: number
  aliquota: number
  municipio?: string
  uf?: string
  created: string
  updated: string
}

export interface TabelaPisCofinsRealRecord {
  id: string
  ano: number
  aliquota_pis: number
  aliquota_cofins: number
  aliquota_credito_pis: number
  aliquota_credito_cofins: number
  observacao?: string
  created: string
  updated: string
}

// Estruturas de Apuração e Distribuição PJ
export interface ApuracaoSimplesMes {
  mes: number
  receita_bruta: number
  folha: number
  rbt12: number
  folha12: number
  fator_r?: number
  anexo_aplicado: AnexoSimplesNacional
  faixa: number
  aliquota_nominal: number
  parcela_deduzir: number
  aliquota_efetiva: number
  valor_das: number
}

export interface ApuracaoSimplesAnual {
  ano_calendario: number
  regime: 'simples'
  receita_bruta_anual: number
  folha_anual: number
  total_das: number
  aliquota_efetiva_media: number
  meses: ApuracaoSimplesMes[]
  lucro_apurado_estimado: number
  lucro_distribuivel: number
}

export interface ApuracaoPresumidoTrimestre {
  trimestre: number
  meses: number[]
  receita_bruta: number
  presuncao_irpj_perc: number
  base_calculo_irpj: number
  irpj_basico: number
  irpj_adicional: number
  irpj_total: number
  presuncao_csll_perc: number
  base_calculo_csll: number
  csll_total: number
  pis_total: number // 0.65%
  cofins_total: number // 3.00%
  iss_total: number
  total_tributos_trimestre: number
  aliquota_efetiva_trimestre: number
}

export interface ApuracaoPresumidoAnual {
  ano_calendario: number
  regime: 'presumido'
  receita_bruta_anual: number
  folha_anual: number
  total_irpj: number
  total_csll: number
  total_pis: number
  total_cofins: number
  total_iss: number
  total_tributos_pj: number
  aliquota_efetiva_anual: number
  trimestres: ApuracaoPresumidoTrimestre[]
  lucro_presumido_isento_maximo: number
  lucro_apurado_estimado: number
  lucro_distribuivel: number
}

export interface DetalheCreditosInsumos {
  comercial_servico: {
    base: number
    aliquota_pis: number
    aliquota_cofins: number
    credito_pis: number
    credito_cofins: number
  }
  rural_agro: {
    base: number
    credito_pis: number
    credito_cofins: number
    itens: {
      produto_codigo: string
      produto_nome: string
      base: number
      aliquota_efetiva_pis: number
      aliquota_efetiva_cofins: number
      credito_pis: number
      credito_cofins: number
    }[]
  }
  monofasico: {
    base: number
    credito_pis: number
    credito_cofins: number
  }
  imobilizado: {
    base: number
    aliquota_pis: number
    aliquota_cofins: number
    credito_pis: number
    credito_cofins: number
  }
  outros_creditos: {
    base: number
    credito_pis: number
    credito_cofins: number
  }
  total_base_creditos: number
  total_credito_pis: number
  total_credito_cofins: number
  total_creditos: number
}

export interface ApuracaoLucroRealTrimestre {
  trimestre: number
  meses: number[]
  receita_bruta: number
  lucro_contabil: number
  adicoes_lalur: number
  exclusoes_lalur: number
  lucro_real_base: number // Lalur (Contábil + Adições - Exclusões)
  irpj_basico: number // 15%
  irpj_adicional: number // 10% sobre o que exceder R$ 60k
  irpj_total: number
  csll_total: number // 9% sobre Lalur
  pis_debito: number // 1.65% s/ receita
  pis_credito: number // s/ insumos por categoria e produto agro
  pis_liquido: number
  cofins_debito: number // 7.60% s/ receita
  cofins_credito: number // s/ insumos por categoria e produto agro
  cofins_liquido: number
  detalhe_creditos?: DetalheCreditosInsumos
  iss_total: number
  total_tributos_trimestre: number
  aliquota_efetiva_trimestre: number
}

export interface ApuracaoLucroRealAnual {
  ano_calendario: number
  regime: 'real'
  receita_bruta_anual: number
  folha_anual: number
  lucro_contabil_anual: number
  total_adicoes: number
  total_exclusoes: number
  lucro_real_ajustado_anual: number
  total_irpj: number
  total_csll: number
  total_pis_liquido: number
  total_cofins_liquido: number
  total_creditos_pis_cofins: number
  detalhe_creditos_anual?: DetalheCreditosInsumos
  total_iss: number
  total_tributos_pj: number
  aliquota_efetiva_anual: number
  trimestres: ApuracaoLucroRealTrimestre[]
  lucro_distribuivel: number
  lucro_apurado_estimado: number
}

// Comparador de Regimes
export interface ComparativoRegimeItem {
  regime: RegimeTributarioPJ
  nomeRegime: string
  totalTributos: number
  aliquotaEfetiva: number
  lucroDistribuivel: number
  detalheTributos: {
    irpj?: number
    csll?: number
    pis?: number
    cofins?: number
    iss?: number
    das?: number
  }
  isMaisVantajoso: boolean
  diferencaParaMelhor: number
  diferencaPercentual: number
}

export interface ComparativoRegimesResultado {
  ano_calendario: number
  receita_bruta_anual: number
  melhorRegime: RegimeTributarioPJ
  regimes: {
    simples: ComparativoRegimeItem
    presumido: ComparativoRegimeItem
    real: ComparativoRegimeItem
  }
  economiaAnualEstimada: number
}

// Simulador PJ e Resumo
export interface SimulacaoPjSocioParam {
  socio_id: string
  cliente_id: string
  cliente_nome: string
  pro_labore_mensal: number
  percentual_distribuicao_lucros: number // % do lucro atribuído ao sócio a ser distribuído
  percentual_participacao?: number
}

export interface SimulacaoPjParams {
  socios_params: SimulacaoPjSocioParam[]
  percentual_distribuicao_geral?: number
  // Campos do Planejador de Retiradas
  retirada_mensal_total?: number // Valor total mensal a retirar
  split_pro_labore_perc?: number // 0-100% pró-labore vs dividendos
  considerar_jcp?: boolean
  jcp_mensal_total?: number
}

export interface SimulacaoPjResultados {
  empresa: {
    tributos_pj_atual: number
    carga_tributaria_atual: number
    tributos_pj_otimizado: number
    carga_tributaria_otimizada: number
    economia_pj: number
    folha_total_anual: number
    lucro_distribuivel_total: number
  }
  socios: {
    socio_id: string
    cliente_nome: string
    pro_labore_anual: number
    lucros_distribuidos: number
    jcp_anual?: number
    irpf_estimado_socio: number
    irpfm_altas_rendas_estimado: number
    total_irpf_socio: number
  }[]
  consolidado: {
    total_tributos_grupo: number // Tributos PJ + IRPF dos Sócios
    economia_global: number
    carga_global_perc: number
  }
}

export interface CenarioSimulacaoPjRecord {
  id: string
  empresa_id: string
  ano_calendario: number
  nome: string
  recomendado?: boolean
  params: SimulacaoPjParams
  resultados: SimulacaoPjResultados
  created: string
  updated: string
}

export interface DistribuicaoSocioResultado {
  socio_id: string
  cliente_id: string
  cliente_nome: string
  cpf: string
  percentual: number
  pro_labore_anual: number // tipo = 'tributavel'
  lucros_distribuidos: number // tipo = 'isento'
  jcp_distribuido: number // tipo = 'exclusiva'
  dividendos_altas_rendas: number // alimenta base IRPF-M
  declaracao_id?: string
  status_declaracao?: string
}

export interface IntegracaoDistribuicaoResponse {
  success: boolean
  total_socios_atualizados: number
  rendimentos_criados: number
  detalhes: {
    socio_nome: string
    cliente_id: string
    declaracao_id: string
    pro_labore: number
    lucros: number
    jcp: number
  }[]
}

export interface TabelasApuracaoPj {
  simples: TabelaSimplesRecord | null
  presumido: TabelaPresumidoRecord | null
  irpjCsll: TabelaIrpjCsllRecord | null
  iss: TabelaIssRecord | null
  pisCofins: TabelaPisCofinsRealRecord | null
  insumos: TabelaInsumoRealRecord[]
  produtosAgro: TabelaProdutoAgroRecord[]
}

export interface ApuracaoEmpresaResultado {
  empresa: EmpresaRecord
  faturamentos: EmpresaFaturamentoRecord[]
  socios: EmpresaSocioRecord[]
  apuracaoSimples: ApuracaoSimplesAnual | null
  apuracaoPresumido: ApuracaoPresumidoAnual | null
  apuracaoReal: ApuracaoLucroRealAnual | null
  comparativoRegimes: ComparativoRegimesResultado
  distribuicoes: DistribuicaoSocioResultado[]
  lucroDistribuivel: number
  anoCalendario: number
  tabelas: TabelasApuracaoPj
}

// ==========================================
// ALERTAS AUTOMÁTICOS GLOBAIS DO ESCRITÓRIO
// ==========================================

export type SeveridadeAlerta = 'critico' | 'atencao' | 'informativo' | 'ok'
export type TipoAlertaEmpresa =
  | 'fator_r'
  | 'pro_labore'
  | 'altas_rendas'
  | 'anexo_simples'
  | 'regime_desvantajoso'
  | 'outro'

export interface AlertaEmpresaGlobal {
  id: string
  empresa_id: string
  empresa_nome: string
  empresa_cnpj: string
  empresa_regime: RegimeTributarioPJ
  tipo: TipoAlertaEmpresa
  severidade: SeveridadeAlerta
  titulo: string
  descricao: string
  impacto?: string
  acao: string
  link: string
  valor_atual?: string | number
  valor_meta?: string | number
  destaque?: boolean
  ano_calendario: number
}

export interface AlertasConfigRecord {
  id: string
  escritorio_id: string
  email_proprietario?: string
  enviar_email_geral?: boolean
  enviar_fator_r?: boolean
  enviar_pro_labore?: boolean
  enviar_altas_rendas?: boolean
  enviar_anexo_simples?: boolean
  config_alertas_custom?: Record<string, boolean>
  created: string
  updated: string
}
