import { useState, useEffect, useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { buscarNoticiasReceitaFederal, type NoticiaTributaria } from '@/services/noticiasRss'

const SESSION_DISMISS_KEY = 'irpf_ticker_noticias_rfb_hidden'

export function TickerNoticias() {
  const [noticias, setNoticias] = useState<NoticiaTributaria[]>([])
  const [oculto, setOculto] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isPaused, setIsPaused] = useState(false)
  const [origem, setOrigem] = useState<'feed_ao_vivo' | 'curadas_oficiais'>('curadas_oficiais')
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (oculto) return

    let isMounted = true

    buscarNoticiasReceitaFederal()
      .then((res) => {
        if (!isMounted) return
        if (res && res.noticias && res.noticias.length > 0) {
          // Limita a no máximo 8 manchetes conforme especificação
          setNoticias(res.noticias.slice(0, 8))
          setOrigem(res.origem)
        } else {
          setNoticias([])
        }
      })
      .catch(() => {
        if (isMounted) setNoticias([])
      })

    return () => {
      isMounted = false
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    }
  }, [oculto])

  const handleDismiss = () => {
    setOculto(true)
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true')
    } catch {
      // Ignora erro de sessionStorage se restrito
    }
  }

  // Tratamento de toque no mobile para pausar temporariamente (ou toggle de pausa)
  const handleTouchStart = () => {
    setIsPaused(true)
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
  }

  const handleTouchEnd = () => {
    // Retoma após 3 segundos do toque para permitir leitura confortável
    touchTimerRef.current = setTimeout(() => {
      setIsPaused(false)
    }, 3000)
  }

  // Se o usuário ocultou ou se a busca falhou silenciosamente / vazia, não renderiza nada
  if (oculto || noticias.length === 0) {
    return null
  }

  // Trunca título em ~80 caracteres se necessário
  const formatTitulo = (titulo: string) => {
    const limpo = titulo.trim()
    if (limpo.length <= 82) return limpo
    return `${limpo.slice(0, 80).trim()}...`
  }

  return (
    <div
      role="region"
      aria-label="Notícias da Receita Federal"
      className="relative w-full h-8 min-h-[32px] max-h-8 bg-slate-900 text-slate-300 border border-slate-800/80 rounded-lg flex items-center overflow-hidden select-none shadow-none text-xs"
    >
      {/* Selo Fixo "Receita Federal" com indicador de status */}
      <div className="shrink-0 z-10 flex items-center gap-1.5 h-full px-2.5 sm:px-3 bg-slate-950/95 border-r border-slate-800 text-[11px] font-semibold text-slate-200 tracking-tight">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            origem === 'feed_ao_vivo'
              ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
              : 'bg-emerald-500'
          }`}
          title={origem === 'feed_ao_vivo' ? 'Feed RFB ao vivo' : 'Boletim Oficial RFB'}
        />
        <span className="whitespace-nowrap font-medium text-slate-100">Receita Federal</span>
      </div>

      {/* Área deslizante do ticker */}
      <div
        className="flex-1 overflow-hidden relative h-full flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex items-center whitespace-nowrap text-[12px] text-slate-300 font-normal leading-none"
          style={{
            animation: 'rfb-marquee 84s linear infinite',
            animationPlayState: isPaused ? 'paused' : 'running',
            willChange: 'transform',
          }}
        >
          {/* Primeiro bloco de manchetes */}
          {noticias.map((item, idx) => (
            <div key={`n1-${item.id || idx}`} className="inline-flex items-center">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                title={item.titulo}
                className="inline-flex items-center gap-1 px-2.5 text-slate-300 hover:text-emerald-400 hover:underline transition-colors"
              >
                <span>{formatTitulo(item.titulo)}</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-60 inline shrink-0" />
              </a>
              <span className="text-slate-600 px-1 font-bold select-none">•</span>
            </div>
          ))}

          {/* Bloco duplicado para garantir transição suave e contínua do letreiro */}
          {noticias.map((item, idx) => (
            <div key={`n2-${item.id || idx}`} className="inline-flex items-center">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                title={item.titulo}
                className="inline-flex items-center gap-1 px-2.5 text-slate-300 hover:text-emerald-400 hover:underline transition-colors"
              >
                <span>{formatTitulo(item.titulo)}</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-60 inline shrink-0" />
              </a>
              <span className="text-slate-600 px-1 font-bold select-none">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Botão discreto para ocultar a faixa pelo resto da sessão */}
      <div className="shrink-0 z-10 h-full flex items-center pr-1.5 pl-1 bg-slate-950/95 border-l border-slate-800">
        <button
          type="button"
          onClick={handleDismiss}
          title="Ocultar notícias nesta sessão"
          aria-label="Ocultar notícias da Receita Federal nesta sessão"
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Keyframe scoped para o letreiro */}
      <style>{`
        @keyframes rfb-marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
