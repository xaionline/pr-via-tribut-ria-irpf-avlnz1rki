import pb from '@/lib/pocketbase/client'
import type {
  ImportacaoInformeRecord,
  DetalhesImportacao,
  ReversaoImportacao,
  RendimentoRecord,
  DespesaDedutivelRecord,
  EmpresaFaturamentoRecord,
  FontePagadoraRecord,
} from '@/types'

/**
 * Busca histórico de importações do escritório.
 * Caso clienteId seja informado, filtra pelo cliente.
 */
export async function getImportacoes(clienteId?: string): Promise<ImportacaoInformeRecord[]> {
  const filters: string[] = []
  if (clienteId) {
    filters.push(`cliente_id = "${clienteId}"`)
  }

  return pb.collection('importacoes_informes').getFullList<ImportacaoInformeRecord>({
    filter: filters.length > 0 ? filters.join(' && ') : undefined,
    sort: '-created',
    expand: 'declaracao_id,cliente_id,importado_por',
  })
}

/**
 * Cria o registro inicial da importação.
 */
export async function criarRegistroImportacao(payload: {
  nomeArquivo: string
  file?: File | Blob
  declaracaoId?: string
  clienteId?: string
  tipo: 'informes_rendimentos' | 'faturamentos_mensais'
  totalLinhas: number
  userId?: string
}): Promise<ImportacaoInformeRecord> {
  const formData = new FormData()
  formData.append('nome_arquivo', payload.nomeArquivo)
  formData.append('status', 'processando')

  if (payload.declaracaoId) {
    formData.append('declaracao_id', payload.declaracaoId)
  }
  if (payload.clienteId) {
    formData.append('cliente_id', payload.clienteId)
  }
  if (payload.userId) {
    formData.append('importado_por', payload.userId)
  }

  if (payload.file) {
    formData.append('arquivo_original', payload.file, payload.nomeArquivo)
  } else {
    // Blob mínimo para satisfazer campo de arquivo obrigatório
    const dummyBlob = new Blob(['empty'], { type: 'text/csv' })
    formData.append('arquivo_original', dummyBlob, payload.nomeArquivo)
  }

  const detalhesIniciais: DetalhesImportacao = {
    tipo: payload.tipo,
    totalLinhas: payload.totalLinhas,
    linhasValidas: 0,
    linhasComErro: 0,
  }
  formData.append('detalhes', JSON.stringify(detalhesIniciais))

  return pb.collection('importacoes_informes').create<ImportacaoInformeRecord>(formData)
}

/**
 * Atualiza o status e os detalhes da importação após a execução do lote.
 */
export async function finalizarRegistroImportacao(
  importacaoId: string,
  status: 'concluida' | 'falhou' | 'cancelada',
  detalhes: DetalhesImportacao,
): Promise<ImportacaoInformeRecord> {
  return pb.collection('importacoes_informes').update<ImportacaoInformeRecord>(importacaoId, {
    status,
    detalhes,
  })
}

/**
 * Reverte uma importação em lote:
 * 1. Localiza e exclui rendimentos criados por esta importação (importacao_id = id).
 * 2. Localiza e exclui despesas dedutíveis criadas por esta importação.
 * 3. Localiza e exclui faturamentos mensais criados por esta importação.
 * 4. Marca o status da importação como 'cancelada' e salva os metadados de reversão.
 */
export async function reverterImportacao(
  importacaoId: string,
  userId?: string,
): Promise<{
  success: boolean
  rendimentosRemovidos: number
  despesasRemovidas: number
  faturamentosRemovidos: number
}> {
  let rendimentosRemovidos = 0
  let despesasRemovidas = 0
  let faturamentosRemovidos = 0

  // 1. Rendimentos com importacao_id
  try {
    const rendimentos = await pb.collection('rendimentos').getFullList<RendimentoRecord>({
      filter: `importacao_id = "${importacaoId}"`,
    })
    for (const r of rendimentos) {
      try {
        await pb.collection('rendimentos').delete(r.id)
        rendimentosRemovidos++
      } catch (err) {
        console.warn('Erro ao deletar rendimento importado:', r.id, err)
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar rendimentos da importação:', err)
  }

  // 2. Despesas com importacao_id
  try {
    const despesas = await pb
      .collection('despesas_dedutiveis')
      .getFullList<DespesaDedutivelRecord>({
        filter: `importacao_id = "${importacaoId}"`,
      })
    for (const d of despesas) {
      try {
        await pb.collection('despesas_dedutiveis').delete(d.id)
        despesasRemovidas++
      } catch (err) {
        console.warn('Erro ao deletar despesa importada:', d.id, err)
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar despesas da importação:', err)
  }

  // 3. Faturamentos com importacao_id
  try {
    const faturamentos = await pb
      .collection('empresas_faturamentos')
      .getFullList<EmpresaFaturamentoRecord>({
        filter: `importacao_id = "${importacaoId}"`,
      })
    for (const f of faturamentos) {
      try {
        await pb.collection('empresas_faturamentos').delete(f.id)
        faturamentosRemovidos++
      } catch (err) {
        console.warn('Erro ao deletar faturamento importado:', f.id, err)
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar faturamentos da importação:', err)
  }

  // 4. Salvar histórico de reversão e atualizar status
  const reversao: ReversaoImportacao = {
    revertidoEm: new Date().toISOString(),
    revertidoPor: userId,
    rendimentosRemovidos,
    despesasRemovidas,
    faturamentosRemovidos,
  }

  await pb.collection('importacoes_informes').update(importacaoId, {
    status: 'cancelada',
    reversao,
  })

  return {
    success: true,
    rendimentosRemovidos,
    despesasRemovidas,
    faturamentosRemovidos,
  }
}

/**
 * Cria ou recupera uma fonte pagadora para a declaração (pelo CNPJ ou nome).
 */
export async function obterOuCriarFontePagadora(
  declaracaoId: string,
  nome: string,
  cnpj?: string,
): Promise<FontePagadoraRecord> {
  const cnpjLimpo = (cnpj || '').replace(/\D/g, '')

  // Tentar encontrar existente na declaração
  const fontes = await pb.collection('fontes_pagadoras').getFullList<FontePagadoraRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
  })

  const encontrada = fontes.find((f) => {
    const fCnpjLimpo = (f.cnpj || '').replace(/\D/g, '')
    if (cnpjLimpo && fCnpjLimpo && cnpjLimpo === fCnpjLimpo) return true
    return f.nome.trim().toLowerCase() === nome.trim().toLowerCase()
  })

  if (encontrada) return encontrada

  return pb.collection('fontes_pagadoras').create<FontePagadoraRecord>({
    declaracao_id: declaracaoId,
    nome: nome.trim(),
    cnpj: cnpj || undefined,
    tipo: 'outros',
  })
}
