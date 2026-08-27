// POST /backend/v1/clientes/{id}/convidar
// Admin/Consultor: cria um login de cliente (cargo = "cliente") vinculado ao
// registro de `clientes`, envia e-mail de convite (best-effort) e registra a
// ação em audit_logs. Se o cliente já tiver login vinculado, retorna conflito.
routerAdd(
  'POST',
  '/backend/v1/clientes/{id}/convidar',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }
      var cargo = auth.getString('cargo')
      if (cargo !== 'admin' && cargo !== 'consultor') or (cargo !== 'Super_admin') {
        return e.forbiddenError('Acesso restrito a admin ou consultor.')
      }
      var escId = auth.getString('escritorio_id')
      if (!escId) {
        return e.badRequestError('Escritório não vinculado ao usuário.')
      }

      var clienteId = e.request.pathValue('id')
      if (!clienteId) {
        return e.badRequestError('id do cliente é obrigatório.')
      }

      var cliente
      try {
        cliente = $app.findRecordById('clientes', clienteId)
      } catch (_) {
        return e.notFoundError('Cliente não encontrado.')
      }

      // Isolamento: cliente deve pertencer ao escritório do contador.
      if (cliente.getString('escritorio_id') !== escId) {
        return e.forbiddenError('Cliente não pertence ao seu escritório.')
      }

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var nome = (body.nome || cliente.getString('nome') || '').trim()
      var email = (body.email || cliente.getString('email') || '').trim().toLowerCase()

      if (!nome) {
        return e.badRequestError('Nome do cliente é obrigatório.')
      }
      if (!email || email.indexOf('@') < 0) {
        return e.badRequestError('E-mail do cliente é obrigatório para o convite.')
      }

      // Verifica se já existe login vinculado a este cliente.
      var userIdExistente = ''
      try {
        userIdExistente = cliente.getString('user_id') || ''
      } catch (_) {
        userIdExistente = ''
      }
      if (userIdExistente) {
        return e.badRequestError('Este cliente já possui acesso vinculado.')
      }

      // Evita duplicidade de e-mail.
      try {
        $app.findAuthRecordByEmail('_pb_users_auth_', email)
        return e.badRequestError('Já existe um usuário com este e-mail.')
      } catch (_) {}

      // Cria o usuário de cliente.
      var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      var record = new Record(usersCol)
      record.setEmail(email)
      var senha = $security.randomString(16)
      record.setPassword(senha)
      record.setVerified(false)
      record.set('name', nome)
      record.set('escritorio_id', escId)
      record.set('cargo', 'cliente')
      record.set('ativo', true)
      $app.save(record)

      // Vincula o login ao registro do cliente.
      cliente.set('user_id', record.id)
      $app.save(cliente)

      // E-mail de convite (best-effort).
      var emailEnviado = false
      try {
        var esc = $app.findRecordById('escritorios', escId)
        var nomeEsc = esc ? esc.getString('nome') : 'Calculadora Tributária IR'
        var siteUrl = $os.getenv('SITE_URL') || ''
        var loginUrl = siteUrl ? siteUrl.replace(/\/$/, '') + '/login' : '/login'
        var html =
          '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
          '<h2 style="color:#059669">Acesso à sua declaração IRPF</h2>' +
          '<p>Olá <strong>' +
          nome +
          '</strong>,</p>' +
          '<p>O escritório <strong>' +
          nomeEsc +
          '</strong> liberou seu acesso para acompanhar a prévia do seu IRPF na plataforma Prévia Tributária IRPF.</p>' +
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
          subject: 'Acesso à sua declaração IRPF — ' + nomeEsc,
          html: html,
        })
        $app.newMailClient().send(message)
        emailEnviado = true
      } catch (mailErr) {
        $app.logger().error('convite cliente email failed', 'error', String(mailErr))
      }

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'convidar_cliente')
        auditRec.set('entity', 'clientes')
        auditRec.set('entity_id', cliente.id)
        auditRec.set(
          'diff',
          JSON.stringify({
            nome: nome,
            email: email,
            user_id: record.id,
            convite: emailEnviado,
          }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(201, {
        success: true,
        cliente_id: cliente.id,
        user_id: record.id,
        email: email,
        convite_enviado: emailEnviado,
      })
    } catch (err) {
      $app.logger().error('convidar cliente failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao convidar cliente: ' + msg)
    }
  },
  $apis.requireAuth(),
)
