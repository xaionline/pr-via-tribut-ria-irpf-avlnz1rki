import { useEffect, useState } from 'react'
import {
  Calculator,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Layers,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  getTabelasSimples,
  createTabelaSimples,
  updateTabelaSimples,
  deleteTabelaSimples,
  getTabelaSimplesAnoAnterior,
} from '@/services/tabelasPj'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency } from '@/lib/formatters'
import type { TabelaSimplesRecord, AnexoSimplesNacional, FaixaSimplesNacional } from '@/types'

const ANEXOS: { value: AnexoSimplesNacional; label: string; desc: string }[] = [
  { value: 'I', label: 'Anexo I - Comércio', desc: 'Comércio em geral (alíquotas 4% a 19%)' },
  {
    value: 'II',
    label: 'Anexo II - Indústria',
    desc: 'Indústria e fábricas (alíquotas 4,5% a 30%)',
  },
  {
    value: 'III',
    label: 'Anexo III - Serviços',
    desc: 'Locação, TI, manutenção (alíquotas 6% a 33%)',
  },
  {
    value: 'IV',
    label: 'Anexo IV - Serviços Específicos',
    desc: 'Limpeza, vigilância, obras (alíquotas 4,5% a 33%)',
  },
  {
    value: 'V',
    label: 'Anexo V - Intelectuais / Fator R',
    desc: 'Serviços intelectuais, médicos, engenharia (15,5% a 30,5%)',
  },
]

export function SimplesNacionalTab() {
  const { toast } = useToast()
  const [tabelas, setTabelas] = useState<TabelaSimplesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [filtroAnexo, setFiltroAnexo] = useState<string>('todos')

  // Dialog Form (Criar / Editar)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TabelaSimplesRecord | null>(null)
  const [ano, setAno] = useState<string>('')
  const [anexo, setAnexo] = useState<AnexoSimplesNacional>('III')
  const [faixas, setFaixas] = useState<FaixaSimplesNacional[]>([])
  const [saving, setSaving] = useState(false)
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Excluir
  const [deleteItem, setDeleteItem] = useState<TabelaSimplesRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const data = await getTabelasSimples()
      setTabelas(data)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar tabelas do Simples Nacional',
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
    setAnexo('III')

    // Herança inteligente do ano anterior
    const prevTable = await getTabelaSimplesAnoAnterior(currentYear, 'III')
    if (prevTable && prevTable.faixas?.length > 0) {
      setFaixas(prevTable.faixas)
      setInheritedFromAno(prevTable.ano)
    } else {
      setFaixas([
        { faixa: 1, faixa_inicial: 0, faixa_final: 180000, aliquota: 6.0, parcela_deduzir: 0 },
        {
          faixa: 2,
          faixa_inicial: 180000.01,
          faixa_final: 360000,
          aliquota: 11.2,
          parcela_deduzir: 9360,
        },
        {
          faixa: 3,
          faixa_inicial: 360000.01,
          faixa_final: 720000,
          aliquota: 13.5,
          parcela_deduzir: 17640,
        },
        {
          faixa: 4,
          faixa_inicial: 720000.01,
          faixa_final: 1800000,
          aliquota: 16.0,
          parcela_deduzir: 35640,
        },
        {
          faixa: 5,
          faixa_inicial: 1800000.01,
          faixa_final: 3600000,
          aliquota: 21.0,
          parcela_deduzir: 125640,
        },
        {
          faixa: 6,
          faixa_inicial: 3600000.01,
          faixa_final: 4800000,
          aliquota: 33.0,
          parcela_deduzir: 648000,
        },
      ])
      setInheritedFromAno(null)
    }

    setDialogOpen(true)
  }

  const handleAnexoChange = async (newAnexo: AnexoSimplesNacional) => {
    setAnexo(newAnexo)
    const anoNum = parseInt(ano, 10)
    if (!editingItem && anoNum) {
      const prevTable = await getTabelaSimplesAnoAnterior(anoNum, newAnexo)
      if (prevTable && prevTable.faixas?.length > 0) {
        setFaixas(prevTable.faixas)
        setInheritedFromAno(prevTable.ano)
      }
    }
  }

  const handleOpenEdit = (item: TabelaSimplesRecord) => {
    setEditingItem(item)
    setAno(String(item.ano))
    setAnexo(item.anexo)
    setFaixas(item.faixas || [])
    setInheritedFromAno(null)
    setDialogOpen(true)
  }

  const handleUpdateFaixa = (index: number, field: keyof FaixaSimplesNacional, value: number) => {
    const updated = [...faixas]
    updated[index] = { ...updated[index], [field]: value }
    setFaixas(updated)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(ano, 10)
    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano válido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateTabelaSimples(editingItem.id, {
          ano: anoNum,
          anexo,
          faixas,
          aliquota: faixas[0]?.aliquota ?? 0,
          parcela_deduzir: faixas[0]?.parcela_deduzir ?? 0,
        })
        toast({ title: `Tabela Simples Nacional (${anexo}) ano ${anoNum} atualizada!` })
      } else {
        const jaExiste = tabelas.some((t) => t.ano === anoNum && t.anexo === anexo)
        if (jaExiste) {
          toast({
            title: `Já existe tabela para o ano ${anoNum} e Anexo ${anexo}`,
            description: 'Edite o registro existente ou escolha outro ano/anexo.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await createTabelaSimples({
          ano: anoNum,
          anexo,
          faixas,
          aliquota: faixas[0]?.aliquota ?? 0,
          parcela_deduzir: faixas[0]?.parcela_deduzir ?? 0,
        })
        toast({ title: `Tabela Simples Nacional (${anexo}) ano ${anoNum} cadastrada!` })
      }
      setDialogOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar tabela',
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
      await deleteTabelaSimples(deleteItem.id)
      toast({ title: `Tabela Anexo ${deleteItem.anexo} (${deleteItem.ano}) excluída!` })
      setDeleteItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir tabela',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const tabelasFiltradas = tabelas.filter((t) =>
    filtroAnexo === 'todos' ? true : t.anexo === filtroAnexo,
  )

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Card className="p-4 sm:p-5 border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Tabelas e Faixas Oficiais do Simples Nacional (LC 123/2006)
              </h2>
              <Badge className="bg-blue-600 text-white border-0 text-[10px]">
                Configuração Anual
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Configure as faixas de RBT12, alíquotas nominais e parcelas a deduzir por Anexo (I a
              V) e ano-calendário. O sistema calcula a alíquota efetiva e o valor devido do DAS com
              base nestes parâmetros.
            </p>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filtroAnexo} onValueChange={setFiltroAnexo}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue placeholder="Filtrar por anexo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os anexos</SelectItem>
              {ANEXOS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  Anexo {a.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">{tabelasFiltradas.length} registro(s)</span>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova tabela
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <Card className="p-5 border border-slate-200/80">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </Card>
      ) : erro ? (
        <Card className="p-10 text-center border-dashed border-rose-200 bg-rose-50/40">
          <p className="text-sm text-slate-600">Não foi possível carregar as tabelas do Simples.</p>
          <Button onClick={carregar} className="mt-4 bg-blue-600 hover:bg-blue-700 text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : tabelasFiltradas.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Nenhuma tabela cadastrada</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cadastre as faixas do Simples Nacional para os anos-calendário desejados.
          </p>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nova tabela
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tabelasFiltradas.map((t) => (
            <Card
              key={t.id}
              className="p-4 border border-slate-200/80 shadow-subtle hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                    {t.anexo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        Anexo {t.anexo} — Ano {t.ano}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {ANEXOS.find((a) => a.value === t.anexo)?.label || `Anexo ${t.anexo}`}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t.faixas?.length || 0} faixas de faturamento configuradas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(t)}
                    className="h-8 w-8 text-slate-600 hover:text-blue-700"
                    title="Editar faixas"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteItem(t)}
                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Excluir tabela"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tabela de Faixas */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-100">
                      <th className="py-1.5 px-2">Faixa</th>
                      <th className="py-1.5 px-2">Receita Bruta em 12 meses (RBT12)</th>
                      <th className="py-1.5 px-2 text-right">Alíquota Nominal</th>
                      <th className="py-1.5 px-2 text-right">Parcela a Deduzir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(t.faixas || []).map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-2 font-semibold text-slate-700">
                          {idx + 1}ª Faixa
                        </td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">
                          {formatCurrency(f.faixa_inicial)} até {formatCurrency(f.faixa_final)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-blue-700">
                          {f.aliquota.toFixed(2)}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatCurrency(f.parcela_deduzir)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Calculator className="w-5 h-5 text-blue-600" />
                {editingItem
                  ? `Editar Tabela — Anexo ${editingItem.anexo} (${editingItem.ano})`
                  : 'Nova Tabela Simples Nacional'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure as faixas de alíquota e parcela a deduzir da LC 123/2006.
              </DialogDescription>
            </DialogHeader>

            {!editingItem && inheritedFromAno && (
              <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-800">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Herança automática:</strong> Faixas sugeridas com base no ano anterior{' '}
                  <strong>({inheritedFromAno})</strong>.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="ts-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <Input
                  id="ts-ano"
                  type="number"
                  min="2020"
                  max="2100"
                  disabled={!!editingItem}
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ts-anexo" className="text-xs font-semibold text-slate-700">
                  Anexo do Simples *
                </Label>
                <Select
                  value={anexo}
                  onValueChange={(v) => handleAnexoChange(v as AnexoSimplesNacional)}
                  disabled={!!editingItem}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANEXOS.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Faixas Editáveis */}
            <div className="space-y-3 py-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Faixas de Faturamento (LC 123/2006)
              </h4>
              <div className="space-y-2">
                {faixas.map((faixa, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs"
                  >
                    <div className="font-semibold text-slate-700">{idx + 1}ª Faixa</div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Até (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={faixa.faixa_final}
                        onChange={(e) =>
                          handleUpdateFaixa(idx, 'faixa_final', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Alíquota (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={faixa.aliquota}
                        onChange={(e) =>
                          handleUpdateFaixa(idx, 'aliquota', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs font-mono text-blue-700 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-400">Deduzir (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={faixa.parcela_deduzir}
                        onChange={(e) =>
                          handleUpdateFaixa(idx, 'parcela_deduzir', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
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
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingItem ? 'Salvar alterações' : 'Cadastrar tabela'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tabela do Simples?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá as faixas do <strong>Anexo {deleteItem?.anexo}</strong> para o ano{' '}
              <strong>{deleteItem?.ano}</strong>.
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
              Excluir tabela
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
