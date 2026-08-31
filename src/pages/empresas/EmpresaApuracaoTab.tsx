import { useState, useMemo } from 'react'
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Layers,
  ArrowRight,
  Info,
  Loader2,
  Save,
  Plus,
  Trash2,
  Sprout,
  ShieldCheck,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { upsertFaturamentoMes } from '@/services/empresas'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  EmpresaRecord,
  EmpresaFaturamentoRecord,
  InsumosDetalhadosMes,
  InsumoAgroItem,
  TabelaInsumoRealRecord,
  TabelaProdutoAgroRecord,
  ApuracaoEmpresaResultado,
} from '@/types'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

interface EmpresaApuracaoTabProps {
  empresa: EmpresaRecord
  anoCalendario: number
  faturamentos: EmpresaFaturamentoRecord[]
  apuracaoCompleta: ApuracaoEmpresaResultado | null
  onAnoChange: (ano: number) => void
  onFaturamentosUpdated: () => void
}

export function EmpresaApuracaoTab({
  empresa,
  anoCalendario,
  faturamentos,
  apuracaoCompleta,
  onAnoChange,
  onFaturamentosUpdated,
}: EmpresaApuracaoTabProps) {
  const { toast } = useToast()
  const [modalMes, setModalMes] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos básicos do formulário mensal
  const [receitaInput, setReceitaInput] = useState<string>('')
  const [folhaInput, setFolhaInput] = useState<string>('')
  const [lucroContabilInput, setLucroContabilInput] = useState<string>('')
  const [adicoesInput, setAdicoesInput] = useState<string>('')
  const [exclusoesInput, setExclusoesInput] = useState<string>('')
  const [outrosCreditosInput, setOutrosCreditosInput] = useState<string>('')

  // Categorias de Insumo no Lucro Real
  const [insumoComercialInput, setInsumoComercialInput] = useState<string>('')
  const [insumoMonofasicoInput, setInsumoMonofasicoInput] = useState<string>('')
  const [insumoImobilizadoInput, setInsumoImobilizadoInput] = useState<string>('')
  const [insumosAgroItens, setInsumosAgroItens] = useState<InsumoAgroItem[]>([])

  // Tabelas do ano atual carregadas pelo serviço de apuração
  const tabelasInsumos: TabelaInsumoRealRecord[] = apuracaoCompleta?.tabelas?.insumos || []
  const tabelasAgro: TabelaProdutoAgroRecord[] = apuracaoCompleta?.tabelas?.produtosAgro || []

  // Mapa de faturamentos existentes indexados por mês
  const faturamentosMap = useMemo(() => {
    const map = new Map<number, EmpresaFaturamentoRecord>()
    faturamentos.forEach((f) => {
      if (f.ano_calendario === anoCalendario) {
        map.set(f.mes, f)
      }
    })
    return map
  }, [faturamentos, anoCalendario])

  // Total de insumos agropecuários no modal
  const totalInsumosAgro = useMemo(() => {
    return insumosAgroItens.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0)
  }, [insumosAgroItens])

  // Total geral de compras de insumos somadas no modal
  const totalInsumosSomados = useMemo(() => {
    const com = parseFloat(insumoComercialInput.replace(',', '.')) || 0
    const mono = parseFloat(insumoMonofasicoInput.replace(',', '.')) || 0
    const imo = parseFloat(insumoImobilizadoInput.replace(',', '.')) || 0
    return com + totalInsumosAgro + mono + imo
  }, [insumoComercialInput, totalInsumosAgro, insumoMonofasicoInput, insumoImobilizadoInput])

  const handleOpenLancamento = (mes: number) => {
    setModalMes(mes)
    const fat = faturamentosMap.get(mes)
    if (fat) {
      setReceitaInput(String(fat.receita_bruta || ''))
      setFolhaInput(fat.folha ? String(fat.folha) : '')
      setLucroContabilInput(fat.lucro_contabil ? String(fat.lucro_contabil) : '')
      setAdicoesInput(fat.adicoes_lalur ? String(fat.adicoes_lalur) : '')
      setExclusoesInput(fat.exclusoes_lalur ? String(fat.exclusoes_lalur) : '')
      setOutrosCreditosInput(
        fat.outros_creditos_pis_cofins ? String(fat.outros_creditos_pis_cofins) : '',
      )

      if (fat.insumos_detalhados) {
        setInsumoComercialInput(
          fat.insumos_detalhados.comercial_servico
            ? String(fat.insumos_detalhados.comercial_servico)
            : '',
        )
        setInsumoMonofasicoInput(
          fat.insumos_detalhados.monofasico ? String(fat.insumos_detalhados.monofasico) : '',
        )
        setInsumoImobilizadoInput(
          fat.insumos_detalhados.imobilizado ? String(fat.insumos_detalhados.imobilizado) : '',
        )
        setInsumosAgroItens(
          fat.insumos_detalhados.rural_agro?.itens &&
            fat.insumos_detalhados.rural_agro.itens.length > 0
            ? [...fat.insumos_detalhados.rural_agro.itens]
            : [],
        )
      } else {
        // Se ainda não tinha o JSON detalhado, inicializa comercial com o valor existente em compras_insumos
        setInsumoComercialInput(fat.compras_insumos ? String(fat.compras_insumos) : '')
        setInsumoMonofasicoInput('')
        setInsumoImobilizadoInput('')
        setInsumosAgroItens([])
      }
    } else {
      setReceitaInput('')
      setFolhaInput('')
      setLucroContabilInput('')
      setAdicoesInput('')
      setExclusoesInput('')
      setOutrosCreditosInput('')
      setInsumoComercialInput('')
      setInsumoMonofasicoInput('')
      setInsumoImobilizadoInput('')
      setInsumosAgroItens([])
    }
  }

  // Manipulação de itens de produto agro
  const handleAddAgroItem = () => {
    const defaultProd = tabelasAgro[0] || {
      codigo: 'soja',
      nome: 'Soja em Grão',
      percentual_presumido_pis: 50,
      percentual_presumido_cofins: 50,
      aliquota_efetiva_pis: 0.825,
      aliquota_efetiva_cofins: 3.8,
    }
    setInsumosAgroItens((prev) => [
      ...prev,
      {
        produto_codigo: defaultProd.codigo,
        produto_nome: defaultProd.nome,
        valor: 0,
        percentual_presumido_pis: defaultProd.percentual_presumido_pis,
        percentual_presumido_cofins: defaultProd.percentual_presumido_cofins,
        aliquota_efetiva_pis: defaultProd.aliquota_efetiva_pis,
        aliquota_efetiva_cofins: defaultProd.aliquota_efetiva_cofins,
      },
    ])
  }

  const handleUpdateAgroItem = (
    index: number,
    field: keyof InsumoAgroItem,
    value: string | number,
  ) => {
    setInsumosAgroItens((prev) => {
      const next = [...prev]
      const item = { ...next[index] }

      if (field === 'produto_codigo') {
        const prod = tabelasAgro.find((p) => p.codigo === value)
        if (prod) {
          item.produto_codigo = prod.codigo
          item.produto_nome = prod.nome
          item.percentual_presumido_pis = prod.percentual_presumido_pis
          item.percentual_presumido_cofins = prod.percentual_presumido_cofins
          item.aliquota_efetiva_pis = prod.aliquota_efetiva_pis
          item.aliquota_efetiva_cofins = prod.aliquota_efetiva_cofins
        } else {
          item.produto_codigo = String(value)
        }
      } else if (field === 'valor') {
        item.valor =
          typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.')) || 0
      }

      next[index] = item
      return next
    })
  }

  const handleRemoveAgroItem = (index: number) => {
    setInsumosAgroItens((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSalvarMes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (modalMes === null) return

    const recNum = parseFloat(receitaInput.replace(',', '.')) || 0
    const folhaNum = parseFloat(folhaInput.replace(',', '.')) || 0
    const lucroNum = parseFloat(lucroContabilInput.replace(',', '.')) || 0
    const adicNum = parseFloat(adicoesInput.replace(',', '.')) || 0
    const exclNum = parseFloat(exclusoesInput.replace(',', '.')) || 0
    const outrosCredNum = parseFloat(outrosCreditosInput.replace(',', '.')) || 0

    // Detalhamento de insumos
    const comNum = parseFloat(insumoComercialInput.replace(',', '.')) || 0
    const monoNum = parseFloat(insumoMonofasicoInput.replace(',', '.')) || 0
    const imoNum = parseFloat(insumoImobilizadoInput.replace(',', '.')) || 0
    const totalComprasInsumos = comNum + totalInsumosAgro + monoNum + imoNum

    const insumosDetalhadosPayload: InsumosDetalhadosMes = {
      comercial_servico: comNum,
      rural_agro: {
        total: totalInsumosAgro,
        itens: insumosAgroItens.filter((i) => i.valor > 0),
      },
      monofasico: monoNum,
      imobilizado: imoNum,
      outros_creditos: outrosCredNum,
    }

    setSaving(true)
    try {
      await upsertFaturamentoMes(
        empresa.id,
        anoCalendario,
        modalMes,
        recNum,
        folhaNum,
        lucroNum,
        adicNum,
        exclNum,
        totalComprasInsumos,
        outrosCredNum,
        insumosDetalhadosPayload,
      )

      toast({
        title: `Lançamento de ${MESES[modalMes - 1]} salvo com sucesso!`,
        description:
          empresa.regime === 'real'
            ? `Compras de Insumos: ${formatCurrency(totalComprasInsumos)} categorizados.`
            : `Receita Bruta: ${formatCurrency(recNum)}`,
      })

      setModalMes(null)
      onFaturamentosUpdated()
    } catch (err) {
      toast({
        title: 'Erro ao salvar lançamento mensal',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Estatísticas do Lucro Real
  const apReal = apuracaoCompleta?.apuracaoReal
  const detalheCreditos = apReal?.detalhe_creditos_anual

  return (
    <div className="space-y-6">
      {/* Barra de Controle de Ano e Informações do Regime */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{empresa.razao_social}</span>
              <Badge
                className={
                  empresa.regime === 'simples'
                    ? 'bg-blue-600 text-white'
                    : empresa.regime === 'presumido'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                }
              >
                {empresa.regime === 'simples'
                  ? 'Simples Nacional'
                  : empresa.regime === 'presumido'
                    ? 'Lucro Presumido'
                    : 'Lucro Real (Não-Cumulativo)'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">CNPJ: {empresa.cnpj}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Ano-Calendário:</span>
          <Select
            value={String(anoCalendario)}
            onValueChange={(val) => onAnoChange(parseInt(val, 10))}
          >
            <SelectTrigger className="w-28 h-9 text-xs font-bold font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((ano) => (
                <SelectItem key={ano} value={String(ano)} className="text-xs font-mono">
                  Ano {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo Anual do Lucro Real (com destaque aos créditos de insumos por categoria) */}
      {empresa.regime === 'real' && apReal && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-subtle">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Receita Bruta Anual
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                {formatCurrency(apReal.receita_bruta_anual)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Base PIS/COFINS Débito
              </span>
            </Card>

            <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-subtle">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Lucro Real Lalur
              </span>
              <p className="text-lg font-bold text-emerald-800 mt-1 font-mono">
                {formatCurrency(apReal.lucro_real_ajustado_anual)}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">IRPJ + CSLL Apurados</span>
            </Card>

            <Card className="p-4 border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 shadow-subtle">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center justify-between">
                <span>Créditos PIS/COFINS</span>
                <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
                  Categorizados
                </Badge>
              </span>
              <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">
                {formatCurrency(apReal.total_creditos_pis_cofins)}
              </p>
              <span className="text-[10px] text-emerald-600 mt-0.5 block">
                Comercial, Agro Presumido, Imobilizado
              </span>
            </Card>

            <Card className="p-4 border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-subtle">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tributos PJ Totais
              </span>
              <p className="text-lg font-bold text-blue-900 mt-1 font-mono">
                {formatCurrency(apReal.total_tributos_pj)}
              </p>
              <span className="text-[10px] text-blue-600 font-bold mt-0.5 block">
                Alíq. Efetiva: {formatPercent(apReal.aliquota_efetiva_anual)}
              </span>
            </Card>
          </div>

          {/* Card Detalhado dos Créditos de Insumos no Lucro Real */}
          {detalheCreditos && detalheCreditos.total_base_creditos > 0 && (
            <Card className="p-4 border border-emerald-200/80 bg-white shadow-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Detalhamento dos Créditos de Insumos por Categoria (Ano {anoCalendario})
                  </h4>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono bg-emerald-50 text-emerald-800 border-emerald-300"
                >
                  Total Créditos: {formatCurrency(detalheCreditos.total_creditos)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Comercial */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Comercial / Serviços (9,25%)
                  </span>
                  <div className="mt-1 space-y-0.5 text-slate-600 font-mono">
                    <p>Base: {formatCurrency(detalheCreditos.comercial_servico.base)}</p>
                    <p className="text-emerald-700 font-bold">
                      Crédito:{' '}
                      {formatCurrency(
                        detalheCreditos.comercial_servico.credito_pis +
                          detalheCreditos.comercial_servico.credito_cofins,
                      )}
                    </p>
                  </div>
                </div>

                {/* Rural / Agro */}
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 block">
                      Rural / Agro (Presumido)
                    </span>
                    <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="mt-1 space-y-0.5 text-emerald-800 font-mono">
                    <p>Base: {formatCurrency(detalheCreditos.rural_agro.base)}</p>
                    <p className="font-bold text-emerald-900">
                      Crédito:{' '}
                      {formatCurrency(
                        detalheCreditos.rural_agro.credito_pis +
                          detalheCreditos.rural_agro.credito_cofins,
                      )}
                    </p>
                  </div>
                  {detalheCreditos.rural_agro.itens.length > 0 && (
                    <div className="mt-2 pt-1 border-t border-emerald-200/60 space-y-1">
                      {detalheCreditos.rural_agro.itens.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[10px] text-emerald-700"
                        >
                          <span>{item.produto_nome}:</span>
                          <span className="font-mono font-semibold">
                            {formatCurrency(item.credito_pis + item.credito_cofins)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Monofásico */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Monofásicos (0% Vedado)
                  </span>
                  <div className="mt-1 space-y-0.5 text-slate-500 font-mono">
                    <p>Base: {formatCurrency(detalheCreditos.monofasico.base)}</p>
                    <p className="text-slate-400 font-semibold">Crédito: R$ 0,00 (0,00%)</p>
                  </div>
                </div>

                {/* Imobilizado */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Ativo Imobilizado (9,25%)
                  </span>
                  <div className="mt-1 space-y-0.5 text-slate-600 font-mono">
                    <p>Base: {formatCurrency(detalheCreditos.imobilizado.base)}</p>
                    <p className="text-purple-700 font-bold">
                      Crédito:{' '}
                      {formatCurrency(
                        detalheCreditos.imobilizado.credito_pis +
                          detalheCreditos.imobilizado.credito_cofins,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tabela de Lançamentos Mensais */}
      <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Lançamento Mensal de Faturamento e Insumos — {anoCalendario}
            </h3>
            <p className="text-xs text-slate-500">
              {empresa.regime === 'real'
                ? 'Informe as compras mensais discriminadas por Comercial, Agro/Rural, Monofásico e Imobilizado.'
                : 'Clique no mês desejado para lançar ou editar a receita bruta.'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider font-sans">
                <th className="py-3 px-4">Mês</th>
                <th className="py-3 px-4 text-right">Receita Bruta</th>
                <th className="py-3 px-4 text-right">Folha / Pró-labore</th>
                {empresa.regime === 'real' && (
                  <>
                    <th className="py-3 px-4 text-right">Lucro Contábil</th>
                    <th className="py-3 px-4 text-right">Compras Insumos</th>
                    <th className="py-3 px-4">Detalhamento Insumos</th>
                  </>
                )}
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {MESES.map((nomeMes, index) => {
                const mesNum = index + 1
                const fat = faturamentosMap.get(mesNum)
                const preenchido =
                  !!fat && (fat.receita_bruta > 0 || (fat.compras_insumos || 0) > 0)
                const insDet = fat?.insumos_detalhados

                return (
                  <tr
                    key={mesNum}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      preenchido ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-center text-slate-400 text-xs font-mono">
                          {String(mesNum).padStart(2, '0')}
                        </span>
                        <span>{nomeMes}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {fat?.receita_bruta ? formatCurrency(fat.receita_bruta) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {fat?.folha ? formatCurrency(fat.folha) : '-'}
                    </td>
                    {empresa.regime === 'real' && (
                      <>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {fat?.lucro_contabil ? formatCurrency(fat.lucro_contabil) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          {fat?.compras_insumos ? formatCurrency(fat.compras_insumos) : '-'}
                        </td>
                        <td className="py-3 px-4 font-sans text-[11px] text-slate-600">
                          {insDet ? (
                            <div className="flex flex-wrap gap-1">
                              {insDet.comercial_servico > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  Com: {formatCurrency(insDet.comercial_servico)}
                                </Badge>
                              )}
                              {insDet.rural_agro?.total > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-800 border-emerald-200"
                                >
                                  Agro: {formatCurrency(insDet.rural_agro.total)}
                                </Badge>
                              )}
                              {insDet.monofasico > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600"
                                >
                                  Mono: {formatCurrency(insDet.monofasico)}
                                </Badge>
                              )}
                              {insDet.imobilizado > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200"
                                >
                                  Imob: {formatCurrency(insDet.imobilizado)}
                                </Badge>
                              )}
                            </div>
                          ) : fat?.compras_insumos ? (
                            <span className="text-[10px] text-slate-400">
                              Geral (não categorizado)
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 text-center font-sans">
                      {preenchido ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                          Lançado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 border-slate-200 text-[10px]"
                        >
                          Pendente
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenLancamento(mesNum)}
                        className="h-8 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        {preenchido ? 'Editar' : 'Lançar'}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL DE LANÇAMENTO MENSAL COM CATEGORIAS DE INSUMO */}
      <Dialog open={modalMes !== null} onOpenChange={(open) => !open && setModalMes(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSalvarMes}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Lançamento Mensal — {modalMes !== null ? MESES[modalMes - 1] : ''} / {anoCalendario}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {empresa.regime === 'real'
                  ? 'Informe as receitas e detalhe os insumos por categoria para apuração dos créditos de PIS/COFINS.'
                  : 'Informe a receita bruta mensal e folha de pagamento.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Seção 1: Receita e Folha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lan-rec" className="text-xs font-semibold text-slate-700">
                    Receita Bruta do Mês (R$) *
                  </Label>
                  <Input
                    id="lan-rec"
                    type="number"
                    step="0.01"
                    value={receitaInput}
                    onChange={(e) => setReceitaInput(e.target.value)}
                    placeholder="0,00"
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lan-folha" className="text-xs font-semibold text-slate-700">
                    Folha de Pagamento / Pró-labore (R$)
                  </Label>
                  <Input
                    id="lan-folha"
                    type="number"
                    step="0.01"
                    value={folhaInput}
                    onChange={(e) => setFolhaInput(e.target.value)}
                    placeholder="0,00"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Seção 2: Dados de Lucro Real */}
              {empresa.regime === 'real' && (
                <>
                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                      Apuração Contábil / LALUR
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="lan-lc" className="text-xs font-semibold text-slate-700">
                          Lucro Contábil (R$)
                        </Label>
                        <Input
                          id="lan-lc"
                          type="number"
                          step="0.01"
                          value={lucroContabilInput}
                          onChange={(e) => setLucroContabilInput(e.target.value)}
                          placeholder="0,00"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lan-ad" className="text-xs font-semibold text-slate-700">
                          Adições LALUR (R$)
                        </Label>
                        <Input
                          id="lan-ad"
                          type="number"
                          step="0.01"
                          value={adicoesInput}
                          onChange={(e) => setAdicoesInput(e.target.value)}
                          placeholder="0,00"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lan-ex" className="text-xs font-semibold text-slate-700">
                          Exclusões LALUR (R$)
                        </Label>
                        <Input
                          id="lan-ex"
                          type="number"
                          step="0.01"
                          value={exclusoesInput}
                          onChange={(e) => setExclusoesInput(e.target.value)}
                          placeholder="0,00"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Categorização dos Insumos de Lucro Real */}
                  <div className="border-t border-slate-200 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                          Categorização de Insumos (Créditos PIS / COFINS)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Lance os insumos por natureza para aplicar as alíquotas corretas de
                          crédito.
                        </p>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">
                        Total Insumos: {formatCurrency(totalInsumosSomados)}
                      </Badge>
                    </div>

                    {/* Categoria 1: Comercial e Serviços */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="lan-com" className="text-xs font-bold text-slate-800">
                          1. Insumos Comerciais / Serviços / Gerais
                        </Label>
                        <span className="text-[11px] font-semibold text-blue-700">
                          Crédito: 9,25% (PIS 1,65% + COFINS 7,60%)
                        </span>
                      </div>
                      <Input
                        id="lan-com"
                        type="number"
                        step="0.01"
                        value={insumoComercialInput}
                        onChange={(e) => setInsumoComercialInput(e.target.value)}
                        placeholder="Valor das aquisições no mês (R$)"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    {/* Categoria 2: Rural / Agro com Tabela de Produtos */}
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Sprout className="w-4 h-4 text-emerald-700" />
                            <span className="text-xs font-bold text-emerald-900">
                              2. Rural / Agropecuário (Crédito Presumido por Produto)
                            </span>
                          </div>
                          <span className="text-[11px] text-emerald-700 block">
                            Soja, Milho, Cana de Açúcar, Leite, Trigo e outros produtos agro.
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddAgroItem}
                          className="text-xs h-7 gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Produto Agro
                        </Button>
                      </div>

                      {insumosAgroItens.length === 0 ? (
                        <div className="p-3 text-center border border-dashed border-emerald-200 rounded-md bg-white/60">
                          <p className="text-[11px] text-emerald-800">
                            Nenhum insumo agropecuário lançado neste mês.
                          </p>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={handleAddAgroItem}
                            className="text-xs text-emerald-700 p-0 h-auto mt-1"
                          >
                            + Lançar produto rural (Soja, Milho, Cana...)
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {insumosAgroItens.map((item, idx) => {
                            const prodCfg = tabelasAgro.find(
                              (p) => p.codigo === item.produto_codigo,
                            )
                            const aliqTotal =
                              (prodCfg?.aliquota_efetiva_pis || 0.825) +
                              (prodCfg?.aliquota_efetiva_cofins || 3.8)

                            return (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-white rounded-md border border-emerald-100 text-xs shadow-xs"
                              >
                                <div className="w-full sm:w-48">
                                  <Select
                                    value={item.produto_codigo}
                                    onValueChange={(val) =>
                                      handleUpdateAgroItem(idx, 'produto_codigo', val)
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs font-semibold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tabelasAgro.map((p) => (
                                        <SelectItem
                                          key={p.codigo}
                                          value={p.codigo}
                                          className="text-xs"
                                        >
                                          {p.nome}
                                        </SelectItem>
                                      ))}
                                      {tabelasAgro.length === 0 && (
                                        <>
                                          <SelectItem value="soja">Soja em Grão</SelectItem>
                                          <SelectItem value="milho">Milho em Grão</SelectItem>
                                          <SelectItem value="cana_de_acucar">
                                            Cana-de-Açúcar
                                          </SelectItem>
                                          <SelectItem value="leite_in_natura">
                                            Leite In Natura
                                          </SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex-1 w-full">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.valor || ''}
                                    onChange={(e) =>
                                      handleUpdateAgroItem(idx, 'valor', e.target.value)
                                    }
                                    placeholder="Valor do insumo (R$)"
                                    className="h-8 text-xs font-mono"
                                  />
                                </div>

                                <div className="text-[11px] text-emerald-800 font-mono whitespace-nowrap px-1">
                                  Crédito: <strong>{aliqTotal.toFixed(2)}%</strong>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveAgroItem(idx)}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )
                          })}

                          <div className="flex justify-between items-center text-xs font-bold text-emerald-900 pt-1 px-1">
                            <span>Subtotal Insumos Agro:</span>
                            <span className="font-mono">{formatCurrency(totalInsumosAgro)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Categoria 3: Produtos Monofásicos */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="lan-mono" className="text-xs font-bold text-slate-800">
                          3. Produtos Monofásicos / Alíquota Zero
                        </Label>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Vedado a crédito (0,00%)
                        </span>
                      </div>
                      <Input
                        id="lan-mono"
                        type="number"
                        step="0.01"
                        value={insumoMonofasicoInput}
                        onChange={(e) => setInsumoMonofasicoInput(e.target.value)}
                        placeholder="Valor das aquisições monofásicas (R$)"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    {/* Categoria 4: Ativo Imobilizado */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="lan-imo" className="text-xs font-bold text-slate-800">
                          4. Bens do Ativo Imobilizado (Depreciação / Aquisições)
                        </Label>
                        <span className="text-[11px] font-semibold text-purple-700">
                          Crédito: 9,25% (ou amortização 1/48)
                        </span>
                      </div>
                      <Input
                        id="lan-imo"
                        type="number"
                        step="0.01"
                        value={insumoImobilizadoInput}
                        onChange={(e) => setInsumoImobilizadoInput(e.target.value)}
                        placeholder="Encargos de depreciação ou parcelas do ativo (R$)"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    {/* Outros Créditos */}
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="lan-outros" className="text-xs font-semibold text-slate-700">
                        Outros Créditos Operacionais PIS/COFINS (Energia, Aluguéis, Fretes)
                      </Label>
                      <Input
                        id="lan-outros"
                        type="number"
                        step="0.01"
                        value={outrosCreditosInput}
                        onChange={(e) => setOutrosCreditosInput(e.target.value)}
                        placeholder="0,00"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalMes(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Salvar Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
