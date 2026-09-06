import { useState } from 'react'
import { Bot, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TribbyChat } from '@/components/TribbyChat'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

export function TribbyFloatingButton() {
  const [open, setOpen] = useState(false)
  const { podeAcessarIA, isTrial, isEnterprise } = useAuth()

  return (
    <>
      {/* Botão Flutuante (desktop e mobile) */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center">
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-200 active:scale-95',
            'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-indigo-500/25',
            'border border-white/20',
          )}
          aria-label="Abrir Assistente IA Tribby"
          title="Assistente IA Tribby (Consultor Tributário & Suporte)"
        >
          {/* Badge pulsante ou indicativo */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          </span>

          <Bot className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-200" />

          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-none flex items-center gap-1">
              Tribby IA
              <Sparkles className="w-3 h-3 text-amber-300 inline" />
            </span>
            <span className="text-[10px] text-purple-200 leading-none mt-0.5">
              {podeAcessarIA ? (isTrial ? 'Trial 14d' : 'Enterprise') : 'Consultor IA'}
            </span>
          </div>
        </button>
      </div>

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
