import {
  getDeclaracao,
  getRendimentos,
  getDespesas,
  getDependentes,
  getAtividadesRurais,
  getDestinacoes,
  getIrrfRecords,
  getResultado,
} from '@/services/declaracoes'
import { getIbsCbsParametroPorAno, calcularApuracaoIbsCbs } from '@/services/ibsCbs'
import { getApuracao as getAltasRendasApuracao } from '@/services/altasRendas'
import { getTabelas } from '@/services/tabelas'
import type {
  DeclaracaoRecord,
  ResultadoRecord,
  RendimentoRecord,
  DespesaDedutivelRecord,
  DependenteRecord,
  AtividadeRuralRecord,
  DestinacaoFiscalRecord,
  IrrfRecord,
  TabelaProgressivaRecord,
} from '@/types'

export interface ResumoConsolidado {
  rendimentosTributaveis: number // rendimentos (tributavel) + 20% da receita bruta rural
  irpfDevido: number // resultados.irrf_devido
  funrural: number // receita_bruta × funrural do ano
  destinacoes: number // soma destinacoes_fiscais
  ibsCbsTotal: number // débito − crédito (da apuração IBS/CBS)
  altasRendasTotal: number // resultado da apuração Altas Rendas (total a pagar/restituir)
  irrfRetido: number // soma irrf (tipo irrf_comum ou null/vazio)
  irpfmRetido: number // soma irrf (tipo irpfm_exercicio)
  totalTributos: number // irpf + funrural + destinacoes + ibsCbs + altasRendas + irrf + irpfm
  cargaTributaria: number // totalTributos / rendimentosTributaveis × 100
}

export interface ResumoDetalhadoData {
  resumo: ResumoConsolidado
  declaracao: DeclaracaoRecord
  resultado: ResultadoRecord | null
  rendimentos: RendimentoRecord[]
  despesas: DespesaDedutivelRecord[]
  dependentes: DependenteRecord[]
  atividadesRurais: AtividadeRuralRecord[]
  destinacoes: DestinacaoFiscalRecord[]
  irrfs: IrrfRecord[]
  tabela: TabelaProgressivaRecord | null
  baseCalculoIRPF: number
  previdenciaAtual: number
  pgblTetoMaximo: number // rendimentosTributaveis * 0.12
  pgblTetoRestante: number // max(0, rendimentosTributaveis * 0.12 - previdenciaAtual)
  destinacaoTetoMaximo: number // irpfDevido * 0.06
  destinacaoTetoRestante: number // max(0, irpfDevido * 0.06 - destinacoesAtuais)
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Retorna os dados consolidados do resumo da apuração de uma declaração.
 */
export async function getResumo(declaracaoId: string): Promise<ResumoConsolidado> {
  const data = await getResumoCompleto(declaracaoId)
  return data.resumo
}

/**
 * Retorna o resumo consolidado junto com todos os registros carregados para uso no simulador.
 */
export async function getResumoCompleto(declaracaoId: string): Promise<ResumoDetalhadoData> {
  const [
    declaracao,
    rendimentos,
    despesas,
    dependentes,
    atividadesRurais,
    destinacoes,
    irrfs,
    tabelas,
  ] = await Promise.all([
    getDeclaracao(declaracaoId),
    getRendimentos(declaracaoId).catch(() => [] as RendimentoRecord[]),
    getDespesas(declaracaoId).catch(() => [] as DespesaDedutivelRecord[]),
    getDependentes(declaracaoId).catch(() => [] as DependenteRecord[]),
    getAtividadesRurais(declaracaoId).catch(() => [] as AtividadeRuralRecord[]),
    getDestinacoes(declaracaoId).catch(() => [] as DestinacaoFiscalRecord[]),
    getIrrfRecords(declaracaoId).catch(() => [] as IrrfRecord[]),
    getTabelas().catch(() => [] as TabelaProgressivaRecord[]),
  ])

  let resultado: ResultadoRecord | null = null
  try {
    resultado = await getResultado(declaracaoId)
  } catch {
    resultado = null
  }

  const ano = declaracao.ano_calendario
  const tabela = tabelas.find((t) => (t.ano_calendario || t.ano) === ano) || null

  // 1. Rendimentos Tributáveis: tipo 'tributavel' + 20% da receita bruta rural
  const rendTribComum = rendimentos
    .filter((r) => r.tipo === 'tributavel')
    .reduce((sum, r) => sum + (Number(r.valor) || 0), 0)

  const receitaRuralBruta = atividadesRurais.reduce(
    (sum, a) => sum + (Number(a.receita_bruta) || 0),
    0,
  )
  const despesaRuralBruta = atividadesRurais.reduce((sum, a) => sum + (Number(a.despesas) || 0), 0)

  const ruralTributavel = receitaRuralBruta * 0.2
  const rendimentosTributaveis = round2(rendTribComum + ruralTributavel)

  // 2. IRPF Devido: resultados.irrf_devido
  const irpfDevido = round2(resultado?.irrf_devido ?? 0)

  // 3. Destinações Fiscais: soma de destinacoes_fiscais
  const totalDestinacoes = round2(destinacoes.reduce((sum, d) => sum + (Number(d.valor) || 0), 0))

  // 4. IRRF Retido: tipo 'irrf_comum' ou null/vazio
  const irrfRetido = round2(
    irrfs
      .filter((i) => !i.tipo || i.tipo === 'irrf_comum')
      .reduce((sum, i) => sum + (Number(i.valor) || 0), 0),
  )

  // 5. IRPFM Retido no Exercício: tipo 'irpfm_exercicio'
  const irpfmRetido = round2(
    irrfs
      .filter((i) => i.tipo === 'irpfm_exercicio')
      .reduce((sum, i) => sum + (Number(i.valor) || 0), 0),
  )

  // 6. IBS/CBS e Funrural
  let funrural = 0
  let ibsCbsTotal = 0
  try {
    const { parametro: ibsParam } = await getIbsCbsParametroPorAno(ano)
    if (ibsParam) {
      const apuracaoIbs = calcularApuracaoIbsCbs(receitaRuralBruta, despesaRuralBruta, ibsParam)
      // ibsCbsTotal = Débito − Crédito
      ibsCbsTotal = round2(apuracaoIbs.debito_ibs_cbs - apuracaoIbs.credito_ibs_cbs)
      funrural = round2(apuracaoIbs.funrural_valor)
    } else {
      // Padrão Funrural estimado se não houver parâmetro: 1.5%
      funrural = round2(receitaRuralBruta * 0.015)
      ibsCbsTotal = 0
    }
  } catch {
    funrural = round2(receitaRuralBruta * 0.015)
    ibsCbsTotal = 0
  }

  // 7. Altas Rendas (IRPF-M)
  let altasRendasTotal = 0
  try {
    const altasRendasData = await getAltasRendasApuracao(declaracaoId)
    // Total a pagar ou restituir
    if (altasRendasData.apuracao.total_a_pagar > 0) {
      altasRendasTotal = round2(altasRendasData.apuracao.total_a_pagar)
    } else if (altasRendasData.apuracao.total_a_restituir > 0) {
      altasRendasTotal = round2(-altasRendasData.apuracao.total_a_restituir)
    } else {
      altasRendasTotal = 0
    }
  } catch {
    altasRendasTotal = 0
  }

  // 8. Total de Tributos e Carga Tributária
  // Fórmula do enunciado: irpf + funrural + destinacoes + ibsCbs + altasRendas + irrf + irpfm
  const totalTributos = round2(
    irpfDevido +
      funrural +
      totalDestinacoes +
      ibsCbsTotal +
      altasRendasTotal +
      irrfRetido +
      irpfmRetido,
  )

  const cargaTributaria =
    rendimentosTributaveis > 0 ? round2((totalTributos / rendimentosTributaveis) * 100) : 0

  const resumo: ResumoConsolidado = {
    rendimentosTributaveis,
    irpfDevido,
    funrural,
    destinacoes: totalDestinacoes,
    ibsCbsTotal,
    altasRendasTotal,
    irrfRetido,
    irpfmRetido,
    totalTributos,
    cargaTributaria,
  }

  // Cálculos auxiliares para limites e simulador
  const previdenciaAtual = despesas
    .filter((d) => d.categoria === 'previdencia')
    .reduce((sum, d) => sum + (Number(d.valor) || 0), 0)

  const pgblTetoMaximo = round2(rendimentosTributaveis * 0.12)
  const pgblTetoRestante = round2(Math.max(0, pgblTetoMaximo - previdenciaAtual))

  const destinacaoTetoMaximo = round2(irpfDevido * 0.06)
  const destinacaoTetoRestante = round2(Math.max(0, destinacaoTetoMaximo - totalDestinacoes))

  const baseCalculoIRPF = resultado?.base_calculo ?? rendimentosTributaveis

  return {
    resumo,
    declaracao,
    resultado,
    rendimentos,
    despesas,
    dependentes,
    atividadesRurais,
    destinacoes,
    irrfs,
    tabela,
    baseCalculoIRPF,
    previdenciaAtual,
    pgblTetoMaximo,
    pgblTetoRestante,
    destinacaoTetoMaximo,
    destinacaoTetoRestante,
  }
}
