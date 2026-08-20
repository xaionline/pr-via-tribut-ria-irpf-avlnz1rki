import pb from '@/lib/pocketbase/client'
import type {
  DeclaracaoRecord,
  FontePagadoraRecord,
  RendimentoRecord,
  DespesaDedutivelRecord,
  DependenteRecord,
  AtividadeRuralRecord,
  DestinacaoFiscalRecord,
  IrrfRecord,
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
  const newDec = await createDeclaracao({
    escritorio_id: original.escritorio_id,
    cliente_id: original.cliente_id,
    ano_calendario: original.ano_calendario + 1,
    status: 'rascunho',
    progresso: 10,
  })

  const fonteMap = new Map<string, string>()
  const fontes = await getFontesPagadoras(id)
  for (const f of fontes) {
    const nf = await createFontePagadora({
      declaracao_id: newDec.id,
      nome: f.nome,
      cnpj: f.cnpj,
      tipo: f.tipo,
    })
    fonteMap.set(f.id, nf.id)
  }

  const rends = await getRendimentos(id)
  for (const r of rends) {
    await createRendimento({
      declaracao_id: newDec.id,
      fonte_pagadora_id: r.fonte_pagadora_id ? fonteMap.get(r.fonte_pagadora_id) : undefined,
      descricao: r.descricao,
      tipo: r.tipo,
      valor: r.valor,
    })
  }

  const desps = await getDespesas(id)
  for (const d of desps) {
    await createDespesa({
      declaracao_id: newDec.id,
      categoria: d.categoria,
      descricao: d.descricao,
      valor: d.valor,
    })
  }

  const deps = await getDependentes(id)
  for (const d of deps) {
    await createDependente({
      declaracao_id: newDec.id,
      nome: d.nome,
      cpf: d.cpf,
      data_nascimento: d.data_nascimento,
    })
  }

  const rurais = await getAtividadesRurais(id)
  for (const a of rurais) {
    await createAtividadeRural({
      declaracao_id: newDec.id,
      receita_bruta: a.receita_bruta,
      despesas: a.despesas,
      resultado: a.resultado,
    })
  }

  const dests = await getDestinacoes(id)
  for (const d of dests) {
    await createDestinacao({
      declaracao_id: newDec.id,
      tipo: d.tipo,
      valor: d.valor,
    })
  }

  const irrfs = await getIrrfRecords(id)
  for (const item of irrfs) {
    await createIrrfRecord({
      declaracao_id: newDec.id,
      fonte_pagadora: item.fonte_pagadora,
      cnpj_fonte: item.cnpj_fonte,
      valor: item.valor,
    })
  }

  return newDec
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

export const getIrrfRecords = (declaracaoId: string) =>
  pb.collection('irrf').getFullList<IrrfRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
    sort: 'created',
  })

export const createIrrfRecord = (data: Partial<IrrfRecord>) =>
  pb.collection('irrf').create<IrrfRecord>(data)

export const updateIrrfRecord = (id: string, data: Partial<IrrfRecord>) =>
  pb.collection('irrf').update<IrrfRecord>(id, data)

export const deleteIrrfRecord = (id: string) => pb.collection('irrf').delete(id)
