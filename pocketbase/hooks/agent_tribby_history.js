// GET /backend/v1/agent/tribby/chats
// GET /backend/v1/agent/tribby/chats/{conversationId}/messages
// Permite listar histórico de conversas e mensagens do agente tribby para o usuário logado.
routerAdd(
  'GET',
  '/backend/v1/agent/tribby/chats',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      var userId = auth.id
      var limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
      var list = $ai.agent('tribby').listConversations({ user_id: userId, limit: limit })
      return e.json(200, list)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'list failed' : err.message })
      }
      return e.json(500, { error: 'Erro ao listar conversas: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/agent/tribby/chats/{conversationId}/messages',
  (e) => {
    try {
      var auth = e.auth
      if (!auth) {
        return e.unauthorizedError('Autenticação necessária.')
      }

      var userId = auth.id
      var conversationId = e.request.pathValue('conversationId')
      if (!conversationId) {
        return e.badRequestError('ID da conversa é obrigatório.')
      }

      var limit = parseInt(e.requestInfo().query?.limit || '50', 10) || 50
      var res = $ai.agent('tribby').listMessages({
        conversation_id: conversationId,
        user_id: userId,
        limit: limit,
      })

      return e.json(200, res)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'conversation lookup failed' : err.message,
        })
      }
      return e.json(500, { error: 'Erro ao buscar mensagens: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)
