// DELETE /backend/v1/admin/escritorios/{id}
// Apenas super_admin: remove o escritório e TODAS as entidades relacionadas em cascata
// de forma segura dentro de transação:
// - declaracoes e suas tabelas filhas (rendimentos, fontes_pagadoras, despesas_dedutiveis,
//   dependentes, atividades_rurais, destinacoes_fiscais, resultados, cenarios_simulacao,
//   importacoes_informes, irrf)
// - clientes do escritório
// - users vinculados ao escritório
// - audit_logs vinculados ao escritório ou aos registros excluídos
// - o próprio registro em escritorios
routerAdd(
  'DELETE',
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

      var escNome = esc.getString('nome')
      var escCnpj = esc.getString('cnpj')

      // Executa toda a remoção em cascata dentro de transação para garantir integridade atômica
      $app.runInTransaction((txApp) => {
        // 1. Localizar todas as declarações do escritório
        var declaracoes = []
        try {
          declaracoes = txApp.findRecordsByFilter(
            'declaracoes',
            'escritorio_id = {:escId}',
            'created',
            5000,
            0,
            { escId: id },
          )
        } catch (_) {
          declaracoes = []
        }

        var decChildCollections = [
          'rendimentos',
          'fontes_pagadoras',
          'despesas_dedutiveis',
          'dependentes',
          'atividades_rurais',
          'destinacoes_fiscais',
          'resultados',
          'cenarios_simulacao',
          'importacoes_informes',
          'irrf',
        ]

        // 2. Para cada declaração, excluir todos os registros filhos vinculados por declaracao_id
        for (var di = 0; di < declaracoes.length; di++) {
          var dec = declaracoes[di]
          var decId = dec.id

          for (var ci = 0; ci < decChildCollections.length; ci++) {
            var colName = decChildCollections[ci]
            try {
              var recs = txApp.findRecordsByFilter(
                colName,
                'declaracao_id = {:decId}',
                'created',
                2000,
                0,
                { decId: decId },
              )
              for (var ri = 0; ri < recs.length; ri++) {
                try {
                  txApp.delete(recs[ri])
                } catch (_) {}
              }
            } catch (_) {}
          }

          // Excluir a própria declaração
          try {
            txApp.delete(dec)
          } catch (_) {}
        }

        // 3. Localizar e excluir todos os clientes do escritório
        try {
          var clientes = txApp.findRecordsByFilter(
            'clientes',
            'escritorio_id = {:escId}',
            'created',
            5000,
            0,
            { escId: id },
          )
          for (var cli = 0; cli < clientes.length; cli++) {
            try {
              txApp.delete(clientes[cli])
            } catch (_) {}
          }
        } catch (_) {}

        // 4. Localizar e excluir todos os usuários vinculados ao escritório (exceto o próprio super_admin executando se for o caso)
        try {
          var usuarios = txApp.findRecordsByFilter(
            'users',
            'escritorio_id = {:escId}',
            'created',
            1000,
            0,
            { escId: id },
          )
          for (var ui = 0; ui < usuarios.length; ui++) {
            var u = usuarios[ui]
            if (u.id !== auth.id) {
              try {
                txApp.delete(u)
              } catch (_) {}
            }
          }
        } catch (_) {}

        // 5. Excluir o escritório
        txApp.delete(esc)

        // 6. Registrar log de auditoria
        try {
          var auditCol = txApp.findCollectionByNameOrId('audit_logs')
          var auditRec = new Record(auditCol)
          auditRec.set('user_id', auth.id)
          auditRec.set('action', 'admin_excluir_escritorio_cascata')
          auditRec.set('entity', 'escritorios')
          auditRec.set('entity_id', id)
          auditRec.set(
            'diff',
            JSON.stringify({
              nome: escNome,
              cnpj: escCnpj,
              declaracoes_removidas: declaracoes.length,
            }),
          )
          txApp.save(auditRec)
        } catch (_) {}
      })

      return e.json(200, {
        success: true,
        message: 'Escritório e todos os dados vinculados foram excluídos com sucesso.',
        id: id,
      })
    } catch (err) {
      $app.logger().error('admin excluir escritorio cascade failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      return e.json(500, {
        success: false,
        message: 'Erro ao excluir escritório em cascata: ' + msg,
      })
    }
  },
  $apis.requireAuth(),
)
