import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Copy, Calculator, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { duplicateDeclaracao } from '@/services/declaracoes'
import { formatCurrency, relativeTime } from '@/lib/formatters'
import { daysUntilDeadline } from '@/lib/irpf-calc'
import { cn } from '@/lib/utils'
import type { DeclaracaoRecord, ResultadoRecord, ClienteRecord } from '@/types'

interface Props {
  declaracoes: DeclaracaoRecord[]
  resultadosMap: Map<string, ResultadoRecord>
  userId?: string
  clientes: ClienteRecord[]
  searchQuery: string
  onEdit: (id: string) => void
  onSimulate: (id: string) => void
}

const CHIPS = [
  { id: 'all', label: 'Todas' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'calculada', label: 'Calculada' },
  { id: 'vencer30', label: 'A vencer em 30 dias' },
  { id: 'carteira', label: 'Minha carteira' },
]

export function DeclarationsTable({
  declaracoes,
  resultadosMap,
  userId,
  clientes,
  searchQuery,
  onEdit,
  onSimulate,
}: Props) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAllCols, setShowAllCols] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const myClientIds = useMemo(
    () => new Set(clientes.filter((c) => c.responsaveis?.includes(userId || '')).map((c) => c.id)),
    [clientes, userId],
  )

  const filtered = useMemo(() => {
    let list = [...declaracoes]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((d) => {
        const nome = d.expand?.cliente_id?.nome?.toLowerCase() || ''
        const cpf = d.expand?.cliente_id?.cpf?.toLowerCase() || ''
        return nome.includes(q) || cpf.includes(q)
      })
    }
    switch (activeFilter) {
      case 'rascunho':
        list = list.filter((d) => d.status === 'rascunho')
        break
      case 'calculada':
        list = list.filter((d) => d.status === 'calculada')
        break
      case 'vencer30':
        list = list.filter((d) => {
          const dd = daysUntilDeadline(d.ano_calendario)
          return dd > 0 && dd <= 30
        })
        break
      case 'carteira':
        list = list.filter((d) => myClientIds.has(d.cliente_id))
        break
    }
    list.sort((a, b) => daysUntilDeadline(a.ano_calendario) - daysUntilDeadline(b.ano_calendario))
    return list
  }, [declaracoes, searchQuery, activeFilter, myClientIds])

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateDeclaracao(id)
      toast({ title: 'Declaração duplicada', description: 'Cópia criada em rascunho.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível duplicar.', variant: 'destructive' })
    }
  }

  const getImposto = (d: DeclaracaoRecord) => {
    const r = resultadosMap.get(d.id)
    return r && r.saldo_imposto > 0 ? r.saldo_imposto : 0
  }

  const getModalidadeLabel = (d: DeclaracaoRecord) =>
    !d.modalidade ? '—' : d.modalidade === 'legal' ? 'Legal' : 'Simplificada'

  return (
    <div className="lg:col-span-2 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-medium border transition-colors',
              activeFilter === chip.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="hidden md:flex justify-end mb-1">
        <button
          onClick={() => setShowAllCols(!showAllCols)}
          className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
        >
          {showAllCols ? 'Ocultar colunas' : 'Mostrar todas as colunas'}
        </button>
      </div>
      <Card className="hidden md:block border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Ano</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Imposto</th>
                <th className={cn('py-2.5 px-3', !showAllCols && 'md:hidden lg:table-cell')}>
                  Modalidade
                </th>
                <th className={cn('py-2.5 px-3', !showAllCols && 'md:hidden lg:table-cell')}>
                  Atualizado
                </th>
                <th className="py-2.5 px-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhuma declaracao pendente
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {d.expand?.cliente_id?.nome || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{d.ano_calendario}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {formatCurrency(getImposto(d))}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 px-3 text-slate-600',
                        !showAllCols && 'md:hidden lg:table-cell',
                      )}
                    >
                      {getModalidadeLabel(d)}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 px-3 text-slate-500',
                        !showAllCols && 'md:hidden lg:table-cell',
                      )}
                    >
                      {relativeTime(d.updated)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(d.id)}
                          className="p-1.5 rounded hover:bg-slate-100"
                          title="Visualizar"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button
                          onClick={() => navigate(`/app/declaracoes/${d.id}/editar`)}
                          className="p-1.5 rounded hover:bg-slate-100"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(d.id)}
                          className="p-1.5 rounded hover:bg-slate-100"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        <button
                          onClick={() => onSimulate(d.id)}
                          className="p-1.5 rounded hover:bg-slate-100"
                          title="Simular"
                        >
                          <Calculator className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-xs text-slate-400 border border-slate-200">
            Nenhuma declaracao pendente
          </Card>
        ) : (
          filtered.map((d) => {
            const isExpanded = expandedId === d.id
            return (
              <Card key={d.id} className="p-3 border border-slate-200 space-y-2">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {d.expand?.cliente_id?.nome || '—'}
                  </span>
                  <StatusBadge status={d.status} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400">Ano: </span>
                    <span className="font-mono text-slate-700">{d.ano_calendario}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Imposto: </span>
                    <span className="font-mono text-slate-700">
                      {formatCurrency(getImposto(d))}
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400">Mod.: </span>
                      <span className="text-slate-700">{getModalidadeLabel(d)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Atual.: </span>
                      <span className="text-slate-700">{relativeTime(d.updated)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1 pt-1.5 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[11px] gap-1 touch-target"
                    onClick={() => onEdit(d.id)}
                  >
                    <Eye className="w-3 h-3" /> Ver
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[11px] gap-1 text-emerald-600 touch-target"
                    onClick={() => navigate(`/app/declaracoes/${d.id}/editar`)}
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[11px] gap-1 touch-target"
                    onClick={() => handleDuplicate(d.id)}
                  >
                    <Copy className="w-3 h-3" /> Dup.
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[11px] gap-1 text-blue-600 touch-target"
                    onClick={() => onSimulate(d.id)}
                  >
                    <Calculator className="w-3 h-3" /> Sim.
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
