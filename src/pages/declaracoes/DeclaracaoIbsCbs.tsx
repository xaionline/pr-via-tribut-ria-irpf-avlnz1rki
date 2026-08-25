import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, FileText, Printer, FileX2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/StatusBadge'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { getDeclaracao } from '@/services/declaracoes'
import type { DeclaracaoRecord } from '@/types'
import { useAuth } from '@/hooks/use-auth'
import TabIbsCbs from './tabs/TabIbsCbs'

export default function DeclaracaoIbsCbsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isConsultor, isAdmin } = useAuth()
  const [declaracao, setDeclaracao] = useState<DeclaracaoRecord | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const d = await getDeclaracao(id)
      if (isConsultor && !isAdmin) {
        const resp = d.expand?.cliente_id?.responsaveis || []
        if (!resp.includes(user?.id || '')) {
          setAccessDenied(true)
          setDeclaracao(null)
          return
        }
      }
      setDeclaracao(d)
      setLoadError(false)
      setAccessDenied(false)
    } catch {
      setLoadError(true)
      setDeclaracao(null)
    }
  }, [id, isConsultor, isAdmin, user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="text-center max-w-sm">
          <FileX2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Declaração não encontrada</h2>
          <p className="text-xs text-slate-500 mt-1.5 mb-6">
            A declaração pode ter sido removida ou o identificador está incorreto
          </p>
          <Button
            onClick={() => navigate('/app/declaracoes')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para declarações
          </Button>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="text-center max-w-sm">
          <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Acesso restrito</h2>
          <p className="text-xs text-slate-500 mt-1.5 mb-6">
            Você não tem permissão para acessar esta declaração
          </p>
          <Button
            onClick={() => navigate('/app/declaracoes')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para declarações
          </Button>
        </div>
      </div>
    )
  }

  if (!declaracao) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">Carregando apuração IBS/CBS...</div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/app/declaracoes/${declaracao.id}`)}
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                Apuração IBS/CBS — {declaracao.expand?.cliente_id?.nome}
              </h1>
              <Badge className="bg-emerald-600 text-white text-[10px]">
                Ano {declaracao.ano_calendario}
              </Badge>
              <StatusBadge status={declaracao.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              CPF: <span className="font-mono">{declaracao.expand?.cliente_id?.cpf}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/declaracoes/${declaracao.id}`)}
            className="text-xs gap-1.5 font-semibold h-9"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ver Declaração IRPF</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="text-xs gap-1.5 font-semibold h-9"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </Button>
        </div>
      </div>

      {/* Conteúdo da Apuração */}
      <TabIbsCbs declaracao={declaracao} />
    </div>
  )
}
