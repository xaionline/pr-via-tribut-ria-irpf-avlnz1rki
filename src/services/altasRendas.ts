import pb from '@/lib/pocketbase/client'
import type {
  AltasRendasParametroRecord,
  AltasRendasApuracaoCalculo,
  DeclaracaoRecord,
  RendimentoRecord,
  AtividadeRuralRecord,
  IrrfRecord,
} from '@/types'

/**
 * Retorna todos os parâmetros de Altas Rendas cadastrados ordenados por ano decrescente.
 */
export async function getParametros(anoCalendario?: number): Promise<AltasRendasParametroRecord[]> {
  if (anoCalendario) {
    return pb.collection('altas_rendas_parametros').getFullList<AltasRendasParametroRecord>({
      filter: `ano_calendario = ${anoCalendario}`,
      sort: '-ano_calendario',
    })
  }
  return pb.collection('altas_rendas_parametros').getFullList<AltasRendasParametroRecord>({
    sort: '-ano_calendario',
  })
}

/**
 * Retorna o parâmetro do ano solicitado ou, se não existir, o mais próximo/recente disponível.
 */
export async function getParametroPorAno(
  ano: number,
): Promise<{ parametro: AltasRendasParametroRecord | null; isFallback: boolean }> {
  try {
    const direct = await pb
      .collection('altas_rendas_parametros')
      .getFirstListItem<AltasRendasParametroRecord>(`ano_calendario = ${ano}`)
    return { parametro: direct, isFallback: false }
  } catch (_) {
    // Busca o mais recente disponível
    try {
      const list = await pb
        .collection('altas_rendas_parametros')
        .getList<AltasRendasParametroRecord>(1, 1, {
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
 * Retorna o registro do ano imediatamente anterior ao informado (para herança inteligente ao criar).
 */
export async function getParametroAnoAnterior(
  ano: number,
): Promise<AltasRendasParametroRecord | null> {
  try {
    const exactPrev = await pb
      .collection('altas_rendas_parametros')
      .getFirstListItem<AltasRendasParametroRecord>(`ano_calendario = ${ano - 1}`)
    return exactPrev
  } catch (_) {
    try {
      const prevList = await pb
        .collection('altas_rendas_parametros')
        .getList<AltasRendasParametroRecord>(1, 1, {
          filter: `ano_calendario < ${ano}`,
          sort: '-ano_calendario',
        })
      if (prevList.items.length > 0) {
        return prevList.items[0]
      }
    } catch {
      /* intentionally ignored */
    }
    try {
      const latestList = await pb
        .collection('altas_rendas_parametros')
        .getList<AltasRendasParametroRecord>(1, 1, {
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
export async function createParametro(
  data: Omit<AltasRendasParametroRecord, 'id' | 'created' | 'updated'>,
): Promise<AltasRendasParametroRecord> {
  return pb.collection('altas_rendas_parametros').create<AltasRendasParametroRecord>(data)
}

/**
 * Atualiza parâmetros de um ano-calendário.
 */
export async function updateParametro(
  id: string,
  data: Partial<Omit<AltasRendasParametroRecord, 'id' | 'created' | 'updated'>>,
): Promise<AltasRendasParametroRecord> {
  return pb.collection('altas_rendas_parametros').update<AltasRendasParametroRecord>(id, data)
}

/**
 * Exclui parâmetros de um ano-calendário.
 */
export async function deleteParametro(id: string): Promise<boolean> {
  return pb.collection('altas_rendas_parametros').delete(id)
}

/**
 * Executa o cálculo da Apuração de Altas Rendas (IRPF-M) a partir dos valores brutos.
 */
export function calcularApuracaoAltasRendas(params: {
  rendimentosTributaveis: number
  dividendos: number
  receitaRural: number
  receitaExterior: number
  aliquota: number
  irrfRetido: number
  irpfmRetidoExercicio: number
  anoCalendario: number
  isFallbackAno?: boolean
  anoUtilizado?: number
}): AltasRendasApuracaoCalculo {
  const rendTributaveis = Math.max(0, Number(params.rendimentosTributaveis) || 0)
  const dividendos = Math.max(0, Number(params.dividendos) || 0)
  const receitaRural = Math.max(0, Number(params.receitaRural) || 0)
  const receitaExterior = Math.max(0, Number(params.receitaExterior) || 0)

  const bcIrpfm = rendTributaveis + dividendos + receitaRural + receitaExterior
  const aliquotaPerc =
    typeof params.aliquota === 'number' && !isNaN(params.aliquota) ? params.aliquota : 10.0
  const irpfmDevido = (bcIrpfm * aliquotaPerc) / 100

  const irrfRetido = Math.max(0, Number(params.irrfRetido) || 0)
  const irpfmRetidoExercicio = Math.max(0, Number(params.irpfmRetidoExercicio) || 0)

  const totalDeducoes = irrfRetido + irpfmRetidoExercicio
  const diferenca = irpfmDevido - totalDeducoes

  let totalAPagar = 0
  let totalARestituir = 0

  if (diferenca > 0) {
    totalAPagar = diferenca
  } else if (diferenca < 0) {
    totalARestituir = Math.abs(diferenca)
  }

  const cargaTributariaPerc = bcIrpfm > 0 ? (irpfmDevido / bcIrpfm) * 100 : 0

  return {
    rendimentos_tributaveis: rendTributaveis,
    dividendos,
    receita_rural: receitaRural,
    receita_exterior: receitaExterior,
    bc_irpfm: bcIrpfm,
    aliquota_perc: aliquotaPerc,
    irpfm_devido: irpfmDevido,
    irrf_retido: irrfRetido,
    irpfm_retido_exercicio: irpfmRetidoExercicio,
    total_a_pagar: totalAPagar,
    total_a_restituir: totalARestituir,
    carga_tributaria_perc: cargaTributariaPerc,
    ano_calendario: params.anoCalendario,
    is_fallback_ano: params.isFallbackAno,
    ano_utilizado: params.anoUtilizado || params.anoCalendario,
  }
}

/**
 * Busca todos os dados vinculados à declaração e retorna o objeto completo de apuração do IRPF-M.
 */
export async function getApuracao(declaracaoId: string): Promise<{
  apuracao: AltasRendasApuracaoCalculo
  parametro: AltasRendasParametroRecord | null
  declaracao: DeclaracaoRecord
}> {
  // 1. Obter declaração
  const declaracao = await pb
    .collection('declaracoes')
    .getOne<DeclaracaoRecord>(declaracaoId, { expand: 'cliente_id' })

  const ano = declaracao.ano_calendario

  // 2. Buscar em paralelo os dados da declaração e os parâmetros
  const [rendimentos, atividadesRurais, irrfs, paramResult] = await Promise.all([
    pb.collection('rendimentos').getFullList<RendimentoRecord>({
      filter: `declaracao_id = "${declaracaoId}"`,
    }),
    pb.collection('atividades_rurais').getFullList<AtividadeRuralRecord>({
      filter: `declaracao_id = "${declaracaoId}"`,
    }),
    pb.collection('irrf').getFullList<IrrfRecord>({
      filter: `declaracao_id = "${declaracaoId}"`,
    }),
    getParametroPorAno(ano),
  ])

  // Rendimentos Tributáveis: tipo = 'tributavel'
  const rendimentosTributaveis = rendimentos
    .filter((r) => r.tipo === 'tributavel')
    .reduce((sum, r) => sum + (Number(r.valor) || 0), 0)

  // Dividendos: tipo = 'dividendos'
  const dividendos = rendimentos
    .filter((r) => r.tipo === 'dividendos')
    .reduce((sum, r) => sum + (Number(r.valor) || 0), 0)

  // Receita Exterior: tipo = 'exterior'
  const receitaExterior = rendimentos
    .filter((r) => r.tipo === 'exterior')
    .reduce((sum, r) => sum + (Number(r.valor) || 0), 0)

  // Receita Rural: soma de atividades_rurais.receita_bruta
  const receitaRural = atividadesRurais.reduce((sum, a) => sum + (Number(a.receita_bruta) || 0), 0)

  // IRRF Retido: tipo = 'irrf_comum' OU tipo vazio/null
  const irrfRetido = irrfs
    .filter((i) => !i.tipo || i.tipo === 'irrf_comum')
    .reduce((sum, i) => sum + (Number(i.valor) || 0), 0)

  // IRPF-M Retido no Exercício: tipo = 'irpfm_exercicio'
  const irpfmRetidoExercicio = irrfs
    .filter((i) => i.tipo === 'irpfm_exercicio')
    .reduce((sum, i) => sum + (Number(i.valor) || 0), 0)

  const aliquota = paramResult.parametro?.aliquota ?? 10.0

  const apuracao = calcularApuracaoAltasRendas({
    rendimentosTributaveis,
    dividendos,
    receitaRural,
    receitaExterior,
    aliquota,
    irrfRetido,
    irpfmRetidoExercicio,
    anoCalendario: ano,
    isFallbackAno: paramResult.isFallback,
    anoUtilizado: paramResult.parametro?.ano_calendario ?? ano,
  })

  return {
    apuracao,
    parametro: paramResult.parametro,
    declaracao,
  }
}
