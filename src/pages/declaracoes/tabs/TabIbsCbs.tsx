import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  AlertTriangle,
  Info,
  DollarSign,
  TrendingDown,
  Percent,
  Receipt,
  FileCheck2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getAtividadesRurais } from '@/services/declaracoes'
import { getIbsCbsParametroPorAno, calcularApuracaoIbsCbs } from '@/services/ibsCbs'
import { formatCurrency, currencyClassName } from '@/lib/formatters'
import type { DeclaracaoRecord, AtividadeRuralRecord, IbsCbsParametroRecord } from '@/types'

interface TabIbsCbsProps {
  declaracao: DeclaracaoRecord
}

function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00%'
  return `${val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

export default function TabIbsCbs({ declaracao }: TabIbsCbsProps) {
  const [atividades, setAtividades] = useState<AtividadeRuralRecord[]>([])
  const [parametro, setParametro] = useState<IbsCbsParametroRecord | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [loading, setLoading] = useState(true)

  // Despesa Bruta informada manualmente pelo usuário
  const [despesaBrutaManual, setDespesaBrutaManual] = useState<string>('')

  // Carrega Atividades Rurais e Parâmetros IBS/CBS
  useEffect(() => {
    let active = true

    async function carregar() {
      setLoading(true)
      try {
        const [ruraisData, paramData] = await Promise.all([
          getAtividadesRurais(declaracao.id),
          getIbsCbsParametroPorAno(declaracao.ano_calendario),
        ])

        if (!active) return

        setAtividades(ruraisData)
        setParametro(paramData.parametro)
        setIsFallback(paramData.isFallback)

        // Se houver despesas cadastradas nas atividades rurais, pré-preenche a despesa
        const totalDespesasCadastradas = ruraisData.reduce(
          (acc, item) => acc + (Number(item.despesas) || 0),
          0,
        )
        if (totalDespesasCadastradas > 0) {
          setDespesaBrutaManual(String(totalDespesasCadastradas))
        }
      } catch (err) {
        console.error('Erro ao carregar dados IBS/CBS:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    carregar()
    return () => {
      active = false
    }
  }, [declaracao.id, declaracao.ano_calendario])

  // Receita bruta somada de todas as atividades rurais
  const receitaBrutaTotal = useMemo(() => {
    return atividades.reduce((acc, curr) => acc + (Number(curr.receita_bruta) || 0), 0)
  }, [atividades])

  // Valor numérico da despesa informada
  const despesaBrutaNum = useMemo(() => {
    const parsed = parseFloat(despesaBrutaManual.replace(',', '.'))
    return isNaN(parsed) ? 0 : Math.max(0, parsed)
  }, [despesaBrutaManual])

  // Realiza os cálculos de apuração
  const apuracao = useMemo(() => {
    if (!parametro) return null
    return calcularApuracaoIbsCbs(
      receitaBrutaTotal,
      despesaBrutaNum,
      parametro,
      isFallback,
      parametro.ano_calendario,
    )
  }, [receitaBrutaTotal, despesaBrutaNum, parametro, isFallback])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aviso caso não haja parâmetros cadastrados */}
      {!parametro && (
        <Card className="border-amber-200 bg-amber-50/80 p-5 shadow-subtle">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                Nenhum parâmetro de IBS/CBS configurado no sistema
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Para calcular a apuração do IBS/CBS e Funrural, é necessário cadastrar as alíquotas
                de IVA, redução para atividade rural e Funrural para o ano-calendário{' '}
                <strong>{declaracao.ano_calendario}</strong>.
              </p>
              <Link to="/app/configuracoes/ibs-cbs">
                <Button
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800 text-white text-xs gap-1.5 mt-1"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Cadastrar parâmetros IBS/CBS
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Alerta de fallback de ano */}
      {parametro && isFallback && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Atenção (Parâmetros de Referência):</span> Não há
            parâmetros cadastrados especificamente para o ano{' '}
            <strong>{declaracao.ano_calendario}</strong>. O sistema está utilizando como referência
            os parâmetros mais recentes cadastrados ({parametro.ano_calendario}).
            <Link
              to="/app/configuracoes/ibs-cbs"
              className="inline-flex items-center gap-1 ml-2 font-bold text-amber-900 hover:underline"
            >
              Cadastrar parâmetros para {declaracao.ano_calendario}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Banner / Cabeçalho dos Parâmetros Utilizados */}
      {parametro && (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 backdrop-blur rounded-lg">
                  <Calculator className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Apuração IBS/CBS — Atividade Rural</h2>
                  <p className="text-xs text-emerald-100">
                    Pessoa Física com Atividade Rural • Reforma Tributária
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 text-xs px-2.5 py-1"
                >
                  Ano Ref.: {parametro.ano_calendario}
                  {isFallback && ' (Fallback)'}
                </Badge>
                <Link to="/app/configuracoes/ibs-cbs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-white hover:bg-white/10 h-7 px-2 gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver Parâmetros
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <CardContent className="p-4 bg-slate-50/70 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  IVA Padrão
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {formatPercent(parametro.iva_padrao)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  Redução Produtor
                </span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatPercent(parametro.reducao_percentual)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
                <span className="text-emerald-700 block text-[10px] font-bold uppercase tracking-wider">
                  IVA Reduzido (Efetivo)
                </span>
                <span className="font-mono font-bold text-emerald-900 text-sm">
                  {apuracao ? formatPercent(apuracao.iva_reduzido_perc) : '0,00%'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  Presunção BC / Funrural
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {formatPercent(parametro.presuncao_bc)} / {formatPercent(parametro.funrural)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta se não houver receita rural */}
      {atividades.length === 0 && (
        <Card className="border-blue-100 bg-blue-50/70 p-4 shadow-subtle">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <span className="font-semibold block">
                Nenhuma atividade rural cadastrada nesta declaração
              </span>
              <p className="text-blue-700">
                A receita bruta está zerada (R$ 0,00). Para puxar automaticamente o faturamento,
                cadastre as receitas na aba <strong>Rural</strong> da declaração ou digite despesas
                abaixo para simular.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Formulário de Entradas: Receita Bruta (Auto) e Despesa Bruta (Manual) */}
      <Card className="border border-slate-200/80 shadow-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Entradas da Atividade Rural
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            A receita bruta é puxada das atividades rurais da declaração e a despesa bruta anual
            pode ser ajustada manualmente para apuração de créditos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Receita Bruta (Automática) */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Receita Bruta Anual (Rurais)
                </Label>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                >
                  Automático
                </Badge>
              </div>
              <div className="text-lg font-bold font-mono text-slate-900 pt-1">
                {formatCurrency(receitaBrutaTotal)}
              </div>
              <p className="text-[10px] text-slate-400">
                Soma de {atividades.length}{' '}
                {atividades.length === 1
                  ? 'registro rural cadastrado'
                  : 'registros rurais cadastrados'}
              </p>
            </div>

            {/* Despesa Bruta Anual (Manual) */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="despesa-bruta-input"
                  className="text-xs font-semibold text-slate-700"
                >
                  Despesa Bruta Anual (R$)
                </Label>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                >
                  Manual
                </Badge>
              </div>
              <div className="relative pt-1">
                <span className="absolute left-3 top-1/2 translate-y-[-1px] text-xs font-mono font-semibold text-slate-400">
                  R$
                </span>
                <Input
                  id="despesa-bruta-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={despesaBrutaManual}
                  onChange={(e) => setDespesaBrutaManual(e.target.value)}
                  className="pl-9 h-10 text-sm font-mono font-bold text-slate-900 bg-white"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Insumos, sementes, maquinário e despesas dedutíveis da produção rural
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Destaque com KPIs Principais */}
      {apuracao && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200/80 shadow-subtle p-4 bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Resultado Líquido Rural
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(apuracao.resultado_liquido)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Receita (−) Despesa Bruta
            </span>
          </Card>

          <Card className="border border-slate-200/80 shadow-subtle p-4 bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Base de Cálculo ({formatPercent(apuracao.presuncao_bc_perc)})
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(apuracao.base_calculo)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Receita × Presunção BC</span>
          </Card>

          <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 shadow-md p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total de Tributos
              </span>
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-emerald-900 mt-1">
              {formatCurrency(apuracao.total_tributos)}
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">
              Débito − Crédito + Funrural
            </span>
          </Card>

          <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/80 to-cyan-50/60 shadow-md p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                Carga Tributária Efetiva
              </span>
              <Percent className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-extrabold font-mono text-blue-900 mt-1">
              {formatPercent(apuracao.carga_tributaria_perc)}
            </div>
            <span className="text-[10px] text-blue-700 block mt-0.5">
              Total Tributos / Receita Bruta
            </span>
          </Card>
        </div>
      )}

      {/* TABELA-RESUMO DA APURAÇÃO IBS/CBS */}
      {apuracao && (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 py-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Demonstrativo Resumido de Apuração IBS / CBS
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                Regime Simplificado Rural
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-5 text-left">Rubrica / Linha de Apuração</th>
                    <th className="py-3 px-5 text-left">Regra de Cálculo</th>
                    <th className="py-3 px-5 text-right">Alíquota / %</th>
                    <th className="py-3 px-5 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* 1. Receita Bruta */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-800">Receita Bruta</td>
                    <td className="py-3 px-5 text-slate-500">
                      Faturamento bruto da atividade rural no ano
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-400">—</td>
                    <td
                      className={`py-3 px-5 text-right font-bold text-slate-900 ${currencyClassName}`}
                    >
                      {formatCurrency(apuracao.receita_bruta)}
                    </td>
                  </tr>

                  {/* 2. Despesa Bruta */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 text-slate-700 flex items-center gap-1.5">
                      <span className="text-rose-500 font-bold">(−)</span> Despesa Bruta
                    </td>
                    <td className="py-3 px-5 text-slate-500">
                      Custeio, insumos e despesas operacionais da safra
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-400">—</td>
                    <td
                      className={`py-3 px-5 text-right font-medium text-rose-600 ${currencyClassName}`}
                    >
                      − {formatCurrency(apuracao.despesa_bruta)}
                    </td>
                  </tr>

                  {/* 3. Resultado Líquido */}
                  <tr className="bg-slate-50/50 hover:bg-slate-50 font-semibold">
                    <td className="py-3 px-5 text-slate-800 flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold">(=)</span> Resultado Líquido
                    </td>
                    <td className="py-3 px-5 text-slate-500 font-normal">
                      Receita Bruta − Despesa Bruta
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-400">—</td>
                    <td
                      className={`py-3 px-5 text-right font-bold ${
                        apuracao.resultado_liquido >= 0 ? 'text-slate-900' : 'text-rose-600'
                      } ${currencyClassName}`}
                    >
                      {formatCurrency(apuracao.resultado_liquido)}
                    </td>
                  </tr>

                  {/* 4. Base de Cálculo (Presunção) */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 text-slate-700">
                      Base de Cálculo (Presunção {formatPercent(apuracao.presuncao_bc_perc)})
                    </td>
                    <td className="py-3 px-5 text-slate-500">
                      Receita Bruta × {formatPercent(apuracao.presuncao_bc_perc)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-700">
                      {formatPercent(apuracao.presuncao_bc_perc)}
                    </td>
                    <td
                      className={`py-3 px-5 text-right font-semibold text-slate-800 ${currencyClassName}`}
                    >
                      {formatCurrency(apuracao.base_calculo)}
                    </td>
                  </tr>

                  {/* 5. Débito IBS/CBS */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 text-slate-700">
                      Débito IBS/CBS ({formatPercent(apuracao.iva_reduzido_perc)})
                    </td>
                    <td className="py-3 px-5 text-slate-500">Base de Cálculo × IVA Reduzido</td>
                    <td className="py-3 px-5 text-right font-mono text-slate-700">
                      {formatPercent(apuracao.iva_reduzido_perc)}
                    </td>
                    <td
                      className={`py-3 px-5 text-right font-bold text-amber-700 ${currencyClassName}`}
                    >
                      {formatCurrency(apuracao.debito_ibs_cbs)}
                    </td>
                  </tr>

                  {/* 6. Crédito IBS/CBS */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 text-slate-700 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">(−)</span> Crédito IBS/CBS (
                      {formatPercent(apuracao.iva_reduzido_perc)})
                    </td>
                    <td className="py-3 px-5 text-slate-500">Despesa Bruta × IVA Reduzido</td>
                    <td className="py-3 px-5 text-right font-mono text-slate-700">
                      {formatPercent(apuracao.iva_reduzido_perc)}
                    </td>
                    <td
                      className={`py-3 px-5 text-right font-medium text-emerald-600 ${currencyClassName}`}
                    >
                      − {formatCurrency(apuracao.credito_ibs_cbs)}
                    </td>
                  </tr>

                  {/* 7. Funrural */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-5 text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-600 font-bold">(+)</span> Funrural (
                      {formatPercent(apuracao.funrural_perc)})
                    </td>
                    <td className="py-3 px-5 text-slate-500">
                      Receita Bruta × {formatPercent(apuracao.funrural_perc)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono text-slate-700">
                      {formatPercent(apuracao.funrural_perc)}
                    </td>
                    <td
                      className={`py-3 px-5 text-right font-semibold text-slate-800 ${currencyClassName}`}
                    >
                      + {formatCurrency(apuracao.funrural_valor)}
                    </td>
                  </tr>

                  {/* 8. TOTAL DE TRIBUTOS (DESTAQUE) */}
                  <tr className="bg-emerald-50/80 border-t-2 border-emerald-300">
                    <td className="py-4 px-5 text-emerald-950 font-bold text-sm flex items-center gap-2">
                      <span className="text-emerald-700 font-bold">(=)</span> Total de Tributos
                    </td>
                    <td className="py-4 px-5 text-emerald-800 font-medium">
                      Débito − Crédito + Funrural
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-emerald-700">—</td>
                    <td
                      className={`py-4 px-5 text-right font-black text-emerald-950 text-base ${currencyClassName}`}
                    >
                      {formatCurrency(apuracao.total_tributos)}
                    </td>
                  </tr>

                  {/* 9. CARGA TRIBUTÁRIA (DESTAQUE) */}
                  <tr className="bg-blue-50/80 border-t border-blue-200">
                    <td className="py-3.5 px-5 text-blue-950 font-bold">
                      Carga Tributária Efetiva
                    </td>
                    <td className="py-3.5 px-5 text-blue-800">Total de Tributos / Receita Bruta</td>
                    <td
                      className={`py-3.5 px-5 text-right font-bold text-blue-900 ${currencyClassName}`}
                    >
                      {formatPercent(apuracao.carga_tributaria_perc)}
                    </td>
                    <td
                      className={`py-3.5 px-5 text-right font-bold text-blue-900 ${currencyClassName}`}
                    >
                      {formatPercent(apuracao.carga_tributaria_perc)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Explicações e Metodologia */}
      <Card className="border border-slate-200/80 bg-slate-50/50 p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 block">
              Entenda os critérios de cálculo da Reforma Tributária (IBS/CBS):
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
              <li>
                <strong>IVA Reduzido:</strong> Aplica a redução constitucional de{' '}
                {parametro ? formatPercent(parametro.reducao_percentual) : '60,00%'} sobre a
                alíquota padrão de {parametro ? formatPercent(parametro.iva_padrao) : '27,91%'},
                resultando em {apuracao ? formatPercent(apuracao.iva_reduzido_perc) : '11,16%'}.
              </li>
              <li>
                <strong>Base de Cálculo:</strong> Presunção de{' '}
                {parametro ? formatPercent(parametro.presuncao_bc) : '20,00%'} sobre a receita bruta
                do produtor.
              </li>
              <li>
                <strong>Aproveitamento de Créditos:</strong> As despesas produtivas geram crédito
                calculado à mesma alíquota reduzida de IVA para dedução direta do imposto apurado.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
