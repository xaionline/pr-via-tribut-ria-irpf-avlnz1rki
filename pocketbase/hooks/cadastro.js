// POST /backend/v1/cadastro
// Rota pública de onboarding de escritório: cria o escritório e o usuário
// administrador vinculado de forma atômica, registra auditoria e retorna os
// dados necessários para o login automático no cliente.
routerAdd('POST', '/backend/v1/cadastro', (e) => {
  // ---- Parse do corpo -------------------------------------------------
  var body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {
    body = {}
  }

  var nomeEscritorio = (body.nome_escritorio || '').trim()
  var cnpj = (body.cnpj || '').trim()
  var telefone = (body.telefone || '').trim()
  var emailEscritorio = (body.email_escritorio || '').trim().toLowerCase()
  var nomeAdmin = (body.nome_admin || '').trim()
  var emailAdmin = (body.email_admin || '').trim().toLowerCase()
  var senha = body.senha || ''
  var senhaConfirm = body.senha_confirm || ''

  // ---- Validações de campos obrigatórios ------------------------------
  var erros = {}

  if (!nomeEscritorio) {
    erros.nome_escritorio = 'Informe o nome do escritório.'
  } else if (nomeEscritorio.length < 3) {
    erros.nome_escritorio = 'O nome do escritório deve ter ao menos 3 caracteres.'
  }

  // CNPJ: aceita formatado (00.000.000/0000-00) ou somente dígitos.
  var cnpjDigitos = cnpj.replace(/\D/g, '')
  if (!cnpj) {
    erros.cnpj = 'Informe o CNPJ.'
  } else if (cnpjDigitos.length !== 14) {
    erros.cnpj = 'CNPJ deve conter 14 dígitos.'
  }

  if (!telefone) {
    erros.telefone = 'Informe o telefone.'
  } else if (telefone.replace(/\D/g, '').length < 10) {
    erros.telefone = 'Telefone inválido.'
  }

  if (!emailEscritorio) {
    erros.email_escritorio = 'Informe o e-mail do escritório.'
  } else if (emailEscritorio.indexOf('@') < 0) {
    erros.email_escritorio = 'E-mail do escritório inválido.'
  }

  if (!nomeAdmin) {
    erros.nome_admin = 'Informe o nome completo do administrador.'
  } else if (nomeAdmin.length < 3) {
    erros.nome_admin = 'O nome deve ter ao menos 3 caracteres.'
  }

  if (!emailAdmin) {
    erros.email_admin = 'Informe o e-mail do administrador.'
  } else if (emailAdmin.indexOf('@') < 0) {
    erros.email_admin = 'E-mail do administrador inválido.'
  }

  if (!senha) {
    erros.senha = 'Informe a senha.'
  } else if (senha.length < 8) {
    erros.senha = 'A senha deve ter no mínimo 8 caracteres.'
  }

  if (senha !== senhaConfirm) {
    erros.senha_confirm = 'As senhas não coincidem.'
  }

  if (Object.keys(erros).length > 0) {
    return e.json(400, { success: false, errors: erros })
  }

  // ---- Verifica duplicidade de CNPJ e e-mail --------------------------
  try {
    $app.findFirstRecordByData('escritorios', 'cnpj', cnpjDigitos)
    return e.json(409, {
      success: false,
      errors: { cnpj: 'Já existe um escritório cadastrado com este CNPJ.' },
    })
  } catch (_) {}

  try {
    $app.findAuthRecordByEmail('_pb_users_auth_', emailAdmin)
    return e.json(409, {
      success: false,
      errors: { email_admin: 'Já existe um usuário com este e-mail.' },
    })
  } catch (_) {}

  // ---- Criação sequencial (escritório + admin) ---------------------------
  try {
    // 1. Escritório
    var escCol = $app.findCollectionByNameOrId('escritorios')
    var esc = new Record(escCol)
    esc.set('nome', nomeEscritorio)
    esc.set('cnpj', cnpjDigitos)
    esc.set('telefone', telefone)
    esc.set('email', emailEscritorio)
    // Plano inicial: Pro com trial de 14 dias. Limites por plano:
    // Starter 10 empresas / 20 clientes PF · Pro 50 / 150 · Enterprise ilimitado (0)
    var trialAte = new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000)
    esc.set('plano', 'pro')
    esc.set('limite_clientes', 150)
    esc.set('limite_empresas', 50)
    esc.set('ativo', true)
    esc.set('assinatura_status', 'trial')
    esc.set('trial_ate', trialAte.toISOString().replace('T', ' '))
    $app.save(esc)

    // 2. Usuário administrador vinculado
    try {
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
    } catch (adminErr) {
      try {
        $app.delete(esc)
      } catch (_) {}
      throw adminErr
    }

    // 3. Auditoria (best-effort)
    try {
      var auditCol = $app.findCollectionByNameOrId('audit_logs')
      var auditRec = new Record(auditCol)
      auditRec.set('user_id', admin.id)
      auditRec.set('action', 'cadastro_escritorio')
      auditRec.set('entity', 'escritorios')
      auditRec.set('entity_id', esc.id)
      auditRec.set(
        'diff',
        JSON.stringify({
          nome_escritorio: nomeEscritorio,
          cnpj: cnpjDigitos,
          email_admin: emailAdmin,
        }),
      )
      $app.save(auditRec)
    } catch (_) {}

    return e.json(201, {
      success: true,
      escritorio_id: esc.id,
      user_id: admin.id,
      email: emailAdmin,
    })
  } catch (err) {
    var errStr = ''
    try {
      errStr = typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err)
    } catch (_) {
      errStr = String(err)
    }
    var msg = err && err.message ? err.message : errStr
    $app.logger().error('cadastro escritorio failed', 'error', msg)
    return e.json(500, {
      success: false,
      errors: { _global: 'Não foi possível concluir o cadastro: ' + msg },
    })
  }
})
