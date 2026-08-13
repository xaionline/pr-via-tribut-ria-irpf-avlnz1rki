import type {
  DeclaracaoRecord,
  ResultadoRecord,
  RendimentoRecord,
  DespesaDedutivelRecord,
  AtividadeRuralRecord,
  DestinacaoFiscalRecord,
  TabelaProgressivaRecord,
} from '@/types'
import {
  getDeclaracao,
  getRendimentos,
  getDespesas,
  getAtividadesRurais,
  getDestinacoes,
  getResultado,
} from '@/services/declaracoes'
import { getTabelas } from '@/services/tabelas'

export interface DemonstrativoData {
  declaracao: DeclaracaoRecord
  resultado: ResultadoRecord
  rendimentos: RendimentoRecord[]
  despesas: DespesaDedutivelRecord[]
  atividadesRurais: AtividadeRuralRecord[]
  destinacoes: DestinacaoFiscalRecord[]
  tabela?: TabelaProgressivaRecord
}

export async function fetchDemonstrativoData(declaracaoId: string): Promise<DemonstrativoData> {
  const [declaracao, rendimentos, despesas, atividadesRurais, destinacoes, tabelas] =
    await Promise.all([
      getDeclaracao(declaracaoId),
      getRendimentos(declaracaoId),
      getDespesas(declaracaoId),
      getAtividadesRurais(declaracaoId),
      getDestinacoes(declaracaoId),
      getTabelas(),
    ])

  let resultado: ResultadoRecord
  try {
    resultado = await getResultado(declaracaoId)
  } catch {
    throw new Error('NO_RESULTADO')
  }

  const tabela = tabelas.find((t) => t.ano === declaracao.ano_calendario)

  return {
    declaracao,
    resultado,
    rendimentos,
    despesas,
    atividadesRurais,
    destinacoes,
    tabela,
  }
}
