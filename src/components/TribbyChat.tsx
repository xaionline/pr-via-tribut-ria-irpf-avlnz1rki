import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  Lock,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Shield,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import {
  sendTribbyMessageStream,
  listTribbyConversations,
  getTribbyConversationMessages,
  type ConversationItem,
} from '@/services/agentTribby'
import type { DisplayMessage, AgentCitation } from '@/lib/skipAi'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AgentCitation[]
  created?: string
  streaming?: boolean
}

const SUGESTOES_INICIAIS = [
  'Como calcular o Fator R de uma empresa no Simples Nacional?',
  'Quais são as diferenças de dedução entre declaração completa e simplificada?',
  'Como funciona a apuração de Altas Rendas (IRPF-M)?',
  'Quais as obrigações acessórias obrigatórias para Lucro Presumido?',
]

interface TribbyChatProps {
  /** Se deve exibir o histórico lateral de conversas (para tela cheia) */
  showHistorySidebar?: boolean
  className?: string
  /** Executado ao clicar em fechar quando dentro de um modal/drawer */
  onClose?: () => void
}

export function TribbyChat({ showHistorySidebar = false, className, onClose }: TribbyChatProps) {
  const { podeAcessarIA, isTrial, isEnterprise, escritorio, user } = useAuth()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Eu sou o **Tribby**, seu consultor tributário e suporte inteligente. Estou conectado aos dados do seu escritório para tirar dúvidas fiscais (clientes PF, empresas PJ, Fator R, regimes e obrigações) e te ajudar a operar o sistema. Como posso te auxiliar hoje?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carrega histórico de conversas se o usuário puder acessar o assistente
  useEffect(() => {
    if (podeAcessarIA && showHistorySidebar) {
      loadConversations()
    }
  }, [podeAcessarIA, showHistorySidebar])

  const loadConversations = async () => {
    try {
      setLoadingHistory(true)
      const list = await listTribbyConversations(20)
      setConversations(list)
    } catch (_) {
      // Ignora erro
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSelectConversation = async (convId: string) => {
    if (loading || convId === conversationId) return
    try {
      setLoading(true)
      setConversationId(convId)
      const history = await getTribbyConversationMessages(convId)
      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            citations: m.citations,
            created: m.created,
          })),
        )
      }
    } catch (err) {
      console.error('Falha ao carregar conversa:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewConversation = () => {
    if (loading) return
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setConversationId(null)
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content:
          'Nova conversa iniciada. Sobre o que você deseja conversar? Pode me perguntar sobre cálculos de impostos, clientes, empresas ou navegação no sistema.',
      },
    ])
    inputRef.current?.focus()
  }

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || input
    const cleanText = rawText.trim()
    if (!cleanText || loading) return

    // Limpa input
    setInput('')

    // Monta mensagens otimistas
    const userMsgId = 'user-' + Date.now()
    const assistantMsgId = 'assistant-' + Date.now()

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        content: cleanText,
        created: new Date().toISOString(),
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        streaming: true,
      },
    ]

    setMessages(newMessages)
    setLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const result = await sendTribbyMessageStream(cleanText, conversationId, {
        onChunk: (_delta, full) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: full, streaming: true } : msg,
            ),
          )
        },
        onCitations: (citations) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, citations } : msg)),
          )
        },
        signal: controller.signal,
      })

      // Atualiza o ID da conversa persistida pelo agente
      if (result.conversationId) {
        setConversationId(result.conversationId)
        if (showHistorySidebar) {
          loadConversations()
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: result.content || msg.content,
                citations: result.citations || msg.citations,
                streaming: false,
              }
            : msg,
        ),
      )
    } catch (err: any) {
      if (controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + ' *(interrompido)*', streaming: false }
              : msg,
          ),
        )
        return
      }

      const errorMessage =
        err?.message || 'Ocorreu um erro ao consultar o assistente. Tente novamente em instantes.'

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `⚠️ **Não foi possível obter a resposta**: ${errorMessage}`,
                streaming: false,
              }
            : msg,
        ),
      )
    } finally {
      setLoading(false)
      abortControllerRef.current = null
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // SE NÃO TIVER ACESSO (plano starter ou pro ativo sem trial):
  if (!podeAcessarIA) {
    const planoAtual = (escritorio?.plano || 'starter').toUpperCase()
    return (
      <div className={cn('flex flex-col h-full bg-slate-50', className)}>
        <div className="p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Tribby - Assistente IA</h3>
                <Badge className="bg-amber-400 text-slate-900 border-0 text-[10px] font-black uppercase">
                  Enterprise
                </Badge>
              </div>
              <p className="text-[11px] text-purple-100">Consultoria tributária nativa</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 text-xs h-8"
            >
              Fechar
            </Button>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <Badge
                variant="outline"
                className="text-xs border-indigo-300 text-indigo-700 font-bold"
              >
                Recurso Exclusivo Plano Enterprise
              </Badge>
              <h4 className="text-lg font-black text-slate-900">
                Assistente de Inteligência Artificial
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seu escritório está no plano <strong>{planoAtual}</strong>. O Tribby é o assistente
                nativo treinado na legislação tributária brasileira e conectado com segurança aos
                dados do seu escritório.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-4 text-left space-y-2 text-xs text-slate-700 shadow-sm">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Vantagens do Tribby no Enterprise:
              </p>
              <ul className="space-y-1 pl-4 list-disc text-slate-600">
                <li>Responde dúvidas sobre Fator R e Anexos III vs V</li>
                <li>Compara regimes de empresas cadastradas</li>
                <li>Explica deduções e dados de declarações IRPF</li>
                <li>Dúvidas e suporte em tempo real 24/7 dentro do app</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                asChild
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs gap-1.5 h-10 shadow-sm"
              >
                <Link to="/app/planos" onClick={onClose}>
                  <span>Fazer upgrade para o Enterprise</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Disponível também durante os 14 dias de teste grátis (trial) de novos escritórios.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full bg-white overflow-hidden', className)}>
      {/* Sidebar de Histórico de Conversas (quando solicitado) */}
      {showHistorySidebar && (
        <div className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-slate-50">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Conversas
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              className="h-7 text-xs gap-1 border-slate-300"
              title="Nova conversa"
            >
              <Plus className="w-3 h-3" />
              <span>Nova</span>
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            {loadingHistory ? (
              <div className="flex items-center justify-center p-4 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center p-4 text-xs text-slate-400">
                Nenhuma conversa anterior
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center gap-2 truncate',
                      conversationId === conv.id
                        ? 'bg-purple-100 text-purple-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-200/60',
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="truncate flex-1">
                      {conv.title || `Conversa ${conv.id.slice(0, 6)}...`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Janela Principal de Chat */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50/50">
        {/* Cabeçalho do Chat */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white truncate">Tribby</h3>
                <Badge className="bg-amber-400 text-slate-900 border-0 text-[10px] font-black uppercase tracking-wider py-0">
                  {isTrial ? 'Trial 14d' : 'Enterprise'}
                </Badge>
              </div>
              <p className="text-[11px] text-purple-100 truncate">
                Consultor Tributário & Suporte do App
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="text-white hover:bg-white/20 text-xs h-8 px-2.5 gap-1.5"
              title="Iniciar nova conversa"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 text-xs h-8 px-2.5"
              >
                ✕
              </Button>
            )}
          </div>
        </div>

        {/* Banner informativo de escopo */}
        <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-[11px] text-indigo-900 shrink-0">
          <span className="flex items-center gap-1.5 truncate">
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            Isolamento ativo: dados exclusivos do escritório{' '}
            <strong>{escritorio?.nome || 'seu escritório'}</strong>
          </span>
          <span className="text-[10px] text-indigo-500 hidden sm:inline">IA Nativa Skip Cloud</span>
        </div>

        {/* Lista de Mensagens */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user'

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex items-start gap-2.5 max-w-2xl',
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5',
                    isUser
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white',
                  )}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={cn(
                    'rounded-2xl p-3 sm:p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-sm transition-all',
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none',
                  )}
                >
                  {/* Conteúdo formatado com suporte básico a markdown */}
                  <div className="whitespace-pre-wrap break-words space-y-1">
                    {formatMessageContent(msg.content)}
                  </div>

                  {/* Estado de streaming com indicador pulsante */}
                  {msg.streaming && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-purple-600 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      digitando...
                    </span>
                  )}

                  {/* Citações / Fontes retornadas pelo agente */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Fontes consultadas:
                      </p>
                      <div className="space-y-1">
                        {msg.citations.map((c) => (
                          <div
                            key={c.chunk_id || c.n}
                            className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-600"
                          >
                            <span className="font-bold text-purple-700">[{c.n}]</span> {c.excerpt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Sugestões de perguntas quando só tiver a mensagem de boas-vindas */}
          {messages.length === 1 && (
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Sugestões de perguntas rápidas:
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGESTOES_INICIAIS.map((sugestao, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(sugestao)}
                    className="p-2.5 rounded-xl border border-indigo-200/80 bg-white hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-900 text-left text-xs transition-all shadow-xs flex items-start gap-2 group"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{sugestao}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Rodapé com Campo de Entrada */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Pergunte ao Tribby sobre tributos, empresas, IRPF ou o app..."
              className="flex-1 text-xs sm:text-sm h-10 bg-slate-50 border-slate-300 focus-visible:ring-purple-500"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-10 px-4 shrink-0 shadow-sm gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            O Tribby é um assistente de IA para suporte contábil. Sempre confira dados críticos com
            a legislação vigente.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Auxiliar para renderizar formatação simples de negrito (*texto*)
 */
function formatMessageContent(text: string) {
  if (!text) return null
  const parts = text.split('\n')
  return parts.map((line, lIdx) => {
    // Processa negrito simples **texto**
    const boldRegex = /\*\*(.*?)\*\*/g
    const lineParts = []
    let lastIndex = 0
    let match

    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        lineParts.push(line.substring(lastIndex, match.index))
      }
      lineParts.push(
        <strong key={`b-${lIdx}-${match.index}`} className="font-bold text-slate-900">
          {match[1]}
        </strong>,
      )
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < line.length) {
      lineParts.push(line.substring(lastIndex))
    }

    return (
      <span key={lIdx} className="block min-h-[1.1em]">
        {lineParts.length > 0 ? lineParts : line}
      </span>
    )
  })
}
