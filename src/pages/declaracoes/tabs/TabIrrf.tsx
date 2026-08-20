import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, ShieldCheck, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  getIrrfRecords,
  createIrrfRecord,
  updateIrrfRecord,
  deleteIrrfRecord,
} from '@/services/declaracoes'
import { formatCurrency, maskCnpj } from '@/lib/formatters'
import type { IrrfRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface TabIrrfProps {
  declaracaoId: string
  isVisualizador?: boolean
}

export default function TabIrrf({ declaracaoId, isVisualizador = false }: TabIrrfProps) {
  const [items, setItems] = useState<IrrfRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<IrrfRecord | null>(null)
  const [fontePagadora, setFontePagadora] = useState('')
  const [cnpjFonte, setCnpjFonte] = useState('')
  const [valor, setValor] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const records = await getIrrfRecords(declaracaoId)
      setItems(records)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const openCreateDialog = () => {
    setEditingItem(null)
    setFontePagadora('')
    setCnpjFonte('')
    setValor('')
    setOpen(true)
  }

  const openEditDialog = (item: IrrfRecord) => {
    setEditingItem(item)
    setFontePagadora(item.fonte_pagadora)
    setCnpjFonte(item.cnpj_fonte ? maskCnpj(item.cnpj_fonte) : '')
    setValor(item.valor.toString())
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fontePagadora.trim() || !valor) return

    const numValor = parseFloat(valor.replace(',', '.'))
    if (isNaN(numValor) || numValor <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor positivo maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateIrrfRecord(editingItem.id, {
          fonte_pagadora: fontePagadora.trim(),
          cnpj_fonte: cnpjFonte.trim() || undefined,
          valor: numValor,
        })
        toast({ title: 'IRRF atualizado com sucesso' })
      } else {
        await createIrrfRecord({
          declaracao_id: declaracaoId,
          fonte_pagadora: fontePagadora.trim(),
          cnpj_fonte: cnpjFonte.trim() || undefined,
          valor: numValor,
        })
        toast({ title: 'IRRF cadastrado com sucesso' })
      }
      setOpen(false)
      loadData()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados do IRRF.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (isVisualizador) return
    try {
      await deleteIrrfRecord(id)
      toast({ title: 'Registro de IRRF excluído' })
      loadData()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o registro.',
        variant: 'destructive',
      })
    }
  }

  const totalIrrf = items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0)

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Imposto de Renda Retido na Fonte (IRRF)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Cadastre os valores de IRRF retidos pelas fontes pagadoras no ano-calendário
          </CardDescription>
        </div>
        {!isVisualizador && (
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar IRRF</span>
          </Button>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                {editingItem ? 'Editar IRRF Retido' : 'Novo IRRF Retido'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Informe a fonte pagadora e o montante retido a título de IRRF.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="fonte_pagadora">Nome da Fonte Pagadora *</Label>
                <Input
                  id="fonte_pagadora"
                  placeholder="Ex: Empresa ABC Ltda / Banco do Brasil"
                  value={fontePagadora}
                  onChange={(e) => setFontePagadora(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cnpj_fonte">CNPJ da Fonte Pagadora</Label>
                <Input
                  id="cnpj_fonte"
                  placeholder="00.000.000/0000-00"
                  value={cnpjFonte}
                  onChange={(e) => setCnpjFonte(maskCnpj(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="valor_irrf">Valor do Imposto Retido (R$) *</Label>
                <Input
                  id="valor_irrf"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading && items.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">Carregando registros...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Landmark className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Nenhum IRRF cadastrado</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Adicione os informes de rendimentos com os impostos retidos na fonte para abater do
              imposto devido.
            </p>
            {!isVisualizador && (
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                className="mt-4 text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar primeiro IRRF
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 text-xs">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg flex-shrink-0">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 block truncate">
                        {item.fonte_pagadora}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        CNPJ: {item.cnpj_fonte ? maskCnpj(item.cnpj_fonte) : 'Não informado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-mono font-semibold text-slate-900 text-sm">
                      {formatCurrency(item.valor)}
                    </span>
                    {!isVisualizador && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-800"
                          onClick={() => openEditDialog(item)}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDelete(item.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totalizador no rodapé da lista */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Total IRRF Retido na Fonte
                </span>
                <span className="text-[11px] text-slate-400">
                  ({items.length} {items.length === 1 ? 'registro' : 'registros'})
                </span>
              </div>
              <span className="font-mono font-bold text-base text-emerald-700">
                {formatCurrency(totalIrrf)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
