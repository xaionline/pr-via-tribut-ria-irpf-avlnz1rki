// POST /backend/v1/agent/tribby/chat
// Endpoint de chat (sync e streaming) com o agente nativo "tribby".
// Valida que o usuário pertence a um escritório com plano Enterprise ativo OU em período de trial (ou super_admin).
routerAdd(
  'POST',
  '/backend/v1/agent/tribby/chat',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      var userId = auth.id
      var cargo = auth.getString('cargo')
      var escId = auth.getString('escritorio_id')

      // Super admin tem acesso total independente do plano
      var isSuperAdmin = cargo === 'super_admin'

      if (!isSuperAdmin) {
        if (!escId) {
          return e.badRequestError('Usuário sem escritório vinculado.')
        }

        var esc
        try {
          esc = $app.findRecordById('escritorios', escId)
        } catch (_) {
          return e.notFoundError('Escritório não encontrado.')
        }

        var plano = (esc.getString('plano') || '').toLowerCase()
        var assinaturaStatus = (esc.getString('assinatura_status') || 'trial').toLowerCase()
        var ativo = esc.getBool('ativo')

        if (!ativo) {
          return e.forbiddenError('Escritório inativo.')
        }

        // Regra de acesso: plano Enterprise ativo OU qualquer plano em trial
        var isTrial = assinaturaStatus === 'trial'
        var isEnterprise = plano === 'enterprise' && assinaturaStatus === 'ativo'

        if (!isTrial && !isEnterprise) {
          return e.json(403, {
            error: 'enterprise_required',
            message:
              'O Assistente IA Tribby é exclusivo do Plano Enterprise. Faça upgrade em /app/planos.',
          })
        }
      }

      var body = e.requestInfo().body || {}
      var message = (body.message || '').trim()
      if (!message) {
        return e.badRequestError('A mensagem é obrigatória.')
      }

      var conversationId = body.conversation_id || null
      var wantStream = body.stream === true

      if (wantStream) {
        var conv = $ai.agent('tribby').getOrCreateConversation({
          user_id: userId,
          id: conversationId,
        })

        var iter = $ai.agent('tribby').chat({
          user_id: userId,
          conversation_id: conv.id,
          message: message,
          stream: true,
        })

        e.response.header().set('Content-Type', 'text/event-stream')
        e.response.header().set('Cache-Control', 'no-cache')
        e.response.header().set('X-Conversation-Id', conv.id)
        return $response.stream(e, iter)
      }

      // Sync chat
      var result = $ai.agent('tribby').chat({
        user_id: userId,
        conversation_id: conversationId,
        message: message,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'IA temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'agent request failed' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        var statusAi = err.status || 502
        return e.json(statusAi, {
          error: statusAi >= 500 ? 'IA temporariamente indisponível' : err.message,
        })
      }
      return e.json(500, { error: 'Erro interno ao processar chat com o agente: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)
