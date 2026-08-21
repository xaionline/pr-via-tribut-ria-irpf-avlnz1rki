// POST /backend/v1/admin/escritorios/{id}/reenviar-email
// Apenas super_admin: localiza o usuário administrador do escritório (ou usa o e-mail cadastrado
// no escritório), gera link de acesso/recuperação e envia e-mail com boas-vindas/redefinição.
routerAdd(
  'POST',
  '/backend/v1/admin/escritorios/{id}/reenviar-email',
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

      var nomeEsc = esc.getString('nome') || 'Escritório Contábil'
      var emailDestino = ''
      var nomeDestino = ''
      var adminUser = null

      // Procura primeiro usuário com cargo "admin" vinculado ao escritório
      try {
        var admins = $app.findRecordsByFilter(
          'users',
          'escritorio_id = {:escId} && cargo = "admin"',
          '-created',
          1,
          0,
          { escId: id },
        )
        if (admins && admins.length > 0) {
          adminUser = admins[0]
          emailDestino = adminUser.email() || adminUser.getString('email')
          nomeDestino = adminUser.getString('name')
        }
      } catch (_) {}

      // Se não encontrou usuário admin explícito, tenta qualquer usuário do escritório ou o campo email do escritório
      if (!emailDestino) {
        try {
          var anyUsers = $app.findRecordsByFilter(
            'users',
            'escritorio_id = {:escId}',
            '-created',
            1,
            0,
            { escId: id },
          )
          if (anyUsers && anyUsers.length > 0) {
            adminUser = anyUsers[0]
            emailDestino = adminUser.email() || adminUser.getString('email')
            nomeDestino = adminUser.getString('name')
          }
        } catch (_) {}
      }

      if (!emailDestino) {
        emailDestino = esc.getString('email')
        nomeDestino = esc.getString('nome')
      }

      if (!emailDestino || emailDestino.indexOf('@') < 0) {
        return e.json(400, {
          success: false,
          message: 'Nenhum e-mail válido encontrado para o administrador deste escritório.',
        })
      }

      // Se temos o registro do usuário, atualiza a senha temporária de forma segura se necessário
      if (adminUser) {
        try {
          var novaSenhaTemp = $security.randomString(16)
          adminUser.setPassword(novaSenhaTemp)
          $app.save(adminUser)
        } catch (_) {}
      }

      var siteUrl = $os.getenv('SITE_URL') || ''
      var loginUrl = siteUrl ? siteUrl.replace(/\/$/, '') + '/login' : '/login'
      var senderAddress = $app.settings().meta.senderAddress || 'no-reply@previatributaria.com.br'
      var senderName = $app.settings().meta.senderName || 'Prévia Tributária IRPF'

      var html =
        '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.5">' +
        '<h2 style="color:#059669;margin-bottom:16px">Bem-vindo à Prévia Tributária IRPF</h2>' +
        '<p>Olá <strong>' +
        (nomeDestino || 'Administrador') +
        '</strong>,</p>' +
        '<p>Este é o e-mail de acesso administrativo para o escritório <strong>' +
        nomeEsc +
        '</strong>.</p>' +
        '<p>Seu login é: <strong>' +
        emailDestino +
        '</strong></p>' +
        '<p>Para acessar sua conta ou definir uma nova senha com segurança, clique no botão abaixo ou utilize a funcionalidade <em>"Esqueci minha senha"</em> na tela de login:</p>' +
        '<p style="margin:24px 0">' +
        '<a href="' +
        loginUrl +
        '" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">Acessar Plataforma</a>' +
        '</p>' +
        '<p style="color:#64748b;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">' +
        'Se você não solicitou este e-mail, pode ignorá-lo com segurança.' +
        '</p>' +
        '</div>'

      var message = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: emailDestino }],
        subject: 'Acesso Administrativo — ' + nomeEsc,
        html: html,
      })

      $app.newMailClient().send(message)

      // Registrar auditoria
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'admin_reenviar_email_escritorio')
        auditRec.set('entity', 'escritorios')
        auditRec.set('entity_id', id)
        auditRec.set(
          'diff',
          JSON.stringify({
            destinatario: emailDestino,
            nome: nomeDestino,
            escritorio: nomeEsc,
          }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'E-mail enviado com sucesso para ' + emailDestino,
        email: emailDestino,
      })
    } catch (err) {
      $app.logger().error('admin reenviar email failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      return e.json(500, {
        success: false,
        message: 'Erro ao enviar e-mail: ' + msg,
      })
    }
  },
  $apis.requireAuth(),
)
