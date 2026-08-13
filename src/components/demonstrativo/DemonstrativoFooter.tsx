import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, Mail, CopyPlus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DeclaracaoRecord } from '@/types'
import { duplicateDeclaracao } from '@/services/declaracoes'
import { useToast } from '@/hooks/use-toast'

interface Props {
  declaracao: DeclaracaoRecord
  clienteEmail?: string
}

export function DemonstrativoFooter({ declaracao, clienteEmail }: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [dupOpen, setDupOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)

  const handlePrint = () => window.print()

  const handleEmail = () => {
    const subject = `Demonstrativo de Cálculo IRPF — Ano ${declaracao.ano_calendario}`
    const body = `Prezado(a),\n\nSegue o demonstrativo de cálculo do IRPF para o ano-calendário ${declaracao.ano_calendario}.\n\nPara visualizar o documento completo, acesse o sistema.\n\nAtenciosamente.`
    window.location.href = `mailto:${clienteEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const newDec = await duplicateDeclaracao(declaracao.id)
      toast({ title: 'Declaração duplicada!', description: `Ano ${newDec.ano_calendario} criado.` })
      setDupOpen(false)
      navigate(`/app/declaracoes/${newDec.id}`)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao duplicar declaração.', variant: 'destructive' })
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <>
      <div className="no-print fixed bottom-16 lg:bottom-0 left-0 right-0 lg:pl-[264px] z-30 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <p className="text-xs text-slate-400 hidden sm:block">Demonstrativo de Cálculo IRPF</p>
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleEmail}>
            <Mail className="w-3.5 h-3.5" /> Enviar ao cliente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setDupOpen(true)}
          >
            <CopyPlus className="w-3.5 h-3.5" /> Duplicar para próximo ano
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handlePrint}
          >
            <FileDown className="w-3.5 h-3.5" /> Exportar PDF
          </Button>
        </div>
        <div className="sm:hidden ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white h-12 w-12 shadow-lg"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePrint} className="text-xs gap-2">
                <FileDown className="w-4 h-4" /> Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmail} className="text-xs gap-2">
                <Mail className="w-4 h-4" /> Enviar ao cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDupOpen(true)} className="text-xs gap-2">
                <CopyPlus className="w-4 h-4" /> Duplicar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar para próximo ano</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma cópia da declaração para o ano-calendário{' '}
              {declaracao.ano_calendario + 1}, com status "rascunho", incluindo fontes pagadoras,
              rendimentos, despesas, dependentes, atividades rurais e destinações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate} disabled={duplicating}>
              {duplicating ? 'Duplicando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
