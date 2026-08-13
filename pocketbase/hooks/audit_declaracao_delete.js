onRecordAfterDeleteSuccess((e) => {
  try {
    var auditCol = $app.findCollectionByNameOrId('audit_logs')
    var auditRec = new Record(auditCol)
    try {
      var authId = e.requestInfo().auth ? e.requestInfo().auth.id : ''
      if (authId) auditRec.set('user_id', authId)
    } catch (_) {}
    auditRec.set('action', 'delete')
    auditRec.set('entity', 'declaracao')
    auditRec.set('entity_id', e.record.id)
    try {
      auditRec.set('diff', {
        cliente_id: e.record.getString('cliente_id'),
        ano_calendario: Number(e.record.get('ano_calendario')) || 0,
        status: e.record.getString('status'),
        timestamp: new Date().toISOString(),
      })
    } catch (_) {}
    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit log failed', 'error', String(err))
  }
  return e.next()
}, 'declaracoes')
