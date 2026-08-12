import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FileText, Filter, MoreVertical, Eye, Calculator, AlertCircle } from 'lucide-react'
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
import { useRealtime } from '@/hooks/use-realtime'
import { getDeclaracoes } from '@/services/declaracoes'
import type { DeclaracaoRecord } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DeclaracoesList() {
  const [searchParams] = useSearchParams()
  const filterClienteId = searchParams.get('clienteId') || ''

  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [anoFilter, setAnoFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

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
          <span>Nova Declaração</span>
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
                <SelectItem value="em_preenchimento">Em preenchimento</SelectItem>
                <SelectItem value="calculada">Calculada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Resumption Banner */}
      {!loading && declaracoes.some((d) => d.status === 'em_preenchimento') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Você tem uma declaração em andamento
              </p>
              <p className="text-xs text-amber-700">Continuar de onde parou?</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 text-xs shrink-0"
            onClick={() => {
              const inProgress = declaracoes.find((d) => d.status === 'em_preenchimento')
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
          <h3 className="text-base font-bold text-slate-800">Nenhuma declaração encontrada</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crie uma nova declaração vinculada a um cliente para apurar a prévia do imposto.
          </p>
          <Button
            onClick={() => navigate('/app/declaracoes/nova')}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Nova Declaração</span>
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
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
                        <span className="text-[10px] text-slate-500 font-mono">{d.progresso}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuItem onClick={() => navigate(`/app/declaracoes/${d.id}`)}>
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            <span>Abrir Declaração</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
