import { useEffect, useState } from 'react'
import {
  Building,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Percent,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import {
  getTabelasPresumido,
  createTabelaPresumido,
  updateTabelaPresumido,
  deleteTabelaPresumido,
  getTabelaPresumidoAnoAnterior,
} from '@/services/tabelasPj'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { TabelaPresumidoRecord } from '@/types'

export function PresumidoTab() {
  const { toast } = useToast()
  const [tabelas, setTabelas] = useState<TabelaPresumidoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Dialog Form
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TabelaPresumidoRecord | null>(null)
  const [ano, setAno] = useState<string>('')
  const [atividade, setAtividade] = useState<string>('')
  const [presuncaoIrpj, setPresuncaoIrpj] = useState<string>('32.00')
  const [presuncaoCsll, setPresuncaoCsll] = useState<string>('32.00')
  const [saving, setSaving] = useState(false)
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Excluir
  const [deleteItem, setDeleteItem] = useState<TabelaPresumidoRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const data = await getTabelasPresumido()
      setTabelas(data)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar presunções do Lucro Presumido',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleOpenNovo = async () => {
    setEditingItem(null)
    const currentYear = new Date().getFullYear()
    setAno(String(currentYear))
    setAtividade('Serviços em Geral / TI / Consultoria')

    const prevTable = await getTabelaPresumidoAnoAnterior(currentYear)
    if (prevTable) {
      setPresuncaoIrpj(String(prevTable.presuncao_irpj))
      setPresuncaoCsll(String(prevTable.presuncao_csll))
      setInheritedFromAno(prevTable.ano)
    } else {
      setPresuncaoIrpj('32.00')
      setPresuncaoCsll('32.00')
      setInheritedFromAno(null)
    }
    setDialogOpen(true)
  }

  const handleOpenEdit = (item: TabelaPresumidoRecord) => {
    setEditingItem(item)
    setAno(String(item.ano))
    setAtividade(item.atividade)
    setPresuncaoIrpj(String(item.presuncao_irpj))
    setPresuncaoCsll(String(item.presuncao_csll))
    setInheritedFromAno(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(ano, 10)
    const irpjNum = parseFloat(presuncaoIrpj.replace(',', '.'))
    const csllNum = parseFloat(presuncaoCsll.replace(',', '.'))

    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano válido', variant: 'destructive' })
      return
    }
    if (!atividade.trim()) {
      toast({ title: 'Informe a atividade', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateTabelaPresumido(editingItem.id, {
          ano: anoNum,
          atividade: atividade.trim(),
          presuncao_irpj: irpjNum,
          presuncao_csll: csllNum,
        })
        toast({ title: `Presunção para "${atividade}" atualizada!` })
      } else {
        await createTabelaPresumido({
          ano: anoNum,
          atividade: atividade.trim(),
          presuncao_irpj: irpjNum,
          presuncao_csll: csllNum,
        })
        toast({ title: `Presunção para "${atividade}" cadastrada!` })
      }
      setDialogOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar presunção',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await deleteTabelaPresumido(deleteItem.id)
      toast({ title: 'Atividade excluída com sucesso!' })
      setDeleteItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir atividade',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="p-4 sm:p-5 border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Tabela de Presunções do Lucro Presumido
              </h2>
              <Badge className="bg-indigo-600 text-white border-0 text-[10px]">
                Configuração Anual
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Configure as margens de presunção para cálculo da base tributável do IRPJ e CSLL por
              atividade e ano-calendário (ex: 32% para serviços em geral, 8% para comércio e
              indústria).
            </p>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Histórico de Atividades e Presunções
          </h3>
          <p className="text-xs text-slate-500">{tabelas.length} atividade(s) cadastrada(s)</p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova atividade
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <Card className="p-5 border border-slate-200/80">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : erro ? (
        <Card className="p-10 text-center border-dashed border-rose-200 bg-rose-50/40">
          <p className="text-sm text-slate-600">Não foi possível carregar as presunções.</p>
          <Button
            onClick={carregar}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : tabelas.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Nenhuma presunção cadastrada</h4>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nova atividade
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Ano</th>
                  <th className="py-3 px-4">Atividade / Setor</th>
                  <th className="py-3 px-4 text-right">Presunção IRPJ</th>
                  <th className="py-3 px-4 text-right">Presunção CSLL</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabelas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{p.ano}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{p.atividade}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-800 border-indigo-200 font-bold"
                      >
                        {p.presuncao_irpj.toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-800 border-purple-200 font-bold"
                      >
                        {p.presuncao_csll.toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(p)}
                          className="h-8 w-8 text-slate-600 hover:text-indigo-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteItem(p)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Building className="w-5 h-5 text-indigo-600" />
                {editingItem ? 'Editar Presunção de Lucro' : 'Nova Presunção de Lucro'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Defina o percentual de presunção para IRPJ e CSLL.
              </DialogDescription>
            </DialogHeader>

            {!editingItem && inheritedFromAno && (
              <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-800">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Herança automática:</strong> Valores sugeridos do ano anterior{' '}
                  <strong>({inheritedFromAno})</strong>.
                </span>
              </div>
            )}

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="pres-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <Input
                  id="pres-ano"
                  type="number"
                  min="2020"
                  max="2100"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pres-atv" className="text-xs font-semibold text-slate-700">
                  Atividade / Descrição *
                </Label>
                <Input
                  id="pres-atv"
                  type="text"
                  value={atividade}
                  onChange={(e) => setAtividade(e.target.value)}
                  placeholder="Ex: Serviços de Engenharia e Consultoria"
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pres-irpj" className="text-xs font-semibold text-slate-700">
                    Presunção IRPJ (%) *
                  </Label>
                  <Input
                    id="pres-irpj"
                    type="number"
                    step="0.01"
                    value={presuncaoIrpj}
                    onChange={(e) => setPresuncaoIrpj(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 32% serviços / 8% comércio</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pres-csll" className="text-xs font-semibold text-slate-700">
                    Presunção CSLL (%) *
                  </Label>
                  <Input
                    id="pres-csll"
                    type="number"
                    step="0.01"
                    value={presuncaoCsll}
                    onChange={(e) => setPresuncaoCsll(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 32% serviços / 12% comércio</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingItem ? 'Salvar alterações' : 'Cadastrar presunção'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a presunção para &quot;{deleteItem?.atividade}&quot; (
              {deleteItem?.ano}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Excluir registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
