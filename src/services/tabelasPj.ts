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
