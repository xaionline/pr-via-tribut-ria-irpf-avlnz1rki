// DELETE /backend/v1/configuracoes/usuarios/{id}
// Admin-only: remove um usuário do escritório. Não permite remover a si
// mesmo nem o último administrador do escritório. Registra em audit_logs.
routerAdd(
  'DELETE',
  '/backend/v1/configuracoes/usuarios/{id}',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }
      var cargo = auth.getString('cargo')
      if (cargo !== 'admin') {
        return e.forbiddenError('Acesso restrito ao administrador.')
      }
      var escId = auth.getString('escritorio_id')
      if (!escId) {
        return e.badRequestError('Escritório não vinculado ao usuário.')
      }

      var userId = e.request.pathValue('id')
      if (!userId) {
        return e.badRequestError('id do usuário é obrigatório.')
      }

      // Evita autoexclusão.
      if (userId === auth.id) {
        return e.badRequestError('Você não pode remover sua própria conta.')
      }

      var target
      try {
        target = $app.findRecordById('users', userId)
      } catch (_) {
        return e.notFoundError('Usuário não encontrado.')
      }

      var targetEsc = target.getString('escritorio_id')
      if (targetEsc !== escId) {
        return e.forbiddenError('Usuário não pertence ao seu escritório.')
      }

      // Não permite remover o último administrador do escritório.
      var admins = $app.findRecordsByFilter(
        'users',
        "escritorio_id = '" + escId + "' && cargo = 'admin' && ativo = true",
        '',
        500,
        0,
      )
      if (admins.length <= 1 && target.getString('cargo') === 'admin') {
        return e.badRequestError('Não é possível remover o único administrador do escritório.')
      }

      var nomeAlvo = target.getString('name') || target.email()

      $app.delete(target)

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'remover')
        auditRec.set('entity', 'users')
        auditRec.set('entity_id', userId)
        auditRec.set('diff', JSON.stringify({ nome: nomeAlvo }))
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, { success: true })
    } catch (err) {
      $app.logger().error('remover usuario failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao remover usuário: ' + msg)
    }
  },
  $apis.requireAuth(),
)
