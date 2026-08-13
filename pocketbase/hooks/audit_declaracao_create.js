onRecordAfterCreateSuccess((e) => {
  try {
    var auditCol = $app.findCollectionByNameOrId('audit_logs')
    var auditRec = new Record(auditCol)
    try {
      var authId = e.requestInfo().auth ? e.requestInfo().auth.id : ''
      if (authId) auditRec.set('user_id', authId)
    } catch (_) {}
    auditRec.set('action', 'create')
    auditRec.set('entity', 'declaracoes')
    auditRec.set('entity_id', e.record.id)
    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit log failed', 'error', String(err))
  }
  return e.next()
}, 'declaracoes')
