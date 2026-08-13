onRecordAfterUpdateSuccess((e) => {
  try {
    var auditCol = $app.findCollectionByNameOrId('audit_logs')
    var auditRec = new Record(auditCol)
    try {
      var authId = e.requestInfo().auth ? e.requestInfo().auth.id : ''
      if (authId) auditRec.set('user_id', authId)
    } catch (_) {}
    auditRec.set('action', 'update')
    auditRec.set('entity', 'declaracoes')
    auditRec.set('entity_id', e.record.id)
    var before = {}
    var after = {}
    try {
      var orig = e.record.original()
      before = {
        status: orig.getString('status'),
        modalidade: orig.getString('modalidade'),
        progresso: orig.getNumber('progresso'),
        ano_calendario: orig.getNumber('ano_calendario'),
      }
    } catch (_) {}
    try {
      after = {
        status: e.record.getString('status'),
        modalidade: e.record.getString('modalidade'),
        progresso: e.record.getNumber('progresso'),
        ano_calendario: e.record.getNumber('ano_calendario'),
      }
    } catch (_) {}
    auditRec.set('diff', JSON.stringify({ before: before, after: after }))
    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit log failed', 'error', String(err))
  }
  return e.next()
}, 'declaracoes')
