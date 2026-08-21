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

      console.log('=== ADMIN ESCRITORIOS CREATE REQUEST ===')
      console.log('Auth user ID:', auth.id, 'Cargo:', auth.getString('cargo'))
      console.log('Body:', JSON.stringify(body))

      var nomeEscritorio = (body.nome || '').trim()
      var cnpj = (body.cnpj || '').trim()
      var emailAdmin = (body.email_admin || '').trim().toLowerCase()
      var nomeAdmin = (body.nome_admin || '').trim()
      var senha = body.senha !== undefined && body.senha !== null ? String(body.senha) : ''
      if (!senha && body.password !== undefined && body.password !== null) {
        senha = String(body.password)
      }

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

      // Criação dos registros (escritório + admin + audit).
      // 1. Escritório
      console.log('[DEBUG] Criando registro de escritorio...')
      var escCol = $app.findCollectionByNameOrId('escritorios')
      var esc = new Record(escCol)
      esc.set('nome', nomeEscritorio)
      esc.set('cnpj', cnpjDigitos)
      esc.set('email', emailAdmin)
      esc.set('plano', 'pro')
      esc.set('limite_clientes', 100)
      esc.set('ativo', true)
      $app.save(esc)
      console.log('[DEBUG] Escritorio criado com sucesso. ID:', esc.id)

      // 2. Administrador vinculado
      try {
        console.log('[DEBUG] Criando registro de admin...')
        var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
        var admin = new Record(usersCol)
        admin.setEmail(emailAdmin)
        admin.setPassword(senha)
        admin.setVerified(true)
        admin.set('name', nomeAdmin)
        admin.set('escritorio_id', esc.id)
        admin.set('cargo', 'admin')
        admin.set('ativo', true)
        $app.save(admin)
        console.log('[DEBUG] Admin criado com sucesso. ID:', admin.id)
      } catch (adminErr) {
        // Rollback manual do escritório se a criação do admin falhar
        console.log(
          '[DEBUG] Falha ao criar admin, excluindo escritorio criado...',
          String(adminErr),
        )
        try {
          $app.delete(esc)
        } catch (_) {}
        throw adminErr
      }

      // 3. Auditoria (best-effort)
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
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
        $app.save(auditRec)
      } catch (auditErr) {
        console.log('[DEBUG] Falha ao salvar audit_log (ignorado):', String(auditErr))
      }

      var createdDateStr = ''
      try {
        createdDateStr = esc.getDateTime('created') ? esc.getDateTime('created').toString() : ''
      } catch (_) {
        createdDateStr = esc.getString('created') || ''
      }

      return e.json(201, {
        success: true,
        escritorio: {
          id: esc.id,
          nome: esc.getString('nome'),
          cnpj: esc.getString('cnpj'),
          email: esc.getString('email'),
          ativo: esc.getBool('ativo'),
          created: createdDateStr,
        },
      })
    } catch (err) {
      var errStr = ''
      try {
        errStr = typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err)
      } catch (_) {
        errStr = String(err)
      }
      var errMsg = err && err.message ? String(err.message) : ''
      var errStack = err && err.stack ? String(err.stack) : ''
      console.log('=== ADMIN ESCRITORIOS CREATE ERROR ===', errStr, errMsg, errStack)
      $app
        .logger()
        .error(
          'admin criar escritorio failed: ' +
            errStr +
            ' | msg: ' +
            errMsg +
            ' | stack: ' +
            errStack,
        )
      var msg = errMsg || errStr || 'Erro interno no servidor.'
      return e.json(500, {
        success: false,
        errors: {
          _global: 'Não foi possível criar o escritório: ' + msg,
          _debug_str: errStr,
          _debug_msg: errMsg,
        },
      })
    }
  },
  $apis.requireAuth(),
)
