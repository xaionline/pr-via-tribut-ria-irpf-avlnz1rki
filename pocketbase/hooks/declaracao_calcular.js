routerAdd(
  'POST',
  '/backend/v1/declaracoes/{id}/calcular',
  (e) => {
    const decId = e.request.pathValue('id')
    if (!decId) return e.badRequestError('id de declaração é obrigatório')

    let dec
    try {
      dec = $app.findRecordById('declaracoes', decId)
    } catch (_) {
      return e.notFoundError('Declaração não encontrada')
    }

    // Fetch Rendimentos
    const rends = $app.findRecordsByFilter(
      'rendimentos',
      'declaracao_id = {:id}',
      'created',
      500,
      0,
      { id: decId },
    )
    let rendTributavel = 0
    for (const r of rends) {
      if (r.getString('tipo') === 'tributavel') {
        rendTributavel += r.getNumber('valor') || 0
      }
    }

    // Fetch Despesas Dedutíveis
    const desps = $app.findRecordsByFilter(
      'despesas_dedutiveis',
      'declaracao_id = {:id}',
      'created',
      500,
      0,
      { id: decId },
    )
    let totalDeducoes = 0
    for (const d of desps) {
      totalDeducoes += d.getNumber('valor') || 0
    }

    // Fetch Dependentes (Standard deduction ~2275.08 per dependent)
    const deps = $app.findRecordsByFilter(
      'dependentes',
      'declaracao_id = {:id}',
      'created',
      500,
      0,
      { id: decId },
    )
    totalDeducoes += deps.length * 2275.08

    // Fetch Atividades Rurais
    const ativs = $app.findRecordsByFilter(
      'atividades_rurais',
      'declaracao_id = {:id}',
      'created',
      500,
      0,
      { id: decId },
    )
    for (const a of ativs) {
      const resAtiv = a.getNumber('resultado') || 0
      if (resAtiv > 0) rendTributavel += resAtiv
    }

    const baseCalculo = Math.max(0, rendTributavel - totalDeducoes)

    // Fetch Progressive Table for year
    const ano = dec.getNumber('ano_calendario')
    let tabRecord
    try {
      tabRecord = $app.findFirstRecordByData('tabelas_progressivas', 'ano', ano)
    } catch (_) {
      tabRecord = null
    }

    let faixas = []
    if (tabRecord) {
      try {
        faixas = tabRecord.get('faixas') || []
      } catch (_) {}
    }

    // Calculate tax using annual faixas (monthly * 12)
    let irrfDevido = 0
    const faixasAplicadas = []
    if (Array.isArray(faixas) && faixas.length > 0) {
      for (let i = 0; i < faixas.length; i++) {
        const f = faixas[i]
        const limInfAnual = (f.limite_inferior || 0) * 12
        const limSupAnual = (f.limite_superior || 999999) * 12
        const aliq = (f.aliquota || 0) / 100
        const dedAnual = (f.deducao || 0) * 12

        if (baseCalculo > limInfAnual) {
          const parcelaBase = Math.min(baseCalculo, limSupAnual) - limInfAnual
          const impostoFaixa = Math.max(
            0,
            parcelaBase * aliq - (i === faixas.length - 1 ? dedAnual : 0),
          )
          faixasAplicadas.push({
            faixa: i + 1,
            aliquota: f.aliquota,
            baseFaixa: parcelaBase,
            imposto: impostoFaixa,
          })
        }
      }
      // Calculate total via standard formula: (Base * aliquota_topo) - deducao_topo
      for (let i = faixas.length - 1; i >= 0; i--) {
        const f = faixas[i]
        const limInfAnual = (f.limite_inferior || 0) * 12
        if (baseCalculo > limInfAnual) {
          const aliq = (f.aliquota || 0) / 100
          const dedAnual = (f.deducao || 0) * 12
          irrfDevido = Math.max(0, baseCalculo * aliq - dedAnual)
          break
        }
      }
    }

    // Destinações fiscais
    const dests = $app.findRecordsByFilter(
      'destinacoes_fiscais',
      'declaracao_id = {:id}',
      'created',
      500,
      0,
      { id: decId },
    )
    let totalDest = 0
    for (const dst of dests) {
      totalDest += dst.getNumber('valor') || 0
    }

    // Assuming withholding standard 15% estimated if not specified
    const irrfRetido = rendTributavel * 0.12
    const saldoImposto = irrfDevido - irrfRetido - totalDest

    // Save/Update resultado
    let resRecord
    try {
      resRecord = $app.findFirstRecordByData('resultados', 'declaracao_id', decId)
    } catch (_) {
      const colRes = $app.findCollectionByNameOrId('resultados')
      resRecord = new Record(colRes)
      resRecord.set('declaracao_id', decId)
    }

    resRecord.set('base_calculo', Math.round(baseCalculo * 100) / 100)
    resRecord.set('irrf_devido', Math.round(irrfDevido * 100) / 100)
    resRecord.set('irrf_retido', Math.round(irrfRetido * 100) / 100)
    resRecord.set('saldo_imposto', Math.round(saldoImposto * 100) / 100)
    resRecord.set('destinacoes_aplicadas', Math.round(totalDest * 100) / 100)
    resRecord.set('detalhamento', { faixasAplicadas, rendTributavel, totalDeducoes })
    $app.save(resRecord)

    // Update declaration status & progress
    dec.set('progresso', 100)
    if (dec.getString('status') === 'rascunho') {
      dec.set('status', 'concluida')
    }
    $app.save(dec)

    return e.json(200, {
      success: true,
      resultado: {
        id: resRecord.id,
        base_calculo: Math.round(baseCalculo * 100) / 100,
        irrf_devido: Math.round(irrfDevido * 100) / 100,
        irrf_retido: Math.round(irrfRetido * 100) / 100,
        saldo_imposto: Math.round(saldoImposto * 100) / 100,
        destinacoes_aplicadas: Math.round(totalDest * 100) / 100,
      },
    })
  },
  $apis.requireAuth(),
)
