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

    function calcIRPF(baseCalculo, faixas) {
      let irrfDevido = 0
      if (Array.isArray(faixas) && faixas.length > 0) {
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
      return irrfDevido
    }

    function round2(v) {
      return Math.round(v * 100) / 100
    }

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

    const deps = $app.findRecordsByFilter(
      'dependentes',
      'declaracao_id = {:id}',
      'created',
      500,
      0,
      { id: decId },
    )
    totalDeducoes += deps.length * 2275.08

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

    const irrfRetido = rendTributavel * 0.12

    var legalScenario = {
      modalidade: 'legal',
      base_calculo: round2(Math.max(0, rendTributavel - totalDeducoes)),
      total_deducoes: round2(totalDeducoes),
      irrf_devido: round2(calcIRPF(Math.max(0, rendTributavel - totalDeducoes), faixas)),
      irrf_retido: round2(irrfRetido),
      saldo_imposto: round2(
        calcIRPF(Math.max(0, rendTributavel - totalDeducoes), faixas) - irrfRetido - totalDest,
      ),
      destinacoes_aplicadas: round2(totalDest),
    }

    var deducaoSimplificada = Math.min(rendTributavel * 0.2, 16754.34)
    var simpBase = Math.max(0, rendTributavel - deducaoSimplificada)
    var simpScenario = {
      modalidade: 'simplificada',
      base_calculo: round2(simpBase),
      total_deducoes: round2(deducaoSimplificada),
      irrf_devido: round2(calcIRPF(simpBase, faixas)),
      irrf_retido: round2(irrfRetido),
      saldo_imposto: round2(calcIRPF(simpBase, faixas) - irrfRetido - totalDest),
      destinacoes_aplicadas: round2(totalDest),
    }

    var recommended =
      legalScenario.saldo_imposto <= simpScenario.saldo_imposto ? 'legal' : 'simplificada'

    var modalidadeEscolhida = dec.getString('modalidade') || ''
    var chosenScenario =
      modalidadeEscolhida === 'simplificada'
        ? simpScenario
        : modalidadeEscolhida === 'legal'
          ? legalScenario
          : recommended === 'simplificada'
            ? simpScenario
            : legalScenario

    let resRecord
    try {
      resRecord = $app.findFirstRecordByData('resultados', 'declaracao_id', decId)
    } catch (_) {
      const colRes = $app.findCollectionByNameOrId('resultados')
      resRecord = new Record(colRes)
      resRecord.set('declaracao_id', decId)
    }

    resRecord.set('base_calculo', chosenScenario.base_calculo)
    resRecord.set('irrf_devido', chosenScenario.irrf_devido)
    resRecord.set('irrf_retido', chosenScenario.irrf_retido)
    resRecord.set('saldo_imposto', chosenScenario.saldo_imposto)
    resRecord.set('destinacoes_aplicadas', chosenScenario.destinacoes_aplicadas)
    resRecord.set('detalhamento', {
      legal: legalScenario,
      simplificada: simpScenario,
      recomendada: recommended,
      modalidade_escolhida: modalidadeEscolhida,
      rendimento_tributavel: round2(rendTributavel),
    })
    $app.save(resRecord)

    dec.set('progresso', 100)
    $app.save(dec)

    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var auditRec = new Record(auditCol)
      if (e.auth && e.auth.id) auditRec.set('user_id', e.auth.id)
      auditRec.set('action', 'calculate')
      auditRec.set('entity', 'declaracoes')
      auditRec.set('entity_id', decId)
      auditRec.set(
        'diff',
        JSON.stringify({
          irrf_devido: chosenScenario.irrf_devido,
          saldo_imposto: chosenScenario.saldo_imposto,
          modalidade: modalidadeEscolhida || recommended,
        }),
      )
      $app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      legal: legalScenario,
      simplificada: simpScenario,
      recomendada: recommended,
      resultado: {
        id: resRecord.id,
        base_calculo: chosenScenario.base_calculo,
        irrf_devido: chosenScenario.irrf_devido,
        irrf_retido: chosenScenario.irrf_retido,
        saldo_imposto: chosenScenario.saldo_imposto,
        destinacoes_aplicadas: chosenScenario.destinacoes_aplicadas,
      },
    })
  },
  $apis.requireAuth(),
)
