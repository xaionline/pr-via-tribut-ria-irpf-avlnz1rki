routerAdd(
  'POST',
  '/backend/v1/declaracoes/{id}/aplicar-cenario',
  (e) => {
    const decId = e.request.pathValue('id')
    if (!decId) return e.badRequestError('id de declaração é obrigatório')

    const body = e.requestInfo().body || {}

    let dec
    try {
      dec = $app.findRecordById('declaracoes', decId)
    } catch (_) {
      return e.notFoundError('Declaração não encontrada')
    }

    const despesasCol = $app.findCollectionByNameOrId('despesas_dedutiveis')
    const destinacoesCol = $app.findCollectionByNameOrId('destinacoes_fiscais')

    if (body.pgbl_adicional && body.pgbl_adicional > 0) {
      const rec = new Record(despesasCol)
      rec.set('declaracao_id', decId)
      rec.set('categoria', 'previdencia')
      rec.set('descricao', 'PGBL Adicional (Simulação)')
      rec.set('valor', body.pgbl_adicional)
      $app.save(rec)
    }

    if (body.despesas_medicas && body.despesas_medicas > 0) {
      const rec = new Record(despesasCol)
      rec.set('declaracao_id', decId)
      rec.set('categoria', 'saude')
      rec.set('descricao', 'Despesas médicas adicionais (Simulação)')
      rec.set('valor', body.despesas_medicas)
      $app.save(rec)
    }

    if (body.pensao_alimenticia && body.pensao_alimenticia > 0) {
      const rec = new Record(despesasCol)
      rec.set('declaracao_id', decId)
      rec.set('categoria', 'pensao')
      rec.set('descricao', 'Pensão alimentícia (Simulação)')
      rec.set('valor', body.pensao_alimenticia)
      $app.save(rec)
    }

    if (body.dependentes && body.dependentes > 0) {
      const rec = new Record(despesasCol)
      rec.set('declaracao_id', decId)
      rec.set('categoria', 'dependentes')
      rec.set('descricao', 'Dependentes adicionais (Simulação)')
      rec.set('valor', body.dependentes * 2275.08)
      $app.save(rec)
    }

    if (body.destinacao && body.destinacao > 0) {
      const rec = new Record(destinacoesCol)
      rec.set('declaracao_id', decId)
      rec.set('tipo', 'doacoes')
      rec.set('valor', body.destinacao)
      $app.save(rec)
    }

    return e.json(200, { success: true, message: 'Parâmetros aplicados à declaração' })
  },
  $apis.requireAuth(),
)
