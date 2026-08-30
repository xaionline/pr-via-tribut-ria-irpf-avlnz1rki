import pb from '@/lib/pocketbase/client'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  EmpresaFaturamentoRecord,
  TabelaSimplesRecord,
  TabelaPresumidoRecord,
  TabelaIrpjCsllRecord,
  TabelaIssRecord,
  AnexoSimplesNacional,
} from '@/types'

// =========================================================================
// EMPRESAS
// =========================================================================

export async function getEmpresas(search = '', page = 1, perPage = 50) {
  const filterParts: string[] = []
  if (search.trim()) {
    const s = search.trim().replace(/"/g, '\\"')
    filterParts.push(`(razao_social ~ "${s}" || cnpj ~ "${s}" || atividade ~ "${s}")`)
  }

  return pb.collection('empresas').getList<EmpresaRecord>(page, perPage, {
    filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
    sort: '-created',
    expand: 'escritorio_id',
  })
}

export async function getAllEmpresas(): Promise<EmpresaRecord[]> {
  return pb.collection('empresas').getFullList<EmpresaRecord>({
    sort: 'razao_social',
    expand: 'escritorio_id',
  })
}

export async function getEmpresa(id: string): Promise<EmpresaRecord> {
  return pb.collection('empresas').getOne<EmpresaRecord>(id, {
    expand: 'escritorio_id',
  })
}

export async function createEmpresa(
  data: Omit<EmpresaRecord, 'id' | 'created' | 'updated'>,
): Promise<EmpresaRecord> {
  return pb.collection('empresas').create<EmpresaRecord>(data)
}

export async function updateEmpresa(
  id: string,
  data: Partial<Omit<EmpresaRecord, 'id' | 'created' | 'updated'>>,
): Promise<EmpresaRecord> {
  return pb.collection('empresas').update<EmpresaRecord>(id, data)
}

export async function deleteEmpresa(id: string): Promise<boolean> {
  return pb.collection('empresas').delete(id)
}

// =========================================================================
// SÓCIOS DA EMPRESA (EMPRESAS_SOCIOS)
// =========================================================================

export async function getSociosDaEmpresa(empresaId: string): Promise<EmpresaSocioRecord[]> {
  return pb.collection('empresas_socios').getFullList<EmpresaSocioRecord>({
    filter: `empresa_id = "${empresaId}"`,
    sort: '-percentual_participacao',
    expand: 'cliente_id,empresa_id',
  })
}

export async function getEmpresasDoCliente(clienteId: string): Promise<EmpresaSocioRecord[]> {
  return pb.collection('empresas_socios').getFullList<EmpresaSocioRecord>({
    filter: `cliente_id = "${clienteId}"`,
    sort: '-created',
    expand: 'empresa_id',
  })
}

export async function addSocio(
  data: Omit<EmpresaSocioRecord, 'id' | 'created' | 'updated'>,
): Promise<EmpresaSocioRecord> {
  return pb.collection('empresas_socios').create<EmpresaSocioRecord>(data, {
    expand: 'cliente_id,empresa_id',
  })
}

export async function updateSocio(
  id: string,
  data: Partial<Omit<EmpresaSocioRecord, 'id' | 'created' | 'updated'>>,
): Promise<EmpresaSocioRecord> {
  return pb.collection('empresas_socios').update<EmpresaSocioRecord>(id, data, {
    expand: 'cliente_id,empresa_id',
  })
}

export async function deleteSocio(id: string): Promise<boolean> {
  return pb.collection('empresas_socios').delete(id)
}

// =========================================================================
// FATURAMENTOS MENSAIS (EMPRESAS_FATURAMENTOS)
// =========================================================================

export async function getFaturamentosEmpresa(
  empresaId: string,
  ano?: number,
): Promise<EmpresaFaturamentoRecord[]> {
  let filter = `empresa_id = "${empresaId}"`
  if (ano) {
    filter += ` && ano_calendario = ${ano}`
  }
  return pb.collection('empresas_faturamentos').getFullList<EmpresaFaturamentoRecord>({
    filter,
    sort: 'ano_calendario,mes',
  })
}

export async function upsertFaturamentoMes(
  empresaId: string,
  ano: number,
  mes: number,
  receitaBruta: number,
  folha: number,
  lucroContabil?: number,
  adicoesLalur?: number,
  exclusoesLalur?: number,
  comprasInsumos?: number,
  outrosCreditos?: number,
): Promise<EmpresaFaturamentoRecord> {
  const payload: Partial<EmpresaFaturamentoRecord> = {
    receita_bruta: receitaBruta,
    folha,
    lucro_contabil: lucroContabil ?? 0,
    adicoes_lalur: adicoesLalur ?? 0,
    exclusoes_lalur: exclusoesLalur ?? 0,
    compras_insumos: comprasInsumos ?? 0,
    outros_creditos_pis_cofins: outrosCreditos ?? 0,
  }

  try {
    const existing = await pb
      .collection('empresas_faturamentos')
      .getFirstListItem<EmpresaFaturamentoRecord>(
        `empresa_id = "${empresaId}" && ano_calendario = ${ano} && mes = ${mes}`,
      )
    return pb
      .collection('empresas_faturamentos')
      .update<EmpresaFaturamentoRecord>(existing.id, payload)
  } catch (_) {
    return pb.collection('empresas_faturamentos').create<EmpresaFaturamentoRecord>({
      empresa_id: empresaId,
      ano_calendario: ano,
      mes,
      ...payload,
    } as any)
  }
}

export async function deleteFaturamento(id: string): Promise<boolean> {
  return pb.collection('empresas_faturamentos').delete(id)
}
