import pb from '@/lib/pocketbase/client'
import {
  streamAgentChat,
  displayableMessages,
  type AgentMessage,
  type DisplayMessage,
  type AgentCitation,
} from '@/lib/skipAi'

export interface ConversationItem {
  id: string
  title?: string
  created: string
  updated?: string
}

/**
 * Envia uma mensagem para o agente nativo Tribby via SSE (streaming).
 */
export async function sendTribbyMessageStream(
  message: string,
  conversationId: string | null,
  handlers: {
    onChunk: (delta: string, full: string) => void
    onCitations?: (citations: AgentCitation[]) => void
    onToolCallStart?: (info: { id: string; name: string }) => void
    onToolCallDone?: (info: { id: string; ok: boolean }) => void
    signal?: AbortSignal
  },
): Promise<{
  conversationId: string
  messageId: string
  content: string
  citations?: AgentCitation[]
}> {
  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl}/backend/v1/agent/tribby/chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      stream: true,
    }),
    signal: handlers.signal,
  })

  // Se retornar erro não-200 com JSON
  if (!res.ok) {
    let errMsg = `Falha ao conectar com o assistente (${res.status})`
    try {
      const data = await res.json()
      if (data?.message) errMsg = data.message
      else if (data?.error) errMsg = data.error
    } catch {
      /* intentionally ignored */
    }
    throw new Error(errMsg)
  }

  const result = await streamAgentChat(res, {
    onChunk: handlers.onChunk,
    onCitations: handlers.onCitations,
    onToolCallStart: handlers.onToolCallStart,
    onToolCallDone: handlers.onToolCallDone,
    signal: handlers.signal,
  })

  const finalConvId =
    res.headers.get('X-Conversation-Id') || result.conversation_id || conversationId || ''

  return {
    conversationId: finalConvId,
    messageId: result.message_id,
    content: result.content,
    citations: result.citations,
  }
}

/**
 * Envia mensagem síncrona (fallback caso streaming não esteja disponível).
 */
export async function sendTribbyMessageSync(
  message: string,
  conversationId: string | null,
): Promise<{
  conversationId: string
  messageId: string
  content: string
  citations?: AgentCitation[]
}> {
  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl}/backend/v1/agent/tribby/chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      stream: false,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Erro ao conversar com Tribby')
  }

  return {
    conversationId: data.conversation_id,
    messageId: data.message_id,
    content: data.content,
    citations: data.citations,
  }
}

/**
 * Lista as conversas anteriores do usuário com o Tribby.
 */
export async function listTribbyConversations(limit = 20): Promise<ConversationItem[]> {
  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl}/backend/v1/agent/tribby/chats?limit=${limit}`

  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (!res.ok) {
    return []
  }

  const data = await res.json()
  return Array.isArray(data) ? data : data?.conversations || []
}

/**
 * Carrega o histórico de mensagens de uma conversa existente, filtrado para exibição.
 */
export async function getTribbyConversationMessages(
  conversationId: string,
): Promise<DisplayMessage[]> {
  const token = pb.authStore.token
  const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
  const url = `${baseUrl}/backend/v1/agent/tribby/chats/${conversationId}/messages`

  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (!res.ok) {
    throw new Error('Não foi possível carregar as mensagens da conversa.')
  }

  const data = await res.json()
  const rawMessages: AgentMessage[] = Array.isArray(data) ? data : data?.messages || []
  return displayableMessages(rawMessages)
}
