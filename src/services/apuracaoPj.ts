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
import type {
  ApuracaoLucroRealAnual,
  ApuracaoLucroRealTrimestre,
  TabelaPisCofinsRealRecord,
  TabelaInsumoRealRecord,
  TabelaProdutoAgroRecord,
  DetalheCreditosInsumos,
  ComparativoRegimesResultado,
  ComparativoRegimeItem,
  RegimeTributarioPJ,
} from '@/types'
import {
  getTabelaSimplesPorAnoAnexo,
  getTabelaPresumidoPorAnoAtividade,
  getTabelaIrpjCsllPorAno,
  getTabelaIssPorAno,
  getTabelaPisCofinsRealPorAno,
  getTabelasInsumosRealPorAno,
  getTabelasProdutosAgroPorAno,
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
 * Calcula detalhadamente os créditos de PIS e COFINS por categoria de insumo e produto rural/agro.
 */
export function calcularCreditosInsumosMes(
  fat: EmpresaFaturamentoRecord,
  tabelasInsumos: TabelaInsumoRealRecord[] = [],
  tabelasAgro: TabelaProdutoAgroRecord[] = [],
  aliqPadraoPis: number = 1.65,
  aliqPadraoCofins: number = 7.6,
): { creditoPis: number; creditoCofins: number; detalhe: DetalheCreditosInsumos } {
  // Configs por categoria
  const catComercial = tabelasInsumos.find((t) => t.categoria === 'comercial_servico')
  const catRural = tabelasInsumos.find((t) => t.categoria === 'rural_agro')
  const catMonofasico = tabelasInsumos.find((t) => t.categoria === 'monofasico')
  const catImobilizado = tabelasInsumos.find((t) => t.categoria === 'imobilizado')

  const aliqComPis = catComercial ? catComercial.aliquota_credito_pis : aliqPadraoPis
  const aliqComCofins = catComercial ? catComercial.aliquota_credito_cofins : aliqPadraoCofins

  const aliqImoPis = catImobilizado ? catImobilizado.aliquota_credito_pis : aliqPadraoPis
  const aliqImoCofins = catImobilizado ? catImobilizado.aliquota_credito_cofins : aliqPadraoCofins

  const aliqMonoPis = catMonofasico ? catMonofasico.aliquota_credito_pis : 0
  const aliqMonoCofins = catMonofasico ? catMonofasico.aliquota_credito_cofins : 0

  const insDet = fat.insumos_detalhados

  // Se houver detalhamento por categoria preenchido:
  if (insDet) {
    const baseComercial = Number(insDet.comercial_servico) || 0
    const credComPis = (baseComercial * aliqComPis) / 100
    const credComCofins = (baseComercial * aliqComCofins) / 100

    const baseMonofasico = Number(insDet.monofasico) || 0
    const credMonoPis = (baseMonofasico * aliqMonoPis) / 100
    const credMonoCofins = (baseMonofasico * aliqMonoCofins) / 100

    const baseImobilizado = Number(insDet.imobilizado) || 0
    const credImoPis = (baseImobilizado * aliqImoPis) / 100
    const credImoCofins = (baseImobilizado * aliqImoCofins) / 100

    const baseOutros = Number(fat.outros_creditos_pis_cofins) || Number(insDet.outros_creditos) || 0
    const credOutrosPis = (baseOutros * aliqPadraoPis) / 100
    const credOutrosCofins = (baseOutros * aliqPadraoCofins) / 100

    // Rural / Agro com tabela de produto
    let baseRuralTotal = 0
    let credRuralPisTotal = 0
    let credRuralCofinsTotal = 0
    const itensAgroCalculados: DetalheCreditosInsumos['rural_agro']['itens'] = []

    const itensAgro = insDet.rural_agro?.itens || []
    if (itensAgro.length > 0) {
      for (const item of itensAgro) {
        const itemVal = Number(item.valor) || 0
        if (itemVal <= 0) continue

        const agroCfg = tabelasAgro.find((p) => p.codigo === item.produto_codigo)
        const aliqEffPis =
          item.aliquota_efetiva_pis !== undefined
            ? item.aliquota_efetiva_pis
            : agroCfg
              ? agroCfg.aliquota_efetiva_pis
              : (catRural?.aliquota_credito_pis ?? aliqPadraoPis * 0.5)

        const aliqEffCofins =
          item.aliquota_efetiva_cofins !== undefined
            ? item.aliquota_efetiva_cofins
            : agroCfg
              ? agroCfg.aliquota_efetiva_cofins
              : (catRural?.aliquota_credito_cofins ?? aliqPadraoCofins * 0.5)

        const cPis = (itemVal * aliqEffPis) / 100
        const cCofins = (itemVal * aliqEffCofins) / 100

        baseRuralTotal += itemVal
        credRuralPisTotal += cPis
        credRuralCofinsTotal += cCofins

        itensAgroCalculados.push({
          produto_codigo: item.produto_codigo,
          produto_nome: item.produto_nome || agroCfg?.nome || item.produto_codigo,
          base: Number(itemVal.toFixed(2)),
          aliquota_efetiva_pis: aliqEffPis,
          aliquota_efetiva_cofins: aliqEffCofins,
          credito_pis: Number(cPis.toFixed(2)),
          credito_cofins: Number(cCofins.toFixed(2)),
        })
      }
    } else {
      // Se não discriminou itens, mas informou rural_agro.total
      baseRuralTotal = Number(insDet.rural_agro?.total) || 0
      const aliqRuralPis = catRural ? catRural.aliquota_credito_pis : aliqPadraoPis * 0.5
      const aliqRuralCofins = catRural ? catRural.aliquota_credito_cofins : aliqPadraoCofins * 0.5
      credRuralPisTotal = (baseRuralTotal * aliqRuralPis) / 100
      credRuralCofinsTotal = (baseRuralTotal * aliqRuralCofins) / 100
    }

    const totalBase = baseComercial + baseRuralTotal + baseMonofasico + baseImobilizado + baseOutros
    const totalPis = credComPis + credRuralPisTotal + credMonoPis + credImoPis + credOutrosPis
    const totalCofins =
      credComCofins + credRuralCofinsTotal + credMonoCofins + credImoCofins + credOutrosCofins

    return {
      creditoPis: totalPis,
      creditoCofins: totalCofins,
      detalhe: {
        comercial_servico: {
          base: Number(baseComercial.toFixed(2)),
          aliquota_pis: aliqComPis,
          aliquota_cofins: aliqComCofins,
          credito_pis: Number(credComPis.toFixed(2)),
          credito_cofins: Number(credComCofins.toFixed(2)),
        },
        rural_agro: {
          base: Number(baseRuralTotal.toFixed(2)),
          credito_pis: Number(credRuralPisTotal.toFixed(2)),
          credito_cofins: Number(credRuralCofinsTotal.toFixed(2)),
          itens: itensAgroCalculados,
        },
        monofasico: {
          base: Number(baseMonofasico.toFixed(2)),
          credito_pis: Number(credMonoPis.toFixed(2)),
          credito_cofins: Number(credMonoCofins.toFixed(2)),
        },
        imobilizado: {
          base: Number(baseImobilizado.toFixed(2)),
          aliquota_pis: aliqImoPis,
          aliquota_cofins: aliqImoCofins,
          credito_pis: Number(credImoPis.toFixed(2)),
          credito_cofins: Number(credImoCofins.toFixed(2)),
        },
        outros_creditos: {
          base: Number(baseOutros.toFixed(2)),
          credito_pis: Number(credOutrosPis.toFixed(2)),
          credito_cofins: Number(credOutrosCofins.toFixed(2)),
        },
        total_base_creditos: Number(totalBase.toFixed(2)),
        total_credito_pis: Number(totalPis.toFixed(2)),
        total_credito_cofins: Number(totalCofins.toFixed(2)),
        total_creditos: Number((totalPis + totalCofins).toFixed(2)),
      },
    }
  }

  // Fallback caso não tenha detalhamento por categoria, mas tenha compras_insumos / outros_creditos
  const comprasInsumos = Number(fat.compras_insumos) || 0
  const outrosCreditos = Number(fat.outros_creditos_pis_cofins) || 0
  const recMes = Number(fat.receita_bruta) || 0

  const baseEstimada =
    comprasInsumos + outrosCreditos > 0 ? comprasInsumos + outrosCreditos : recMes * 0.25
  const cPis = (baseEstimada * aliqComPis) / 100
  const cCofins = (baseEstimada * aliqComCofins) / 100

  return {
    creditoPis: cPis,
    creditoCofins: cCofins,
    detalhe: {
      comercial_servico: {
        base: Number(baseEstimada.toFixed(2)),
        aliquota_pis: aliqComPis,
        aliquota_cofins: aliqComCofins,
        credito_pis: Number(cPis.toFixed(2)),
        credito_cofins: Number(cCofins.toFixed(2)),
      },
      rural_agro: { base: 0, credito_pis: 0, credito_cofins: 0, itens: [] },
      monofasico: { base: 0, credito_pis: 0, credito_cofins: 0 },
      imobilizado: {
        base: 0,
        aliquota_pis: aliqImoPis,
        aliquota_cofins: aliqImoCofins,
        credito_pis: 0,
        credito_cofins: 0,
      },
      outros_creditos: { base: 0, credito_pis: 0, credito_cofins: 0 },
      total_base_creditos: Number(baseEstimada.toFixed(2)),
      total_credito_pis: Number(cPis.toFixed(2)),
      total_credito_cofins: Number(cCofins.toFixed(2)),
      total_creditos: Number((cPis + cCofins).toFixed(2)),
    },
  }
}

/**
 * Realiza os cálculos de Apuração do Lucro Real trimestral e anual com suporte
 * a categorias de insumos e créditos presumidos agropecuários por produto.
 */
export function calcularApuracaoReal(
  faturamentos: EmpresaFaturamentoRecord[],
  anoCalendario: number,
  tabelaIrpjCsll: TabelaIrpjCsllRecord | null,
  tabelaIss: TabelaIssRecord | null,
  tabelaPisCofins: TabelaPisCofinsRealRecord | null,
  tabelasInsumos: TabelaInsumoRealRecord[] = [],
  tabelasAgro: TabelaProdutoAgroRecord[] = [],
): ApuracaoLucroRealAnual {
  const faturamentosAno = faturamentos.filter((f) => f.ano_calendario === anoCalendario)

  const aliqIrpj = tabelaIrpjCsll?.aliquota_irpj ?? 15.0
  const adicionalIrpj = tabelaIrpjCsll?.adicional_irpj ?? 10.0
  const limiteTrimestralAdicional = (tabelaIrpjCsll?.limite_adicional ?? 20000) * 3 // R$ 60.000 / trimestre
  const aliqCsll = tabelaIrpjCsll?.aliquota_csll ?? 9.0
  const aliqIss = tabelaIss?.aliquota ?? 5.0
  const aliqPis = tabelaPisCofins?.aliquota_pis ?? 1.65
  const aliqCofins = tabelaPisCofins?.aliquota_cofins ?? 7.6

  const trimestresConfig = [
    { tri: 1, meses: [1, 2, 3] },
    { tri: 2, meses: [4, 5, 6] },
    { tri: 3, meses: [7, 8, 9] },
    { tri: 4, meses: [10, 11, 12] },
  ]

  let receitaAnual = 0
  let folhaAnual = 0
  let lucroContabilAnual = 0
  let totalAdicoes = 0
  let totalExclusoes = 0
  let lucroRealAjustadoAnual = 0

  let totalIrpj = 0
  let totalCsll = 0
  let totalPisLiquido = 0
  let totalCofinsLiquido = 0
  let totalCreditosPisCofins = 0
  let totalIss = 0

  // Acumulador de detalhamento anual de créditos
  const detalheAnualCreditos: DetalheCreditosInsumos = {
    comercial_servico: {
      base: 0,
      aliquota_pis: 1.65,
      aliquota_cofins: 7.6,
      credito_pis: 0,
      credito_cofins: 0,
    },
    rural_agro: { base: 0, credito_pis: 0, credito_cofins: 0, itens: [] },
    monofasico: { base: 0, credito_pis: 0, credito_cofins: 0 },
    imobilizado: {
      base: 0,
      aliquota_pis: 1.65,
      aliquota_cofins: 7.6,
      credito_pis: 0,
      credito_cofins: 0,
    },
    outros_creditos: { base: 0, credito_pis: 0, credito_cofins: 0 },
    total_base_creditos: 0,
    total_credito_pis: 0,
    total_credito_cofins: 0,
    total_creditos: 0,
  }

  const trimestresApurados: ApuracaoLucroRealTrimestre[] = trimestresConfig.map((t) => {
    const fatsTrimestre = faturamentosAno.filter((f) => t.meses.includes(f.mes))
    const recTrimestre = fatsTrimestre.reduce((s, f) => s + (Number(f.receita_bruta) || 0), 0)
    const folhaTrimestre = fatsTrimestre.reduce((s, f) => s + (Number(f.folha) || 0), 0)

    const lcTrimestrePreenchido = fatsTrimestre.reduce(
      (s, f) => s + (Number(f.lucro_contabil) || 0),
      0,
    )
    const adicTrimestre = fatsTrimestre.reduce((s, f) => s + (Number(f.adicoes_lalur) || 0), 0)
    const exclTrimestre = fatsTrimestre.reduce((s, f) => s + (Number(f.exclusoes_lalur) || 0), 0)

    // Estimativa se não houver lucro contábil explícito
    let lucroContabil = lcTrimestrePreenchido
    if (lucroContabil === 0 && recTrimestre > 0) {
      lucroContabil = Math.max(0, recTrimestre - folhaTrimestre - recTrimestre * 0.35)
    }

    // Lucro Real Base (LALUR)
    const baseLucroReal = Math.max(0, lucroContabil + adicTrimestre - exclTrimestre)

    const irpjBasico = (baseLucroReal * aliqIrpj) / 100
    const excedente = Math.max(0, baseLucroReal - limiteTrimestralAdicional)
    const irpjAdic = (excedente * adicionalIrpj) / 100
    const irpjTot = irpjBasico + irpjAdic

    const csllTot = (baseLucroReal * aliqCsll) / 100

    // Débitos PIS / COFINS sobre a receita
    const pisDeb = (recTrimestre * aliqPis) / 100
    const cofinsDeb = (recTrimestre * aliqCofins) / 100

    // Créditos PIS / COFINS calculados mês a mês por categoria de insumo
    let pisCredTri = 0
    let cofinsCredTri = 0

    const detalheTriCreditos: DetalheCreditosInsumos = {
      comercial_servico: {
        base: 0,
        aliquota_pis: 1.65,
        aliquota_cofins: 7.6,
        credito_pis: 0,
        credito_cofins: 0,
      },
      rural_agro: { base: 0, credito_pis: 0, credito_cofins: 0, itens: [] },
      monofasico: { base: 0, credito_pis: 0, credito_cofins: 0 },
      imobilizado: {
        base: 0,
        aliquota_pis: 1.65,
        aliquota_cofins: 7.6,
        credito_pis: 0,
        credito_cofins: 0,
      },
      outros_creditos: { base: 0, credito_pis: 0, credito_cofins: 0 },
      total_base_creditos: 0,
      total_credito_pis: 0,
      total_credito_cofins: 0,
      total_creditos: 0,
    }

    for (const fatMes of fatsTrimestre) {
      const resCred = calcularCreditosInsumosMes(
        fatMes,
        tabelasInsumos,
        tabelasAgro,
        aliqPis,
        aliqCofins,
      )
      pisCredTri += resCred.creditoPis
      cofinsCredTri += resCred.creditoCofins

      // Somatório no trimestre
      detalheTriCreditos.comercial_servico.base += resCred.detalhe.comercial_servico.base
      detalheTriCreditos.comercial_servico.credito_pis +=
        resCred.detalhe.comercial_servico.credito_pis
      detalheTriCreditos.comercial_servico.credito_cofins +=
        resCred.detalhe.comercial_servico.credito_cofins
      detalheTriCreditos.comercial_servico.aliquota_pis =
        resCred.detalhe.comercial_servico.aliquota_pis
      detalheTriCreditos.comercial_servico.aliquota_cofins =
        resCred.detalhe.comercial_servico.aliquota_cofins

      detalheTriCreditos.rural_agro.base += resCred.detalhe.rural_agro.base
      detalheTriCreditos.rural_agro.credito_pis += resCred.detalhe.rural_agro.credito_pis
      detalheTriCreditos.rural_agro.credito_cofins += resCred.detalhe.rural_agro.credito_cofins

      for (const itemAgro of resCred.detalhe.rural_agro.itens) {
        const exist = detalheTriCreditos.rural_agro.itens.find(
          (i) => i.produto_codigo === itemAgro.produto_codigo,
        )
        if (exist) {
          exist.base += itemAgro.base
          exist.credito_pis += itemAgro.credito_pis
          exist.credito_cofins += itemAgro.credito_cofins
        } else {
          detalheTriCreditos.rural_agro.itens.push({ ...itemAgro })
        }
      }

      detalheTriCreditos.monofasico.base += resCred.detalhe.monofasico.base
      detalheTriCreditos.monofasico.credito_pis += resCred.detalhe.monofasico.credito_pis
      detalheTriCreditos.monofasico.credito_cofins += resCred.detalhe.monofasico.credito_cofins

      detalheTriCreditos.imobilizado.base += resCred.detalhe.imobilizado.base
      detalheTriCreditos.imobilizado.credito_pis += resCred.detalhe.imobilizado.credito_pis
      detalheTriCreditos.imobilizado.credito_cofins += resCred.detalhe.imobilizado.credito_cofins
      detalheTriCreditos.imobilizado.aliquota_pis = resCred.detalhe.imobilizado.aliquota_pis
      detalheTriCreditos.imobilizado.aliquota_cofins = resCred.detalhe.imobilizado.aliquota_cofins

      detalheTriCreditos.outros_creditos.base += resCred.detalhe.outros_creditos.base
      detalheTriCreditos.outros_creditos.credito_pis += resCred.detalhe.outros_creditos.credito_pis
      detalheTriCreditos.outros_creditos.credito_cofins +=
        resCred.detalhe.outros_creditos.credito_cofins

      detalheTriCreditos.total_base_creditos += resCred.detalhe.total_base_creditos
      detalheTriCreditos.total_credito_pis += resCred.detalhe.total_credito_pis
      detalheTriCreditos.total_credito_cofins += resCred.detalhe.total_credito_cofins
      detalheTriCreditos.total_creditos += resCred.detalhe.total_creditos

      // Somatório no anual
      detalheAnualCreditos.comercial_servico.base += resCred.detalhe.comercial_servico.base
      detalheAnualCreditos.comercial_servico.credito_pis +=
        resCred.detalhe.comercial_servico.credito_pis
      detalheAnualCreditos.comercial_servico.credito_cofins +=
        resCred.detalhe.comercial_servico.credito_cofins
      detalheAnualCreditos.comercial_servico.aliquota_pis =
        resCred.detalhe.comercial_servico.aliquota_pis
      detalheAnualCreditos.comercial_servico.aliquota_cofins =
        resCred.detalhe.comercial_servico.aliquota_cofins

      detalheAnualCreditos.rural_agro.base += resCred.detalhe.rural_agro.base
      detalheAnualCreditos.rural_agro.credito_pis += resCred.detalhe.rural_agro.credito_pis
      detalheAnualCreditos.rural_agro.credito_cofins += resCred.detalhe.rural_agro.credito_cofins

      for (const itemAgro of resCred.detalhe.rural_agro.itens) {
        const exist = detalheAnualCreditos.rural_agro.itens.find(
          (i) => i.produto_codigo === itemAgro.produto_codigo,
        )
        if (exist) {
          exist.base += itemAgro.base
          exist.credito_pis += itemAgro.credito_pis
          exist.credito_cofins += itemAgro.credito_cofins
        } else {
          detalheAnualCreditos.rural_agro.itens.push({ ...itemAgro })
        }
      }

      detalheAnualCreditos.monofasico.base += resCred.detalhe.monofasico.base
      detalheAnualCreditos.monofasico.credito_pis += resCred.detalhe.monofasico.credito_pis
      detalheAnualCreditos.monofasico.credito_cofins += resCred.detalhe.monofasico.credito_cofins

      detalheAnualCreditos.imobilizado.base += resCred.detalhe.imobilizado.base
      detalheAnualCreditos.imobilizado.credito_pis += resCred.detalhe.imobilizado.credito_pis
      detalheAnualCreditos.imobilizado.credito_cofins += resCred.detalhe.imobilizado.credito_cofins
      detalheAnualCreditos.imobilizado.aliquota_pis = resCred.detalhe.imobilizado.aliquota_pis
      detalheAnualCreditos.imobilizado.aliquota_cofins = resCred.detalhe.imobilizado.aliquota_cofins

      detalheAnualCreditos.outros_creditos.base += resCred.detalhe.outros_creditos.base
      detalheAnualCreditos.outros_creditos.credito_pis +=
        resCred.detalhe.outros_creditos.credito_pis
      detalheAnualCreditos.outros_creditos.credito_cofins +=
        resCred.detalhe.outros_creditos.credito_cofins

      detalheAnualCreditos.total_base_creditos += resCred.detalhe.total_base_creditos
      detalheAnualCreditos.total_credito_pis += resCred.detalhe.total_credito_pis
      detalheAnualCreditos.total_credito_cofins += resCred.detalhe.total_credito_cofins
      detalheAnualCreditos.total_creditos += resCred.detalhe.total_creditos
    }

    const pisLiq = Math.max(0, pisDeb - pisCredTri)
    const cofinsLiq = Math.max(0, cofinsDeb - cofinsCredTri)
    const issTot = (recTrimestre * aliqIss) / 100

    const tributosTri = irpjTot + csllTot + pisLiq + cofinsLiq + issTot
    const aliqEfetivaTri = recTrimestre > 0 ? (tributosTri / recTrimestre) * 100 : 0

    receitaAnual += recTrimestre
    folhaAnual += folhaTrimestre
    lucroContabilAnual += lucroContabil
    totalAdicoes += adicTrimestre
    totalExclusoes += exclTrimestre
    lucroRealAjustadoAnual += baseLucroReal

    totalIrpj += irpjTot
    totalCsll += csllTot
    totalPisLiquido += pisLiq
    totalCofinsLiquido += cofinsLiq
    totalCreditosPisCofins += pisCredTri + cofinsCredTri
    totalIss += issTot

    return {
      trimestre: t.tri,
      meses: t.meses,
      receita_bruta: Number(recTrimestre.toFixed(2)),
      lucro_contabil: Number(lucroContabil.toFixed(2)),
      adicoes_lalur: Number(adicTrimestre.toFixed(2)),
      exclusoes_lalur: Number(exclTrimestre.toFixed(2)),
      lucro_real_base: Number(baseLucroReal.toFixed(2)),
      irpj_basico: Number(irpjBasico.toFixed(2)),
      irpj_adicional: Number(irpjAdic.toFixed(2)),
      irpj_total: Number(irpjTot.toFixed(2)),
      csll_total: Number(csllTot.toFixed(2)),
      pis_debito: Number(pisDeb.toFixed(2)),
      pis_credito: Number(pisCredTri.toFixed(2)),
      pis_liquido: Number(pisLiq.toFixed(2)),
      cofins_debito: Number(cofinsDeb.toFixed(2)),
      cofins_credito: Number(cofinsCredTri.toFixed(2)),
      cofins_liquido: Number(cofinsLiq.toFixed(2)),
      detalhe_creditos: detalheTriCreditos,
      iss_total: Number(issTot.toFixed(2)),
      total_tributos_trimestre: Number(tributosTri.toFixed(2)),
      aliquota_efetiva_trimestre: Number(aliqEfetivaTri.toFixed(2)),
    }
  })

  const totalTributosPj = totalIrpj + totalCsll + totalPisLiquido + totalCofinsLiquido + totalIss
  const aliqEfetivaAnual = receitaAnual > 0 ? (totalTributosPj / receitaAnual) * 100 : 0

  // Lucro Distribuível no Lucro Real = Lucro Contábil - Tributos PJ
  const lucroDistribuivel = Math.max(0, lucroContabilAnual - totalTributosPj)

  return {
    ano_calendario: anoCalendario,
    regime: 'real',
    receita_bruta_anual: Number(receitaAnual.toFixed(2)),
    folha_anual: Number(folhaAnual.toFixed(2)),
    lucro_contabil_anual: Number(lucroContabilAnual.toFixed(2)),
    total_adicoes: Number(totalAdicoes.toFixed(2)),
    total_exclusoes: Number(totalExclusoes.toFixed(2)),
    lucro_real_ajustado_anual: Number(lucroRealAjustadoAnual.toFixed(2)),
    total_irpj: Number(totalIrpj.toFixed(2)),
    total_csll: Number(totalCsll.toFixed(2)),
    total_pis_liquido: Number(totalPisLiquido.toFixed(2)),
    total_cofins_liquido: Number(totalCofinsLiquido.toFixed(2)),
    total_creditos_pis_cofins: Number(totalCreditosPisCofins.toFixed(2)),
    detalhe_creditos_anual: detalheAnualCreditos,
    total_iss: Number(totalIss.toFixed(2)),
    total_tributos_pj: Number(totalTributosPj.toFixed(2)),
    aliquota_efetiva_anual: Number(aliqEfetivaAnual.toFixed(2)),
    trimestres: trimestresApurados,
    lucro_distribuivel: Number(lucroDistribuivel.toFixed(2)),
    lucro_apurado_estimado: Number(lucroDistribuivel.toFixed(2)),
  }
}

/**
 * Comparador de Regimes Tributários (Simples vs Presumido vs Real)
 */
export function compararRegimesTributarios(
  faturamentos: EmpresaFaturamentoRecord[],
  anoCalendario: number,
  anexoSimples: AnexoSimplesNacional = 'III',
  atividadePresumido?: string,
  tabelaSimples?: TabelaSimplesRecord | null,
  tabelaPresumido?: TabelaPresumidoRecord | null,
  tabelaIrpjCsll?: TabelaIrpjCsllRecord | null,
  tabelaIss?: TabelaIssRecord | null,
  tabelaPisCofins?: TabelaPisCofinsRealRecord | null,
  tabelasInsumos?: TabelaInsumoRealRecord[],
  tabelasAgro?: TabelaProdutoAgroRecord[],
): ComparativoRegimesResultado {
  const apSimples = calcularApuracaoSimples(
    faturamentos,
    anoCalendario,
    anexoSimples,
    tabelaSimples || null,
  )
  const apPresumido = calcularApuracaoPresumido(
    faturamentos,
    anoCalendario,
    tabelaPresumido || null,
    tabelaIrpjCsll || null,
    tabelaIss || null,
  )
  const apReal = calcularApuracaoReal(
    faturamentos,
    anoCalendario,
    tabelaIrpjCsll || null,
    tabelaIss || null,
    tabelaPisCofins || null,
    tabelasInsumos || [],
    tabelasAgro || [],
  )

  const totSimples = apSimples.total_das
  const totPresumido = apPresumido.total_tributos_pj
  const totReal = apReal.total_tributos_pj

  const menorTotal = Math.min(totSimples, totPresumido, totReal)
  let melhorRegime: RegimeTributarioPJ = 'simples'
  if (menorTotal === totPresumido) melhorRegime = 'presumido'
  if (menorTotal === totReal) melhorRegime = 'real'

  const receitaBruta = apSimples.receita_bruta_anual

  const itemSimples: ComparativoRegimeItem = {
    regime: 'simples',
    nomeRegime: `Simples Nacional (Anexo ${anexoSimples})`,
    totalTributos: totSimples,
    aliquotaEfetiva: apSimples.aliquota_efetiva_media,
    lucroDistribuivel: apSimples.lucro_distribuivel,
    detalheTributos: {
      das: totSimples,
    },
    isMaisVantajoso: melhorRegime === 'simples',
    diferencaParaMelhor: Number((totSimples - menorTotal).toFixed(2)),
    diferencaPercentual:
      menorTotal > 0 ? Number((((totSimples - menorTotal) / menorTotal) * 100).toFixed(2)) : 0,
  }

  const itemPresumido: ComparativoRegimeItem = {
    regime: 'presumido',
    nomeRegime: 'Lucro Presumido',
    totalTributos: totPresumido,
    aliquotaEfetiva: apPresumido.aliquota_efetiva_anual,
    lucroDistribuivel: apPresumido.lucro_distribuivel,
    detalheTributos: {
      irpj: apPresumido.total_irpj,
      csll: apPresumido.total_csll,
      pis: apPresumido.total_pis,
      cofins: apPresumido.total_cofins,
      iss: apPresumido.total_iss,
    },
    isMaisVantajoso: melhorRegime === 'presumido',
    diferencaParaMelhor: Number((totPresumido - menorTotal).toFixed(2)),
    diferencaPercentual:
      menorTotal > 0 ? Number((((totPresumido - menorTotal) / menorTotal) * 100).toFixed(2)) : 0,
  }

  const itemReal: ComparativoRegimeItem = {
    regime: 'real',
    nomeRegime: 'Lucro Real (Não-Cumulativo)',
    totalTributos: totReal,
    aliquotaEfetiva: apReal.aliquota_efetiva_anual,
    lucroDistribuivel: apReal.lucro_distribuivel,
    detalheTributos: {
      irpj: apReal.total_irpj,
      csll: apReal.total_csll,
      pis: apReal.total_pis_liquido,
      cofins: apReal.total_cofins_liquido,
      iss: apReal.total_iss,
    },
    isMaisVantajoso: melhorRegime === 'real',
    diferencaParaMelhor: Number((totReal - menorTotal).toFixed(2)),
    diferencaPercentual:
      menorTotal > 0 ? Number((((totReal - menorTotal) / menorTotal) * 100).toFixed(2)) : 0,
  }

  // Maior diferença entre o pior e o melhor
  const maiorTotal = Math.max(totSimples, totPresumido, totReal)
  const economiaAnualEstimada = Number((maiorTotal - menorTotal).toFixed(2))

  return {
    ano_calendario: anoCalendario,
    receita_bruta_anual: receitaBruta,
    melhorRegime,
    regimes: {
      simples: itemSimples,
      presumido: itemPresumido,
      real: itemReal,
    },
    economiaAnualEstimada,
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
export async function processarApuracaoEmpresa(empresa: EmpresaRecord, anoCalendario: number) {
  const [faturamentos, socios] = await Promise.all([
    getFaturamentosEmpresa(empresa.id, anoCalendario),
    getSociosDaEmpresa(empresa.id),
  ])

  let apuracaoSimples: ApuracaoSimplesAnual | null = null
  let apuracaoPresumido: ApuracaoPresumidoAnual | null = null
  let apuracaoReal: ApuracaoLucroRealAnual | null = null
  let lucroDistribuivel = 0

  const [
    tabelaSimplesRes,
    tabelaPresumidoRes,
    tabelaIrpjRes,
    tabelaIssRes,
    tabelaPisCofinsRes,
    tabelasInsumosRes,
    tabelasAgroRes,
  ] = await Promise.all([
    getTabelaSimplesPorAnoAnexo(anoCalendario, empresa.anexo_simples || 'III'),
    getTabelaPresumidoPorAnoAtividade(anoCalendario, empresa.atividade),
    getTabelaIrpjCsllPorAno(anoCalendario),
    getTabelaIssPorAno(anoCalendario),
    getTabelaPisCofinsRealPorAno(anoCalendario),
    getTabelasInsumosRealPorAno(anoCalendario),
    getTabelasProdutosAgroPorAno(anoCalendario),
  ])

  if (empresa.regime === 'simples') {
    apuracaoSimples = calcularApuracaoSimples(
      faturamentos,
      anoCalendario,
      empresa.anexo_simples || 'III',
      tabelaSimplesRes.tabela,
    )
    lucroDistribuivel = apuracaoSimples.lucro_distribuivel
  } else if (empresa.regime === 'presumido') {
    apuracaoPresumido = calcularApuracaoPresumido(
      faturamentos,
      anoCalendario,
      tabelaPresumidoRes.tabela,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
    )
    lucroDistribuivel = apuracaoPresumido.lucro_distribuivel
  } else {
    apuracaoReal = calcularApuracaoReal(
      faturamentos,
      anoCalendario,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
      tabelaPisCofinsRes.tabela,
      tabelasInsumosRes.tabelas,
      tabelasAgroRes.produtos,
    )
    lucroDistribuivel = apuracaoReal.lucro_distribuivel
  }

  const comparativoRegimes = compararRegimesTributarios(
    faturamentos,
    anoCalendario,
    empresa.anexo_simples || 'III',
    empresa.atividade,
    tabelaSimplesRes.tabela,
    tabelaPresumidoRes.tabela,
    tabelaIrpjRes.tabela,
    tabelaIssRes.tabela,
    tabelaPisCofinsRes.tabela,
    tabelasInsumosRes.tabelas,
    tabelasAgroRes.produtos,
  )

  const distribuicoes = calcularDistribuicaoSocios(socios, lucroDistribuivel, anoCalendario)

  return {
    empresa,
    faturamentos,
    socios,
    apuracaoSimples,
    apuracaoPresumido,
    apuracaoReal,
    comparativoRegimes,
    distribuicoes,
    lucroDistribuivel,
    anoCalendario,
  }
}

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
  let apuracaoReal: ApuracaoLucroRealAnual | null = null
  let lucroDistribuivel = 0

  const [
    tabelaSimplesRes,
    tabelaPresumidoRes,
    tabelaIrpjRes,
    tabelaIssRes,
    tabelaPisCofinsRes,
    tabelasInsumosRes,
    tabelasAgroRes,
  ] = await Promise.all([
    getTabelaSimplesPorAnoAnexo(anoCalendario, empresa.anexo_simples || 'III'),
    getTabelaPresumidoPorAnoAtividade(anoCalendario, empresa.atividade),
    getTabelaIrpjCsllPorAno(anoCalendario),
    getTabelaIssPorAno(anoCalendario),
    getTabelaPisCofinsRealPorAno(anoCalendario),
    getTabelasInsumosRealPorAno(anoCalendario),
    getTabelasProdutosAgroPorAno(anoCalendario),
  ])

  if (empresa.regime === 'simples') {
    apuracaoSimples = calcularApuracaoSimples(
      faturamentos,
      anoCalendario,
      empresa.anexo_simples || 'III',
      tabelaSimplesRes.tabela,
    )
    lucroDistribuivel = apuracaoSimples.lucro_distribuivel
  } else if (empresa.regime === 'presumido') {
    apuracaoPresumido = calcularApuracaoPresumido(
      faturamentos,
      anoCalendario,
      tabelaPresumidoRes.tabela,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
    )
    lucroDistribuivel = apuracaoPresumido.lucro_distribuivel
  } else {
    apuracaoReal = calcularApuracaoReal(
      faturamentos,
      anoCalendario,
      tabelaIrpjRes.tabela,
      tabelaIssRes.tabela,
      tabelaPisCofinsRes.tabela,
      tabelasInsumosRes.tabelas,
      tabelasAgroRes.produtos,
    )
    lucroDistribuivel = apuracaoReal.lucro_distribuivel
  }

  // Comparador consolidado dos 3 regimes
  const comparativoRegimes = compararRegimesTributarios(
    faturamentos,
    anoCalendario,
    empresa.anexo_simples || 'III',
    empresa.atividade,
    tabelaSimplesRes.tabela,
    tabelaPresumidoRes.tabela,
    tabelaIrpjRes.tabela,
    tabelaIssRes.tabela,
    tabelaPisCofinsRes.tabela,
    tabelasInsumosRes.tabelas,
    tabelasAgroRes.produtos,
  )

  const distribuicoes = calcularDistribuicaoSocios(socios, lucroDistribuivel, anoCalendario)

  return {
    empresa,
    faturamentos,
    socios,
    apuracaoSimples,
    apuracaoPresumido,
    apuracaoReal,
    comparativoRegimes,
    distribuicoes,
    lucroDistribuivel,
    anoCalendario,
    tabelas: {
      simples: tabelaSimplesRes.tabela,
      presumido: tabelaPresumidoRes.tabela,
      irpjCsll: tabelaIrpjRes.tabela,
      iss: tabelaIssRes.tabela,
      pisCofins: tabelaPisCofinsRes.tabela,
      insumos: tabelasInsumosRes.tabelas,
      produtosAgro: tabelasAgroRes.produtos,
    },
  }
}
