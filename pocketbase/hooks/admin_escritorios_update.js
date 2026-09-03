// PUT /backend/v1/admin/escritorios/{id}
// Apenas super_admin: atualiza dados cadastrais do escritório:
// nome, cnpj, email, plano, limite_clientes e ativo.
// Valida duplicidade de CNPJ caso alterado.
// Registra a alteração em audit_logs.
routerAdd(
  'PUT',
  '/backend/v1/admin/escritorios/{id}',
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

      var body = {}
      try {
        body = e.requestInfo().body || {}
      } catch (_) {
        body = {}
      }

      var nome = (body.nome !== undefined ? String(body.nome) : esc.getString('nome')).trim()
      var cnpjRaw = body.cnpj !== undefined ? String(body.cnpj) : esc.getString('cnpj')
      var cnpjDigitos = cnpjRaw.replace(/\D/g, '')
      var email = (body.email !== undefined ? String(body.email) : esc.getString('email'))
        .trim()
        .toLowerCase()
      var plano = (
        body.plano !== undefined ? String(body.plano) : esc.getString('plano') || 'pro'
      ).trim()
      var limiteClientes =
        body.limite_clientes !== undefined
          ? Number(body.limite_clientes)
          : Number(esc.get('limite_clientes')) || 100
      var limiteEmpresas =
        body.limite_empresas !== undefined
          ? Number(body.limite_empresas)
          : Number(esc.get('limite_empresas')) || 0
      var ativo =
        body.ativo !== undefined
          ? body.ativo === true || body.ativo === 'true'
          : esc.getBool('ativo')

      var erros = {}

      if (!nome) {
        erros.nome = 'Informe o nome do escritório.'
      } else if (nome.length < 3) {
        erros.nome = 'O nome do escritório deve ter ao menos 3 caracteres.'
      }

      if (cnpjDigitos && cnpjDigitos.length !== 14) {
        erros.cnpj = 'CNPJ deve conter 14 dígitos.'
      }

      if (email && email.indexOf('@') < 0) {
        erros.email = 'E-mail inválido.'
      }

      if (plano !== 'starter' && plano !== 'pro' && plano !== 'enterprise') {
        erros.plano = 'Plano inválido. Selecione starter, pro ou enterprise.'
      }

      if (isNaN(limiteClientes) || limiteClientes < 1) {
        erros.limite_clientes = 'Limite de clientes deve ser no mínimo 1.'
      }

      if (isNaN(limiteEmpresas) || limiteEmpresas < 0) {
        erros.limite_empresas = 'Limite de empresas deve ser no mínimo 0 (0 = ilimitado).'
      }

      if (Object.keys(erros).length > 0) {
        return e.json(400, { success: false, errors: erros })
      }

      // Validação de CNPJ único (se preenchido e diferente do atual)
      if (cnpjDigitos) {
        try {
          var escExistente = $app.findFirstRecordByData('escritorios', 'cnpj', cnpjDigitos)
          if (escExistente && escExistente.id !== id) {
            return e.json(409, {
              success: false,
              errors: { cnpj: 'Já existe outro escritório cadastrado com este CNPJ.' },
            })
          }
        } catch (_) {}
      }

      var diff = {}
      if (esc.getString('nome') !== nome) diff.nome = { de: esc.getString('nome'), para: nome }
      if (esc.getString('cnpj') !== cnpjDigitos)
        diff.cnpj = { de: esc.getString('cnpj'), para: cnpjDigitos }
      if (esc.getString('email') !== email) diff.email = { de: esc.getString('email'), para: email }
      if (esc.getString('plano') !== plano) diff.plano = { de: esc.getString('plano'), para: plano }
      if (Number(esc.get('limite_clientes')) !== limiteClientes)
        diff.limite_clientes = { de: Number(esc.get('limite_clientes')), para: limiteClientes }
      if (Number(esc.get('limite_empresas') || 0) !== limiteEmpresas)
        diff.limite_empresas = { de: Number(esc.get('limite_empresas') || 0), para: limiteEmpresas }
      if (esc.getBool('ativo') !== ativo) diff.ativo = { de: esc.getBool('ativo'), para: ativo }

      esc.set('nome', nome)
      esc.set('cnpj', cnpjDigitos)
      esc.set('email', email)
      esc.set('plano', plano)
      esc.set('limite_clientes', limiteClientes)
      esc.set('limite_empresas', limiteEmpresas)
      esc.set('ativo', ativo)

      // Alteração de plano pelo super_admin ajusta os limites-padrão e o estado da assinatura
      if (esc.original().getString('plano') !== plano) {
        if (plano === 'starter') {
          esc.set('limite_empresas', 10)
          esc.set('limite_clientes', 20)
        } else if (plano === 'pro') {
          esc.set('limite_empresas', 50)
          esc.set('limite_clientes', 150)
        } else {
          esc.set('limite_empresas', 0) // ilimitado
          esc.set('limite_clientes', 0) // ilimitado
        }
      }

      $app.save(esc)

      // Auditoria
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'admin_editar_escritorio')
        auditRec.set('entity', 'escritorios')
        auditRec.set('entity_id', id)
        auditRec.set('diff', JSON.stringify(diff))
        $app.save(auditRec)
      } catch (_) {}

      var createdDateStr = ''
      try {
        createdDateStr = esc.getDateTime('created') ? esc.getDateTime('created').toString() : ''
      } catch (_) {
        createdDateStr = esc.getString('created') || ''
      }

      return e.json(200, {
        success: true,
        escritorio: {
          id: esc.id,
          nome: esc.getString('nome'),
          cnpj: esc.getString('cnpj'),
          email: esc.getString('email'),
          plano: esc.getString('plano'),
          limite_clientes: Number(esc.get('limite_clientes')),
          limite_empresas: Number(esc.get('limite_empresas') || 0),
          ativo: esc.getBool('ativo'),
          created: createdDateStr,
        },
      })
    } catch (err) {
      $app.logger().error('admin editar escritorio failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      return e.json(500, {
        success: false,
        errors: { _global: 'Erro ao atualizar escritório: ' + msg },
      })
    }
  },
  $apis.requireAuth(),
)
