// POST /backend/v1/admin/escritorios
// Apenas super_admin: cria um escritório e o respectivo administrador
// de forma atômica (transação). Valida duplicidade de CNPJ e e-mail.
// Registra auditoria e retorna os dados do escritório criado.
routerAdd(
  'POST',
  '/backend/v1/admin/escritorios',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }
      if (auth.getString('cargo') !== 'super_admin') {
        return e.forbiddenError('Acesso restrito ao super administrador.')
      }

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var nomeEscritorio = (body.nome || '').trim()
      var cnpj = (body.cnpj || '').trim()
      var emailAdmin = (body.email_admin || '').trim().toLowerCase()
      var nomeAdmin = (body.nome_admin || '').trim()
      var senha = body.senha || ''

      var erros = {}

      if (!nomeEscritorio) {
        erros.nome = 'Informe o nome do escritório.'
      } else if (nomeEscritorio.length < 3) {
        erros.nome = 'O nome do escritório deve ter ao menos 3 caracteres.'
      }

      var cnpjDigitos = cnpj.replace(/\D/g, '')
      if (!cnpj) {
        erros.cnpj = 'Informe o CNPJ.'
      } else if (cnpjDigitos.length !== 14) {
        erros.cnpj = 'CNPJ deve conter 14 dígitos.'
      }

      if (!emailAdmin) {
        erros.email_admin = 'Informe o e-mail do administrador.'
      } else if (emailAdmin.indexOf('@') < 0) {
        erros.email_admin = 'E-mail do administrador inválido.'
      }

      if (!nomeAdmin) {
        erros.nome_admin = 'Informe o nome do administrador.'
      } else if (nomeAdmin.length < 3) {
        erros.nome_admin = 'O nome deve ter ao menos 3 caracteres.'
      }

      if (!senha) {
        erros.senha = 'Informe a senha inicial.'
      } else if (senha.length < 8) {
        erros.senha = 'A senha deve ter no mínimo 8 caracteres.'
      }

      if (Object.keys(erros).length > 0) {
        return e.json(400, { success: false, errors: erros })
      }

      // Duplicidade de CNPJ.
      try {
        $app.findFirstRecordByData('escritorios', 'cnpj', cnpjDigitos)
        return e.json(409, {
          success: false,
          errors: { cnpj: 'Já existe um escritório cadastrado com este CNPJ.' },
        })
      } catch (_) {}

      // Duplicidade de e-mail.
      try {
        $app.findAuthRecordByEmail('_pb_users_auth_', emailAdmin)
        return e.json(409, {
          success: false,
          errors: { email_admin: 'Já existe um usuário com este e-mail.' },
        })
      } catch (_) {}

      // Criação atômica.
      var criado = $app.runInTransaction(function (txApp) {
        var escCol = txApp.findCollectionByNameOrId('escritorios')
        var esc = new Record(escCol)
        esc.set('nome', nomeEscritorio)
        esc.set('cnpj', cnpjDigitos)
        esc.set('email', emailAdmin)
        esc.set('plano', 'pro')
        esc.set('limite_clientes', 100)
        esc.set('ativo', true)
        txApp.save(esc)

        var usersCol = txApp.findCollectionByNameOrId('_pb_users_auth_')
        var admin = new Record(usersCol)
        admin.setEmail(emailAdmin)
        admin.setPassword(senha)
        admin.setVerified(true)
        admin.set('name', nomeAdmin)
        admin.set('escritorio_id', esc.id)
        admin.set('cargo', 'admin')
        admin.set('ativo', true)
        txApp.save(admin)

        try {
          var auditCol = txApp.findCollectionByNameOrId('audit_logs')
          var auditRec = new Record(auditCol)
          auditRec.set('user_id', auth.id)
          auditRec.set('action', 'admin_criar_escritorio')
          auditRec.set('entity', 'escritorios')
          auditRec.set('entity_id', esc.id)
          auditRec.set(
            'diff',
            JSON.stringify({
              nome: nomeEscritorio,
              cnpj: cnpjDigitos,
              email_admin: emailAdmin,
            }),
          )
          txApp.save(auditRec)
        } catch (_) {}

        return { escritorio_id: esc.id, user_id: admin.id }
      })

      var escRecord = $app.findRecordById('escritorios', criado.escritorio_id)

      return e.json(201, {
        success: true,
        escritorio: {
          id: escRecord.id,
          nome: escRecord.getString('nome'),
          cnpj: escRecord.getString('cnpj'),
          email: escRecord.getString('email'),
          ativo: escRecord.getBool('ativo'),
          created: escRecord.getDateTime('created').toString(),
        },
      })
    } catch (err) {
      $app.logger().error('admin criar escritorio failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      return e.json(500, {
        success: false,
        errors: { _global: 'Não foi possível criar o escritório: ' + msg },
      })
    }
  },
  $apis.requireAuth(),
)
