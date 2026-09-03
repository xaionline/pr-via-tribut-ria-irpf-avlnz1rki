// GET /backend/v1/configuracoes/lgpd/exportar?cpf=...
// Admin-only: localiza um titular pelo CPF (cliente) e retorna um
// dossiê de dados pessoais para exportação LGPD. Registra em audit_logs.
routerAdd(
  'GET',
  '/backend/v1/configuracoes/lgpd/exportar',
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

      var cpf = (e.requestInfo().query['cpf'] || '').toString().replace(/\D/g, '')
      if (!cpf || cpf.length !== 11) {
        return e.badRequestError('CPF inválido. Informe 11 dígitos.')
      }

      var cliente = null
      try {
        cliente = $app.findFirstRecordByFilter(
          'clientes',
          "escritorio_id = '" + escId + "' && cpf = '" + cpf + "'",
        )
      } catch (_) {
        return e.json(200, { success: true, encontrado: false })
      }

      var declaracoes = []
      try {
        declaracoes = $app.findRecordsByFilter(
          'declaracoes',
          "cliente_id = '" + cliente.id + "'",
          '-ano_calendario',
          500,
          0,
        )
      } catch (_) {}

      var dependentes = []
      for (var i = 0; i < declaracoes.length; i++) {
        try {
          var deps = $app.findRecordsByFilter(
            'dependentes',
            "declaracao_id = '" + declaracoes[i].id + "'",
            '',
            500,
            0,
          )
          for (var j = 0; j < deps.length; j++) {
            dependentes.push({
              nome: deps[j].getString('nome'),
              cpf: deps[j].getString('cpf'),
              data_nascimento: deps[j].getString('data_nascimento'),
              declaracao_id: declaracoes[i].id,
            })
          }
        } catch (_) {}
      }

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'lgpd_exportar')
        auditRec.set('entity', 'clientes')
        auditRec.set('entity_id', cliente.id)
        auditRec.set('diff', JSON.stringify({ cpf: cpf }))
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        encontrado: true,
        titular: {
          id: cliente.id,
          nome: cliente.getString('nome'),
          cpf: cliente.getString('cpf'),
          email: cliente.getString('email'),
          telefone: cliente.getString('telefone'),
          data_nascimento: cliente.getString('data_nascimento'),
          endereco: cliente.getString('endereco'),
          status: cliente.getString('status'),
          created: cliente.getString('created'),
          updated: cliente.getString('updated'),
        },
        declaracoes: declaracoes.map(function (r) {
          return {
            id: r.id,
            ano_calendario: Number(r.get('ano_calendario')) || 0,
            status: r.getString('status'),
            modalidade: r.getString('modalidade'),
            created: r.getString('created'),
            updated: r.getString('updated'),
          }
        }),
        dependentes: dependentes,
        exportado_em: new Date().toISOString(),
      })
    } catch (err) {
      $app.logger().error('lgpd exportar failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao exportar dados pessoais: ' + msg)
    }
  },
  $apis.requireAuth(),
)
