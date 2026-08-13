import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, CheckCircle2, FileText, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/StatusBadge'
import { getDeclaracao, calcularDeclaracao } from '@/services/declaracoes'
import type { DeclaracaoRecord, CalcularResponse } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

import TabVisaoGeral from './tabs/TabVisaoGeral'
import TabFontesPagadoras from './tabs/TabFontesPagadoras'
import TabRendimentos from './tabs/TabRendimentos'
import TabDespesas from './tabs/TabDespesas'
import TabDependentes from './tabs/TabDependentes'
import TabAtividadesRurais from './tabs/TabAtividadesRurais'
import TabDestinacoesFiscais from './tabs/TabDestinacoesFiscais'

export default function DeclaracaoDetail() {
  const { declaracaoId } = useParams<{ declaracaoId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isVisualizador } = useAuth()

  const [declaracao, setDeclaracao] = useState<DeclaracaoRecord | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState<CalcularResponse | null>(null)
  const [activeTab, setActiveTab] = useState('visao_geral')

  const loadData = async () => {
    if (!declaracaoId) return
    try {
      const d = await getDeclaracao(declaracaoId)
      setDeclaracao(d)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const handleCalcular = async () => {
    if (!declaracaoId) return
    setCalculating(true)
    try {
      const result = await calcularDeclaracao(declaracaoId)
      setCalcResult(result)
      toast({
        title: 'Cálculo concluído!',
        description: 'Comparativo disponível na aba Visão Geral.',
      })
      loadData()
      setActiveTab('visao_geral')
    } catch {
      toast({
        title: 'Erro no cálculo',
        description: 'Falha ao processar a prévia.',
        variant: 'destructive',
      })
    } finally {
      setCalculating(false)
    }
  }

  if (!declaracao) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Carregando detalhes da declaração...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/declaracoes')}>
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                {declaracao.expand?.cliente_id?.nome} - Ano {declaracao.ano_calendario}
              </h1>
              <StatusBadge status={declaracao.status} />
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Salvo automaticamente
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              CPF: <span className="font-mono">{declaracao.expand?.cliente_id?.cpf}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/app/declaracoes/${declaracao.id}/demonstrativo`)}
            className="text-xs gap-2 font-semibold"
          >
            <FileText className="w-4 h-4" />
            <span>Demonstrativo</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/app/declaracoes/${declaracao.id}/simulador`)}
            className="text-xs gap-2 font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Simular</span>
          </Button>
          <Button
            onClick={handleCalcular}
            disabled={calculating || isVisualizador}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            <span>{calculating ? 'Calculando...' : 'Calcular Prévia'}</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border flex overflow-x-auto justify-start">
          <TabsTrigger value="visao_geral" className="text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="fontes" className="text-xs">
            Fontes Pagadoras
          </TabsTrigger>
          <TabsTrigger value="rendimentos" className="text-xs">
            Rendimentos
          </TabsTrigger>
          <TabsTrigger value="despesas" className="text-xs">
            Despesas
          </TabsTrigger>
          <TabsTrigger value="dependentes" className="text-xs">
            Dependentes
          </TabsTrigger>
          <TabsTrigger value="rurais" className="text-xs">
            Atividade Rural
          </TabsTrigger>
          <TabsTrigger value="destinacoes" className="text-xs">
            Destinações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao_geral">
          <TabVisaoGeral
            declaracao={declaracao}
            onRefresh={loadData}
            calcResult={calcResult}
            isVisualizador={isVisualizador}
          />
        </TabsContent>
        <TabsContent value="fontes">
          <TabFontesPagadoras declaracaoId={declaracao.id} />
        </TabsContent>
        <TabsContent value="rendimentos">
          <TabRendimentos declaracaoId={declaracao.id} />
        </TabsContent>
        <TabsContent value="despesas">
          <TabDespesas declaracaoId={declaracao.id} />
        </TabsContent>
        <TabsContent value="dependentes">
          <TabDependentes declaracaoId={declaracao.id} />
        </TabsContent>
        <TabsContent value="rurais">
          <TabAtividadesRurais declaracaoId={declaracao.id} />
        </TabsContent>
        <TabsContent value="destinacoes">
          <TabDestinacoesFiscais declaracaoId={declaracao.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
