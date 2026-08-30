import pb from '@/lib/pocketbase/client'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  EmpresaFaturamentoRecord,
  SimulacaoPjParams,
  SimulacaoPjResultados,
  CenarioSimulacaoPjRecord,
  FaixaProgressiva,
} from '@/types'
import {
  calcularApuracaoSimples,
  calcularApuracaoPresumido,
  calcularApuracaoReal,
} from './apuracaoPj'
import {
  getTabelaSimplesPorAnoAnexo,
  getTabelaPresumidoPorAnoAtividade,
  getTabelaIrpjCsllPorAno,
  getTabelaIssPorAno,
  getTabelaPisCofinsRealPorAno,
} from './tabelasPj'
import { getTabelaPorAno } from './tabelas'

function calcIRPFSocio(baseCalculo: number, faixas: FaixaProgressiva[]): number {
  if (!Array.isArray(faixas) || faixas.length === 0) return 0
  for (let i = faixas.length - 1; i >= 0; i--) {
    const f = faixas[i]
    if (baseCalculo > (f.limite_inferior || 0)) {
      const aliq = (f.aliquota || 0) / 100
      const parcelaDeduzir = f.parcela_deduzir != null ? f.parcela_deduzir : (f.deducao || 0) * 12
      return Math.max(0, baseCalculo * aliq - parcelaDeduzir)
    }
  }
  return 0
}

/**
 * Motor de Simulação Interativa PJ + IRPF dos Sócios
 */
export async function simularCenarioPj(
  empresa: EmpresaRecord,
  faturamentos: EmpresaFaturamentoRecord[],
  socios: EmpresaSocioRecord[],
  anoCalendario: number,
  params: SimulacaoPjParams,
  altasRendasAliq: number = 10,
): Promise<SimulacaoPjResultados> {
  // 1. Obter tabelas vigentes
  const [
    tabelaSimplesRes,
    tabelaPresumidoRes,
    tabelaIrpjRes,
    tabelaIssRes,
    tabelaPisCofinsRes,
    tabelaProgRes,
  ] = await Promise.all([
    getTabelaSimplesPorAnoAnexo(anoCalendario, empresa.anexo_simples || 'III'),
    getTabelaPresumidoPorAnoAtividade(anoCalendario, empresa.atividade),
    getTabelaIrpjCsllPorAno(anoCalendario),
    getTabelaIssPorAno(anoCalendario),
    getTabelaPisCofinsRealPorAno(anoCalendario),
    getTabelaPorAno(anoCalendario).catch(() => null),
  ])

  const faixasIRPF = tabelaProgRes?.faixas || []

  // 2. Montar apuração base (atual)
  let tributosPjAtual = 0
  let cargaAtual = 0
  let receitaBrutaAnual = 0

  if (empresa.regime === 'simples') {
    const ap = calcularApuracaoSimples(
      faturamentos,
      anoCalendario,
      empresa.anexo_simples || 'III',
      tabelaSimplesRes.tabela,
    )
    tributosPjAtual = ap.total_das
    cargaAtual = ap.aliquota_efetiva_media
    receitaBrutaAnual = ap.receita_bruta_anual
  } else if (empresa.regime === 'presumido') {
    const ap = calcularApuracaoPresumido(
      faturamentos,
      anoCalendario,
      tabelaPresumidoRes.tabela,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
    )
    tributosPjAtual = ap.total_tributos_pj
    cargaAtual = ap.aliquota_efetiva_anual
    receitaBrutaAnual = ap.receita_bruta_anual
  } else {
    const ap = calcularApuracaoReal(
      faturamentos,
      anoCalendario,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
      tabelaPisCofinsRes.tabela,
    )
    tributosPjAtual = ap.total_tributos_pj
    cargaAtual = ap.aliquota_efetiva_anual
    receitaBrutaAnual = ap.receita_bruta_anual
  }

  // 3. Simular novo cenário com ajuste de pró-labores (impacta a folha e o Fator R / Lucro Contábil)
  const proLaboreMensalTotalSimulado = params.socios_params.reduce(
    (s, p) => s + (Number(p.pro_labore_mensal) || 0),
    0,
  )

  // Ajusta a folha proporcionalmente nos meses com base no novo pró-labore total
  const faturamentosSimulados = faturamentos.map((f) => {
    if (f.ano_calendario !== anoCalendario) return f
    return {
      ...f,
      folha: proLaboreMensalTotalSimulado > 0 ? proLaboreMensalTotalSimulado : f.folha || 0,
    }
  })

  let tributosPjOtimizado = tributosPjAtual
  let cargaOtimizada = cargaAtual
  let lucroDistribuivelTotal = 0

  if (empresa.regime === 'simples') {
    const apSim = calcularApuracaoSimples(
      faturamentosSimulados,
      anoCalendario,
      empresa.anexo_simples || 'III',
      tabelaSimplesRes.tabela,
    )
    tributosPjOtimizado = apSim.total_das
    cargaOtimizada = apSim.aliquota_efetiva_media
    lucroDistribuivelTotal = apSim.lucro_distribuivel
  } else if (empresa.regime === 'presumido') {
    const apPres = calcularApuracaoPresumido(
      faturamentosSimulados,
      anoCalendario,
      tabelaPresumidoRes.tabela,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
    )
    tributosPjOtimizado = apPres.total_tributos_pj
    cargaOtimizada = apPres.aliquota_efetiva_anual
    lucroDistribuivelTotal = apPres.lucro_distribuivel
  } else {
    const apReal = calcularApuracaoReal(
      faturamentosSimulados,
      anoCalendario,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
      tabelaPisCofinsRes.tabela,
    )
    tributosPjOtimizado = apReal.total_tributos_pj
    cargaOtimizada = apReal.aliquota_efetiva_anual
    lucroDistribuivelTotal = apReal.lucro_distribuivel
  }

  const economiaPj = Math.max(0, tributosPjAtual - tributosPjOtimizado)

  // 4. Calcular impacto individual em cada sócio
  let totalIrpfSocios = 0
  const sociosResultados = params.socios_params.map((sp) => {
    const socioOrig = socios.find((s) => s.id === sp.socio_id)
    const percentualParticipacao = Number(socioOrig?.percentual_participacao) || 0

    const proLaboreAnual = (Number(sp.pro_labore_mensal) || 0) * 12
    const cotaLucroMaximo = (lucroDistribuivelTotal * percentualParticipacao) / 100
    const pctDistribuicao = sp.percentual_distribuicao_lucros ?? 100
    const lucrosDistribuidos = (cotaLucroMaximo * pctDistribuicao) / 100

    // IRPF sobre pró-labore
    const irpfProLabore = calcIRPFSocio(proLaboreAnual, faixasIRPF)

    // Altas Rendas sobre dividendos se ultrapassar teto anual
    const irpfmAltasRendas =
      lucrosDistribuidos > 600000 ? ((lucrosDistribuidos - 600000) * altasRendasAliq) / 100 : 0

    const totalIrpfSocio = irpfProLabore + irpfmAltasRendas
    totalIrpfSocios += totalIrpfSocio

    return {
      socio_id: sp.socio_id,
      cliente_nome: sp.cliente_nome,
      pro_labore_anual: Number(proLaboreAnual.toFixed(2)),
      lucros_distribuidos: Number(lucrosDistribuidos.toFixed(2)),
      irpf_estimado_socio: Number(irpfProLabore.toFixed(2)),
      irpfm_altas_rendas_estimado: Number(irpfmAltasRendas.toFixed(2)),
      total_irpf_socio: Number(totalIrpfSocio.toFixed(2)),
    }
  })

  // 5. Consolidado Grupo (PJ + Sócios)
  const totalTributosGrupo = tributosPjOtimizado + totalIrpfSocios
  const totalTributosGrupoAntes = tributosPjAtual + totalIrpfSocios
  const economiaGlobal = Math.max(0, totalTributosGrupoAntes - totalTributosGrupo)
  const cargaGlobalPerc = receitaBrutaAnual > 0 ? (totalTributosGrupo / receitaBrutaAnual) * 100 : 0

  return {
    empresa: {
      tributos_pj_atual: Number(tributosPjAtual.toFixed(2)),
      carga_tributaria_atual: Number(cargaAtual.toFixed(2)),
      tributos_pj_otimizado: Number(tributosPjOtimizado.toFixed(2)),
      carga_tributaria_otimizada: Number(cargaOtimizada.toFixed(2)),
      economia_pj: Number(economiaPj.toFixed(2)),
      folha_total_anual: Number((proLaboreMensalTotalSimulado * 12).toFixed(2)),
      lucro_distribuivel_total: Number(lucroDistribuivelTotal.toFixed(2)),
    },
    socios: sociosResultados,
    consolidado: {
      total_tributos_grupo: Number(totalTributosGrupo.toFixed(2)),
      economia_global: Number(economiaGlobal.toFixed(2)),
      carga_global_perc: Number(cargaGlobalPerc.toFixed(2)),
    },
  }
}

// Salvar / Listar Cenários PJ
export async function getCenariosPj(
  empresaId: string,
  ano?: number,
): Promise<CenarioSimulacaoPjRecord[]> {
  let filter = `empresa_id = "${empresaId}"`
  if (ano) filter += ` && ano_calendario = ${ano}`
  return pb.collection('cenarios_simulacao_pj').getFullList<CenarioSimulacaoPjRecord>({
    filter,
    sort: '-created',
  })
}

export async function createCenarioPj(
  data: Omit<CenarioSimulacaoPjRecord, 'id' | 'created' | 'updated'>,
): Promise<CenarioSimulacaoPjRecord> {
  return pb.collection('cenarios_simulacao_pj').create<CenarioSimulacaoPjRecord>(data)
}

export async function deleteCenarioPj(id: string): Promise<boolean> {
  return pb.collection('cenarios_simulacao_pj').delete(id)
}
