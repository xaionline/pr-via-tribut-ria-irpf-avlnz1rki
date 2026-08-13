routerAdd(
  'POST',
  '/backend/v1/declaracoes/{id}/modalidade',
  (e) => {
    const decId = e.request.pathValue('id')
    if (!decId) return e.badRequestError('id de declaração é obrigatório')

    const body = e.requestInfo().body || {}
    const modalidade = body.modalidade
    if (modalidade !== 'legal' && modalidade !== 'simplificada') {
      return e.badRequestError('Modalidade inválida. Use "legal" ou "simplificada".')
    }

    let dec
    try {
      dec = $app.findRecordById('declaracoes', decId)
    } catch (_) {
      return e.notFoundError('Declaração não encontrada')
    }

    let resRecord
    try {
      resRecord = $app.findFirstRecordByData('resultados', 'declaracao_id', decId)
    } catch (_) {
      return e.badRequestError('Calcule a declaração antes de escolher a modalidade.')
    }

    var detalhamento = {}
    try {
      var rawDet = resRecord.get('detalhamento')
      if (typeof rawDet === 'string') {
        detalhamento = JSON.parse(rawDet) || {}
      } else if (rawDet && typeof rawDet === 'object') {
        detalhamento = rawDet
      }
    } catch (_) {}

    const legal = detalhamento.legal || {}
    const simplificada = detalhamento.simplificada || {}
    const chosen = modalidade === 'simplificada' ? simplificada : legal

    resRecord.set('base_calculo', chosen.base_calculo || 0)
    resRecord.set('irrf_devido', chosen.irrf_devido || 0)
    resRecord.set('irrf_retido', chosen.irrf_retido || 0)
    resRecord.set('saldo_imposto', chosen.saldo_imposto || 0)
    resRecord.set('destinacoes_aplicadas', chosen.destinacoes_aplicadas || 0)

    var demonstrativo = {
      rendimento_tributavel: detalhamento.rendimento_tributavel || 0,
      deducoes: chosen.total_deducoes || 0,
      base_calculo: chosen.base_calculo || 0,
      irrf_devido: chosen.irrf_devido || 0,
      irrf_retido: chosen.irrf_retido || 0,
      destinacoes_aplicadas: chosen.destinacoes_aplicadas || 0,
      saldo_imposto: chosen.saldo_imposto || 0,
      modalidade: modalidade,
    }
    detalhamento.modalidade_escolhida = modalidade
    detalhamento.demonstrativo = demonstrativo
    resRecord.set('detalhamento', detalhamento)
    $app.save(resRecord)

    dec.set('modalidade', modalidade)
    dec.set('status', 'calculada')
    dec.set('progresso', 100)
    $app.save(dec)

    return e.json(200, {
      success: true,
      modalidade: modalidade,
      status: 'calculada',
      demonstrativo: demonstrativo,
    })
  },
  $apis.requireAuth(),
)
