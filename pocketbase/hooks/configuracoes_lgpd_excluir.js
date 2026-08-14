// POST /backend/v1/configuracoes/lgpd/excluir
// Admin-only: solicita a exclusão definitiva de um titular (cliente) pelo CPF.
// Anonimiza CPF/e-mail e marca como inativo; registra a solicitação em
// audit_logs. Não realiza a exclusão física imediata — mantém rastreabilidade.
routerAdd(
  'POST',
  '/backend/v1/configuracoes/lgpd/excluir',
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

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var cpf = (body.cpf || '').toString().replace(/\D/g, '')
      if (!cpf || cpf.length !== 11) {
        return e.badRequestError('CPF inválido. Informe 11 dígitos.')
      }

      var confirmado = body.confirmar === true
      if (!confirmado) {
        return e.badRequestError('Confirmação explícita é obrigatória.')
      }

      var cliente = null
      try {
        cliente = $app.findFirstRecordByFilter(
          'clientes',
          "escritorio_id = '" + escId + "' && cpf = '" + cpf + "'",
        )
      } catch (_) {
        return e.notFoundError('Titular não encontrado para o CPF informado.')
      }

      var nomeOriginal = cliente.getString('nome')
      var cpfOriginal = cliente.getString('cpf')

      // Anonimização + marcação de exclusão deferida.
      cliente.set('nome', 'Titular excluído (LGPD)')
      cliente.set('cpf', '00000000000')
      cliente.set('email', '')
      cliente.set('telefone', '')
      cliente.set('endereco', '')
      cliente.set('status', 'inativo')
      $app.save(cliente)

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'lgpd_excluir')
        auditRec.set('entity', 'clientes')
        auditRec.set('entity_id', cliente.id)
        auditRec.set(
          'diff',
          JSON.stringify({ cpf_anonimizado: cpfOriginal, nome_original: nomeOriginal }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        cliente_id: cliente.id,
        anonimizado: true,
      })
    } catch (err) {
      $app.logger().error('lgpd excluir failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao processar exclusão de titular: ' + msg)
    }
  },
  $apis.requireAuth(),
)
