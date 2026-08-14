// POST /backend/v1/configuracoes/usuarios/{id}/redefinir-senha
// Admin-only: dispara o reset de senha nativo do PocketBase para o usuário.
routerAdd(
  'POST',
  '/backend/v1/configuracoes/usuarios/{id}/redefinir-senha',
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

      // Reinicia a senha para um valor aleatório forte e envia o e-mail
      // de "esqueci minha senha" via fluxo nativo do PocketBase.
      var novaSenha = $security.randomString(16)
      target.setPassword(novaSenha)
      $app.save(target)

      var emailEnviado = false
      try {
        var esc = $app.findRecordById('escritorios', escId)
        var nomeEsc = esc ? esc.getString('nome') : 'Prévia Tributária IRPF'
        var siteUrl = $os.getenv('SITE_URL') || ''
        var loginUrl = siteUrl ? siteUrl.replace(/\/$/, '') + '/login' : '/login'
        var html =
          '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
          '<h2 style="color:#059669">Redefinição de senha</h2>' +
          '<p>Olá <strong>' +
          (target.getString('name') || '') +
          '</strong>,</p>' +
          '<p>Sua senha foi redefinida pelo administrador do escritório <strong>' +
          nomeEsc +
          '</strong>.</p>' +
          '<p>Acesse a plataforma e utilize a opção "Esqueci minha senha" para definir uma nova credencial.</p>' +
          '<p><a href="' +
          loginUrl +
          '" style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Acessar plataforma</a></p>' +
          '<p style="color:#64748b;font-size:12px;margin-top:24px">Caso não esperasse essa ação, entre em contato com o administrador do escritório.</p>' +
          '</div>'
        var message = new MailerMessage({
          from: {
            address: $app.settings().meta.senderAddress || 'no-reply@previatributaria.com.br',
            name: $app.settings().meta.senderName || 'Prévia Tributária IRPF',
          },
          to: [{ address: target.email() }],
          subject: 'Redefinição de senha — ' + nomeEsc,
          html: html,
        })
        $app.newMailClient().send(message)
        emailEnviado = true
      } catch (mailErr) {
        $app.logger().error('redefinir senha email failed', 'error', String(mailErr))
      }

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'redefinir_senha')
        auditRec.set('entity', 'users')
        auditRec.set('entity_id', userId)
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        convite_enviado: emailEnviado,
      })
    } catch (err) {
      $app.logger().error('redefinir senha failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao redefinir senha: ' + msg)
    }
  },
  $apis.requireAuth(),
)
