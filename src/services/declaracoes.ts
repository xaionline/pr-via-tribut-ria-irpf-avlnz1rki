import pb from '@/lib/pocketbase/client'
import type {
  DeclaracaoRecord,
  FontePagadoraRecord,
  RendimentoRecord,
  DespesaDedutivelRecord,
  DependenteRecord,
  AtividadeRuralRecord,
  DestinacaoFiscalRecord,
  ResultadoRecord,
  CalcularResponse,
  SetModalidadeResponse,
} from '@/types'

export const getDeclaracoes = (clienteId?: string, ano?: number, status?: string) => {
  const filters: string[] = []
  if (clienteId) filters.push(`cliente_id = "${clienteId}"`)
  if (ano) filters.push(`ano_calendario = ${ano}`)
  if (status && status !== 'todos') filters.push(`status = "${status}"`)

  return pb.collection('declaracoes').getFullList<DeclaracaoRecord>({
    filter: filters.join(' && ') || undefined,
    sort: '-ano_calendario,-created',
    expand: 'cliente_id',
  })
}

export const getDeclaracao = (id: string) =>
  pb.collection('declaracoes').getOne<DeclaracaoRecord>(id, { expand: 'cliente_id' })

export const createDeclaracao = (data: Partial<DeclaracaoRecord>) =>
  pb.collection('declaracoes').create<DeclaracaoRecord>(data)

export const updateDeclaracao = (id: string, data: Partial<DeclaracaoRecord>) =>
  pb.collection('declaracoes').update<DeclaracaoRecord>(id, data)

export const deleteDeclaracao = (id: string) => pb.collection('declaracoes').delete(id)

export const getAllResultados = () =>
  pb.collection('resultados').getFullList<ResultadoRecord>({ expand: 'declaracao_id' })

export const duplicateDeclaracao = async (id: string) => {
  const original = await getDeclaracao(id)
  return createDeclaracao({
    escritorio_id: original.escritorio_id,
    cliente_id: original.cliente_id,
    ano_calendario: original.ano_calendario,
    status: 'rascunho',
    progresso: 10,
  })
}

export const calcularDeclaracao = (id: string) =>
  pb.send<CalcularResponse>(`/backend/v1/declaracoes/${id}/calcular`, {
    method: 'POST',
  })

export const setModalidade = (id: string, modalidade: 'legal' | 'simplificada') =>
  pb.send<SetModalidadeResponse>(`/backend/v1/declaracoes/${id}/modalidade`, {
    method: 'POST',
    body: JSON.stringify({ modalidade }),
    headers: { 'Content-Type': 'application/json' },
  })

export const getResultado = (declaracaoId: string) =>
  pb.collection('resultados').getFirstListItem<ResultadoRecord>(`declaracao_id = "${declaracaoId}"`)

export const getFontesPagadoras = (declaracaoId: string) =>
  pb.collection('fontes_pagadoras').getFullList<FontePagadoraRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
  })

export const createFontePagadora = (data: Partial<FontePagadoraRecord>) =>
  pb.collection('fontes_pagadoras').create<FontePagadoraRecord>(data)

export const deleteFontePagadora = (id: string) => pb.collection('fontes_pagadoras').delete(id)

export const getRendimentos = (declaracaoId: string) =>
  pb.collection('rendimentos').getFullList<RendimentoRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
    expand: 'fonte_pagadora_id',
  })

export const createRendimento = (data: Partial<RendimentoRecord>) =>
  pb.collection('rendimentos').create<RendimentoRecord>(data)

export const deleteRendimento = (id: string) => pb.collection('rendimentos').delete(id)

export const getDespesas = (declaracaoId: string) =>
  pb.collection('despesas_dedutiveis').getFullList<DespesaDedutivelRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
  })

export const createDespesa = (data: Partial<DespesaDedutivelRecord>) =>
  pb.collection('despesas_dedutiveis').create<DespesaDedutivelRecord>(data)

export const deleteDespesa = (id: string) => pb.collection('despesas_dedutiveis').delete(id)

export const getDependentes = (declaracaoId: string) =>
  pb.collection('dependentes').getFullList<DependenteRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
  })

export const createDependente = (data: Partial<DependenteRecord>) =>
  pb.collection('dependentes').create<DependenteRecord>(data)

export const deleteDependente = (id: string) => pb.collection('dependentes').delete(id)

export const getAtividadesRurais = (declaracaoId: string) =>
  pb.collection('atividades_rurais').getFullList<AtividadeRuralRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
  })

export const createAtividadeRural = (data: Partial<AtividadeRuralRecord>) =>
  pb.collection('atividades_rurais').create<AtividadeRuralRecord>(data)

export const deleteAtividadeRural = (id: string) => pb.collection('atividades_rurais').delete(id)

export const getDestinacoes = (declaracaoId: string) =>
  pb.collection('destinacoes_fiscais').getFullList<DestinacaoFiscalRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
  })

export const createDestinacao = (data: Partial<DestinacaoFiscalRecord>) =>
  pb.collection('destinacoes_fiscais').create<DestinacaoFiscalRecord>(data)

export const deleteDestinacao = (id: string) => pb.collection('destinacoes_fiscais').delete(id)
