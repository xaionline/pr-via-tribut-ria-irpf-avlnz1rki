import { useEffect, useState } from 'react'
import {
  Coins,
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
  getParametros,
  createParametro,
  updateParametro,
  deleteParametro,
  getParametroAnoAnterior,
} from '@/services/altasRendas'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { AltasRendasParametroRecord } from '@/types'

function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00%'
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

export function AltasRendasTab() {
  const { toast } = useToast()
  const [parametros, setParametros] = useState<AltasRendasParametroRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Dialog Form (Criar / Editar)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AltasRendasParametroRecord | null>(null)
  const [ano, setAno] = useState<string>('')
  const [aliquota, setAliquota] = useState<string>('10.00')
  const [saving, setSaving] = useState(false)
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Excluir
  const [deleteItem, setDeleteItem] = useState<AltasRendasParametroRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const data = await getParametros()
      setParametros(data)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar parâmetros de Altas Rendas',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sugestão ao abrir modal de Novo Ano
  const handleOpenNovo = async () => {
    setEditingItem(null)
    const currentYear = new Date().getFullYear()
    const existingYears = new Set(parametros.map((p) => p.ano_calendario))
    let suggestedYear = currentYear
    if (existingYears.has(suggestedYear)) {
      suggestedYear = Math.max(...parametros.map((p) => p.ano_calendario), currentYear) + 1
    }

    setAno(String(suggestedYear))

    // Herança inteligente: buscar do ano imediatamente anterior
    const prevParam = await getParametroAnoAnterior(suggestedYear)
    if (prevParam) {
      setAliquota(String(prevParam.aliquota))
      setInheritedFromAno(prevParam.ano_calendario)
    } else {
      setAliquota('10.00')
      setInheritedFromAno(null)
    }

    setDialogOpen(true)
  }

  // Quando o usuário muda o ano no formulário de criação, recalcula herança
  const handleAnoChange = async (newAnoStr: string) => {
    setAno(newAnoStr)
    const newAnoNum = parseInt(newAnoStr, 10)
    if (!editingItem && newAnoNum && !isNaN(newAnoNum)) {
      const prevParam = await getParametroAnoAnterior(newAnoNum)
      if (prevParam && prevParam.ano_calendario !== newAnoNum) {
        setAliquota(String(prevParam.aliquota))
        setInheritedFromAno(prevParam.ano_calendario)
      }
    }
  }

  const handleOpenEdit = (item: AltasRendasParametroRecord) => {
    setEditingItem(item)
    setAno(String(item.ano_calendario))
    setAliquota(String(item.aliquota))
    setInheritedFromAno(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(ano, 10)
    const aliqNum = parseFloat(aliquota.replace(',', '.'))

    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano-calendário válido', variant: 'destructive' })
      return
    }
    if (isNaN(aliqNum) || aliqNum < 0 || aliqNum > 100) {
      toast({ title: 'Preencha uma alíquota válida (0 a 100%)', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateParametro(editingItem.id, {
          ano_calendario: anoNum,
          aliquota: aliqNum,
        })
        toast({ title: `Parâmetros do ano ${anoNum} atualizados com sucesso!` })
      } else {
        const jaExiste = parametros.some((p) => p.ano_calendario === anoNum)
        if (jaExiste) {
          toast({
            title: `Já existem parâmetros cadastrados para o ano ${anoNum}`,
            description: 'Edite o registro existente ou escolha outro ano.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await createParametro({
          ano_calendario: anoNum,
          aliquota: aliqNum,
        })
        toast({ title: `Parâmetros do ano ${anoNum} cadastrados com sucesso!` })
      }
      setDialogOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar parâmetros',
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
      await deleteParametro(deleteItem.id)
      toast({ title: `Parâmetros do ano ${deleteItem.ano_calendario} excluídos` })
      setDeleteItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir parâmetros',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <Card className="p-4 sm:p-5 border-amber-100 bg-gradient-to-br from-amber-50/70 to-orange-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-sm shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Parâmetros do Adicional de Altas Rendas (IRPF-M)
              </h2>
              <Badge className="bg-amber-600 text-white border-0 text-[10px]">
                Configuração Anual
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Configure a alíquota aplicável ao Adicional de Altas Rendas por ano-calendário (padrão
              de 10%). Ao criar um novo ano, o sistema herda os valores do ano anterior para manter
              a consistência.
            </p>
          </div>
        </div>
      </Card>

      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Histórico de Parâmetros IRPF-M</h3>
          <p className="text-xs text-slate-500">
            Total de {parametros.length}{' '}
            {parametros.length === 1 ? 'ano cadastrado' : 'anos cadastrados'}
          </p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo ano
        </Button>
      </div>

      {/* Tabela de Parâmetros */}
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
          <p className="text-sm text-slate-600">
            Não foi possível carregar os parâmetros de Altas Rendas.
          </p>
          <Button
            onClick={carregar}
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : parametros.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Nenhum ano configurado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cadastre a alíquota de Altas Rendas para o primeiro ano-calendário.
          </p>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Novo ano
          </Button>
        </Card>
      ) : (
        <>
          {/* Visualização Desktop */}
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Ano-Calendário</th>
                    <th className="py-3 px-4 text-right">Alíquota (%)</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parametros.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>{p.ano_calendario}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-300 font-bold font-mono"
                        >
                          {formatPercent(p.aliquota)}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 w-8 text-slate-600 hover:text-amber-700"
                            title="Editar parâmetros"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItem(p)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Excluir ano"
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

          {/* Visualização Mobile (Cards) */}
          <div className="md:hidden space-y-3">
            {parametros.map((p) => (
              <Card key={p.id} className="p-4 border border-slate-200/80 shadow-subtle">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm text-slate-900">Ano {p.ano_calendario}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(p)}
                      className="h-7 text-xs px-2"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteItem(p)}
                      className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 text-xs">
                  <span className="text-slate-500">Alíquota IRPF-M</span>
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-800 border-amber-300 font-bold font-mono"
                  >
                    {formatPercent(p.aliquota)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Coins className="w-5 h-5 text-amber-600" />
                {editingItem
                  ? `Editar Alíquota — Ano ${editingItem.ano_calendario}`
                  : 'Novo Ano — Altas Rendas (IRPF-M)'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {editingItem
                  ? 'Atualize a alíquota do adicional de altas rendas deste ano-calendário.'
                  : 'Defina a alíquota do adicional de altas rendas para o novo ano-calendário.'}
              </DialogDescription>
            </DialogHeader>

            {!editingItem && inheritedFromAno && (
              <div className="my-3 p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-800">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-semibold">Herança de parâmetros:</span> Alíquota sugerida
                  com base no ano anterior <strong>({inheritedFromAno})</strong>.
                </div>
              </div>
            )}

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="param-ar-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="param-ar-ano"
                    type="number"
                    min="2020"
                    max="2100"
                    disabled={!!editingItem}
                    value={ano}
                    onChange={(e) => handleAnoChange(e.target.value)}
                    placeholder="Ex: 2026"
                    className="pl-9 h-10 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="param-ar-aliquota" className="text-xs font-semibold text-slate-700">
                  Alíquota (%) *
                </Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    id="param-ar-aliquota"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={aliquota}
                    onChange={(e) => setAliquota(e.target.value)}
                    placeholder="10.00"
                    className="pl-9 h-10 text-xs font-mono tabular-nums"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">Padrão da legislação: 10,00%</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingItem ? 'Salvar alterações' : 'Cadastrar ano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir Parâmetros do Ano {deleteItem?.ano_calendario}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a configuração de alíquota de Altas Rendas para o ano{' '}
              <strong className="text-slate-800">{deleteItem?.ano_calendario}</strong>. Declarações
              deste ano passarão a utilizar o padrão (10%) ou o ano mais próximo como fallback.
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
