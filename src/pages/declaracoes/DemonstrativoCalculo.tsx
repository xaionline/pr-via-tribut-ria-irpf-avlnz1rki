import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { fetchDemonstrativoData, type DemonstrativoData } from '@/services/demonstrativo'
import { computeSteps } from '@/lib/demonstrativo-calc'
import { DemonstrativoHeader } from '@/components/demonstrativo/DemonstrativoHeader'
import { CalculationSteps } from '@/components/demonstrativo/CalculationSteps'
import { ComparativoModalidades } from '@/components/demonstrativo/ComparativoModalidades'
import { AliquotaEfetiva } from '@/components/demonstrativo/AliquotaEfetiva'
import { DemonstrativoFooter } from '@/components/demonstrativo/DemonstrativoFooter'
import { getEscritorio } from '@/services/escritorio'
import type { ResultadoRecord, EscritorioRecord } from '@/types'

export default function DemonstrativoCalculo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, escritorio } = useAuth()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DemonstrativoData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [escritorioData, setEscritorioData] = useState<EscritorioRecord | null>(escritorio)

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchDemonstrativoData(id)
      setData(result)
      if (result.declaracao.escritorio_id) {
        getEscritorio(result.declaracao.escritorio_id)
          .then(setEscritorioData)
          .catch(() => {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime<ResultadoRecord>('resultados', (e) => {
    if (e.record.declaracao_id === id) loadData()
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
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
          Esta declaração ainda não foi calculada. Calcule-a primeiro para visualizar o
          demonstrativo.
        </p>
        <Button
          onClick={() => navigate(`/app/declaracoes/${id}`)}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para a declaração
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xs text-slate-500">Erro ao carregar dados.</p>
        <Button onClick={() => navigate(`/app/declaracoes/${id}`)} className="mt-4 text-xs gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>
    )
  }

  const clienteEmail = data.declaracao.expand?.cliente_id?.email

  return (
    <div className="pb-32 lg:pb-20">
      <div className="no-print mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/app/declaracoes/${id}`)}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <h1 className="text-sm font-bold text-slate-700">Demonstrativo de Cálculo</h1>
      </div>

      <div className="demo-paper bg-white lg:rounded-xl lg:shadow-lg lg:border lg:border-slate-200/60 lg:max-w-[820px] mx-auto p-4 sm:p-6 lg:p-10">
        <DemonstrativoHeader
          declaracao={data.declaracao}
          escritorio={escritorioData}
          user={user}
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

      <DemonstrativoFooter declaracao={data.declaracao} clienteEmail={clienteEmail} />
    </div>
  )
}
