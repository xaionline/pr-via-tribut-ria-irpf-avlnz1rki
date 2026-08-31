import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Calculator,
  Sliders,
  Scale,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  getEmpresa,
  deleteEmpresa,
  getSociosDaEmpresa,
  getFaturamentosEmpresa,
} from '@/services/empresas'
import { processarApuracaoEmpresa } from '@/services/apuracaoPj'
import { EmpresaSociosTab } from './EmpresaSociosTab'
import { EmpresaApuracaoTab } from './EmpresaApuracaoTab'
import { ComparadorRegimesTab } from './ComparadorRegimesTab'
import { SimuladorResumoPjTab } from './SimuladorResumoPjTab'
import { maskCnpj, formatDate } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  EmpresaFaturamentoRecord,
  ComparativoRegimesResultado,
} from '@/types'

type TabKey = 'resumo-simulador' | 'comparador' | 'apuracao' | 'socios'

export default function EmpresaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [empresa, setEmpresa] = useState<EmpresaRecord | null>(null)
  const [socios, setSocios] = useState<EmpresaSocioRecord[]>([])
  const [faturamentos, setFaturamentos] = useState<EmpresaFaturamentoRecord[]>([])
  const [apuracaoCompleta, setApuracaoCompleta] = useState<any | null>(null)
  const [comparativo, setComparativo] = useState<ComparativoRegimesResultado | null>(null)
  const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear())

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('resumo-simulador')
  const [deleting, setDeleting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const carregar = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [emp, socs, fats] = await Promise.all([
        getEmpresa(id),
        getSociosDaEmpresa(id),
        getFaturamentosEmpresa(id, selectedAno),
      ])
      setEmpresa(emp)
      setSocios(socs)
      setFaturamentos(fats)

      const apRes = await processarApuracaoEmpresa(emp, selectedAno)
      setApuracaoCompleta(apRes)
      setComparativo(apRes.comparativoRegimes)
    } catch (err) {
      toast({
        title: 'Erro ao carregar dados da empresa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [id, selectedAno])

  const handleDelete = async () => {
    if (!empresa) return
    setDeleting(true)
    try {
      await deleteEmpresa(empresa.id)
      toast({ title: 'Empresa excluída com sucesso!' })
      navigate('/app/empresas')
    } catch (err) {
      toast({
        title: 'Erro ao excluir empresa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!empresa) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-800">Empresa não encontrada</h2>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/app/empresas')}>
          Voltar para Empresas
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER DE NAVEGAÇÃO & AÇÕES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/empresas')}
            className="h-9 w-9 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{empresa.razao_social}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-9"
            onClick={() => navigate(`/app/empresas/${empresa.id}/editar`)}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar Cadastro</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs gap-1.5 h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </Button>
        </div>
      </div>

      {/* CARD PRINCIPAL DE INFORMAÇÕES DA EMPRESA */}
      <Card className="p-5 border-slate-200/80 bg-white shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs capitalize font-semibold bg-blue-50 text-blue-700 border-blue-200"
              >
                Regime:{' '}
                {empresa.regime === 'simples'
                  ? `Simples Nacional (Anexo ${empresa.anexo_simples || 'III'})`
                  : empresa.regime === 'presumido'
                    ? 'Lucro Presumido'
                    : 'Lucro Real (Não-Cumulativo)'}
              </Badge>

              {empresa.atividade && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {empresa.atividade}
                </Badge>
              )}

              {comparativo && (
                <Badge className="bg-emerald-600 text-white border-0 text-[11px] font-bold gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Mais Vantajoso: {comparativo.regimes[comparativo.melhorRegime].nomeRegime}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="font-mono font-medium">CNPJ: {maskCnpj(empresa.cnpj)}</span>
              {empresa.data_abertura && <span>Abertura: {formatDate(empresa.data_abertura)}</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* NAVEGAÇÃO DE ABAS REESTRUTURADA COM SIMULADOR E COMPARADOR */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('resumo-simulador')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'resumo-simulador'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-600" />
          Resumo & Simulador PJ
        </button>

        <button
          onClick={() => setActiveTab('comparador')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'comparador'
              ? 'border-blue-600 text-blue-700 bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4 text-blue-600" />
          Comparador de Regimes (Simples vs Presumido vs Real)
        </button>

        <button
          onClick={() => setActiveTab('apuracao')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'apuracao'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4 text-indigo-600" />
          Apuração & Faturamentos
        </button>

        <button
          onClick={() => setActiveTab('socios')}
          className={`flex items-center gap-2 px-4 sm:px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'socios'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          Sócios & Quotas
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === 'resumo-simulador' && (
        <SimuladorResumoPjTab
          empresa={empresa}
          socios={socios}
          faturamentos={faturamentos}
          ano={selectedAno}
        />
      )}

      {activeTab === 'comparador' && (
        <ComparadorRegimesTab
          comparativo={comparativo}
          regimeAtual={empresa.regime}
          ano={selectedAno}
          onNavigateToSimulador={() => setActiveTab('resumo-simulador')}
        />
      )}

      {activeTab === 'apuracao' && (
        <EmpresaApuracaoTab
          empresa={empresa}
          anoCalendario={selectedAno}
          faturamentos={faturamentos}
          apuracaoCompleta={apuracaoCompleta}
          onAnoChange={(ano) => setSelectedAno(ano)}
          onFaturamentosUpdated={carregar}
        />
      )}
      {activeTab === 'socios' && <EmpresaSociosTab empresa={empresa} />}

      {/* MODAL EXCLUIR */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresa?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a empresa <strong>{empresa.razao_social}</strong> e todo o seu
              histórico de faturamentos e vínculos societários. Esta operação não pode ser desfeita.
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
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
