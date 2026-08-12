import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { GlobalSearchModal } from '@/components/GlobalSearchModal'

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-subtle transition-all">
        <Breadcrumbs />

        <div className="flex items-center gap-3">
          {/* Global Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 text-slate-500 rounded-lg text-xs transition-colors border border-slate-200/60 w-44 sm:w-64"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Buscar clientes ou IRPF...</span>
            <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-400 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* New Declaration Primary CTA */}
          <Button
            onClick={() => navigate('/app/declaracoes/nova')}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm active:scale-95 transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Declaração</span>
          </Button>
        </div>
      </header>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
