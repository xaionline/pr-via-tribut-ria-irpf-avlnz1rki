import pb from '@/lib/pocketbase/client'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  EmpresaFaturamentoRecord,
  TabelaSimplesRecord,
  TabelaPresumidoRecord,
  TabelaIrpjCsllRecord,
  TabelaIssRecord,
  ApuracaoSimplesAnual,
  ApuracaoSimplesMes,
  ApuracaoPresumidoAnual,
  ApuracaoPresumidoTrimestre,
  DistribuicaoSocioResultado,
  IntegracaoDistribuicaoResponse,
  DeclaracaoRecord,
  FontePagadoraRecord,
  RendimentoRecord,
  AnexoSimplesNacional,
} from '@/types'
import {
  getTabelaSimplesPorAnoAnexo,
  getTabelaPresumidoPorAnoAtividade,
  getTabelaIrpjCsllPorAno,
  getTabelaIssPorAno,
} from './tabelasPj'
import { getFaturamentosEmpresa, getSociosDaEmpresa } from './empresas'

/**
 * Realiza os cálculos de Apuração do Simples Nacional por mês e consolidado anual.
 *
 * Fórmula da Alíquota Efetiva:
 * Alíquota Efetiva = [(RBT12 × Alíquota Nominal) − Parcela a Deduzir] / RBT12
 * DAS = Receita do Mês × Alíquota Efetiva
 *
 * Fator R: se anexo V ou III sujeito ao Fator R (Folha12 / RBT12 >= 28%), aplica Anexo III, senão Anexo V.
 */
export function calcularApuracaoSimples(
  faturamentos: EmpresaFaturamentoRecord[],
  anoCalendario: number,
  anexoPadrao: AnexoSimplesNacional = 'III',
  tabelaSimples: TabelaSimplesRecord | null,
): ApuracaoSimplesAnual {
  const faturamentosAno = faturamentos.filter((f) => f.ano_calendario === anoCalendario)
  const mesesOrdenados = Array.from({ length: 12 }, (_, i) => i + 1)

  let receitaAcumuladaTotal = 0
  let folhaAcumuladaTotal = 0
  let totalDas = 0

  const mesesApurados: ApuracaoSimplesMes[] = mesesOrdenados.map((mes) => {
    const fatMes = faturamentosAno.find((f) => f.mes === mes)
    const recMes = Number(fatMes?.receita_bruta) || 0
    const folhaMes = Number(fatMes?.folha) || 0

    receitaAcumuladaTotal += recMes
    folhaAcumuladaTotal += folhaMes

    // Cálculo RBT12 e Folha12 considerando histórico dos últimos 12 meses
    // Para simplificação realista no exercício: acumulado no ano ou proporcionalizado
    let rbt12 = 0
    let folha12 = 0

    const faturamentosHistoricos = faturamentos.filter((f) => {
      if (f.ano_calendario === anoCalendario && f.mes < mes) return true
      if (f.ano_calendario === anoCalendario - 1 && f.mes >= mes) return true
      return false
    })

    if (faturamentosHistoricos.length > 0) {
      rbt12 = faturamentosHistoricos.reduce((s, f) => s + (Number(f.receita_bruta) || 0), 0)
      folha12 = faturamentosHistoricos.reduce((s, f) => s + (Number(f.folha) || 0), 0)
    } else {
      // Caso não haja 12 meses anteriores, proporcionaliza
      rbt12 = recMes * 12
      folha12 = folhaMes * 12
    }

    if (rbt12 <= 0) {
      rbt12 = recMes > 0 ? recMes * 12 : 180000
    }

    const fatorR = rbt12 > 0 ? folha12 / rbt12 : 0

    // Regra Fator R para anexos III e V
    let anexoAplicado = anexoPadrao
    if (anexoPadrao === 'V' && fatorR >= 0.28) {
      anexoAplicado = 'III' // Fator R reduz carga para Anexo III
    }

    // Localizar faixa na tabela do Simples
    const faixas = tabelaSimples?.faixas || [
      { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 6.0, parcela_deduzir: 0 },
      {
        faixa: 2,
        faixa_inicial: 180000.01,
        faixa_final: 360000,
        aliquota: 11.2,
        parcela_deduzir: 9360,
      },
      {
        faixa: 3,
        faixa_inicial: 360000.01,
        faixa_final: 720000,
        aliquota: 13.5,
        parcela_deduzir: 17640,
      },
      {
        faixa: 4,
        faixa_inicial: 720000.01,
        faixa_final: 1800000,
        aliquota: 16.0,
        parcela_deduzir: 35640,
      },
      {
        faixa: 5,
        faixa_inicial: 1800000.01,
        faixa_final: 3600000,
        aliquota: 21.0,
        parcela_deduzir: 125640,
      },
      {
        faixa: 6,
        faixa_inicial: 3600000.01,
        faixa_final: 4800000,
        aliquota: 33.0,
        parcela_deduzir: 648000,
      },
    ]

    let faixaEncontrada = faixas.find((f) => rbt12 >= f.faixa_inicial && rbt12 <= f.faixa_final)
    if (!faixaEncontrada) {
      faixaEncontrada = faixas[faixas.length - 1]
    }

    const aliquotaNominal = faixaEncontrada.aliquota
    const parcelaDeduzir = faixaEncontrada.parcela_deduzir

    let aliquotaEfetiva = 0
    if (rbt12 > 0) {
      aliquotaEfetiva = ((rbt12 * (aliquotaNominal / 100) - parcelaDeduzir) / rbt12) * 100
    }
    aliquotaEfetiva = Math.max(0, aliquotaEfetiva)

    const valorDas = (recMes * aliquotaEfetiva) / 100
    totalDas += valorDas

    return {
      mes,
      receita_bruta: recMes,
      folha: folhaMes,
      rbt12,
      folha12,
      fator_r: fatorR,
      anexo_aplicado: anexoAplicado,
      faixa: faixaEncontrada.faixa || 1,
      aliquota_nominal: aliquotaNominal,
      parcela_deduzir: parcelaDeduzir,
      aliquota_efetiva: Number(aliquotaEfetiva.toFixed(4)),
      valor_das: Number(valorDas.toFixed(2)),
    }
  })

  const aliquotaMedia = receitaAcumuladaTotal > 0 ? (totalDas / receitaAcumuladaTotal) * 100 : 0

  // Lucro apurado estimado = Receita Bruta - Folha - DAS - custos operacionais (estimado 15%)
  const outrosCustosEstimados = receitaAcumuladaTotal * 0.1
  const lucroEstimado = Math.max(
    0,
    receitaAcumuladaTotal - folhaAcumuladaTotal - totalDas - outrosCustosEstimados,
  )

  return {
    ano_calendario: anoCalendario,
    regime: 'simples',
    receita_bruta_anual: Number(receitaAcumuladaTotal.toFixed(2)),
    folha_anual: Number(folhaAcumuladaTotal.toFixed(2)),
    total_das: Number(totalDas.toFixed(2)),
    aliquota_efetiva_media: Number(aliquotaMedia.toFixed(2)),
    meses: mesesApurados,
    lucro_apurado_estimado: Number(lucroEstimado.toFixed(2)),
    lucro_distribuivel: Number(lucroEstimado.toFixed(2)),
  }
}

/**
 * Realiza os cálculos de Apuração do Lucro Presumido trimestral e anual.
 *
 * IRPJ: Base = Receita × Presunção% (ex: 32% para serviços, 8% comércio)
 *       IRPJ Básico = Base × 15%
 *       IRPJ Adicional = Max(0, Base - R$ 60.000 no trimestre) × 10%
 * CSLL: Base = Receita × Presunção% (ex: 32% serviços, 12% comércio)
 *       CSLL = Base × 9%
 * PIS: Receita × 0.65% (cumulativo)
 * COFINS: Receita × 3.00% (cumulativo)
 * ISS: Receita × Alíquota ISS (ex: 5.00%)
 */
export function calcularApuracaoPresumido(
  faturamentos: EmpresaFaturamentoRecord[],
  anoCalendario: number,
  tabelaPresumido: TabelaPresumidoRecord | null,
  tabelaIrpjCsll: TabelaIrpjCsllRecord | null,
  tabelaIss: TabelaIssRecord | null,
): ApuracaoPresumidoAnual {
  const faturamentosAno = faturamentos.filter((f) => f.ano_calendario === anoCalendario)

  const presuncaoIrpj = tabelaPresumido?.presuncao_irpj ?? 32.0
  const presuncaoCsll = tabelaPresumido?.presuncao_csll ?? 32.0
  const aliqIrpj = tabelaIrpjCsll?.aliquota_irpj ?? 15.0
  const adicionalIrpj = tabelaIrpjCsll?.adicional_irpj ?? 10.0
  const limiteTrimestralAdicional = (tabelaIrpjCsll?.limite_adicional ?? 20000) * 3 // R$ 60.000 / trimestre
  const aliqCsll = tabelaIrpjCsll?.aliquota_csll ?? 9.0
  const aliqIss = tabelaIss?.aliquota ?? 5.0

  const trimestresConfig = [
    { tri: 1, meses: [1, 2, 3] },
    { tri: 2, meses: [4, 5, 6] },
    { tri: 3, meses: [7, 8, 9] },
    { tri: 4, meses: [10, 11, 12] },
  ]

  let receitaAnual = 0
  let folhaAnual = 0
  let totalIrpj = 0
  let totalCsll = 0
  let totalPis = 0
  let totalCofins = 0
  let totalIss = 0

  const trimestresApurados: ApuracaoPresumidoTrimestre[] = trimestresConfig.map((t) => {
    const fatsTrimestre = faturamentosAno.filter((f) => t.meses.includes(f.mes))
    const recTrimestre = fatsTrimestre.reduce((s, f) => s + (Number(f.receita_bruta) || 0), 0)
    const folhaTrimestre = fatsTrimestre.reduce((s, f) => s + (Number(f.folha) || 0), 0)

    receitaAnual += recTrimestre
    folhaAnual += folhaTrimestre

    const bcIrpj = (recTrimestre * presuncaoIrpj) / 100
    const irpjBasico = (bcIrpj * aliqIrpj) / 100
    const excedente = Math.max(0, bcIrpj - limiteTrimestralAdicional)
    const irpjAdic = (excedente * adicionalIrpj) / 100
    const irpjTot = irpjBasico + irpjAdic

    const bcCsll = (recTrimestre * presuncaoCsll) / 100
    const csllTot = (bcCsll * aliqCsll) / 100

    const pisTot = (recTrimestre * 0.65) / 100
    const cofinsTot = (recTrimestre * 3.0) / 100
    const issTot = (recTrimestre * aliqIss) / 100

    const tributosTri = irpjTot + csllTot + pisTot + cofinsTot + issTot
    const aliqEfetivaTri = recTrimestre > 0 ? (tributosTri / recTrimestre) * 100 : 0

    totalIrpj += irpjTot
    totalCsll += csllTot
    totalPis += pisTot
    totalCofins += cofinsTot
    totalIss += issTot

    return {
      trimestre: t.tri,
      meses: t.meses,
      receita_bruta: Number(recTrimestre.toFixed(2)),
      presuncao_irpj_perc: presuncaoIrpj,
      base_calculo_irpj: Number(bcIrpj.toFixed(2)),
      irpj_basico: Number(irpjBasico.toFixed(2)),
      irpj_adicional: Number(irpjAdic.toFixed(2)),
      irpj_total: Number(irpjTot.toFixed(2)),
      presuncao_csll_perc: presuncaoCsll,
      base_calculo_csll: Number(bcCsll.toFixed(2)),
      csll_total: Number(csllTot.toFixed(2)),
      pis_total: Number(pisTot.toFixed(2)),
      cofins_total: Number(cofinsTot.toFixed(2)),
      iss_total: Number(issTot.toFixed(2)),
      total_tributos_trimestre: Number(tributosTri.toFixed(2)),
      aliquota_efetiva_trimestre: Number(aliqEfetivaTri.toFixed(2)),
    }
  })

  const totalTributosPj = totalIrpj + totalCsll + totalPis + totalCofins + totalIss
  const aliqEfetivaAnual = receitaAnual > 0 ? (totalTributosPj / receitaAnual) * 100 : 0

  // Lucro Presumido Isento Máximo por lei (Receita x Presunção - IRPJ/CSLL/PIS/COFINS/ISS)
  const basePresumidaTotal = (receitaAnual * presuncaoIrpj) / 100
  const lucroPresumidoIsento = Math.max(0, basePresumidaTotal - totalTributosPj)

  // Lucro apurado contábil estimado
  const lucroEstimado = Math.max(
    0,
    receitaAnual - folhaAnual - totalTributosPj - receitaAnual * 0.1,
  )

  return {
    ano_calendario: anoCalendario,
    regime: 'presumido',
    receita_bruta_anual: Number(receitaAnual.toFixed(2)),
    folha_anual: Number(folhaAnual.toFixed(2)),
    total_irpj: Number(totalIrpj.toFixed(2)),
    total_csll: Number(totalCsll.toFixed(2)),
    total_pis: Number(totalPis.toFixed(2)),
    total_cofins: Number(totalCofins.toFixed(2)),
    total_iss: Number(totalIss.toFixed(2)),
    total_tributos_pj: Number(totalTributosPj.toFixed(2)),
    aliquota_efetiva_anual: Number(aliqEfetivaAnual.toFixed(2)),
    trimestres: trimestresApurados,
    lucro_presumido_isento_maximo: Number(lucroPresumidoIsento.toFixed(2)),
    lucro_apurado_estimado: Number(lucroEstimado.toFixed(2)),
    lucro_distribuivel: Number(lucroEstimado.toFixed(2)),
  }
}

/**
 * Calcula a distribuição de lucros, pró-labore e JCP para os sócios da empresa.
 */
export function calcularDistribuicaoSocios(
  socios: EmpresaSocioRecord[],
  lucroDistribuivelTotal: number,
  anoCalendario: number,
): DistribuicaoSocioResultado[] {
  return socios.map((socio) => {
    const percentual = Number(socio.percentual_participacao) || 0
    const proLaboreMensal = Number(socio.pro_labore_mensal) || 0
    const proLaboreAnual = proLaboreMensal * 12 // tipo 'tributavel'

    // Lucros distribuídos proporcionais à cota
    let lucrosDistribuidos = 0
    if (socio.participa_lucros !== false) {
      lucrosDistribuidos = (lucroDistribuivelTotal * percentual) / 100
    }

    // Juros Sobre Capital Próprio se ativado (estimativa 5% do lucro)
    let jcpDistribuido = 0
    if (socio.participa_jcp) {
      jcpDistribuido = lucrosDistribuidos * 0.1 // parcela convertida em JCP
      lucrosDistribuidos -= jcpDistribuido
    }

    const cliente = socio.expand?.cliente_id
    const clienteNome = cliente?.nome || 'Sócio PF'
    const cpf = cliente?.cpf || ''

    return {
      socio_id: socio.id,
      cliente_id: socio.cliente_id,
      cliente_nome: clienteNome,
      cpf,
      percentual,
      pro_labore_anual: Number(proLaboreAnual.toFixed(2)),
      lucros_distribuidos: Number(lucrosDistribuidos.toFixed(2)),
      jcp_distribuido: Number(jcpDistribuido.toFixed(2)),
      dividendos_altas_rendas: Number(lucrosDistribuidos.toFixed(2)), // dividendos alimentam a base de Altas Rendas (IRPF-M)
    }
  })
}

/**
 * Integração e sincronização automática da PJ com o IRPF dos Sócios:
 * 1. Localiza ou cria a declaração IRPF do sócio para o ano-calendário
 * 2. Localiza ou cria a Fonte Pagadora referente à Empresa (CNPJ + Razão Social)
 * 3. Lança Pró-labore em rendimentos como 'tributavel'
 * 4. Lança Lucros Distribuídos em rendimentos como 'isento' e 'dividendos' (para Altas Rendas)
 * 5. Lança JCP em rendimentos como 'exclusiva'
 */
export async function sincronizarDistribuicaoComIRPF(
  empresa: EmpresaRecord,
  anoCalendario: number,
  distribuicoes: DistribuicaoSocioResultado[],
): Promise<IntegracaoDistribuicaoResponse> {
  let totalSocios = 0
  let totalRendimentosCriados = 0
  const detalhes: IntegracaoDistribuicaoResponse['detalhes'] = []

  for (const item of distribuicoes) {
    if (!item.cliente_id) continue

    // 1. Obter ou criar a Declaração IRPF do cliente para este ano
    let declaracao: DeclaracaoRecord
    try {
      declaracao = await pb
        .collection('declaracoes')
        .getFirstListItem<DeclaracaoRecord>(
          `cliente_id = "${item.cliente_id}" && ano_calendario = ${anoCalendario}`,
        )
    } catch (_) {
      // Cria declaração em rascunho
      const cliente = await pb.collection('clientes').getOne(item.cliente_id)
      declaracao = await pb.collection('declaracoes').create<DeclaracaoRecord>({
        escritorio_id: empresa.escritorio_id || cliente.escritorio_id,
        cliente_id: item.cliente_id,
        ano_calendario: anoCalendario,
        status: 'rascunho',
        modalidade: 'legal',
        progresso: 15,
      })
    }

    // 2. Obter ou criar Fonte Pagadora na Declaração com os dados da Empresa PJ
    let fontePagadora: FontePagadoraRecord
    try {
      fontePagadora = await pb
        .collection('fontes_pagadoras')
        .getFirstListItem<FontePagadoraRecord>(
          `declaracao_id = "${declaracao.id}" && cnpj = "${empresa.cnpj}"`,
        )
    } catch (_) {
      fontePagadora = await pb.collection('fontes_pagadoras').create<FontePagadoraRecord>({
        declaracao_id: declaracao.id,
        nome: empresa.razao_social,
        cnpj: empresa.cnpj,
        tipo: 'pro_labore',
      })
    }

    // 3. Limpar rendimentos automáticos prévios dessa fonte/empresa para evitar duplicidade
    try {
      const existingRends = await pb.collection('rendimentos').getFullList<RendimentoRecord>({
        filter: `declaracao_id = "${declaracao.id}" && fonte_pagadora_id = "${fontePagadora.id}"`,
      })
      for (const r of existingRends) {
        await pb.collection('rendimentos').delete(r.id)
      }
    } catch {
      /* ignore */
    }

    // 4. Inserir Pró-labore (tipo 'tributavel')
    if (item.pro_labore_anual > 0) {
      await pb.collection('rendimentos').create<RendimentoRecord>({
        declaracao_id: declaracao.id,
        fonte_pagadora_id: fontePagadora.id,
        descricao: `Pró-Labore Anual - ${empresa.razao_social}`,
        tipo: 'tributavel',
        valor: item.pro_labore_anual,
        origem: 'manual',
      })
      totalRendimentosCriados++
    }

    // 5. Inserir Lucros / Dividendos (tipo 'dividendos' e 'isento' para atender a legislação IRPF e módulo Altas Rendas)
    if (item.lucros_distribuidos > 0) {
      await pb.collection('rendimentos').create<RendimentoRecord>({
        declaracao_id: declaracao.id,
        fonte_pagadora_id: fontePagadora.id,
        descricao: `Lucros e Dividendos Distribuídos (${item.percentual}%) - ${empresa.razao_social}`,
        tipo: 'dividendos',
        valor: item.lucros_distribuidos,
        origem: 'manual',
      })
      totalRendimentosCriados++
    }

    // 6. Inserir Juros Sobre Capital Próprio (tipo 'exclusiva')
    if (item.jcp_distribuido > 0) {
      await pb.collection('rendimentos').create<RendimentoRecord>({
        declaracao_id: declaracao.id,
        fonte_pagadora_id: fontePagadora.id,
        descricao: `Juros Sobre Capital Próprio (JCP) - ${empresa.razao_social}`,
        tipo: 'exclusiva',
        valor: item.jcp_distribuido,
        origem: 'manual',
      })
      totalRendimentosCriados++
    }

    totalSocios++
    detalhes.push({
      socio_nome: item.cliente_nome,
      cliente_id: item.cliente_id,
      declaracao_id: declaracao.id,
      pro_labore: item.pro_labore_anual,
      lucros: item.lucros_distribuidos,
      jcp: item.jcp_distribuido,
    })
  }

  return {
    success: true,
    total_socios_atualizados: totalSocios,
    rendimentos_criados: totalRendimentosCriados,
    detalhes,
  }
}

/**
 * Retorna apuração completa da empresa para um ano especificado.
 */
export async function getApuracaoEmpresaCompleta(empresaId: string, anoCalendario: number) {
  const empresa = await pb.collection('empresas').getOne<EmpresaRecord>(empresaId, {
    expand: 'escritorio_id',
  })
  const [faturamentos, socios] = await Promise.all([
    getFaturamentosEmpresa(empresaId),
    getSociosDaEmpresa(empresaId),
  ])

  let apuracaoSimples: ApuracaoSimplesAnual | null = null
  let apuracaoPresumido: ApuracaoPresumidoAnual | null = null
  let lucroDistribuivel = 0

  if (empresa.regime === 'simples') {
    const { tabela } = await getTabelaSimplesPorAnoAnexo(
      anoCalendario,
      empresa.anexo_simples || 'III',
    )
    apuracaoSimples = calcularApuracaoSimples(
      faturamentos,
      anoCalendario,
      empresa.anexo_simples || 'III',
      tabela,
    )
    lucroDistribuivel = apuracaoSimples.lucro_distribuivel
  } else {
    const [tabelaPresumidoRes, tabelaIrpjRes, tabelaIssRes] = await Promise.all([
      getTabelaPresumidoPorAnoAtividade(anoCalendario, empresa.atividade),
      getTabelaIrpjCsllPorAno(anoCalendario),
      getTabelaIssPorAno(anoCalendario),
    ])

    apuracaoPresumido = calcularApuracaoPresumido(
      faturamentos,
      anoCalendario,
      tabelaPresumidoRes.tabela,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
    )
    lucroDistribuivel = apuracaoPresumido.lucro_distribuivel
  }

  const distribuicoes = calcularDistribuicaoSocios(socios, lucroDistribuivel, anoCalendario)

  return {
    empresa,
    faturamentos,
    socios,
    apuracaoSimples,
    apuracaoPresumido,
    distribuicoes,
    lucroDistribuivel,
    anoCalendario,
  }
}
