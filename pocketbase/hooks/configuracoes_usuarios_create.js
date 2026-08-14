// POST /backend/v1/configuracoes/usuarios
// Admin-only: cria um novo usuário no escritório do admin autenticado,
// define cargo, marca como ativo e (opcional) envia e-mail de convite.
// Registra a ação em audit_logs.
routerAdd(
  'POST',
  '/backend/v1/configuracoes/usuarios',
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

      var nome = (body.name || '').trim()
      var email = (body.email || '').trim().toLowerCase()
      var novoCargo = body.cargo
      var enviarConvite = body.enviar_convite === true

      if (!nome) {
        return e.badRequestError('Nome é obrigatório.')
      }
      if (!email || email.indexOf('@') < 0) {
        return e.badRequestError('E-mail inválido.')
      }
      if (novoCargo !== 'admin' && novoCargo !== 'consultor' && novoCargo !== 'visualizador') {
        return e.badRequestError('Cargo inválido. Use admin, consultor ou visualizador.')
      }

      // Evita duplicidade de e-mail no sistema.
      try {
        $app.findAuthRecordByEmail('_pb_users_auth_', email)
        return e.badRequestError('Já existe um usuário com este e-mail.')
      } catch (_) {}

      var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      var record = new Record(usersCol)
      record.setEmail(email)
      // Senha inicial determinística, porém forte o suficiente; o usuário
      // redefine no primeiro acesso via convite.
      var senha = $security.randomString(16)
      record.setPassword(senha)
      record.setVerified(false)
      record.set('name', nome)
      record.set('escritorio_id', escId)
      record.set('cargo', novoCargo)
      record.set('ativo', true)
      $app.save(record)

      // E-mail de convite (best-effort).
      var emailEnviado = false
      if (enviarConvite) {
        try {
          var esc = $app.findRecordById('escritorios', escId)
          var nomeEsc = esc ? esc.getString('nome') : 'Prévia Tributária IRPF'
          var siteUrl = $os.getenv('SITE_URL') || ''
          var loginUrl = siteUrl ? siteUrl.replace(/\/$/, '') + '/login' : '/login'
          var html =
            '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
            '<h2 style="color:#059669">Convite para o escritório ' +
            nomeEsc +
            '</h2>' +
            '<p>Olá <strong>' +
            nome +
            '</strong>,</p>' +
            '<p>Você foi convidado para integrar o escritório <strong>' +
            nomeEsc +
            '</strong> na plataforma Prévia Tributária IRPF.</p>' +
            '<p>Use o e-mail <strong>' +
            email +
            '</strong> para acessar a plataforma. Na primeira entrada, utilize a opção "Esqueci minha senha" para definir sua credencial.</p>' +
            '<p><a href="' +
            loginUrl +
            '" style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Acessar plataforma</a></p>' +
            '<p style="color:#64748b;font-size:12px;margin-top:24px">Caso não esperasse este convite, ignore esta mensagem.</p>' +
            '</div>'
          var message = new MailerMessage({
            from: {
              address: $app.settings().meta.senderAddress || 'no-reply@previatributaria.com.br',
              name: $app.settings().meta.senderName || 'Prévia Tributária IRPF',
            },
            to: [{ address: email }],
            subject: 'Convite para acessar o escritório ' + nomeEsc,
            html: html,
          })
          $app.newMailClient().send(message)
          emailEnviado = true
        } catch (mailErr) {
          $app.logger().error('convite usuario email failed', 'error', String(mailErr))
        }
      }

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'convidar')
        auditRec.set('entity', 'users')
        auditRec.set('entity_id', record.id)
        auditRec.set(
          'diff',
          JSON.stringify({ nome: nome, email: email, cargo: novoCargo, convite: emailEnviado }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(201, {
        success: true,
        id: record.id,
        email: email,
        name: nome,
        cargo: novoCargo,
        ativo: true,
        convite_enviado: emailEnviado,
      })
    } catch (err) {
      $app.logger().error('criar usuario failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao criar usuário: ' + msg)
    }
  },
  $apis.requireAuth(),
)
