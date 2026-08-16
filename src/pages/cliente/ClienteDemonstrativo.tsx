import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { fetchDemonstrativoData } from '@/services/demonstrativo'
import { getEscritorio } from '@/services/escritorio'
import { registrarAuditoria } from '@/services/configuracoes'
import { computeSteps } from '@/lib/demonstrativo-calc'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { DemonstrativoHeader } from '@/components/demonstrativo/DemonstrativoHeader'
import { CalculationSteps } from '@/components/demonstrativo/CalculationSteps'
import { ComparativoModalidades } from '@/components/demonstrativo/ComparativoModalidades'
import { AliquotaEfetiva } from '@/components/demonstrativo/AliquotaEfetiva'
import { ClienteDemonstrativoFooter } from '@/components/demonstrativo/ClienteDemonstrativoFooter'
import type { EscritorioRecord } from '@/types'

interface Props {
  declaracaoId: string
}

/** Demonstrativo de cálculo em modo somente leitura para o cliente. */
export function ClienteDemonstrativo({ declaracaoId }: Props) {
  const navigate = useNavigate()
  const { user, escritorio } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchDemonstrativoData>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [escritorioData, setEscritorioData] = useState<EscritorioRecord | null>(escritorio)

  const loadData = async () => {
    if (!declaracaoId) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchDemonstrativoData(declaracaoId)
      setData(result)
      if (result.declaracao.escritorio_id) {
        getEscritorio(result.declaracao.escritorio_id)
          .then(setEscritorioData)
          .catch(() => {})
      }
      // Auditoria: visualização do demonstrativo pelo cliente.
      registrarAuditoria('visualizar_demonstrativo', 'declaracoes', declaracaoId, {
        ano_calendario: result.declaracao.ano_calendario,
      }).catch(() => {})
    } catch (err) {
      setError(err instanceof Error ? err.message : getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declaracaoId])
  useRealtime('resultados', (e) => {
    if (e.record.declaracao_id === declaracaoId) loadData()
  })

  const steps = useMemo(() => {
    if (!data) return []
    return computeSteps({
      resultado: data.resultado,
      rendimentos: data.rendimentos,
      despesas: data.despesas,
      atividadesRurais: data.atividadesRurais,
      destinacoes: data.destinacoes,
      tabela: data.tabela,
    })
  }, [data])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500">Carregando demonstrativo...</p>
      </div>
    )
  }

  if (error === 'NO_RESULTADO' || !data?.resultado) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileX className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Nenhum cálculo encontrado</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Esta declaração ainda não foi calculada. Entre em contato com seu contador para mais
          informações.
        </p>
        <Button
          onClick={() => navigate('/app/cliente')}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xs text-slate-500">Não foi possível carregar o demonstrativo.</p>
        <Button onClick={() => navigate('/app/cliente')} className="mt-4 text-xs gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="pb-32 lg:pb-20">
      <div className="no-print mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/cliente')}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <h1 className="text-sm font-bold text-slate-700">Demonstrativo de Cálculo</h1>
        <span className="ml-2 text-[10px] uppercase font-semibold tracking-wider text-slate-400">
          Somente leitura
        </span>
      </div>

      <div className="demo-paper bg-white lg:rounded-xl lg:shadow-lg lg:border lg:border-slate-200/60 lg:max-w-[820px] mx-auto p-4 sm:p-6 lg:p-10">
        <DemonstrativoHeader
          declaracao={data.declaracao}
          escritorio={escritorioData}
          user={user}
          readOnly
          onLogoUploaded={() => {
            if (data.declaracao.escritorio_id) {
              getEscritorio(data.declaracao.escritorio_id)
                .then(setEscritorioData)
                .catch(() => {})
            }
          }}
        />

        <div className="space-y-6">
          <CalculationSteps steps={steps} />
          <ComparativoModalidades resultado={data.resultado} />
          <AliquotaEfetiva resultado={data.resultado} tabela={data.tabela} />
        </div>
      </div>

      <ClienteDemonstrativoFooter declaracao={data.declaracao} />
    </div>
  )
}
