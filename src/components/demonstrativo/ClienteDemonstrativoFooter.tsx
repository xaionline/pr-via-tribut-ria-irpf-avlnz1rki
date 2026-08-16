import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DeclaracaoRecord } from '@/types'

interface Props {
  declaracao: DeclaracaoRecord
}

/** Rodapé do demonstrativo em modo cliente — apenas exportar PDF. */
export function ClienteDemonstrativoFooter({ declaracao }: Props) {
  const handlePrint = () => window.print()

  return (
    <div className="no-print fixed bottom-16 lg:bottom-0 left-0 right-0 lg:pl-[264px] z-30 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
      <p className="text-xs text-slate-400 hidden sm:block">
        Demonstrativo de Cálculo IRPF — Ano {declaracao.ano_calendario}
      </p>
      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={handlePrint}
        >
          <FileDown className="w-3.5 h-3.5" /> Exportar PDF
        </Button>
      </div>
    </div>
  )
}
