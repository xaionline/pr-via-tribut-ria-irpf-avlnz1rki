import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Building2,
  ArrowLeft,
  Sliders,
  Sparkles,
  Save,
  Trash2,
  FileDown,
  Percent,
  Layers,
  Star,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Coins,
  ShieldAlert,
  Loader2,
  Copy,
  Printer,
  FileText,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatNumber, maskCnpj } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  getEmpresa,
  getAllEmpresas,
  getSociosDaEmpresa,
  getFaturamentosEmpresa,
} from '@/services/empresas'
import { processarApuracaoEmpresa } from '@/services/apuracaoPj'
import {
  simularCenarioPj,
  getCenariosPj,
  createCenarioPj,
  updateCenarioPj,
  deleteCenarioPj,
} from '@/services/simulacaoPj'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  EmpresaFaturamentoRecord,
  SimulacaoPjParams,
  SimulacaoPjResultados,
  CenarioSimulacaoPjRecord,
  ApuracaoEmpresaResultado,
} from '@/types'

const SALARIO_MINIMO_2025 = 1518

interface PlanejadorRetiradasProps {
  empresaId?: string
  initialAno?: number
  isTab?: boolean
}

export default function PlanejadorRetiradas({
  empresaId: propEmpresaId,
  initialAno,
  isTab = false,
}: PlanejadorRetiradasProps) {
  const routeParams = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const currentEmpresaId = propEmpresaId || routeParams.id || ''

  // Lista de empresas para o seletor quando acessado diretamente pelo menu geral
  const [empresasLista, setEmpresasLista] = useState<EmpresaRecord[]>([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>(currentEmpresaId)

  // Ano selecionado
  const currentYear = new Date().getFullYear()
  const [selectedAno, setSelectedAno] = useState<number>(initialAno || currentYear)

  // Dados da Empresa
  const [empresa, setEmpresa] = useState<EmpresaRecord | null>(null)
  const [socios, setSocios] = useState<EmpresaSocioRecord[]>([])
  const [faturamentos, setFaturamentos] = useState<EmpresaFaturamentoRecord[]>([])
  const [apuracao, setApuracao] = useState<ApuracaoEmpresaResultado | null>(null)
  const [loading, setLoading] = useState(true)

  // 1. Total a Distribuir Mensal (e Anual)
  const [retiradaMensal, setRetiradaMensal] = useState<number>(0)
  // 2. Composição: % Pró-labore vs % Dividendos (0 = 100% dividendos, 100 = 100% pró-labore)
  const [splitProLabore, setSplitProLabore] = useState<number>(30)
  const [considerarJcp, setConsiderarJcp] = useState<boolean>(false)
  const [jcpMensal, setJcpMensal] = useState<number>(0)

  // 3. Sócios e Pro-labores / Cotas
  const [sociosConfig, setSociosConfig] = useState<
    {
      socio_id: string
      cliente_id: string
      cliente_nome: string
      percentual_participacao: number
      pro_labore_mensal: number
      percentual_distribuicao_lucros: number
      collapsed?: boolean
    }[]
  >([])

  // Resultados em tempo real
  const [resultados, setResultados] = useState<SimulacaoPjResultados | null>(null)
  const [calculating, setCalculating] = useState(false)

  // Cenários Persistidos
  const [cenarios, setCenarios] = useState<CenarioSimulacaoPjRecord[]>([])
  const [selectedCenarioId, setSelectedCenarioId] = useState<string | 'draft'>('draft')

  // Modais
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [scenarioToCompare, setScenarioToCompare] = useState<CenarioSimulacaoPjRecord | null>(null)
  const [cenarioNomeInput, setCenarioNomeInput] = useState('')
  const [marcarRecomendadoInput, setMarcarRecomendadoInput] = useState(false)
  const [dataReferenciaInput, setDataReferenciaInput] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [savingCenario, setSavingCenario] = useState(false)

  // Exclusão de cenário
  const [cenarioToDelete, setCenarioToDelete] = useState<CenarioSimulacaoPjRecord | null>(null)

  // Rascunho automático em LocalStorage por empresa + ano
  const draftKey = `planejador_draft_${selectedEmpresaId}_${selectedAno}`
  const isInternalUpdate = useRef(false)

  // Carregar lista de empresas caso não tenha id inicial
  useEffect(() => {
    getAllEmpresas()
      .then((res) => {
        setEmpresasLista(res)
        if (!selectedEmpresaId && res.length > 0) {
          setSelectedEmpresaId(res[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Sincronizar selectedEmpresaId com prop / rota
  useEffect(() => {
    if (propEmpresaId && propEmpresaId !== selectedEmpresaId) {
      setSelectedEmpresaId(propEmpresaId)
    } else if (routeParams.id && routeParams.id !== selectedEmpresaId) {
      setSelectedEmpresaId(routeParams.id)
    }
  }, [propEmpresaId, routeParams.id])

  // Carregar Dados da Empresa selecionada
  useEffect(() => {
    if (!selectedEmpresaId) return

    let isMounted = true
    setLoading(true)

    async function loadData() {
      try {
        const [emp, socs, fats, cens] = await Promise.all([
          getEmpresa(selectedEmpresaId),
          getSociosDaEmpresa(selectedEmpresaId),
          getFaturamentosEmpresa(selectedEmpresaId, selectedAno),
          getCenariosPj(selectedEmpresaId, selectedAno),
        ])

        if (!isMounted) return

        setEmpresa(emp)
        setSocios(socs)
        setFaturamentos(fats)
        setCenarios(cens)

        // Processa a apuração para obter o lucro contábil / distribuível disponível
        const apRes = await processarApuracaoEmpresa(emp, selectedAno)
        setApuracao(apRes)

        const lucroDisponivel = apRes.lucroDistribuivel || 0
        const lucroDisponivelMensal = Math.max(0, Math.round(lucroDisponivel / 12))

        // Recuperar rascunho automático salvo
        let draftApplied = false
        try {
          const draftRaw = localStorage.getItem(draftKey)
          if (draftRaw) {
            const draft = JSON.parse(draftRaw)
            setRetiradaMensal(draft.retiradaMensal ?? lucroDisponivelMensal)
            setSplitProLabore(draft.splitProLabore ?? 30)
            setConsiderarJcp(draft.considerarJcp ?? false)
            setJcpMensal(draft.jcpMensal ?? 0)
            if (draft.sociosConfig && Array.isArray(draft.sociosConfig)) {
              setSociosConfig(draft.sociosConfig)
            } else {
              initSociosConfig(
                socs,
                draft.retiradaMensal ?? lucroDisponivelMensal,
                draft.splitProLabore ?? 30,
              )
            }
            draftApplied = true
          }
        } catch {
          /* intentionally ignored */
        }

        if (!draftApplied) {
          // Inicialização padrão
          const defaultRetirada = lucroDisponivelMensal > 0 ? lucroDisponivelMensal : 20000
          setRetiradaMensal(defaultRetirada)
          setSplitProLabore(30)
          setConsiderarJcp(false)
          setJcpMensal(0)
          initSociosConfig(socs, defaultRetirada, 30)
        }

        setSelectedCenarioId('draft')
      } catch (err) {
        toast({
          title: 'Erro ao carregar dados da empresa',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [selectedEmpresaId, selectedAno])

  const initSociosConfig = (
    socList: EmpresaSocioRecord[],
    totRetirada: number,
    splitPl: number,
  ) => {
    const proLaboreGlobal = (totRetirada * splitPl) / 100
    const configs = socList.map((s) => {
      const pct = Number(s.percentual_participacao) || 100 / (socList.length || 1)
      const proLaboreIndividual = Math.round((proLaboreGlobal * pct) / 100)
      return {
        socio_id: s.id,
        cliente_id: s.cliente_id,
        cliente_nome: s.expand?.cliente_id?.nome || 'Sócio',
        percentual_participacao: pct,
        pro_labore_mensal: proLaboreIndividual,
        percentual_distribuicao_lucros: pct,
        collapsed: false,
      }
    })
    setSociosConfig(configs)
  }

  // Lucro apurado disponível
  const lucroDisponivelAnual = apuracao?.lucroDistribuivel || 0
  const lucroDisponivelMensal = Math.max(0, Math.round(lucroDisponivelAnual / 12))
  const maxRetiradaPermitida = Math.max(lucroDisponivelMensal * 1.5, 100000)

  // Sincronizar pró-labore dos sócios quando o split ou total a retirar é alterado no slider geral
  const handleRetiradaGeralChange = (novaRetirada: number, novoSplit: number) => {
    isInternalUpdate.current = true
    setRetiradaMensal(novaRetirada)
    setSplitProLabore(novoSplit)

    const proLaboreTotalMensal = (novaRetirada * novoSplit) / 100

    setSociosConfig((prev) =>
      prev.map((sc) => {
        const pct = sc.percentual_participacao || 100 / prev.length
        return {
          ...sc,
          pro_labore_mensal: Math.round((proLaboreTotalMensal * pct) / 100),
        }
      }),
    )
  }

  // Quando o pró-labore individual de um sócio é editado
  const handleProLaboreSocioChange = (socioId: string, val: number) => {
    isInternalUpdate.current = true
    setSociosConfig((prev) => {
      const next = prev.map((s) => (s.socio_id === socioId ? { ...s, pro_labore_mensal: val } : s))
      // Recalcula o split de pro-labore geral
      const sumPl = next.reduce((acc, curr) => acc + curr.pro_labore_mensal, 0)
      if (retiradaMensal > 0) {
        const calculatedSplit = Math.min(100, Math.round((sumPl / retiradaMensal) * 100))
        setSplitProLabore(calculatedSplit)
      }
      return next
    })
  }

  const handlePctDistribuicaoSocioChange = (socioId: string, val: number) => {
    isInternalUpdate.current = true
    setSociosConfig((prev) =>
      prev.map((s) => (s.socio_id === socioId ? { ...s, percentual_distribuicao_lucros: val } : s)),
    )
  }

  const toggleSocioCollapse = (socioId: string) => {
    setSociosConfig((prev) =>
      prev.map((s) => (s.socio_id === socioId ? { ...s, collapsed: !s.collapsed } : s)),
    )
  }

  // Recálculo da simulação em tempo real
  useEffect(() => {
    if (!empresa || sociosConfig.length === 0) return

    let active = true
    setCalculating(true)

    async function runSim() {
      try {
        const params: SimulacaoPjParams = {
          retirada_mensal_total: retiradaMensal,
          split_pro_labore_perc: splitProLabore,
          considerar_jcp: considerarJcp,
          jcp_mensal_total: considerarJcp ? jcpMensal : 0,
          socios_params: sociosConfig.map((sc) => ({
            socio_id: sc.socio_id,
            cliente_id: sc.cliente_id,
            cliente_nome: sc.cliente_nome,
            pro_labore_mensal: sc.pro_labore_mensal,
            percentual_distribuicao_lucros: sc.percentual_distribuicao_lucros,
            percentual_participacao: sc.percentual_participacao,
          })),
        }

        const res = await simularCenarioPj(empresa, faturamentos, socios, selectedAno, params)
        if (active) {
          setResultados(res)

          // Gravação do rascunho automático
          localStorage.setItem(
            draftKey,
            JSON.stringify({
              retiradaMensal,
              splitProLabore,
              considerarJcp,
              jcpMensal,
              sociosConfig,
              updatedAt: new Date().toISOString(),
            }),
          )
        }
      } catch (err) {
        console.error('Erro na simulação:', err)
      } finally {
        if (active) setCalculating(false)
      }
    }

    runSim()
    return () => {
      active = false
    }
  }, [
    empresa,
    faturamentos,
    socios,
    selectedAno,
    retiradaMensal,
    splitProLabore,
    considerarJcp,
    jcpMensal,
    sociosConfig,
  ])

  // Valores calculados de Composição
  const proLaboreMensalCalculado = (retiradaMensal * splitProLabore) / 100
  const dividendosMensalCalculado = Math.max(0, retiradaMensal - proLaboreMensalCalculado)
  const retiradaAnualCalculada = retiradaMensal * 12

  // Indicadores de Alertas e Regras em tempo real
  const faturamentoTotalAnual = useMemo(() => {
    return faturamentos
      .filter((f) => f.ano_calendario === selectedAno)
      .reduce((s, f) => s + (Number(f.receita_bruta) || 0), 0)
  }, [faturamentos, selectedAno])

  const folhaSimuladaAnual = proLaboreMensalCalculado * 12
  const fatorRSimulado =
    faturamentoTotalAnual > 0 ? (folhaSimuladaAnual / faturamentoTotalAnual) * 100 : 0
  const atingiuFatorR = fatorRSimulado >= 28

  const minProLaboreAtingido = sociosConfig.every(
    (s) => s.pro_labore_mensal >= SALARIO_MINIMO_2025 || s.pro_labore_mensal === 0,
  )

  const alertaAltasRendas = useMemo(() => {
    if (!resultados) return false
    return resultados.socios.some((s) => s.lucros_distribuidos > 600000)
  }, [resultados])

  const anexoSimplesInfo = useMemo(() => {
    if (empresa?.regime !== 'simples') return null
    const anexoOrig = empresa.anexo_simples || 'III'
    if (anexoOrig === 'V') {
      return atingiuFatorR
        ? {
            alterou: true,
            de: 'V',
            para: 'III',
            mensagem: 'Migrou de Anexo V para Anexo III (Economia)',
          }
        : { alterou: false, de: 'V', para: 'V', mensagem: 'Mantido no Anexo V (Fator R < 28%)' }
    }
    return null
  }, [empresa, atingiuFatorR])

  // Ações de Cenários
  const handleNovoCenario = () => {
    initSociosConfig(socios, 0, 0)
    setRetiradaMensal(0)
    setSplitProLabore(0)
    setConsiderarJcp(false)
    setJcpMensal(0)
    setSelectedCenarioId('draft')
    toast({
      title: 'Novo cenário em branco',
      description: 'Sliders zerados para nova modelagem.',
    })
  }

  const handleCarregarCenario = (cenario: CenarioSimulacaoPjRecord) => {
    setSelectedCenarioId(cenario.id)
    if (cenario.params) {
      if (cenario.params.retirada_mensal_total !== undefined) {
        setRetiradaMensal(cenario.params.retirada_mensal_total)
      }
      if (cenario.params.split_pro_labore_perc !== undefined) {
        setSplitProLabore(cenario.params.split_pro_labore_perc)
      }
      setConsiderarJcp(!!cenario.params.considerar_jcp)
      setJcpMensal(cenario.params.jcp_mensal_total || 0)

      if (cenario.params.socios_params && cenario.params.socios_params.length > 0) {
        setSociosConfig(
          cenario.params.socios_params.map((sp) => ({
            socio_id: sp.socio_id,
            cliente_id: sp.cliente_id,
            cliente_nome: sp.cliente_nome,
            percentual_participacao: sp.percentual_participacao || 0,
            pro_labore_mensal: sp.pro_labore_mensal,
            percentual_distribuicao_lucros: sp.percentual_distribuicao_lucros,
            collapsed: false,
          })),
        )
      }
    }
    toast({
      title: `Cenário "${cenario.nome}" carregado`,
      description: 'Todos os parâmetros foram aplicados.',
    })
  }

  const handleSalvarCenarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cenarioNomeInput.trim() || !resultados || !empresa) return

    setSavingCenario(true)
    try {
      const novoCenario = await createCenarioPj({
        empresa_id: empresa.id,
        ano_calendario: selectedAno,
        nome: cenarioNomeInput.trim(),
        recomendado: marcarRecomendadoInput,
        params: {
          retirada_mensal_total: retiradaMensal,
          split_pro_labore_perc: splitProLabore,
          considerar_jcp: considerarJcp,
          jcp_mensal_total: considerarJcp ? jcpMensal : 0,
          socios_params: sociosConfig.map((sc) => ({
            socio_id: sc.socio_id,
            cliente_id: sc.cliente_id,
            cliente_nome: sc.cliente_nome,
            pro_labore_mensal: sc.pro_labore_mensal,
            percentual_distribuicao_lucros: sc.percentual_distribuicao_lucros,
            percentual_participacao: sc.percentual_participacao,
          })),
        },
        resultados,
      })

      const updatedList = await getCenariosPj(empresa.id, selectedAno)
      setCenarios(updatedList)
      setSelectedCenarioId(novoCenario.id)
      setSaveModalOpen(false)
      setCenarioNomeInput('')
      setMarcarRecomendadoInput(false)

      toast({
        title: 'Cenário salvo com sucesso!',
        description: `Snapshot "${novoCenario.nome}" armazenado.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar cenário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingCenario(false)
    }
  }

  const handleConfirmDeleteCenario = async () => {
    if (!cenarioToDelete) return
    try {
      await deleteCenarioPj(cenarioToDelete.id)
      toast({
        title: 'Cenário excluído',
        description: `Cenário "${cenarioToDelete.nome}" removido com sucesso.`,
      })
      if (selectedCenarioId === cenarioToDelete.id) {
        setSelectedCenarioId('draft')
      }
      setCenarioToDelete(null)
      if (empresa) {
        const list = await getCenariosPj(empresa.id, selectedAno)
        setCenarios(list)
      }
    } catch (err) {
      toast({
        title: 'Erro ao excluir cenário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handlePrintPdf = () => {
    window.print()
  }

  const activeCenario = cenarios.find((c) => c.id === selectedCenarioId)

  // Economia em relação ao cenário base (ou tributos PJ originais)
  const tributosPjBase = resultados?.empresa.tributos_pj_atual || 0
  const tributosGrupoAtual = resultados?.consolidado.total_tributos_grupo || 0
  const economiaPjValor = resultados?.empresa.economia_pj || 0
  const economiaGlobalValor = resultados?.consolidado.economia_global || 0
  const economiaPercentual =
    tributosPjBase > 0 ? ((economiaPjValor / tributosPjBase) * 100).toFixed(1) : '0'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    )
  }

  if (!empresa) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-800">Empresa não selecionada</h2>
        <p className="text-xs text-slate-500 mt-1">
          Selecione uma empresa para acessar o planejador de retiradas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. SELETOR DE EMPRESA NO TOPO (QUANDO ACESSADO DO MENU GERAL OU DIRETO) */}
      {!isTab && (
        <div className="no-print bg-slate-900 text-slate-100 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">
                Planejador de Retiradas PJ
              </h2>
              <p className="text-xs text-slate-400">
                Otimização tributária de Pró-labore, Dividendos e JCP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-72">
              <Select
                value={selectedEmpresaId}
                onValueChange={(val) => {
                  setSelectedEmpresaId(val)
                  navigate(`/app/empresas/${val}/planejador`)
                }}
              >
                <SelectTrigger className="h-9 bg-slate-800 border-slate-700 text-xs text-slate-200">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 text-xs">
                  {empresasLista.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="cursor-pointer text-xs">
                      {emp.razao_social} ({emp.regime.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* 2. CABEÇALHO DO PLANEJADOR */}
      <Card className="p-5 border-slate-200/80 bg-white shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/app/empresas/${empresa.id}`)}
                className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar à empresa
              </Button>

              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {empresa.razao_social}
              </h1>

              <Badge
                variant="outline"
                className="text-xs capitalize font-semibold bg-blue-50 text-blue-700 border-blue-200"
              >
                {empresa.regime === 'simples'
                  ? `Simples Nacional (Anexo ${empresa.anexo_simples || 'III'})`
                  : empresa.regime === 'presumido'
                    ? 'Lucro Presumido'
                    : 'Lucro Real'}
              </Badge>

              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                {socios.length} {socios.length === 1 ? 'sócio' : 'sócios'}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span>
                Lucro Anual Apurado:{' '}
                <strong className="text-emerald-700 font-mono font-bold">
                  {formatCurrency(lucroDisponivelAnual)}
                </strong>{' '}
                ({formatCurrency(lucroDisponivelMensal)}/mês disponível)
              </span>
              <span>CNPJ: {maskCnpj(empresa.cnpj)}</span>
            </div>
          </div>

          {/* Seletor de Ano */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <Calendar className="w-4 h-4 text-slate-400 ml-2" />
              <Select
                value={String(selectedAno)}
                onValueChange={(val) => setSelectedAno(Number(val))}
              >
                <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-bold text-slate-800 focus:ring-0 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((ano) => (
                    <SelectItem key={ano} value={String(ano)} className="text-xs">
                      Ano {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. DROPDOWN DE CENÁRIOS EM MOBILE */}
      <div className="lg:hidden no-print">
        <Card className="p-3 bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <Label className="text-[11px] font-bold uppercase text-slate-500">
                Cenário Ativo
              </Label>
              <Select
                value={selectedCenarioId}
                onValueChange={(val) => {
                  if (val === 'draft') {
                    setSelectedCenarioId('draft')
                  } else {
                    const c = cenarios.find((item) => item.id === val)
                    if (c) handleCarregarCenario(c)
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-white text-xs mt-1">
                  <SelectValue placeholder="Selecione um cenário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs font-semibold">
                    ✏️ Em edição… (Rascunho atual)
                  </SelectItem>
                  {cenarios.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.recomendado ? '⭐ ' : ''}
                      {c.nome} (
                      {formatCurrency(c.resultados?.consolidado?.total_tributos_grupo || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNovoCenario}
              className="mt-5 h-9 text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. LAYOUT PRINCIPAL: COLUNA ESQUERDA (CENÁRIOS) + ÁREA CENTRAL + RESULTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CENÁRIOS SALVOS (~280px / 3 cols) */}
        <div className="hidden lg:block lg:col-span-3 space-y-3 no-print">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Cenários Salvos
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNovoCenario}
              className="h-7 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1 px-2"
            >
              <Plus className="w-3 h-3" /> Novo cenário
            </Button>
          </div>

          {/* CARD 1: RASCUNHO AUTOMÁTICO ("Em edição...") */}
          <Card
            onClick={() => setSelectedCenarioId('draft')}
            className={`p-3.5 cursor-pointer transition-all border ${
              selectedCenarioId === 'draft'
                ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-400'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Em edição…
              </span>
              <Badge
                variant="outline"
                className="text-[10px] bg-slate-100 text-slate-600 py-0 px-1"
              >
                Rascunho
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Salvo sozinho a cada ajuste</p>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Tributos Totais:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(resultados?.consolidado.total_tributos_grupo || 0)}
              </span>
            </div>
          </Card>

          {/* LISTA DE CENÁRIOS NOMEADOS */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {cenarios.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50/50">
                <p className="text-xs text-slate-400">
                  Nenhum cenário nomeado ainda. Clique em "Salvar cenário" para criar snapshots.
                </p>
              </div>
            ) : (
              cenarios.map((c) => {
                const isSelected = selectedCenarioId === c.id
                const impostoTotal = c.resultados?.consolidado?.total_tributos_grupo || 0
                const economia = c.resultados?.empresa?.economia_pj || 0

                return (
                  <Card
                    key={c.id}
                    onClick={() => handleCarregarCenario(c)}
                    className={`p-3.5 cursor-pointer transition-all border relative ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold text-xs text-slate-900 truncate">{c.nome}</div>
                      {c.recomendado && (
                        <Badge className="bg-amber-500 text-white text-[10px] py-0 px-1.5 shrink-0 gap-1 border-0">
                          <Star className="w-2.5 h-2.5 fill-white" /> Recomendado
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Tributos:</span>
                        <strong className="text-slate-900">{formatCurrency(impostoTotal)}</strong>
                      </div>
                      {economia > 0 && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Economia:</span>
                          <span>+{formatCurrency(economia)}</span>
                        </div>
                      )}
                    </div>

                    {/* Ações quando o card está selecionado */}
                    {isSelected && (
                      <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setScenarioToCompare(c)
                            setCompareModalOpen(true)
                          }}
                          className="h-6 text-[11px] px-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50 gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Comparar
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePrintPdf()
                            }}
                            className="h-6 text-[11px] px-1.5 text-slate-700 hover:text-slate-900 gap-1"
                          >
                            <FileDown className="w-3 h-3" /> PDF
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCenarioToDelete(c)
                            }}
                            className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* ÁREA CENTRAL E RESULTADOS (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* INDICADORES & ALERTAS EM TEMPO REAL (CHIPS COLORIDOS) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chip 1: Fator R */}
            <Badge
              variant="outline"
              className={`text-xs py-1 px-2.5 font-semibold gap-1.5 ${
                atingiuFatorR
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              {atingiuFatorR ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              )}
              Fator R: {formatNumber(fatorRSimulado)}% {atingiuFatorR ? '(≥ 28% OK)' : '(< 28%)'}
            </Badge>

            {/* Chip 2: Salário Mínimo */}
            <Badge
              variant="outline"
              className={`text-xs py-1 px-2.5 font-semibold gap-1.5 ${
                minProLaboreAtingido
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {minProLaboreAtingido ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              )}
              Pró-labore ≥ 1 Salário Mínimo ({formatCurrency(SALARIO_MINIMO_2025)})
            </Badge>

            {/* Chip 3: Altas Rendas */}
            <Badge
              variant="outline"
              className={`text-xs py-1 px-2.5 font-semibold gap-1.5 ${
                alertaAltasRendas
                  ? 'bg-purple-50 text-purple-700 border-purple-300 animate-pulse'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <ShieldAlert
                className={`w-3.5 h-3.5 ${alertaAltasRendas ? 'text-purple-600' : 'text-slate-400'}`}
              />
              {alertaAltasRendas
                ? 'Altas Rendas Ativado (> R$ 600k dividendos)'
                : 'Isenção Dividendos (Teto R$ 600k OK)'}
            </Badge>

            {/* Chip 4: Anexo Simples */}
            {anexoSimplesInfo && (
              <Badge
                variant="outline"
                className={`text-xs py-1 px-2.5 font-semibold gap-1.5 ${
                  anexoSimplesInfo.alterou
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {anexoSimplesInfo.mensagem}
              </Badge>
            )}
          </div>

          {/* TRÊS CARDS EM CASCATA: AJUSTES DE RETIRADA */}
          <div className="space-y-4">
            {/* CARD 1: TOTAL A DISTRIBUIR */}
            <Card className="border border-slate-200/90 shadow-subtle bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Total a Distribuir (Retirada Global Mensal)
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold bg-white">
                    Equivalente Anual: {formatCurrency(retiradaAnualCalculada)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    Valor total mensal retirado pelos sócios (limitado ao lucro disponível de{' '}
                    <strong className="text-slate-700 font-mono">
                      {formatCurrency(lucroDisponivelMensal)}/mês
                    </strong>
                    )
                  </span>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                      {formatCurrency(retiradaMensal)}
                    </span>
                    <span className="text-xs text-slate-400 block">/ mês</span>
                  </div>
                </div>

                <Slider
                  value={[retiradaMensal]}
                  min={0}
                  max={maxRetiradaPermitida}
                  step={500}
                  onValueChange={([val]) => handleRetiradaGeralChange(val, splitProLabore)}
                  className="py-1"
                />

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>R$ 0,00</span>
                  <span>
                    Lucro disponível:{' '}
                    <strong className="text-emerald-700">
                      {formatCurrency(lucroDisponivelMensal)}
                    </strong>
                  </span>
                  <span>{formatCurrency(maxRetiradaPermitida)}</span>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: COMPOSIÇÃO (PRÓ-LABORE X DIVIDENDOS + JCP) */}
            <Card className="border border-slate-200/90 shadow-subtle bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Composição da Retirada (Pró-labore × Dividendos)
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="toggle-jcp"
                      className="text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Considerar JCP
                    </Label>
                    <Switch
                      id="toggle-jcp"
                      checked={considerarJcp}
                      onCheckedChange={(checked) => setConsiderarJcp(checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Visualizador de split */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                      Pró-labore ({splitProLabore}%)
                    </span>
                    <span className="text-lg font-black font-mono text-blue-900 mt-1 block">
                      {formatCurrency(proLaboreMensalCalculado)}/mês
                    </span>
                    <span className="text-[10px] text-blue-600">
                      {formatCurrency(proLaboreMensalCalculado * 12)}/ano (Tributável + INSS)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Dividendos ({100 - splitProLabore}%)
                    </span>
                    <span className="text-lg font-black font-mono text-emerald-900 mt-1 block">
                      {formatCurrency(dividendosMensalCalculado)}/mês
                    </span>
                    <span className="text-[10px] text-emerald-600">
                      {formatCurrency(dividendosMensalCalculado * 12)}/ano (Isento de IRPF)
                    </span>
                  </div>
                </div>

                {/* Slider Pró-labore x Dividendos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>100% Dividendos</span>
                    <span>50% / 50%</span>
                    <span>100% Pró-labore</span>
                  </div>
                  <Slider
                    value={[splitProLabore]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([val]) => handleRetiradaGeralChange(retiradaMensal, val)}
                    className="py-1"
                  />
                </div>

                {/* Sub-slider de JCP quando ligado */}
                {considerarJcp && (
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="font-bold text-purple-900 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-purple-600" />
                        Juros Sobre Capital Próprio (JCP Mensal)
                      </Label>
                      <span className="font-mono font-bold text-purple-900 text-sm">
                        {formatCurrency(jcpMensal)}/mês{' '}
                        <span className="text-[11px] font-normal text-purple-700">
                          ({formatCurrency(jcpMensal * 12)}/ano)
                        </span>
                      </span>
                    </div>
                    <Slider
                      value={[jcpMensal]}
                      min={0}
                      max={Math.max(retiradaMensal * 0.3, 20000)}
                      step={200}
                      onValueChange={([val]) => setJcpMensal(val)}
                      className="py-1"
                    />
                    <p className="text-[10px] text-purple-800">
                      JCP é tributado exclusivamente na fonte (15% IRRF) e dedutível no Lucro Real /
                      Presumido.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CARD 3: POR SÓCIO (CARDS COLAPSÁVEIS) */}
            <Card className="border border-slate-200/90 shadow-subtle bg-white overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Distribuição Individual por Sócio
                    </CardTitle>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Ajustes detalhados por quota societária
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {sociosConfig.map((soc) => {
                  const resSocio = resultados?.socios.find((r) => r.socio_id === soc.socio_id)
                  const cotaDisponivelSocio =
                    (lucroDisponivelAnual * soc.percentual_participacao) / 100

                  return (
                    <div
                      key={soc.socio_id}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40"
                    >
                      {/* Header do sócio com toggle colapsável */}
                      <button
                        type="button"
                        onClick={() => toggleSocioCollapse(soc.socio_id)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                            {soc.cliente_nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                              {soc.cliente_nome}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Participação:{' '}
                              <strong className="text-slate-800">
                                {formatNumber(soc.percentual_participacao)}%
                              </strong>{' '}
                              | Cota de Lucro Anual:{' '}
                              <strong className="text-emerald-700 font-mono">
                                {formatCurrency(cotaDisponivelSocio)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              IRPF Estimado
                            </span>
                            <span className="text-xs font-bold font-mono text-purple-700">
                              {formatCurrency(resSocio?.total_irpf_socio || 0)}
                            </span>
                          </div>
                          {soc.collapsed ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Conteúdo expandido */}
                      {!soc.collapsed && (
                        <div className="p-4 border-t border-slate-200 bg-white space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Slider Pró-labore Mensal */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <Label className="font-semibold text-slate-700">
                                  Pró-labore Mensal Individual
                                </Label>
                                <span className="font-mono font-bold text-blue-700">
                                  {formatCurrency(soc.pro_labore_mensal)}/mês
                                </span>
                              </div>
                              <Slider
                                value={[soc.pro_labore_mensal]}
                                min={0}
                                max={50000}
                                step={500}
                                onValueChange={([val]) =>
                                  handleProLaboreSocioChange(soc.socio_id, val)
                                }
                                className="py-1"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>R$ 0</span>
                                <span>Anual: {formatCurrency(soc.pro_labore_mensal * 12)}</span>
                                <span>R$ 50.000</span>
                              </div>
                            </div>

                            {/* Campo % de Distribuição de Lucros */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <Label className="font-semibold text-slate-700">
                                  % Distribuição de Lucros da Cota
                                </Label>
                                <span className="font-mono font-bold text-emerald-700">
                                  {soc.percentual_distribuicao_lucros}% (
                                  {formatCurrency(resSocio?.lucros_distribuidos || 0)})
                                </span>
                              </div>
                              <Slider
                                value={[soc.percentual_distribuicao_lucros]}
                                min={0}
                                max={100}
                                step={5}
                                onValueChange={([val]) =>
                                  handlePctDistribuicaoSocioChange(soc.socio_id, val)
                                }
                                className="py-1"
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>0% (Reter)</span>
                                <span>100% (Distribuir total)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* 5. RESULTADO DO CENÁRIO */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Resultado Consolidado do Cenário
            </h3>

            {/* 4 CARDS KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Tributos PJ */}
              <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tributos PJ
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1.5">
                  {formatCurrency(resultados?.empresa.tributos_pj_otimizado || 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Original: {formatCurrency(tributosPjBase)}
                </div>
              </Card>

              {/* KPI 2: IRPF dos Sócios */}
              <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  IRPF dos Sócios ({socios.length})
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-purple-700 mt-1.5">
                  {formatCurrency(
                    resultados?.socios.reduce((s, r) => s + r.total_irpf_socio, 0) || 0,
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">Pró-labore + Altas Rendas + JCP</div>
              </Card>

              {/* KPI 3: Total do Grupo */}
              <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Grupo (PJ + Sócios)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1.5">
                  {formatCurrency(tributosGrupoAtual)}
                </div>
                <div className="text-xs text-emerald-700 mt-1 font-bold">
                  Carga Global: {formatNumber(resultados?.consolidado.carga_global_perc || 0)}%
                </div>
              </Card>

              {/* KPI 4: Economia Alcançada */}
              <Card className="p-4 border-emerald-300 bg-emerald-50/70 shadow-subtle">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Economia Estimada
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-1.5">
                  {formatCurrency(economiaPjValor)}
                </div>
                <div className="text-xs text-emerald-800 mt-1 font-bold">
                  +{economiaPercentual}% de redução
                </div>
              </Card>
            </div>

            {/* LINHA DE DESTAQUE COM CARGA EFETIVA E ECONOMIA */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Carga Efetiva Otimizada
                </span>
                <div className="text-2xl font-black font-mono mt-0.5">
                  {formatNumber(resultados?.empresa.carga_tributaria_otimizada || 0)}%
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    (Antes: {formatNumber(resultados?.empresa.carga_tributaria_atual || 0)}%)
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Economia vs Cenário Base
                </span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                  {formatCurrency(economiaPjValor)} ({economiaPercentual}%)
                </div>
              </div>
            </div>

            {/* MINI-GRÁFICO DE BARRAS / REGIMES */}
            {apuracao && apuracao.comparativoRegimes && (
              <Card className="p-4 border border-slate-200/90 shadow-subtle bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Comparativo Rápido por Regime Tributário
                  </h4>
                  <Badge variant="outline" className="text-[11px] text-slate-600">
                    Ano {selectedAno}
                  </Badge>
                </div>

                <div className="space-y-3 pt-1">
                  {Object.values(apuracao.comparativoRegimes.regimes).map((reg) => {
                    const isAtual = empresa.regime === reg.regime
                    const maxVal = Math.max(
                      ...Object.values(apuracao.comparativoRegimes.regimes).map(
                        (r) => r.totalTributos,
                      ),
                      1,
                    )
                    const percBar = Math.max(5, Math.round((reg.totalTributos / maxVal) * 100))

                    return (
                      <div key={reg.regime} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            {reg.nomeRegime}
                            {isAtual && (
                              <Badge className="bg-blue-100 text-blue-800 text-[10px] py-0 px-1 border-0">
                                Atual
                              </Badge>
                            )}
                            {reg.isMaisVantajoso && (
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1 border-0 font-bold">
                                Mais Vantajoso
                              </Badge>
                            )}
                          </span>
                          <span className="font-mono text-slate-900">
                            {formatCurrency(reg.totalTributos)} ({formatNumber(reg.aliquotaEfetiva)}
                            %)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              reg.isMaisVantajoso
                                ? 'bg-emerald-600'
                                : isAtual
                                  ? 'bg-blue-600'
                                  : 'bg-slate-400'
                            }`}
                            style={{ width: `${percBar}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* 6. RODAPÉ DE AÇÕES */}
          <div className="no-print pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Cenário ativo:{' '}
              <strong className="text-slate-800">
                {activeCenario ? activeCenario.nome : '✏️ Rascunho em edição'}
              </strong>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintPdf}
                className="text-xs gap-1.5 h-9 flex-1 sm:flex-initial"
              >
                <FileDown className="w-4 h-4" />
                Gerar PDF
              </Button>

              <Button
                onClick={() => {
                  setCenarioNomeInput(
                    activeCenario
                      ? `${activeCenario.nome} (Cópia)`
                      : `Cenário Retirada ${selectedAno}`,
                  )
                  setSaveModalOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm flex-1 sm:flex-initial"
              >
                <Save className="w-4 h-4" />
                Salvar cenário
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SALVAR CENÁRIO */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSalvarCenarioSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Save className="w-5 h-5 text-emerald-600" />
                Salvar Cenário de Retirada
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grave o snapshot completo com todos os parâmetros de pró-labore, dividendos e JCP.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="cenario-nome" className="text-xs font-semibold text-slate-700">
                  Nome do Cenário *
                </Label>
                <Input
                  id="cenario-nome"
                  type="text"
                  value={cenarioNomeInput}
                  onChange={(e) => setCenarioNomeInput(e.target.value)}
                  placeholder="Ex: Otimizado Fator R 28% com Dividendos"
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cenario-data" className="text-xs font-semibold text-slate-700">
                  Data de Referência
                </Label>
                <Input
                  id="cenario-data"
                  type="date"
                  value={dataReferenciaInput}
                  onChange={(e) => setDataReferenciaInput(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="cenario-recomendado"
                  checked={marcarRecomendadoInput}
                  onCheckedChange={(checked) => setMarcarRecomendadoInput(!!checked)}
                />
                <Label
                  htmlFor="cenario-recomendado"
                  className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Marcar como cenário recomendado para o cliente
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSaveModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={savingCenario}
              >
                {savingCenario && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar Cenário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL COMPARAR CENÁRIOS */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              Comparativo de Cenários
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Compare os parâmetros e impostos entre o cenário ativo e o cenário salvo.
            </DialogDescription>
          </DialogHeader>

          {scenarioToCompare && (
            <div className="py-3 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Cenário Ativo */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="font-bold text-xs text-emerald-900 flex items-center gap-1">
                    <span>🟢 Cenário Atual (Sliders)</span>
                  </div>
                  <div className="text-xs space-y-1.5 font-mono pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retirada Mensal:</span>
                      <strong>{formatCurrency(retiradaMensal)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pró-labore:</span>
                      <strong>{splitProLabore}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tributos PJ:</span>
                      <strong>
                        {formatCurrency(resultados?.empresa.tributos_pj_otimizado || 0)}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-emerald-200 pt-1 text-slate-900 font-bold">
                      <span>Total Grupo:</span>
                      <span>
                        {formatCurrency(resultados?.consolidado.total_tributos_grupo || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cenário Salvo */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="font-bold text-xs text-blue-900 flex items-center gap-1">
                    <span>🔵 {scenarioToCompare.nome}</span>
                  </div>
                  <div className="text-xs space-y-1.5 font-mono pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Retirada Mensal:</span>
                      <strong>
                        {formatCurrency(scenarioToCompare.params?.retirada_mensal_total || 0)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pró-labore:</span>
                      <strong>{scenarioToCompare.params?.split_pro_labore_perc || 0}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tributos PJ:</span>
                      <strong>
                        {formatCurrency(
                          scenarioToCompare.resultados?.empresa?.tributos_pj_otimizado || 0,
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-1 text-slate-900 font-bold">
                      <span>Total Grupo:</span>
                      <span>
                        {formatCurrency(
                          scenarioToCompare.resultados?.consolidado?.total_tributos_grupo || 0,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCompareModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR EXCLUSÃO DE CENÁRIO */}
      <AlertDialog
        open={!!cenarioToDelete}
        onOpenChange={(open) => !open && setCenarioToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cenário de retirada?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja excluir o cenário <strong>{cenarioToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteCenario}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
