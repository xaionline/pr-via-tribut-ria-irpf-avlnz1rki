import { useEffect, useState } from 'react'
import { Plus, Trash2, Tractor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getAtividadesRurais,
  createAtividadeRural,
  deleteAtividadeRural,
} from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import type { AtividadeRuralRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function TabAtividadesRurais({ declaracaoId }: { declaracaoId: string }) {
  const [atividades, setAtividades] = useState<AtividadeRuralRecord[]>([])
  const [open, setOpen] = useState(false)
  const [receitaBruta, setReceitaBruta] = useState('')
  const [despesas, setDespesas] = useState('')
  const { toast } = useToast()

  const loadData = () => {
    getAtividadesRurais(declaracaoId).then(setAtividades)
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receitaBruta) return
    const receita = parseFloat(receitaBruta)
    const despesa = parseFloat(despesas) || 0
    try {
      await createAtividadeRural({
        declaracao_id: declaracaoId,
        receita_bruta: receita,
        despesas: despesa,
        resultado: receita - despesa,
      })
      toast({ title: 'Atividade rural adicionada' })
      setOpen(false)
      setReceitaBruta('')
      setDespesas('')
      loadData()
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDelete = async (id: string) => {
    await deleteAtividadeRural(id)
    toast({ title: 'Atividade rural removida' })
    loadData()
  }

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold">Atividades Rurais</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Atividade</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Nova Atividade Rural</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Receita Bruta (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={receitaBruta}
                  onChange={(e) => setReceitaBruta(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Despesas (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={despesas}
                  onChange={(e) => setDespesas(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              >
                Salvar Atividade
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhuma atividade rural informada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {atividades.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Tractor className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      Resultado: {formatCurrency(a.resultado)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Receita: {formatCurrency(a.receita_bruta)} • Despesas:{' '}
                      {formatCurrency(a.despesas)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
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
