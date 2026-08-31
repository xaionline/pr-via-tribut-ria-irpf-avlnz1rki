import pb from '@/lib/pocketbase/client'
import type {
  TabelaSimplesRecord,
  TabelaPresumidoRecord,
  TabelaIrpjCsllRecord,
  TabelaIssRecord,
  TabelaPisCofinsRealRecord,
  AnexoSimplesNacional,
} from '@/types'

// =========================================================================
// TABELAS SIMPLES NACIONAL (CRUD ANUAL COM HERANÇA)
// =========================================================================

export async function getTabelasSimples(ano?: number): Promise<TabelaSimplesRecord[]> {
  const filter = ano ? `ano = ${ano}` : undefined
  return pb.collection('tabelas_simples').getFullList<TabelaSimplesRecord>({
    filter,
    sort: '-ano,anexo',
  })
}

export async function getTabelaSimplesPorAnoAnexo(
  ano: number,
  anexo: AnexoSimplesNacional,
): Promise<{ tabela: TabelaSimplesRecord | null; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('tabelas_simples')
      .getFirstListItem<TabelaSimplesRecord>(`ano = ${ano} && anexo = "${anexo}"`)
    return { tabela: direct, isFallback: false }
  } catch (_) {
    // Fallback: mais recente com o mesmo anexo
    try {
      const list = await pb.collection('tabelas_simples').getList<TabelaSimplesRecord>(1, 1, {
        filter: `anexo = "${anexo}"`,
        sort: '-ano',
      })
      if (list.items.length > 0) {
        return { tabela: list.items[0], isFallback: true }
      }
    } catch {
      /* intentionally ignored */
    }
    return { tabela: null, isFallback: false }
  }
}

export async function getTabelaSimplesAnoAnterior(
  ano: number,
  anexo: AnexoSimplesNacional,
): Promise<TabelaSimplesRecord | null> {
  try {
    return await pb
      .collection('tabelas_simples')
      .getFirstListItem<TabelaSimplesRecord>(`ano = ${ano - 1} && anexo = "${anexo}"`)
  } catch (_) {
    try {
      const prevList = await pb.collection('tabelas_simples').getList<TabelaSimplesRecord>(1, 1, {
        filter: `ano < ${ano} && anexo = "${anexo}"`,
        sort: '-ano',
      })
      if (prevList.items.length > 0) return prevList.items[0]
    } catch {
      /* intentionally ignored */
    }
    return null
  }
}

export async function createTabelaSimples(
  data: Omit<TabelaSimplesRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaSimplesRecord> {
  return pb.collection('tabelas_simples').create<TabelaSimplesRecord>(data)
}

export async function updateTabelaSimples(
  id: string,
  data: Partial<Omit<TabelaSimplesRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaSimplesRecord> {
  return pb.collection('tabelas_simples').update<TabelaSimplesRecord>(id, data)
}

export async function deleteTabelaSimples(id: string): Promise<boolean> {
  return pb.collection('tabelas_simples').delete(id)
}

// =========================================================================
// TABELAS LUCRO PRESUMIDO (CRUD ANUAL COM HERANÇA)
// =========================================================================

export async function getTabelasPresumido(ano?: number): Promise<TabelaPresumidoRecord[]> {
  const filter = ano ? `ano = ${ano}` : undefined
  return pb.collection('tabelas_presumido').getFullList<TabelaPresumidoRecord>({
    filter,
    sort: '-ano,atividade',
  })
}

export async function getTabelaPresumidoPorAnoAtividade(
  ano: number,
  atividade?: string,
): Promise<{ tabela: TabelaPresumidoRecord | null; isFallback: boolean }> {
  try {
    let filter = `ano = ${ano}`
    if (atividade) {
      filter += ` && atividade ~ "${atividade}"`
    }
    const direct = await pb
      .collection('tabelas_presumido')
      .getFirstListItem<TabelaPresumidoRecord>(filter)
    return { tabela: direct, isFallback: false }
  } catch (_) {
    try {
      const list = await pb.collection('tabelas_presumido').getList<TabelaPresumidoRecord>(1, 1, {
        sort: '-ano',
      })
      if (list.items.length > 0) {
        return { tabela: list.items[0], isFallback: true }
      }
    } catch {
      /* intentionally ignored */
    }
    return { tabela: null, isFallback: false }
  }
}

export async function getTabelaPresumidoAnoAnterior(
  ano: number,
): Promise<TabelaPresumidoRecord | null> {
  try {
    return await pb
      .collection('tabelas_presumido')
      .getFirstListItem<TabelaPresumidoRecord>(`ano = ${ano - 1}`)
  } catch (_) {
    try {
      const prevList = await pb
        .collection('tabelas_presumido')
        .getList<TabelaPresumidoRecord>(1, 1, {
          filter: `ano < ${ano}`,
          sort: '-ano',
        })
      if (prevList.items.length > 0) return prevList.items[0]
    } catch {
      /* intentionally ignored */
    }
    return null
  }
}

export async function createTabelaPresumido(
  data: Omit<TabelaPresumidoRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaPresumidoRecord> {
  return pb.collection('tabelas_presumido').create<TabelaPresumidoRecord>(data)
}

export async function updateTabelaPresumido(
  id: string,
  data: Partial<Omit<TabelaPresumidoRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaPresumidoRecord> {
  return pb.collection('tabelas_presumido').update<TabelaPresumidoRecord>(id, data)
}

export async function deleteTabelaPresumido(id: string): Promise<boolean> {
  return pb.collection('tabelas_presumido').delete(id)
}

// =========================================================================
// TABELAS IRPJ / CSLL (CRUD ANUAL COM HERANÇA)
// =========================================================================

export async function getTabelasIrpjCsll(): Promise<TabelaIrpjCsllRecord[]> {
  return pb.collection('tabelas_irpj_csll').getFullList<TabelaIrpjCsllRecord>({
    sort: '-ano',
  })
}

export async function getTabelaIrpjCsllPorAno(
  ano: number,
): Promise<{ tabela: TabelaIrpjCsllRecord | null; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('tabelas_irpj_csll')
      .getFirstListItem<TabelaIrpjCsllRecord>(`ano = ${ano}`)
    return { tabela: direct, isFallback: false }
  } catch (_) {
    try {
      const list = await pb.collection('tabelas_irpj_csll').getList<TabelaIrpjCsllRecord>(1, 1, {
        sort: '-ano',
      })
      if (list.items.length > 0) {
        return { tabela: list.items[0], isFallback: true }
      }
    } catch {
      /* intentionally ignored */
    }
    return { tabela: null, isFallback: false }
  }
}

export async function getTabelaIrpjCsllAnoAnterior(
  ano: number,
): Promise<TabelaIrpjCsllRecord | null> {
  try {
    return await pb
      .collection('tabelas_irpj_csll')
      .getFirstListItem<TabelaIrpjCsllRecord>(`ano = ${ano - 1}`)
  } catch (_) {
    try {
      const prevList = await pb
        .collection('tabelas_irpj_csll')
        .getList<TabelaIrpjCsllRecord>(1, 1, {
          filter: `ano < ${ano}`,
          sort: '-ano',
        })
      if (prevList.items.length > 0) return prevList.items[0]
    } catch {
      /* intentionally ignored */
    }
    return null
  }
}

export async function createTabelaIrpjCsll(
  data: Omit<TabelaIrpjCsllRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaIrpjCsllRecord> {
  return pb.collection('tabelas_irpj_csll').create<TabelaIrpjCsllRecord>(data)
}

export async function updateTabelaIrpjCsll(
  id: string,
  data: Partial<Omit<TabelaIrpjCsllRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaIrpjCsllRecord> {
  return pb.collection('tabelas_irpj_csll').update<TabelaIrpjCsllRecord>(id, data)
}

export async function deleteTabelaIrpjCsll(id: string): Promise<boolean> {
  return pb.collection('tabelas_irpj_csll').delete(id)
}

// =========================================================================
// TABELAS ISS (CRUD ANUAL COM HERANÇA)
// =========================================================================

export async function getTabelasIss(ano?: number): Promise<TabelaIssRecord[]> {
  const filter = ano ? `ano = ${ano}` : undefined
  return pb.collection('tabelas_iss').getFullList<TabelaIssRecord>({
    filter,
    sort: '-ano,municipio',
  })
}

export async function getTabelaIssPorAno(
  ano: number,
): Promise<{ tabela: TabelaIssRecord | null; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('tabelas_iss')
      .getFirstListItem<TabelaIssRecord>(`ano = ${ano}`)
    return { tabela: direct, isFallback: false }
  } catch (_) {
    try {
      const list = await pb.collection('tabelas_iss').getList<TabelaIssRecord>(1, 1, {
        sort: '-ano',
      })
      if (list.items.length > 0) {
        return { tabela: list.items[0], isFallback: true }
      }
    } catch {
      /* intentionally ignored */
    }
    return { tabela: null, isFallback: false }
  }
}

export async function getTabelaIssAnoAnterior(ano: number): Promise<TabelaIssRecord | null> {
  try {
    return await pb.collection('tabelas_iss').getFirstListItem<TabelaIssRecord>(`ano = ${ano - 1}`)
  } catch (_) {
    try {
      const prevList = await pb.collection('tabelas_iss').getList<TabelaIssRecord>(1, 1, {
        filter: `ano < ${ano}`,
        sort: '-ano',
      })
      if (prevList.items.length > 0) return prevList.items[0]
    } catch {
      /* intentionally ignored */
    }
    return null
  }
}

export async function createTabelaIss(
  data: Omit<TabelaIssRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaIssRecord> {
  return pb.collection('tabelas_iss').create<TabelaIssRecord>(data)
}

export async function updateTabelaIss(
  id: string,
  data: Partial<Omit<TabelaIssRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaIssRecord> {
  return pb.collection('tabelas_iss').update<TabelaIssRecord>(id, data)
}

export async function deleteTabelaIss(id: string): Promise<boolean> {
  return pb.collection('tabelas_iss').delete(id)
}

// =========================================================================
// TABELAS PIS / COFINS NÃO-CUMULATIVO (LUCRO REAL)
// =========================================================================

export async function getTabelasPisCofinsReal(): Promise<TabelaPisCofinsRealRecord[]> {
  return pb.collection('tabelas_pis_cofins_real').getFullList<TabelaPisCofinsRealRecord>({
    sort: '-ano',
  })
}

export async function getTabelaPisCofinsRealPorAno(
  ano: number,
): Promise<{ tabela: TabelaPisCofinsRealRecord | null; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('tabelas_pis_cofins_real')
      .getFirstListItem<TabelaPisCofinsRealRecord>(`ano = ${ano}`)
    return { tabela: direct, isFallback: false }
  } catch (_) {
    try {
      const list = await pb
        .collection('tabelas_pis_cofins_real')
        .getList<TabelaPisCofinsRealRecord>(1, 1, {
          sort: '-ano',
        })
      if (list.items.length > 0) {
        return { tabela: list.items[0], isFallback: true }
      }
    } catch {
      /* intentionally ignored */
    }
    return { tabela: null, isFallback: false }
  }
}

export async function getTabelaPisCofinsRealAnoAnterior(
  ano: number,
): Promise<TabelaPisCofinsRealRecord | null> {
  try {
    return await pb
      .collection('tabelas_pis_cofins_real')
      .getFirstListItem<TabelaPisCofinsRealRecord>(`ano = ${ano - 1}`)
  } catch (_) {
    try {
      const prevList = await pb
        .collection('tabelas_pis_cofins_real')
        .getList<TabelaPisCofinsRealRecord>(1, 1, {
          filter: `ano < ${ano}`,
          sort: '-ano',
        })
      if (prevList.items.length > 0) return prevList.items[0]
    } catch {
      /* intentionally ignored */
    }
    return null
  }
}

export async function createTabelaPisCofinsReal(
  data: Omit<TabelaPisCofinsRealRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaPisCofinsRealRecord> {
  return pb.collection('tabelas_pis_cofins_real').create<TabelaPisCofinsRealRecord>(data)
}

export async function updateTabelaPisCofinsReal(
  id: string,
  data: Partial<Omit<TabelaPisCofinsRealRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaPisCofinsRealRecord> {
  return pb.collection('tabelas_pis_cofins_real').update<TabelaPisCofinsRealRecord>(id, data)
}

export async function deleteTabelaPisCofinsReal(id: string): Promise<boolean> {
  return pb.collection('tabelas_pis_cofins_real').delete(id)
}

// =========================================================================
// TABELAS CATEGORIAS DE INSUMOS REAL (CRUD ANUAL COM HERANÇA)
// =========================================================================

import type { TabelaInsumoRealRecord, TabelaProdutoAgroRecord } from '@/types'

export async function getTabelasInsumosReal(ano?: number): Promise<TabelaInsumoRealRecord[]> {
  const filter = ano ? `ano = ${ano}` : undefined
  return pb.collection('tabelas_insumos_real').getFullList<TabelaInsumoRealRecord>({
    filter,
    sort: '-ano,categoria',
  })
}

export async function getTabelasInsumosRealPorAno(
  ano: number,
): Promise<{ tabelas: TabelaInsumoRealRecord[]; isFallback: boolean }> {
  try {
    const direct = await pb.collection('tabelas_insumos_real').getFullList<TabelaInsumoRealRecord>({
      filter: `ano = ${ano}`,
      sort: 'categoria',
    })
    if (direct.length > 0) return { tabelas: direct, isFallback: false }
  } catch {
    /* intentionally ignored */
  }

  // Fallback para ano mais recente
  try {
    const list = await pb
      .collection('tabelas_insumos_real')
      .getList<TabelaInsumoRealRecord>(1, 10, {
        sort: '-ano,categoria',
      })
    if (list.items.length > 0) {
      const fallbackAno = list.items[0].ano
      const fallbackList = await pb
        .collection('tabelas_insumos_real')
        .getFullList<TabelaInsumoRealRecord>({
          filter: `ano = ${fallbackAno}`,
          sort: 'categoria',
        })
      return { tabelas: fallbackList, isFallback: true }
    }
  } catch {
    /* intentionally ignored */
  }

  return { tabelas: [], isFallback: false }
}

export async function createTabelaInsumoReal(
  data: Omit<TabelaInsumoRealRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaInsumoRealRecord> {
  return pb.collection('tabelas_insumos_real').create<TabelaInsumoRealRecord>(data)
}

export async function updateTabelaInsumoReal(
  id: string,
  data: Partial<Omit<TabelaInsumoRealRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaInsumoRealRecord> {
  return pb.collection('tabelas_insumos_real').update<TabelaInsumoRealRecord>(id, data)
}

export async function deleteTabelaInsumoReal(id: string): Promise<boolean> {
  return pb.collection('tabelas_insumos_real').delete(id)
}

// =========================================================================
// TABELAS PRODUTOS AGRO (CRÉDITO PRESUMIDO POR PRODUTO)
// =========================================================================

export async function getTabelasProdutosAgro(ano?: number): Promise<TabelaProdutoAgroRecord[]> {
  const filter = ano ? `ano = ${ano}` : undefined
  return pb.collection('tabelas_produtos_agro').getFullList<TabelaProdutoAgroRecord>({
    filter,
    sort: '-ano,nome',
  })
}

export async function getTabelasProdutosAgroPorAno(
  ano: number,
): Promise<{ produtos: TabelaProdutoAgroRecord[]; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('tabelas_produtos_agro')
      .getFullList<TabelaProdutoAgroRecord>({
        filter: `ano = ${ano}`,
        sort: 'nome',
      })
    if (direct.length > 0) return { produtos: direct, isFallback: false }
  } catch {
    /* intentionally ignored */
  }

  // Fallback para ano mais recente
  try {
    const list = await pb
      .collection('tabelas_produtos_agro')
      .getList<TabelaProdutoAgroRecord>(1, 10, {
        sort: '-ano,nome',
      })
    if (list.items.length > 0) {
      const fallbackAno = list.items[0].ano
      const fallbackList = await pb
        .collection('tabelas_produtos_agro')
        .getFullList<TabelaProdutoAgroRecord>({
          filter: `ano = ${fallbackAno}`,
          sort: 'nome',
        })
      return { produtos: fallbackList, isFallback: true }
    }
  } catch {
    /* intentionally ignored */
  }

  return { produtos: [], isFallback: false }
}

export async function createTabelaProdutoAgro(
  data: Omit<TabelaProdutoAgroRecord, 'id' | 'created' | 'updated'>,
): Promise<TabelaProdutoAgroRecord> {
  return pb.collection('tabelas_produtos_agro').create<TabelaProdutoAgroRecord>(data)
}

export async function updateTabelaProdutoAgro(
  id: string,
  data: Partial<Omit<TabelaProdutoAgroRecord, 'id' | 'created' | 'updated'>>,
): Promise<TabelaProdutoAgroRecord> {
  return pb.collection('tabelas_produtos_agro').update<TabelaProdutoAgroRecord>(id, data)
}

export async function deleteTabelaProdutoAgro(id: string): Promise<boolean> {
  return pb.collection('tabelas_produtos_agro').delete(id)
}

export async function clonarTabelasInsumosEAgroDeAnoAnterior(
  anoDestino: number,
  anoOrigem: number,
): Promise<{ insumosClonados: number; produtosAgroClonados: number }> {
  const [insumosOrigem, produtosAgroOrigem] = await Promise.all([
    pb.collection('tabelas_insumos_real').getFullList<TabelaInsumoRealRecord>({
      filter: `ano = ${anoOrigem}`,
    }),
    pb.collection('tabelas_produtos_agro').getFullList<TabelaProdutoAgroRecord>({
      filter: `ano = ${anoOrigem}`,
    }),
  ])

  let insumosClonados = 0
  let produtosAgroClonados = 0

  for (const item of insumosOrigem) {
    try {
      await pb.collection('tabelas_insumos_real').create({
        ano: anoDestino,
        categoria: item.categoria,
        descricao: item.descricao,
        aliquota_credito_pis: item.aliquota_credito_pis,
        aliquota_credito_cofins: item.aliquota_credito_cofins,
        permite_credito: item.permite_credito,
        tipo_credito: item.tipo_credito,
        observacao: item.observacao,
      })
      insumosClonados++
    } catch {
      /* ignore unique conflict */
    }
  }

  for (const item of produtosAgroOrigem) {
    try {
      await pb.collection('tabelas_produtos_agro').create({
        ano: anoDestino,
        codigo: item.codigo,
        nome: item.nome,
        percentual_presumido_pis: item.percentual_presumido_pis,
        percentual_presumido_cofins: item.percentual_presumido_cofins,
        aliquota_efetiva_pis: item.aliquota_efetiva_pis,
        aliquota_efetiva_cofins: item.aliquota_efetiva_cofins,
        ncm: item.ncm,
        base_legal: item.base_legal,
      })
      produtosAgroClonados++
    } catch {
      /* ignore unique conflict */
    }
  }

  return { insumosClonados, produtosAgroClonados }
}
