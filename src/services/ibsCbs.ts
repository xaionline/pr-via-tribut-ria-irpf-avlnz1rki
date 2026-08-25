import pb from '@/lib/pocketbase/client'
import type { IbsCbsParametroRecord, IbsCbsApuracaoCalculo } from '@/types'

/**
 * Retorna todos os parâmetros de IBS/CBS cadastrados ordenados por ano decrescente.
 */
export async function getIbsCbsParametros(): Promise<IbsCbsParametroRecord[]> {
  return pb.collection('ibs_cbs_parametros').getFullList<IbsCbsParametroRecord>({
    sort: '-ano_calendario',
  })
}

/**
 * Retorna o parâmetro do ano solicitado ou, se não existir, o mais recente disponível.
 */
export async function getIbsCbsParametroPorAno(
  ano: number,
): Promise<{ parametro: IbsCbsParametroRecord | null; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('ibs_cbs_parametros')
      .getFirstListItem<IbsCbsParametroRecord>(`ano_calendario = ${ano}`)
    return { parametro: direct, isFallback: false }
  } catch (_) {
    // Busca o mais recente disponível
    try {
      const list = await pb.collection('ibs_cbs_parametros').getList<IbsCbsParametroRecord>(1, 1, {
        sort: '-ano_calendario',
      })
      if (list.items.length > 0) {
        return { parametro: list.items[0], isFallback: true }
      }
    } catch {
      /* intentionally ignored */
    }
    return { parametro: null, isFallback: false }
  }
}

/**
 * Retorna o registro do ano imediatamente anterior ao informado (para sugestão inteligente).
 */
export async function getParametroAnoAnterior(ano: number): Promise<IbsCbsParametroRecord | null> {
  try {
    // 1º: Tenta exatamente o ano imediatamente anterior (ano - 1)
    const exactPrev = await pb
      .collection('ibs_cbs_parametros')
      .getFirstListItem<IbsCbsParametroRecord>(`ano_calendario = ${ano - 1}`)
    return exactPrev
  } catch (_) {
    // 2º: Tenta o ano mais próximo menor que o solicitado
    try {
      const prevList = await pb
        .collection('ibs_cbs_parametros')
        .getList<IbsCbsParametroRecord>(1, 1, {
          filter: `ano_calendario < ${ano}`,
          sort: '-ano_calendario',
        })
      if (prevList.items.length > 0) {
        return prevList.items[0]
      }
    } catch {
      /* intentionally ignored */
    }
    // 3º: Fallback para o mais recente geral
    try {
      const latestList = await pb
        .collection('ibs_cbs_parametros')
        .getList<IbsCbsParametroRecord>(1, 1, {
          sort: '-ano_calendario',
        })
      if (latestList.items.length > 0) {
        return latestList.items[0]
      }
    } catch {
      /* intentionally ignored */
    }
    return null
  }
}

/**
 * Cria novos parâmetros para um ano-calendário.
 */
export async function createIbsCbsParametro(
  data: Omit<IbsCbsParametroRecord, 'id' | 'created' | 'updated'>,
): Promise<IbsCbsParametroRecord> {
  return pb.collection('ibs_cbs_parametros').create<IbsCbsParametroRecord>(data)
}

/**
 * Atualiza parâmetros de um ano-calendário.
 */
export async function updateIbsCbsParametro(
  id: string,
  data: Partial<Omit<IbsCbsParametroRecord, 'id' | 'created' | 'updated'>>,
): Promise<IbsCbsParametroRecord> {
  return pb.collection('ibs_cbs_parametros').update<IbsCbsParametroRecord>(id, data)
}

/**
 * Exclui parâmetros de um ano-calendário.
 */
export async function deleteIbsCbsParametro(id: string): Promise<boolean> {
  return pb.collection('ibs_cbs_parametros').delete(id)
}

/**
 * Calcula o IVA Reduzido: iva_padrao × (1 − reducao_percentual / 100)
 */
export function calcularIvaReduzido(ivaPadrao: number, reducaoPercentual: number): number {
  return (Number(ivaPadrao) || 0) * (1 - (Number(reducaoPercentual) || 0) / 100)
}

/**
 * Executa todos os cálculos da Apuração IBS/CBS para Pessoa Física com Atividade Rural.
 *
 * Regras:
 * - Resultado Líquido = Receita Bruta − Despesa Bruta
 * - Base de Cálculo (Presunção) = Receita Bruta × presuncao_bc%
 * - IVA Reduzido = iva_padrao × (1 − reducao_percentual%)
 * - Débito IBS/CBS = Base de Cálculo × IVA Reduzido%
 * - Crédito IBS/CBS = Despesa Bruta × IVA Reduzido%
 * - Funrural = Receita Bruta × funrural%
 * - Total de Tributos = Débito − Crédito + Funrural
 * - Carga Tributária = Total de Tributos / Receita Bruta (%)
 */
export function calcularApuracaoIbsCbs(
  receitaBruta: number,
  despesaBruta: number,
  param: {
    ano_calendario: number
    iva_padrao: number
    reducao_percentual: number
    presuncao_bc: number
    funrural: number
  },
  isFallbackAno = false,
  anoUtilizado?: number,
): IbsCbsApuracaoCalculo {
  const rec = Number(receitaBruta) || 0
  const desp = Number(despesaBruta) || 0
  const resultadoLiquido = rec - desp

  const presuncaoBcPerc = Number(param.presuncao_bc) || 0
  const ivaPadraoPerc = Number(param.iva_padrao) || 0
  const reducaoPercentual = Number(param.reducao_percentual) || 0
  const funruralPerc = Number(param.funrural) || 0

  const baseCalculo = (rec * presuncaoBcPerc) / 100
  const ivaReduzidoPerc = calcularIvaReduzido(ivaPadraoPerc, reducaoPercentual)

  const debitoIbsCbs = (baseCalculo * ivaReduzidoPerc) / 100
  const creditoIbsCbs = (desp * ivaReduzidoPerc) / 100
  const funruralValor = (rec * funruralPerc) / 100

  const totalTributos = debitoIbsCbs - creditoIbsCbs + funruralValor
  const cargaTributariaPerc = rec > 0 ? (totalTributos / rec) * 100 : 0

  return {
    receita_bruta: rec,
    despesa_bruta: desp,
    resultado_liquido: resultadoLiquido,
    presuncao_bc_perc: presuncaoBcPerc,
    base_calculo: baseCalculo,
    iva_padrao_perc: ivaPadraoPerc,
    reducao_percentual: reducaoPercentual,
    iva_reduzido_perc: ivaReduzidoPerc,
    debito_ibs_cbs: debitoIbsCbs,
    credito_ibs_cbs: creditoIbsCbs,
    funrural_perc: funruralPerc,
    funrural_valor: funruralValor,
    total_tributos: totalTributos,
    carga_tributaria_perc: cargaTributariaPerc,
    ano_calendario: param.ano_calendario,
    is_fallback_ano: isFallbackAno,
    ano_utilizado: anoUtilizado || param.ano_calendario,
  }
}
