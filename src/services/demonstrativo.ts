import type {
  DeclaracaoRecord,
  ResultadoRecord,
  RendimentoRecord,
  DespesaDedutivelRecord,
  AtividadeRuralRecord,
  DestinacaoFiscalRecord,
  IrrfRecord,
  TabelaProgressivaRecord,
} from '@/types'
import {
  getDeclaracao,
  getRendimentos,
  getDespesas,
  getAtividadesRurais,
  getDestinacoes,
  getIrrfRecords,
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
  irrfs?: IrrfRecord[]
  tabela?: TabelaProgressivaRecord
}

export async function fetchDemonstrativoData(declaracaoId: string): Promise<DemonstrativoData> {
  const [declaracao, rendimentos, despesas, atividadesRurais, destinacoes, irrfs, tabelas] =
    await Promise.all([
      getDeclaracao(declaracaoId),
      getRendimentos(declaracaoId),
      getDespesas(declaracaoId),
      getAtividadesRurais(declaracaoId),
      getDestinacoes(declaracaoId),
      getIrrfRecords(declaracaoId).catch(() => [] as IrrfRecord[]),
      getTabelas(),
    ])

  let resultado: ResultadoRecord
  try {
    resultado = await getResultado(declaracaoId)
  } catch {
    throw new Error('NO_RESULTADO')
  }

  const tabela = tabelas.find((t) => (t.ano_calendario || t.ano) === declaracao.ano_calendario)

  return {
    declaracao,
    resultado,
    rendimentos,
    despesas,
    atividadesRurais,
    destinacoes,
    irrfs,
    tabela,
  }
}
