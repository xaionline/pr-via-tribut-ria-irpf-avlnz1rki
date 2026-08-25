import { useEffect, useState } from 'react'
import {
  Calculator,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Percent,
  TrendingDown,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
  getIbsCbsParametros,
  createIbsCbsParametro,
  updateIbsCbsParametro,
  deleteIbsCbsParametro,
  calcularIvaReduzido,
  getParametroAnoAnterior,
} from '@/services/ibsCbs'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { IbsCbsParametroRecord } from '@/types'

function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00%'
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

export function IbsCbsTab() {
  const { toast } = useToast()
  const [parametros, setParametros] = useState<IbsCbsParametroRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Dialog Form (Criar / Editar)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<IbsCbsParametroRecord | null>(null)
  const [ano, setAno] = useState<string>('')
  const [ivaPadrao, setIvaPadrao] = useState<string>('27.91')
  const [reducaoPercentual, setReducaoPercentual] = useState<string>('60.00')
  const [presuncaoBc, setPresuncaoBc] = useState<string>('20.00')
  const [funrural, setFunrural] = useState<string>('1.63')
  const [saving, setSaving] = useState(false)
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Excluir
  const [deleteItem, setDeleteItem] = useState<IbsCbsParametroRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const data = await getIbsCbsParametros()
      setParametros(data)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar parâmetros IBS/CBS',
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
    // Encontra o próximo ano que ainda não existe na lista
    const existingYears = new Set(parametros.map((p) => p.ano_calendario))
    let suggestedYear = currentYear
    if (existingYears.has(suggestedYear)) {
      suggestedYear = Math.max(...parametros.map((p) => p.ano_calendario), currentYear) + 1
    }

    setAno(String(suggestedYear))

    // Herança inteligente: buscar do ano imediatamente anterior
    const prevParam = await getParametroAnoAnterior(suggestedYear)
    if (prevParam) {
      setIvaPadrao(String(prevParam.iva_padrao))
      setReducaoPercentual(String(prevParam.reducao_percentual))
      setPresuncaoBc(String(prevParam.presuncao_bc))
      setFunrural(String(prevParam.funrural))
      setInheritedFromAno(prevParam.ano_calendario)
    } else {
      setIvaPadrao('27.91')
      setReducaoPercentual('60.00')
      setPresuncaoBc('20.00')
      setFunrural('1.63')
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
        setIvaPadrao(String(prevParam.iva_padrao))
        setReducaoPercentual(String(prevParam.reducao_percentual))
        setPresuncaoBc(String(prevParam.presuncao_bc))
        setFunrural(String(prevParam.funrural))
        setInheritedFromAno(prevParam.ano_calendario)
      }
    }
  }

  const handleOpenEdit = (item: IbsCbsParametroRecord) => {
    setEditingItem(item)
    setAno(String(item.ano_calendario))
    setIvaPadrao(String(item.iva_padrao))
    setReducaoPercentual(String(item.reducao_percentual))
    setPresuncaoBc(String(item.presuncao_bc))
    setFunrural(String(item.funrural))
    setInheritedFromAno(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(ano, 10)
    const ivaNum = parseFloat(ivaPadrao.replace(',', '.'))
    const redNum = parseFloat(reducaoPercentual.replace(',', '.'))
    const bcNum = parseFloat(presuncaoBc.replace(',', '.'))
    const funNum = parseFloat(funrural.replace(',', '.'))

    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano-calendário válido', variant: 'destructive' })
      return
    }
    if (isNaN(ivaNum) || isNaN(redNum) || isNaN(bcNum) || isNaN(funNum)) {
      toast({ title: 'Preencha todos os campos com números válidos', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateIbsCbsParametro(editingItem.id, {
          ano_calendario: anoNum,
          iva_padrao: ivaNum,
          reducao_percentual: redNum,
          presuncao_bc: bcNum,
          funrural: funNum,
        })
        toast({ title: `Parâmetros do ano ${anoNum} atualizados com sucesso!` })
      } else {
        // Verificar duplicidade localmente para feedback mais rápido
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

        await createIbsCbsParametro({
          ano_calendario: anoNum,
          iva_padrao: ivaNum,
          reducao_percentual: redNum,
          presuncao_bc: bcNum,
          funrural: funNum,
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
      await deleteIbsCbsParametro(deleteItem.id)
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

  // IVA Reduzido preview no modal
  const previewIvaPadrao = parseFloat(ivaPadrao.replace(',', '.')) || 0
  const previewReducao = parseFloat(reducaoPercentual.replace(',', '.')) || 0
  const previewIvaReduzido = calcularIvaReduzido(previewIvaPadrao, previewReducao)

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <Card className="p-4 sm:p-5 border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Parâmetros Fiscais da Reforma Tributária (IBS / CBS)
              </h2>
              <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                Registro Anual
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Configure as alíquotas de IVA Padrão, Redução para Produtor Rural, Presunção da Base
              de Cálculo e Funrural por ano-calendário. Ao criar um novo ano, o sistema herda
              automaticamente os valores do ano anterior para facilitar a manutenção.
            </p>
          </div>
        </div>
      </Card>

      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Histórico de Parâmetros Anuais</h3>
          <p className="text-xs text-slate-500">
            Total de {parametros.length}{' '}
            {parametros.length === 1 ? 'ano cadastrado' : 'anos cadastrados'}
          </p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
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
            Não foi possível carregar os parâmetros de IBS/CBS.
          </p>
          <Button
            onClick={carregar}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : parametros.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Nenhum ano configurado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cadastre os parâmetros fiscais de IBS/CBS para o primeiro ano-calendário.
          </p>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
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
                    <th className="py-3 px-4 text-right">IVA Padrão</th>
                    <th className="py-3 px-4 text-right">Redução %</th>
                    <th className="py-3 px-4 text-right">IVA Reduzido (Calculado)</th>
                    <th className="py-3 px-4 text-right">Presunção BC</th>
                    <th className="py-3 px-4 text-right">Funrural</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parametros.map((p) => {
                    const ivaReduzido = calcularIvaReduzido(p.iva_padrao, p.reducao_percentual)
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span>{p.ano_calendario}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {formatPercent(p.iva_padrao)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          <span className="text-emerald-700 font-medium">
                            {formatPercent(p.reducao_percentual)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                          >
                            {formatPercent(ivaReduzido)}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {formatPercent(p.presuncao_bc)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {formatPercent(p.funrural)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(p)}
                              className="h-8 w-8 text-slate-600 hover:text-emerald-700"
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Visualização Mobile (Cards) */}
          <div className="md:hidden space-y-3">
            {parametros.map((p) => {
              const ivaReduzido = calcularIvaReduzido(p.iva_padrao, p.reducao_percentual)
              return (
                <Card key={p.id} className="p-4 border border-slate-200/80 shadow-subtle">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-slate-900">
                        Ano {p.ano_calendario}
                      </span>
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
                  <div className="grid grid-cols-2 gap-2 pt-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">IVA Padrão</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatPercent(p.iva_padrao)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Redução %</span>
                      <span className="font-mono font-medium text-emerald-700">
                        {formatPercent(p.reducao_percentual)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">IVA Reduzido</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {formatPercent(ivaReduzido)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Presunção BC</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatPercent(p.presuncao_bc)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Funrural</span>
                      <span className="font-mono font-medium text-slate-800">
                        {formatPercent(p.funrural)}
                      </span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Calculator className="w-5 h-5 text-emerald-600" />
                {editingItem
                  ? `Editar Parâmetros — Ano ${editingItem.ano_calendario}`
                  : 'Novo Ano de Parâmetros IBS/CBS'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {editingItem
                  ? 'Atualize as alíquotas fiscais aplicadas neste ano-calendário.'
                  : 'Defina as alíquotas fiscais para o novo ano-calendário.'}
              </DialogDescription>
            </DialogHeader>

            {!editingItem && inheritedFromAno && (
              <div className="my-3 p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-800">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-semibold">Herança de parâmetros:</span> Valores sugeridos
                  com base no ano anterior <strong>({inheritedFromAno})</strong>. Você pode alterar
                  qualquer campo antes de salvar.
                </div>
              </div>
            )}

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="param-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="param-ano"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="param-iva" className="text-xs font-semibold text-slate-700">
                    IVA Padrão (%) *
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      id="param-iva"
                      type="text"
                      value={ivaPadrao}
                      onChange={(e) => setIvaPadrao(e.target.value)}
                      placeholder="27.91"
                      className="pl-9 h-10 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Ex: 27,91% (IVA padrão da Reforma)</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="param-reducao" className="text-xs font-semibold text-slate-700">
                    Redução Percentual (%) *
                  </Label>
                  <div className="relative">
                    <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      id="param-reducao"
                      type="text"
                      value={reducaoPercentual}
                      onChange={(e) => setReducaoPercentual(e.target.value)}
                      placeholder="60.00"
                      className="pl-9 h-10 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Ex: 60,00% (Redução p/ Produtor Rural)
                  </p>
                </div>
              </div>

              {/* Card de Cálculo Automático do IVA Reduzido */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-950 block">
                    IVA Reduzido (Calculado)
                  </span>
                  <span className="text-[10px] text-emerald-700">iva_padrão × (1 − redução%)</span>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono text-xs px-2.5 py-1">
                  {formatPercent(previewIvaReduzido)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="param-presuncao" className="text-xs font-semibold text-slate-700">
                    Presunção Base de Cálculo (%) *
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      id="param-presuncao"
                      type="text"
                      value={presuncaoBc}
                      onChange={(e) => setPresuncaoBc(e.target.value)}
                      placeholder="20.00"
                      className="pl-9 h-10 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Ex: 20,00% (Presunção atividade rural)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="param-funrural" className="text-xs font-semibold text-slate-700">
                    Alíquota Funrural (%) *
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      id="param-funrural"
                      type="text"
                      value={funrural}
                      onChange={(e) => setFunrural(e.target.value)}
                      placeholder="1.63"
                      className="pl-9 h-10 text-xs font-mono tabular-nums"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Ex: 1,63% (Funrural s/ receita bruta)
                  </p>
                </div>
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
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
              Esta ação removerá a configuração fiscal de IBS/CBS para o ano{' '}
              <strong className="text-slate-800">{deleteItem?.ano_calendario}</strong>. Declarações
              deste ano passarão a utilizar o ano mais recente como fallback.
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
