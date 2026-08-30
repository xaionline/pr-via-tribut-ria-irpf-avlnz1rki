import { useEffect, useState } from 'react'
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Percent,
  MapPin,
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
  getTabelasIss,
  createTabelaIss,
  updateTabelaIss,
  deleteTabelaIss,
  getTabelaIssAnoAnterior,
} from '@/services/tabelasPj'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { TabelaIssRecord } from '@/types'

export function IssTab() {
  const { toast } = useToast()
  const [tabelas, setTabelas] = useState<TabelaIssRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Dialog Form
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TabelaIssRecord | null>(null)
  const [ano, setAno] = useState<string>('')
  const [aliquota, setAliquota] = useState<string>('5.00')
  const [municipio, setMunicipio] = useState<string>('Padrão / Geral')
  const [uf, setUf] = useState<string>('SP')
  const [saving, setSaving] = useState(false)
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Excluir
  const [deleteItem, setDeleteItem] = useState<TabelaIssRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const data = await getTabelasIss()
      setTabelas(data)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar alíquotas de ISS',
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
    setMunicipio('Padrão / Geral')
    setUf('SP')

    const prevTable = await getTabelaIssAnoAnterior(currentYear)
    if (prevTable) {
      setAliquota(String(prevTable.aliquota))
      setInheritedFromAno(prevTable.ano)
    } else {
      setAliquota('5.00')
      setInheritedFromAno(null)
    }
    setDialogOpen(true)
  }

  const handleOpenEdit = (item: TabelaIssRecord) => {
    setEditingItem(item)
    setAno(String(item.ano))
    setAliquota(String(item.aliquota))
    setMunicipio(item.municipio || '')
    setUf(item.uf || '')
    setInheritedFromAno(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(ano, 10)
    const aliqNum = parseFloat(aliquota.replace(',', '.'))

    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano válido', variant: 'destructive' })
      return
    }
    if (isNaN(aliqNum) || aliqNum < 2 || aliqNum > 5) {
      toast({
        title: 'Alíquota de ISS deve ser entre 2% e 5% (conforme LC 116/2003)',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await updateTabelaIss(editingItem.id, {
          ano: anoNum,
          aliquota: aliqNum,
          municipio: municipio.trim(),
          uf: uf.trim().toUpperCase(),
        })
        toast({ title: `Alíquota de ISS atualizada com sucesso!` })
      } else {
        await createTabelaIss({
          ano: anoNum,
          aliquota: aliqNum,
          municipio: municipio.trim(),
          uf: uf.trim().toUpperCase(),
        })
        toast({ title: `Alíquota de ISS cadastrada com sucesso!` })
      }
      setDialogOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar ISS',
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
      await deleteTabelaIss(deleteItem.id)
      toast({ title: `Registro de ISS excluído!` })
      setDeleteItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir ISS',
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
      <Card className="p-4 sm:p-5 border-amber-100 bg-gradient-to-br from-amber-50/70 to-yellow-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-sm shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Alíquotas Municipais de ISS (Imposto Sobre Serviços)
              </h2>
              <Badge className="bg-amber-600 text-white border-0 text-[10px]">
                Configuração Anual
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Defina a alíquota de ISS aplicada às empresas de serviços no Lucro Presumido (limites
              legais de 2,00% a 5,00% de acordo com a LC 116/2003).
            </p>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Alíquotas de ISS por Município / Ano
          </h3>
          <p className="text-xs text-slate-500">{tabelas.length} registro(s)</p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova alíquota
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
          <p className="text-sm text-slate-600">Não foi possível carregar as alíquotas de ISS.</p>
          <Button
            onClick={carregar}
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : tabelas.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <Coins className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800">Nenhum registro de ISS</h4>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nova alíquota
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Ano</th>
                  <th className="py-3 px-4">Município / UF</th>
                  <th className="py-3 px-4 text-right">Alíquota ISS (%)</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabelas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>{p.ano}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {p.municipio || 'Geral'} {p.uf ? `(${p.uf})` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-300"
                      >
                        {p.aliquota.toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(p)}
                          className="h-8 w-8 text-slate-600 hover:text-amber-700"
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
                <Coins className="w-5 h-5 text-amber-600" />
                {editingItem ? 'Editar Alíquota de ISS' : 'Nova Alíquota de ISS'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure a alíquota municipal de ISS (entre 2% e 5%).
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
                <Label htmlFor="iss-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <Input
                  id="iss-ano"
                  type="number"
                  min="2020"
                  max="2100"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="iss-mun" className="text-xs font-semibold text-slate-700">
                    Município
                  </Label>
                  <Input
                    id="iss-mun"
                    type="text"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="h-10 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="iss-uf" className="text-xs font-semibold text-slate-700">
                    UF
                  </Label>
                  <Input
                    id="iss-uf"
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="h-10 text-xs uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="iss-aliq" className="text-xs font-semibold text-slate-700">
                  Alíquota ISS (%) *
                </Label>
                <Input
                  id="iss-aliq"
                  type="number"
                  step="0.01"
                  min="2"
                  max="5"
                  value={aliquota}
                  onChange={(e) => setAliquota(e.target.value)}
                  className="h-10 text-xs font-mono"
                  required
                />
                <p className="text-[10px] text-slate-400">Piso legal: 2,00% • Teto legal: 5,00%</p>
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
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingItem ? 'Salvar alterações' : 'Cadastrar alíquota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Alíquota de ISS?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a alíquota configurada para {deleteItem?.municipio || 'Geral'} (
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
