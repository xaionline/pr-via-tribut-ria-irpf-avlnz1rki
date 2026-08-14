// POST /backend/v1/configuracoes/retensao/relatorio
// Admin-only: gera um relatório de itens elegíveis para retenção/arquivamento
///exclusão conforme a política do escritório:
//   - Declarações: retenção de 5 anos (ano_calendário < anoAtual - 5)
//   - Clientes inativos: arquivamento após 2 anos, exclusão após 5 anos
routerAdd(
  'POST',
  '/backend/v1/configuracoes/retensao/relatorio',
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

      var agora = new Date()
      var anoAtual = agora.getFullYear()
      var anoCorteDeclaracoes = anoAtual - 5
      var doisAnosAtras = new Date(agora.getTime() - 2 * 365 * 24 * 3600 * 1000).toISOString()
      var cincoAnosAtras = new Date(agora.getTime() - 5 * 365 * 24 * 3600 * 1000).toISOString()

      var filterEsc = "escritorio_id = '" + escId + "'"

      // Declarações elegíveis para descarte (ano_calendário < anoAtual - 5).
      var decElegiveis = []
      try {
        decElegiveis = $app.findRecordsByFilter(
          'declaracoes',
          filterEsc + ' && ano_calendario < ' + anoCorteDeclaracoes,
          'ano_calendario',
          500,
          0,
        )
      } catch (_) {}

      // Clientes inativos arquiváveis (status inativo há mais de 2 anos).
      var clientesArquivar = []
      try {
        clientesArquivar = $app.findRecordsByFilter(
          'clientes',
          filterEsc + " && status = 'inativo' && updated < {:corte}",
          'updated',
          500,
          0,
          { corte: doisAnosAtras },
        )
      } catch (_) {}

      // Clientes inativos elegíveis para exclusão (há mais de 5 anos).
      var clientesExcluir = []
      try {
        clientesExcluir = $app.findRecordsByFilter(
          'clientes',
          filterEsc + " && status = 'inativo' && updated < {:corte}",
          'updated',
          500,
          0,
          { corte: cincoAnosAtras },
        )
      } catch (_) {}

      // Auditoria.
      try {
        var auditCol = $app.findCollectionByNameOrId('audit_logs')
        var auditRec = new Record(auditCol)
        auditRec.set('user_id', auth.id)
        auditRec.set('action', 'relatorio_retensao')
        auditRec.set('entity', 'escritorios')
        auditRec.set('entity_id', escId)
        auditRec.set(
          'diff',
          JSON.stringify({
            declaracoes_elegiveis: decElegiveis.length,
            clientes_arquivar: clientesArquivar.length,
            clientes_excluir: clientesExcluir.length,
          }),
        )
        $app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        gerado_em: agora.toISOString(),
        politicas: {
          declaracoes_retencao_anos: 5,
          clientes_arquivamento_anos: 2,
          clientes_exclusao_anos: 5,
        },
        declaracoes_elegiveis: decElegiveis.map(function (r) {
          return {
            id: r.id,
            ano_calendario: r.getInt('ano_calendario'),
            cliente_id: r.getString('cliente_id'),
            status: r.getString('status'),
            updated: r.getString('updated'),
          }
        }),
        clientes_arquivar: clientesArquivar.map(function (r) {
          return {
            id: r.id,
            nome: r.getString('nome'),
            cpf: r.getString('cpf'),
            updated: r.getString('updated'),
          }
        }),
        clientes_excluir: clientesExcluir.map(function (r) {
          return {
            id: r.id,
            nome: r.getString('nome'),
            cpf: r.getString('cpf'),
            updated: r.getString('updated'),
          }
        }),
      })
    } catch (err) {
      $app.logger().error('relatorio retensao failed', 'error', String(err))
      var msg = err && err.message ? err.message : String(err)
      throw new BadRequestError('Erro ao gerar relatório de retenção: ' + msg)
    }
  },
  $apis.requireAuth(),
)
