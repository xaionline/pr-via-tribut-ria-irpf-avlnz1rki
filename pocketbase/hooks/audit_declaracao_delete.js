// Cascade delete for declaracoes.
//
// PocketBase blocks the delete of a declaracao while child records in related
// collections reference it via a required relation. This model hook runs
// BEFORE the declaracao is deleted, removes every child record pointing at it,
// writes a final audit_log entry for the delete action, then lets the actual
// declaracao delete proceed via e.next().
//
// One hook per file — all logic is inline inside the callback (top-level
// identifiers are not accessible inside hook callbacks in the JSVM).
onRecordDelete((e) => {
  try {
    var decId = e.record.id

    // 1. Write the final audit_log entry for the delete action BEFORE removing
    //    the related audit_logs, so the delete action itself is always recorded.
    var finalLogId = ''
    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var auditRec = new Record(auditCol)
      try {
        var authId = e.requestInfo().auth ? e.requestInfo().auth.id : ''
        if (authId) auditRec.set('user_id', authId)
      } catch (_) {}
      auditRec.set('action', 'delete')
      auditRec.set('entity', 'declaracao')
      auditRec.set('entity_id', decId)
      try {
        auditRec.set('diff', {
          cliente_id: e.record.getString('cliente_id'),
          ano_calendario: Number(e.record.get('ano_calendario')) || 0,
          status: e.record.getString('status'),
          timestamp: new Date().toISOString(),
        })
      } catch (_) {}
      $app.save(auditRec)
      finalLogId = auditRec.id
    } catch (err) {
      $app.logger().error('audit log (delete) failed', 'error', String(err))
    }

    // 2. Cascade delete every child collection that holds a required
    //    declaracao_id relation pointing at this declaracao.
    var childCollections = [
      'rendimentos',
      'despesas_dedutiveis',
      'destinacoes_fiscais',
      'atividades_rurais',
      'cenarios_simulacao',
      'resultados',
      'fontes_pagadoras',
      'dependentes',
      'importacoes_informes',
    ]
    for (var ci = 0; ci < childCollections.length; ci++) {
      var colName = childCollections[ci]
      try {
        var recs = $app.findRecordsByFilter(colName, 'declaracao_id = {:id}', 'created', 1000, 0, {
          id: decId,
        })
        for (var ri = 0; ri < recs.length; ri++) {
          try {
            $app.delete(recs[ri])
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 3. Remove the related audit_logs for this declaracao, keeping the final
    //    delete-entry created above (entity_id is a plain text field, so these
    //    do not block the declaracao delete — this is just for cleanliness).
    try {
      var auditFilter = finalLogId ? 'entity_id = {:id} && id != {:logId}' : 'entity_id = {:id}'
      var auditParams = finalLogId ? { id: decId, logId: finalLogId } : { id: decId }
      var auditRecs = $app.findRecordsByFilter(
        'audit_logs',
        auditFilter,
        'created',
        1000,
        0,
        auditParams,
      )
      for (var ai = 0; ai < auditRecs.length; ai++) {
        try {
          $app.delete(auditRecs[ai])
        } catch (_) {}
      }
    } catch (_) {}
  } catch (err) {
    $app.logger().error('cascade delete declaracao failed', 'error', String(err))
  }
  return e.next()
}, 'declaracoes')
