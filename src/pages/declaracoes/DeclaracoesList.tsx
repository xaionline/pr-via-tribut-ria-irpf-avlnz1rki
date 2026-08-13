import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  FileText,
  Filter,
  MoreVertical,
  Eye,
  Calculator,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getDeclaracoes, deleteDeclaracao } from '@/services/declaracoes'
import type { DeclaracaoRecord } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

export default function DeclaracoesList() {
  const [searchParams] = useSearchParams()
  const filterClienteId = searchParams.get('clienteId') || ''

  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [anoFilter, setAnoFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [target, setTarget] = useState<DeclaracaoRecord | null>(null)

  const navigate = useNavigate()
  const { isVisualizador } = useAuth()
  const { toast } = useToast()

  const canDelete = !isVisualizador

  const loadData = async () => {
    setLoading(true)
    try {
      const anoNum = anoFilter !== 'todos' ? parseInt(anoFilter) : undefined
      const res = await getDeclaracoes(filterClienteId || undefined, anoNum, statusFilter)
      setDeclaracoes(res)
    } catch {
      /* intentionally ignored */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [anoFilter, statusFilter, filterClienteId])

  useRealtime('declaracoes', () => loadData())

  const confirmDelete = async () => {
    if (!target) return
    setDeleting(true)
    try {
      await deleteDeclaracao(target.id)
      setDeclaracoes((prev) => prev.filter((d) => d.id !== target.id))
      toast({ title: 'Declaração excluída' })
      setTarget(null)
    } catch {
      toast({
        title: 'Falha ao excluir declaração',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Declarações IRPF</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie as declarações do ano-calendário por cliente e monitore o status do cálculo.
          </p>
        </div>

        <Button
          onClick={() => navigate('/app/declaracoes/nova')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nova declaração</span>
        </Button>
      </div>

      {/* Filters Toolbar */}
      <Card className="border border-slate-200/80 p-3 shadow-subtle">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="w-36">
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Ano-calendário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="calculada">Calculada</SelectItem>
                <SelectItem value="revisada">Revisada</SelectItem>
                <SelectItem value="apresentada">Apresentada</SelectItem>
                <SelectItem value="retificada">Retificada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Resumption Banner */}
      {!loading && declaracoes.some((d) => d.status === 'revisada') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Há declarações em revisão aguardando conclusão
              </p>
              <p className="text-xs text-amber-700">Retome o preenchimento</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 text-xs shrink-0"
            onClick={() => {
              const inProgress = declaracoes.find((d) => d.status === 'revisada')
              if (inProgress) navigate(`/app/declaracoes/${inProgress.id}`)
            }}
          >
            Continuar
          </Button>
        </div>
      )}

      {/* Declarations Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Carregando declarações...</div>
      ) : declaracoes.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {anoFilter !== 'todos'
              ? `Nenhuma declaração iniciada para ${anoFilter}`
              : 'Nenhuma declaração encontrada'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crie a primeira declaração para começar o cálculo
          </p>
          <Button
            onClick={() => navigate('/app/declaracoes/nova')}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova declaração</span>
          </Button>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Cliente / Declarante</th>
                    <th className="py-3 px-4">Ano-Calendário</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Progresso</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {declaracoes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {d.expand?.cliente_id?.nome || 'Cliente'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{d.ano_calendario}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${d.progresso}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {d.progresso}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuItem onClick={() => navigate(`/app/declaracoes/${d.id}`)}>
                              <Eye className="w-3.5 h-3.5 mr-2" />
                              <span>Abrir declaração</span>
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setTarget(d)}
                                  className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  <span>Excluir declaração</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="md:hidden space-y-3">
            {declaracoes.map((d) => (
              <Card key={d.id} className="p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {d.expand?.cliente_id?.nome || 'Cliente'}
                  </span>
                  <StatusBadge status={d.status} />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Ano: <span className="font-mono text-slate-700">{d.ano_calendario}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${d.progresso}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{d.progresso}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs touch-target"
                    onClick={() => navigate(`/app/declaracoes/${d.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Abrir declaração
                  </Button>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 touch-target"
                      onClick={() => setTarget(d)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Excluir declaração?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação não pode ser desfeita. Os dados da declaração de{' '}
              <span className="font-semibold text-slate-700">
                {target?.expand?.cliente_id?.nome || 'cliente'}
              </span>{' '}
              para o ano{' '}
              <span className="font-semibold text-slate-700">{target?.ano_calendario}</span> serão
              removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-xs" disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-xs"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
