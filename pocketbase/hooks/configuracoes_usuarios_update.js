// PATCH /backend/v1/configuracoes/usuarios/{id}
// Admin-only: atualiza cargo e/ou ativo de um usuário do escritório.
// Registra as alterações em audit_logs. Não permite rebaixar o último
// administrador do escritório para outro cargo nem desativá-lo.
routerAdd(
  'PATCH',
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

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var diff = {}
      var cargoAntigo = target.getString('cargo')
      var ativoAntigo = target.getBool('ativo')

      if (body.cargo !== undefined && body.cargo !== null) {
        var novoCargo = body.cargo
        if (novoCargo !== 'admin' && novoCargo !== 'consultor' && novoCargo !== 'visualizador') {
          return e.badRequestError('Cargo inválido.')
        }
        if (novoCargo !== cargoAntigo) {
          // Proteção do último admin.
          if (cargoAntigo === 'admin' && novoCargo !== 'admin') {
            var admins = $app.findRecordsByFilter(
              'users',
              "escritorio_id = '" + escId + "' && cargo = 'admin' && ativo = true",
              '',
              500,
              0,
            )
            if (admins.length <= 1) {
              return e.badRequestError(
                'Não é possível alterar o cargo do único administrador do escritório.',
              )
            }
          }
          target.set('cargo', novoCargo)
          diff.cargo = { de: cargoAntigo, para: novoCargo }
        }
      }

      if (body.ativo !== undefined && body.ativo !== null) {
        var novoAtivo = body.ativo === true || body.ativo === 'true'
        if (novoAtivo !== ativoAntigo) {
          if (!novoAtivo && cargoAntigo === 'admin') {
            var adminsAtivos = $app.findRecordsByFilter(
              'users',
              "escritorio_id = '" + escId + "' && cargo = 'admin' && ativo = true",
              '',
              500,
              0,
            )
            if (adminsAtivos.length <= 1) {
              return e.badRequestError(
                'Não é possível desativar o único administrador do escritório.',
              )
            }
          }
          target.set('ativo', novoAtivo)
          diff.ativo = { de: ativoAntigo, para: novoAtivo }
        }
      }

      if (Object.keys(diff).length === 0) {
        return e.json(200, { success: true, alterado: false })
      }

      $app.save(target)

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'alterar')
        auditRec.set('entity', 'users')
        auditRec.set('entity_id', userId)
        auditRec.set('diff', JSON.stringify(diff))
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, { success: true, alterado: true })
    } catch (err) {
      $app.logger().error('atualizar usuario failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao atualizar usuário: ' + msg)
    }
  },
  $apis.requireAuth(),
)
