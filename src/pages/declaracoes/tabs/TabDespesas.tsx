import { useEffect, useState } from 'react'
import { Plus, Trash2, Receipt } from 'lucide-react'
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
import { getDespesas, createDespesa, deleteDespesa } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import { InlineLimitAlerts } from '@/components/InlineLimitAlerts'
import type { DespesaDedutivelRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

const categoriaLabel: Record<string, string> = {
  saude: 'Saúde',
  educacao: 'Educação',
  previdencia: 'Previdência',
  pensao: 'Pensão Alimentícia',
  dependentes: 'Dependentes',
  outras: 'Outras',
}

export default function TabDespesas({ declaracaoId }: { declaracaoId: string }) {
  const [despesas, setDespesas] = useState<DespesaDedutivelRecord[]>([])
  const [open, setOpen] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<DespesaDedutivelRecord['categoria']>('saude')
  const { toast } = useToast()

  const loadData = () => {
    getDespesas(declaracaoId).then(setDespesas)
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor) return
    try {
      await createDespesa({
        declaracao_id: declaracaoId,
        descricao,
        valor: parseFloat(valor),
        categoria,
      })
      toast({ title: 'Despesa adicionada' })
      setOpen(false)
      setDescricao('')
      setValor('')
      setCategoria('saude')
      loadData()
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDelete = async (id: string) => {
    await deleteDespesa(id)
    toast({ title: 'Despesa removida' })
    loadData()
  }

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold">Despesas Dedutíveis</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar despesa</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Nova Despesa Dedutível</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Descrição *</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="educacao">Educação</SelectItem>
                      <SelectItem value="previdencia">Previdência</SelectItem>
                      <SelectItem value="pensao">Pensão Alimentícia</SelectItem>
                      <SelectItem value="dependentes">Dependentes</SelectItem>
                      <SelectItem value="outras">Outras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              >
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <InlineLimitAlerts declaracaoId={declaracaoId} refreshKey={despesas.length} />
        {despesas.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhuma despesa dedutível informada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {despesas.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">{d.descricao}</span>
                    <span className="text-[10px] text-slate-400">
                      {categoriaLabel[d.categoria] || d.categoria}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCurrency(d.valor)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
