import { useEffect, useState } from 'react'
import { Plus, Trash2, HeartHandshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getDestinacoes, createDestinacao, deleteDestinacao } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import type { DestinacaoFiscalRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

const tipoLabel: Record<string, string> = {
  fundo_idoso: 'Fundo do Idoso',
  fundo_crianca: 'Fundo da Criança e do Adolescente',
  incentivos: 'Incentivos Culturais/Audiovisuais',
  doacoes: 'Doações',
}

export default function TabDestinacoesFiscais({ declaracaoId }: { declaracaoId: string }) {
  const [destinacoes, setDestinacoes] = useState<DestinacaoFiscalRecord[]>([])
  const [open, setOpen] = useState(false)
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<DestinacaoFiscalRecord['tipo']>('fundo_idoso')
  const { toast } = useToast()

  const loadData = () => {
    getDestinacoes(declaracaoId).then(setDestinacoes)
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valor) return
    try {
      await createDestinacao({
        declaracao_id: declaracaoId,
        valor: parseFloat(valor),
        tipo,
      })
      toast({ title: 'Destinação adicionada' })
      setOpen(false)
      setValor('')
      setTipo('fundo_idoso')
      loadData()
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDelete = async (id: string) => {
    await deleteDestinacao(id)
    toast({ title: 'Destinação removida' })
    loadData()
  }

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold">Destinações Fiscais</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Destinação</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Nova Destinação Fiscal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fundo_idoso">Fundo do Idoso</SelectItem>
                    <SelectItem value="fundo_crianca">Fundo da Criança e do Adolescente</SelectItem>
                    <SelectItem value="incentivos">Incentivos Culturais/Audiovisuais</SelectItem>
                    <SelectItem value="doacoes">Doações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              >
                Salvar Destinação
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {destinacoes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhuma destinação fiscal informada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {destinacoes.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {tipoLabel[d.tipo] || d.tipo}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatCurrency(d.valor)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
