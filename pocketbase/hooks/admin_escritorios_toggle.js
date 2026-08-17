// PATCH /backend/v1/admin/escritorios/{id}
// Apenas super_admin: ativa ou desativa um escritório (campo ativo).
// Registra a alteração em audit_logs.
routerAdd(
  'PATCH',
  '/backend/v1/admin/escritorios/{id}',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }
      if (auth.getString('cargo') !== 'super_admin') {
        return e.forbiddenError('Acesso restrito ao super administrador.')
      }

      var id = e.request.pathValue('id')
      if (!id) {
        return e.badRequestError('id do escritório é obrigatório.')
      }

      var esc
      try {
        esc = $app.findRecordById('escritorios', id)
      } catch (_) {
        return e.notFoundError('Escritório não encontrado.')
      }

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      if (body.ativo === undefined || body.ativo === null) {
        return e.badRequestError('Campo "ativo" é obrigatório.')
      }

      var novoAtivo = body.ativo === true || body.ativo === 'true'
      var ativoAntigo = esc.getBool('ativo')
      if (novoAtivo === ativoAntigo) {
        return e.json(200, { success: true, alterado: false, ativo: ativoAntigo })
      }

      esc.set('ativo', novoAtivo)
      $app.save(esc)

      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', novoAtivo ? 'admin_ativar_escritorio' : 'admin_desativar_escritorio')
        auditRec.set('entity', 'escritorios')
        auditRec.set('entity_id', id)
        auditRec.set('diff', JSON.stringify({ ativo: { de: ativoAntigo, para: novoAtivo } }))
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, { success: true, alterado: true, ativo: novoAtivo })
    } catch (err) {
      $app.logger().error('admin toggle escritorio failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao atualizar escritório: ' + msg)
    }
  },
  $apis.requireAuth(),
)
