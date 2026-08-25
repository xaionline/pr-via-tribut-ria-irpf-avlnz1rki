import { useEffect, useState } from 'react'
import { Plus, Trash2, Banknote } from 'lucide-react'
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
import { getRendimentos, createRendimento, deleteRendimento } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import type { RendimentoRecord, FontePagadoraRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function TabRendimentos({ declaracaoId }: { declaracaoId: string }) {
  const [rendimentos, setRendimentos] = useState<RendimentoRecord[]>([])
  const [fontes, setFontes] = useState<FontePagadoraRecord[]>([])
  const [open, setOpen] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<
    'tributavel' | 'isento' | 'exclusiva' | 'dividendos' | 'exterior'
  >('tributavel')
  const [fonteId, setFonteId] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    getRendimentos(declaracaoId).then(setRendimentos)
    import('@/services/declaracoes').then(({ getFontesPagadoras }) => {
      getFontesPagadoras(declaracaoId).then(setFontes)
    })
  }, [declaracaoId])

  const loadData = () => {
    getRendimentos(declaracaoId).then(setRendimentos)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor) return
    try {
      await createRendimento({
        declaracao_id: declaracaoId,
        descricao,
        valor: parseFloat(valor),
        tipo,
        fonte_pagadora_id: fonteId || undefined,
        origem: 'manual',
      })
      toast({ title: 'Rendimento adicionado' })
      setOpen(false)
      setDescricao('')
      setValor('')
      setTipo('tributavel')
      setFonteId('')
      loadData()
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDelete = async (id: string) => {
    await deleteRendimento(id)
    toast({ title: 'Rendimento removido' })
    loadData()
  }

  const tipoLabel: Record<string, string> = {
    tributavel: 'Tributável',
    isento: 'Isento',
    exclusiva: 'Exclusiva',
    dividendos: 'Dividendos (Altas Rendas)',
    exterior: 'Receita Exterior (Altas Rendas)',
  }

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold">Rendimentos Declarados</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar rendimento</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Novo Rendimento</DialogTitle>
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
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tributavel">Tributável</SelectItem>
                      <SelectItem value="isento">Isento</SelectItem>
                      <SelectItem value="exclusiva">Exclusiva</SelectItem>
                      <SelectItem value="dividendos">Dividendos</SelectItem>
                      <SelectItem value="exterior">Receita Exterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {fontes.length > 0 && (
                <div className="space-y-1">
                  <Label>Fonte Pagadora (opcional)</Label>
                  <Select value={fonteId} onValueChange={setFonteId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fontes.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
        {rendimentos.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhum rendimento informado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {rendimentos.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">{r.descricao}</span>
                    <span className="text-[10px] text-slate-400">
                      {tipoLabel[r.tipo] || r.tipo}
                      {r.expand?.fonte_pagadora_id ? ` • ${r.expand.fonte_pagadora_id.nome}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCurrency(r.valor)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
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
