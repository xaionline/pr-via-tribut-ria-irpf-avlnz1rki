import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TribbyChat } from '@/components/TribbyChat'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface Position {
  x: number
  y: number
}

const STORAGE_KEY = 'tribby_button_position_v1'
const DRAG_THRESHOLD = 6 // pixels mínimos para diferenciar clique de arrasto
const PADDING = 12 // margem mínima das bordas da tela

export function TribbyFloatingButton() {
  const [open, setOpen] = useState(false)
  const { podeAcessarIA, isTrial } = useAuth()

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Referências para controle de arrasto sem re-render excessivo
  const dragRef = useRef<{
    startX: number
    startY: number
    initialBtnX: number
    initialBtnY: number
    pointerId: number | null
    hasMoved: boolean
  }>({
    startX: 0,
    startY: 0,
    initialBtnX: 0,
    initialBtnY: 0,
    pointerId: null,
    hasMoved: false,
  })

  // Calcula posição padrão na tela:
  // Desktop: bottom-6 (24px) centralizado
  // Mobile (< 1024px): bottom-[76px] centralizado
  const getDefaultPosition = useCallback((btnWidth = 170, btnHeight = 48): Position => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const isMobile = vw < 1024
    const bottomOffset = isMobile ? 76 : 24
    const x = Math.max(PADDING, Math.min(vw - btnWidth - PADDING, (vw - btnWidth) / 2))
    const y = Math.max(PADDING, Math.min(vh - btnHeight - PADDING, vh - btnHeight - bottomOffset))
    return { x, y }
  }, [])

  // Garante que uma posição esteja contida dentro da viewport atual
  const clampPosition = useCallback((pos: Position, btnWidth = 170, btnHeight = 48): Position => {
    if (typeof window === 'undefined') return pos
    const vw = window.innerWidth
    const vh = window.innerHeight
    const maxX = Math.max(PADDING, vw - btnWidth - PADDING)
    const maxY = Math.max(PADDING, vh - btnHeight - PADDING)
    return {
      x: Math.max(PADDING, Math.min(maxX, pos.x)),
      y: Math.max(PADDING, Math.min(maxY, pos.y)),
    }
  }, [])

  // Inicialização e recuperação de posição salva
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadSavedPosition = () => {
      const btn = buttonRef.current
      const width = btn ? btn.offsetWidth : 170
      const height = btn ? btn.offsetHeight : 48

      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Position
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const clamped = clampPosition(parsed, width, height)
            setPosition(clamped)
            return
          }
        }
      } catch {
        // Ignora erro de parsing e usa o padrão
      }

      setPosition(getDefaultPosition(width, height))
    }

    loadSavedPosition()

    // Ajusta posição quando a janela for redimensionada ou rotacionada
    const handleResize = () => {
      const btn = buttonRef.current
      const width = btn ? btn.offsetWidth : 170
      const height = btn ? btn.offsetHeight : 48
      setPosition((prev) => {
        if (!prev) return getDefaultPosition(width, height)
        return clampPosition(prev, width, height)
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampPosition, getDefaultPosition])

  // Handlers do Pointer Drag
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Permite apenas clique primário (botão esquerdo do mouse ou toque)
    if (e.button !== 0) return

    const btn = buttonRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialBtnX: rect.left,
      initialBtnY: rect.top,
      pointerId: e.pointerId,
      hasMoved: false,
    }

    btn.setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return

    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY

    // Se o deslocamento ultrapassou o limiar de arrasto
    if (!dragRef.current.hasMoved) {
      if (Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
        dragRef.current.hasMoved = true
      }
    }

    if (dragRef.current.hasMoved) {
      const btn = buttonRef.current
      const width = btn ? btn.offsetWidth : 170
      const height = btn ? btn.offsetHeight : 48

      const nextX = dragRef.current.initialBtnX + deltaX
      const nextY = dragRef.current.initialBtnY + deltaY

      const clamped = clampPosition({ x: nextX, y: nextY }, width, height)
      setPosition(clamped)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return

    const btn = buttonRef.current
    if (btn && btn.hasPointerCapture(e.pointerId)) {
      try {
        btn.releasePointerCapture(e.pointerId)
      } catch {
        // Ignora caso já liberado
      }
    }

    const hadMoved = dragRef.current.hasMoved
    dragRef.current.pointerId = null
    setIsDragging(false)

    // Se foi arrasto, salva no localStorage e realiza snap suave se estiver muito perto das bordas laterais (< 40px)
    if (hadMoved && position) {
      const width = btn ? btn.offsetWidth : 170
      const height = btn ? btn.offsetHeight : 48
      const vw = window.innerWidth
      let finalX = position.x

      // Snap suave para borda esquerda ou direita se soltar muito perto da margem (< 32px)
      if (finalX < PADDING + 32) {
        finalX = PADDING
      } else if (finalX > vw - width - PADDING - 32) {
        finalX = vw - width - PADDING
      }

      const finalPos = clampPosition({ x: finalX, y: position.y }, width, height)
      setPosition(finalPos)

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos))
      } catch {
        // Fallback silencioso para erro de quota/armazenamento restrito
      }
    } else {
      // Se não moveu além da tolerância, aciona a abertura do chat (comportamento de clique)
      setOpen(true)
    }
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId === e.pointerId) {
      const btn = buttonRef.current
      if (btn && btn.hasPointerCapture(e.pointerId)) {
        try {
          btn.releasePointerCapture(e.pointerId)
        } catch {
          // Ignora
        }
      }
      dragRef.current.pointerId = null
      setIsDragging(false)
    }
  }

  return (
    <>
      {/* Botão Flutuante Arrastável (Mouse & Touch) */}
      <button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={
          position
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none',
              }
            : {
                // Estilo inicial antes do primeiro cálculo (fallback elegante no centro inferior)
                bottom: '76px',
                left: '50%',
                transform: 'translateX(-50%)',
                touchAction: 'none',
              }
        }
        className={cn(
          'fixed z-40 select-none',
          'group flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl',
          'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white',
          'hover:from-purple-700 hover:to-indigo-700 hover:shadow-indigo-500/25',
          'border border-white/20',
          isDragging
            ? 'cursor-grabbing scale-105 shadow-purple-500/40 ring-2 ring-purple-300/40'
            : 'cursor-grab transition-[box-shadow,transform] duration-200 active:scale-95',
        )}
        aria-label="Abrir Assistente IA Tribby (arraste para reposicionar)"
        title="Assistente IA Tribby (Clique para abrir, arraste para mover)"
      >
        {/* Badge pulsante ou indicativo */}
        <span className="relative flex h-3 w-3 shrink-0 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
        </span>

        <Bot className="w-5 h-5 text-white shrink-0 group-hover:rotate-12 transition-transform duration-200 pointer-events-none" />

        <div className="flex flex-col text-left pointer-events-none">
          <span className="text-xs font-black tracking-tight leading-none flex items-center gap-1">
            Tribby IA
            <Sparkles className="w-3 h-3 text-amber-300 inline shrink-0" />
          </span>
          <span className="text-[10px] text-purple-200 leading-none mt-0.5 whitespace-nowrap">
            {podeAcessarIA ? (isTrial ? 'Trial 14d' : 'Enterprise') : 'Consultor IA'}
          </span>
        </div>
      </button>

      {/* Sheet / Drawer lateral para o chat flutuante */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full border-l border-slate-200 shadow-2xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Assistente Tributário Tribby</SheetTitle>
          </SheetHeader>
          <div className="flex-1 h-full min-h-0">
            <TribbyChat showHistorySidebar={false} onClose={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
