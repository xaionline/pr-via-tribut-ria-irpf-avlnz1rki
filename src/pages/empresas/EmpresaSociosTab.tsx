import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  DollarSign,
  PieChart,
  Percent,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { getSociosDaEmpresa, addSocio, updateSocio, deleteSocio } from '@/services/empresas'
import { getClientes } from '@/services/clientes'
import { formatCurrency, maskCpf } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { EmpresaRecord, EmpresaSocioRecord, ClienteRecord } from '@/types'

interface EmpresaSociosTabProps {
  empresa: EmpresaRecord
}

export function EmpresaSociosTab({ empresa }: EmpresaSociosTabProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [socios, setSocios] = useState<EmpresaSocioRecord[]>([])
  const [clientesDisponiveis, setClientesDisponiveis] = useState<ClienteRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog Criar / Editar
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSocio, setEditingSocio] = useState<EmpresaSocioRecord | null>(null)
  const [clienteId, setClienteId] = useState('')
  const [percentual, setPercentual] = useState('')
  const [proLaboreMensal, setProLaboreMensal] = useState('')
  const [participaLucros, setParticipaLucros] = useState(true)
  const [participaJcp, setParticipaJcp] = useState(false)
  const [saving, setSaving] = useState(false)

  // Dialog Exclusão
  const [deleteItem, setDeleteItem] = useState<EmpresaSocioRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const [sociosList, clientesList] = await Promise.all([
        getSociosDaEmpresa(empresa.id),
        getClientes('', 1, 100),
      ])
      setSocios(sociosList)
      setClientesDisponiveis(clientesList.items)
    } catch (err) {
      toast({
        title: 'Erro ao carregar sócios da empresa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [empresa.id])

  const totalPercentual = socios.reduce(
    (acc, s) => acc + (Number(s.percentual_participacao) || 0),
    0,
  )

  const handleOpenNovo = () => {
    setEditingSocio(null)
    setClienteId(clientesDisponiveis[0]?.id || '')
    const percRestante = Math.max(0, 100 - totalPercentual)
    setPercentual(percRestante > 0 ? String(percRestante) : '50.00')
    setProLaboreMensal('5000.00')
    setParticipaLucros(true)
    setParticipaJcp(false)
    setDialogOpen(true)
  }

  const handleOpenEdit = (socio: EmpresaSocioRecord) => {
    setEditingSocio(socio)
    setClienteId(socio.cliente_id)
    setPercentual(String(socio.percentual_participacao))
    setProLaboreMensal(String(socio.pro_labore_mensal || 0))
    setParticipaLucros(socio.participa_lucros !== false)
    setParticipaJcp(Boolean(socio.participa_jcp))
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) {
      toast({ title: 'Selecione um cliente PF para ser sócio', variant: 'destructive' })
      return
    }
    const percNum = parseFloat(percentual.replace(',', '.'))
    if (isNaN(percNum) || percNum <= 0 || percNum > 100) {
      toast({
        title: 'Percentual de participação deve ser entre 0% e 100%',
        variant: 'destructive',
      })
      return
    }

    const proLaboreNum = parseFloat(proLaboreMensal.replace(',', '.')) || 0

    setSaving(true)
    try {
      if (editingSocio) {
        await updateSocio(editingSocio.id, {
          cliente_id: clienteId,
          percentual_participacao: percNum,
          pro_labore_mensal: proLaboreNum,
          participa_lucros: participaLucros,
          participa_jcp: participaJcp,
        })
        toast({ title: 'Vínculo do sócio atualizado com sucesso!' })
      } else {
        // Verificar se cliente já é sócio nesta empresa
        const jaCadastrado = socios.some((s) => s.cliente_id === clienteId)
        if (jaCadastrado) {
          toast({
            title: 'Este cliente PF já é sócio desta empresa',
            description: 'Edite o vínculo existente.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await addSocio({
          empresa_id: empresa.id,
          cliente_id: clienteId,
          percentual_participacao: percNum,
          pro_labore_mensal: proLaboreNum,
          participa_lucros: participaLucros,
          participa_jcp: participaJcp,
        })
        toast({ title: 'Sócio adicionado à empresa com sucesso!' })
      }
      setDialogOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar sócio',
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
      await deleteSocio(deleteItem.id)
      toast({ title: 'Sócio desvinculado da empresa!' })
      setDeleteItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao remover sócio',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumo do Quadro Societário */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200/80 bg-white shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total de Sócios PF
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{socios.length}</div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Capital Total Alocado
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <span>{totalPercentual.toFixed(1)}%</span>
              {totalPercentual === 100 ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  100% Fechado
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  {100 - totalPercentual > 0
                    ? `Restam ${(100 - totalPercentual).toFixed(1)}%`
                    : 'Acima de 100%'}
                </Badge>
              )}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <PieChart className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 bg-white shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Folha Mensal de Pró-Labore
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(
                socios.reduce((acc, s) => acc + (Number(s.pro_labore_mensal) || 0), 0),
              )}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Quadro de Sócios e Diretores</h3>
          <p className="text-xs text-slate-500">
            Vínculo entre a Pessoa Jurídica e os Clientes PF para distribuição automática de
            Pró-Labore, Lucros e Dividendos.
          </p>
        </div>
        <Button
          onClick={handleOpenNovo}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Vincular Sócio PF
        </Button>
      </div>

      {/* Tabela de Sócios */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-500">
          Carregando quadro societário...
        </div>
      ) : socios.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">Nenhum sócio vinculado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Vincule os clientes PF do escritório a esta empresa para habilitar o lançamento
            automático no IRPF.
          </p>
          <Button
            onClick={handleOpenNovo}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Vincular Sócio PF
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Sócio (Cliente PF)</th>
                  <th className="py-3 px-4 text-center">Participação</th>
                  <th className="py-3 px-4 text-right">Pró-Labore Mensal</th>
                  <th className="py-3 px-4 text-center">Participa Lucros</th>
                  <th className="py-3 px-4 text-center">Participa JCP</th>
                  <th className="py-3 px-4 text-right">Acesso IRPF</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {socios.map((socio) => {
                  const cliente = socio.expand?.cliente_id
                  return (
                    <tr key={socio.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-900 block text-sm">
                            {cliente?.nome || 'Cliente PF'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {cliente?.cpf ? maskCpf(cliente.cpf) : 'CPF não informado'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-800 border-blue-200 font-bold font-mono"
                        >
                          {socio.percentual_participacao.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(socio.pro_labore_mensal || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {socio.participa_lucros !== false ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300 inline-block" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {socio.participa_jcp ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline-block" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300 inline-block" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/clientes/${socio.cliente_id}`)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1"
                        >
                          <span>Ver IRPF do Sócio</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(socio)}
                            className="h-8 w-8 text-slate-600 hover:text-blue-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItem(socio)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
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
      )}

      {/* Modal Criar / Editar Sócio */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Users className="w-5 h-5 text-blue-600" />
                {editingSocio ? 'Editar Vínculo do Sócio' : 'Vincular Sócio PF'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Conecte um cliente Pessoa Física a esta empresa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="socio-cliente" className="text-xs font-semibold text-slate-700">
                  Cliente Pessoa Física *
                </Label>
                <Select value={clienteId} onValueChange={setClienteId} disabled={!!editingSocio}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione o cliente PF" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome} ({maskCpf(c.cpf)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="socio-perc" className="text-xs font-semibold text-slate-700">
                    Participação (%) *
                  </Label>
                  <Input
                    id="socio-perc"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100"
                    value={percentual}
                    onChange={(e) => setPercentual(e.target.value)}
                    className="h-10 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="socio-prolabore" className="text-xs font-semibold text-slate-700">
                    Pró-Labore Mensal (R$)
                  </Label>
                  <Input
                    id="socio-prolabore"
                    type="number"
                    step="100"
                    min="0"
                    value={proLaboreMensal}
                    onChange={(e) => setProLaboreMensal(e.target.value)}
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <Label className="text-xs font-semibold text-slate-800">
                      Participa dos Lucros / Dividendos
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Recebe dividendos proporcionais à cota (isento no IRPF)
                    </p>
                  </div>
                  <Switch checked={participaLucros} onCheckedChange={setParticipaLucros} />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <Label className="text-xs font-semibold text-slate-800">
                      Participa de Juros sobre Capital Próprio (JCP)
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Tributação exclusiva na fonte no IRPF
                    </p>
                  </div>
                  <Switch checked={participaJcp} onCheckedChange={setParticipaJcp} />
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
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingSocio ? 'Salvar alterações' : 'Vincular sócio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Sócio?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação desvinculará o sócio da empresa. O cadastro do cliente PF não será afetado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Removendo...' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
