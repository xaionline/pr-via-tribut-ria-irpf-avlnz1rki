import { useEffect, useState } from 'react'
import {
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Percent,
  Coins,
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
  getTabelasPisCofinsReal,
  createTabelaPisCofinsReal,
  updateTabelaPisCofinsReal,
  deleteTabelaPisCofinsReal,
  getTabelaPisCofinsRealAnoAnterior,
} from '@/services/tabelasPj'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { TabelaPisCofinsRealRecord } from '@/types'

export function PisCofinsRealTab() {
  const { toast } = useToast()
  const [tabelas, setTabelas] = useState<TabelaPisCofinsRealRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Dialog Form
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TabelaPisCofinsRealRecord | null>(null)
  const [ano, setAno] = useState<string>('')
  const [aliquotaPis, setAliquotaPis] = useState<string>('1.65')
  const [aliquotaCofins, setAliquotaCofins] = useState<string>('7.60')
  const [aliquotaCreditoPis, setAliquotaCreditoPis] = useState<string>('1.65')
  const [aliquotaCreditoCofins, setAliquotaCreditoCofins] = useState<string>('7.60')
  const [observacao, setObservacao] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Excluir
  const [deleteItem, setDeleteItem] = useState<TabelaPisCofinsRealRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const data = await getTabelasPisCofinsReal()
      setTabelas(data)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar parâmetros de PIS/COFINS',
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

    const prevTable = await getTabelaPisCofinsRealAnoAnterior(currentYear)
    if (prevTable) {
      setAliquotaPis(String(prevTable.aliquota_pis))
      setAliquotaCofins(String(prevTable.aliquota_cofins))
      setAliquotaCreditoPis(String(prevTable.aliquota_credito_pis))
      setAliquotaCreditoCofins(String(prevTable.aliquota_credito_cofins))
      setObservacao(prevTable.observacao || '')
      setInheritedFromAno(prevTable.ano)
    } else {
      setAliquotaPis('1.65')
      setAliquotaCofins('7.60')
      setAliquotaCreditoPis('1.65')
      setAliquotaCreditoCofins('7.60')
      setObservacao('Regime Não-Cumulativo Padrão (Leis 10.637/2002 e 10.833/2003)')
      setInheritedFromAno(null)
    }
    setDialogOpen(true)
  }

  const handleOpenEdit = (item: TabelaPisCofinsRealRecord) => {
    setEditingItem(item)
    setAno(String(item.ano))
    setAliquotaPis(String(item.aliquota_pis))
    setAliquotaCofins(String(item.aliquota_cofins))
    setAliquotaCreditoPis(String(item.aliquota_credito_pis))
    setAliquotaCreditoCofins(String(item.aliquota_credito_cofins))
    setObservacao(item.observacao || '')
    setInheritedFromAno(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(ano, 10)
    const pisNum = parseFloat(aliquotaPis.replace(',', '.'))
    const cofinsNum = parseFloat(aliquotaCofins.replace(',', '.'))
    const credPisNum = parseFloat(aliquotaCreditoPis.replace(',', '.'))
    const credCofinsNum = parseFloat(aliquotaCreditoCofins.replace(',', '.'))

    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano válido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateTabelaPisCofinsReal(editingItem.id, {
          ano: anoNum,
          aliquota_pis: pisNum,
          aliquota_cofins: cofinsNum,
          aliquota_credito_pis: credPisNum,
          aliquota_credito_cofins: credCofinsNum,
          observacao,
        })
        toast({ title: `PIS/COFINS Não-Cumulativo para ${anoNum} atualizado!` })
      } else {
        const jaExiste = tabelas.some((t) => t.ano === anoNum)
        if (jaExiste) {
          toast({
            title: `Já existe configuração para o ano ${anoNum}`,
            description: 'Edite o registro existente.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await createTabelaPisCofinsReal({
          ano: anoNum,
          aliquota_pis: pisNum,
          aliquota_cofins: cofinsNum,
          aliquota_credito_pis: credPisNum,
          aliquota_credito_cofins: credCofinsNum,
          observacao,
        })
        toast({ title: `PIS/COFINS Não-Cumulativo para ${anoNum} cadastrado!` })
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
      await deleteTabelaPisCofinsReal(deleteItem.id)
      toast({ title: `Parâmetros do ano ${deleteItem.ano} excluídos!` })
      setDeleteItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir',
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
      <Card className="p-4 sm:p-5 border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                PIS e COFINS no Regime Não-Cumulativo (Lucro Real)
              </h2>
              <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                Configuração Anual
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Defina as alíquotas de débito sobre o faturamento (PIS 1,65% e COFINS 7,60%) e as
              taxas de apuração de créditos sobre insumos, compras e encargos operacionais.
            </p>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Histórico de Alíquotas PIS/COFINS (Não-Cumulativo)
          </h3>
          <p className="text-xs text-slate-500">{tabelas.length} ano(s) cadastrado(s)</p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo ano
        </Button>
      </div>

      {/* Tabela */}
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
          <p className="text-sm text-slate-600">Não foi possível carregar os parâmetros.</p>
          <Button
            onClick={carregar}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : tabelas.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Nenhum parâmetro cadastrado</h4>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Novo ano
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Ano-Calendário</th>
                  <th className="py-3 px-4 text-right">PIS (Débito)</th>
                  <th className="py-3 px-4 text-right">COFINS (Débito)</th>
                  <th className="py-3 px-4 text-right">Crédito PIS</th>
                  <th className="py-3 px-4 text-right">Crédito COFINS</th>
                  <th className="py-3 px-4">Observação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabelas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{p.ano}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                      {p.aliquota_pis.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                      {p.aliquota_cofins.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      {p.aliquota_credito_pis.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      {p.aliquota_credito_cofins.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {p.observacao || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(p)}
                          className="h-8 w-8 text-slate-600 hover:text-emerald-700"
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
                <Coins className="w-5 h-5 text-emerald-600" />
                {editingItem
                  ? `Editar PIS/COFINS Real — Ano ${editingItem.ano}`
                  : 'Novos Parâmetros PIS/COFINS Real'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure as alíquotas federais de PIS e COFINS não-cumulativos.
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
                <Label htmlFor="pc-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <Input
                  id="pc-ano"
                  type="number"
                  min="2020"
                  max="2100"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pc-pis" className="text-xs font-semibold text-slate-700">
                    PIS Débito (%) *
                  </Label>
                  <Input
                    id="pc-pis"
                    type="number"
                    step="0.01"
                    value={aliquotaPis}
                    onChange={(e) => setAliquotaPis(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 1,65%</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pc-cofins" className="text-xs font-semibold text-slate-700">
                    COFINS Débito (%) *
                  </Label>
                  <Input
                    id="pc-cofins"
                    type="number"
                    step="0.01"
                    value={aliquotaCofins}
                    onChange={(e) => setAliquotaCofins(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 7,60%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pc-cred-pis" className="text-xs font-semibold text-slate-700">
                    Crédito PIS (%) *
                  </Label>
                  <Input
                    id="pc-cred-pis"
                    type="number"
                    step="0.01"
                    value={aliquotaCreditoPis}
                    onChange={(e) => setAliquotaCreditoPis(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 1,65%</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pc-cred-cofins" className="text-xs font-semibold text-slate-700">
                    Crédito COFINS (%) *
                  </Label>
                  <Input
                    id="pc-cred-cofins"
                    type="number"
                    step="0.01"
                    value={aliquotaCreditoCofins}
                    onChange={(e) => setAliquotaCreditoCofins(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 7,60%</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pc-obs" className="text-xs font-semibold text-slate-700">
                  Observações / Base Legal
                </Label>
                <Input
                  id="pc-obs"
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Regime Não-Cumulativo Padrão"
                  className="h-10 text-xs"
                />
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingItem ? 'Salvar alterações' : 'Cadastrar parâmetros'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Parâmetros do Ano {deleteItem?.ano}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a configuração de PIS/COFINS Não-Cumulativo para este ano.
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
