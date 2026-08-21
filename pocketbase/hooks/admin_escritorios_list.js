// GET /backend/v1/admin/escritorios
// Apenas super_admin: lista todos os escritórios cadastrados no sistema,
// sem filtro de escritorio_id. Retorna id, nome, cnpj, email, plano, limite_clientes, status
// ativo e data de criação.
routerAdd(
  'GET',
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

      var registros = $app.findRecordsByFilter('escritorios', '', '-created', 500, 0)

      var lista = []
      for (var i = 0; i < registros.length; i++) {
        var r = registros[i]
        var createdDateStr = ''
        try {
          createdDateStr = r.getDateTime('created') ? r.getDateTime('created').toString() : ''
        } catch (_) {
          createdDateStr = r.getString('created') || ''
        }

        var planoVal = r.getString('plano') || 'pro'
        var limiteVal = Number(r.get('limite_clientes'))
        if (isNaN(limiteVal) || limiteVal <= 0) {
          limiteVal = 100
        }

        lista.push({
          id: r.id,
          nome: r.getString('nome'),
          cnpj: r.getString('cnpj'),
          email: r.getString('email'),
          plano: planoVal,
          limite_clientes: limiteVal,
          ativo: r.getBool('ativo'),
          created: createdDateStr,
        })
      }

      return e.json(200, { success: true, escritorios: lista })
    } catch (err) {
      $app.logger().error('admin listar escritorios failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      return e.json(500, { success: false, message: 'Erro ao listar escritórios: ' + msg })
    }
  },
  $apis.requireAuth(),
)
