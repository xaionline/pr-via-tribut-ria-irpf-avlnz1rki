import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Coins,
  AlertTriangle,
  Info,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  FileCheck2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getApuracao } from '@/services/altasRendas'
import { formatCurrency } from '@/lib/formatters'
import type {
  DeclaracaoRecord,
  AltasRendasApuracaoCalculo,
  AltasRendasParametroRecord,
} from '@/types'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface TabAltasRendasProps {
  declaracao: DeclaracaoRecord
}

function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00%'
  return `${val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

export default function TabAltasRendas({ declaracao }: TabAltasRendasProps) {
  const { toast } = useToast()
  const [apuracao, setApuracao] = useState<AltasRendasApuracaoCalculo | null>(null)
  const [parametro, setParametro] = useState<AltasRendasParametroRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  const carregar = async (showToast = false) => {
    try {
      if (showToast) setRecalculating(true)
      const data = await getApuracao(declaracao.id)
      setApuracao(data.apuracao)
      setParametro(data.parametro)
      if (showToast) {
        toast({
          title: 'Dados atualizados com sucesso',
          description: 'A apuração do Adicional de Altas Rendas (IRPF-M) foi recalculada.',
        })
      }
    } catch (err) {
      toast({
        title: 'Erro ao carregar apuração de Altas Rendas',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRecalculating(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [declaracao.id, declaracao.ano_calendario])

  const isFallback = apuracao?.is_fallback_ano ?? false

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-80 w-full" />
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
                Nenhum parâmetro específico de Altas Rendas configurado
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                O cálculo está utilizando a alíquota padrão legal de <strong>10,00%</strong> para o
                ano-calendário <strong>{declaracao.ano_calendario}</strong>. Você pode configurar
                alíquotas personalizadas na tela de configurações.
              </p>
              <Link to="/app/configuracoes/altas-rendas">
                <Button
                  size="sm"
                  className="bg-amber-700 hover:bg-amber-800 text-white text-xs gap-1.5 mt-1"
                >
                  <Coins className="w-3.5 h-3.5" />
                  Configurar parâmetros IRPF-M
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
            os parâmetros mais recentes ({parametro.ano_calendario}) com alíquota de{' '}
            {formatPercent(parametro.aliquota)}.
            <Link
              to="/app/configuracoes/altas-rendas"
              className="inline-flex items-center gap-1 ml-2 font-bold text-amber-900 hover:underline"
            >
              Cadastrar parâmetros para {declaracao.ano_calendario}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Banner / Cabeçalho dos Parâmetros Utilizados */}
      <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 px-5 py-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur rounded-xl shadow-sm">
                <Coins className="w-6 h-6 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold">Adicional de Altas Rendas (IRPF-M)</h2>
                  <Badge
                    variant="outline"
                    className="bg-white/15 text-white border-white/30 text-[10px]"
                  >
                    Ano-Calendário {declaracao.ano_calendario}
                  </Badge>
                </div>
                <p className="text-xs text-amber-100 mt-0.5">
                  Demonstrativo e apuração do imposto sobre rendimentos e proventos de altas rendas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => carregar(true)}
                disabled={recalculating}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5 h-8 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                <span>{recalculating ? 'Recalculando...' : 'Recalcular'}</span>
              </Button>
              <Link to="/app/configuracoes/altas-rendas">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-white hover:bg-white/10 h-8 px-2.5 gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Parâmetros
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {apuracao && (
          <CardContent className="p-4 bg-slate-50/80 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  Base de Cálculo (BC)
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {formatCurrency(apuracao.bc_irpfm)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  Alíquota Aplicável
                </span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  {formatPercent(apuracao.aliquota_perc)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  IRPF-M Devido
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(apuracao.irpfm_devido)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block text-[10px] font-medium uppercase tracking-wider">
                  Carga Tributária
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatPercent(apuracao.carga_tributaria_perc)}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cards de Resumo Principal */}
      {apuracao && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200/80 shadow-subtle p-4 bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Base de Cálculo (BC IRPF-M)
            </span>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(apuracao.bc_irpfm)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Tributáveis + Dividendos + Rural + Exterior
            </span>
          </Card>

          <Card className="border border-slate-200/80 shadow-subtle p-4 bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              IRPF-M Devido ({formatPercent(apuracao.aliquota_perc)})
            </span>
            <div className="text-lg font-bold font-mono text-amber-700 mt-1">
              {formatCurrency(apuracao.irpfm_devido)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              BC IRPF-M × {formatPercent(apuracao.aliquota_perc)}
            </span>
          </Card>

          <Card className="border border-slate-200/80 shadow-subtle p-4 bg-white">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Retenções Dedutíveis
            </span>
            <div className="text-lg font-bold font-mono text-slate-700 mt-1">
              {formatCurrency(apuracao.irrf_retido + apuracao.irpfm_retido_exercicio)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              IRRF ({formatCurrency(apuracao.irrf_retido)}) + IRPF-M Retido (
              {formatCurrency(apuracao.irpfm_retido_exercicio)})
            </span>
          </Card>

          {/* Card Final de Saldo (A Pagar ou A Restituir) */}
          {apuracao.total_a_pagar > 0 ? (
            <Card className="border-2 border-rose-500/30 bg-gradient-to-br from-rose-50/80 to-red-50/60 shadow-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Total a Pagar (IRPF-M)
                </span>
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-extrabold font-mono text-rose-900 mt-1">
                {formatCurrency(apuracao.total_a_pagar)}
              </div>
              <span className="text-[10px] text-rose-700 block mt-0.5">
                Imposto devido após deduções de retenções
              </span>
            </Card>
          ) : apuracao.total_a_restituir > 0 ? (
            <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 shadow-md p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total a Restituir (IRPF-M)
                </span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold font-mono text-emerald-900 mt-1">
                {formatCurrency(apuracao.total_a_restituir)}
              </div>
              <span className="text-[10px] text-emerald-700 block mt-0.5">
                Retenções superiores ao imposto devido
              </span>
            </Card>
          ) : (
            <Card className="border-2 border-slate-300 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Saldo Quitado (R$ 0,00)
                </span>
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-800 mt-1">
                {formatCurrency(0)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Sem saldo adicional a pagar ou a restituir
              </span>
            </Card>
          )}
        </div>
      )}

      {/* Tabela de Apuração Estilo Demonstrativo */}
      {apuracao && (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  Demonstrativo de Apuração — IRPF-M
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Composição detalhada da Base de Cálculo, alíquota, deduções e imposto líquido
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] self-start sm:self-auto font-mono">
                Carga Tributária: {formatPercent(apuracao.carga_tributaria_perc)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-2.5 px-4">Linha</th>
                    <th className="py-2.5 px-4">Origem / Regra de Cálculo</th>
                    <th className="py-2.5 px-4 text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* (+) Rendimentos Tributáveis */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-slate-400 font-mono font-bold mr-1.5">(+)</span>
                      Rendimentos Tributáveis
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Soma de rendimentos onde tipo ={' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        tributável
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(apuracao.rendimentos_tributaveis)}
                    </td>
                  </tr>

                  {/* (+) Dividendos */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-slate-400 font-mono font-bold mr-1.5">(+)</span>
                      Dividendos
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Soma de rendimentos onde tipo ={' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        dividendos
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(apuracao.dividendos)}
                    </td>
                  </tr>

                  {/* (+) Receita Rural */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-slate-400 font-mono font-bold mr-1.5">(+)</span>
                      Receita Rural
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Soma de{' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        atividades_rurais.receita_bruta
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(apuracao.receita_rural)}
                    </td>
                  </tr>

                  {/* (+) Receita Exterior */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-slate-400 font-mono font-bold mr-1.5">(+)</span>
                      Receita Exterior
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Soma de rendimentos onde tipo ={' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        exterior
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(apuracao.receita_exterior)}
                    </td>
                  </tr>

                  {/* (=) BC IRPF-M */}
                  <tr className="bg-amber-50/60 font-bold border-y-2 border-amber-200">
                    <td className="py-3 px-4 text-amber-950">
                      <span className="text-amber-700 font-mono mr-1.5">(=)</span>
                      BC IRPF-M (Base de Cálculo)
                    </td>
                    <td className="py-3 px-4 text-amber-800 text-[11px] font-normal">
                      Soma das 4 linhas acima (Tributáveis + Dividendos + Rural + Exterior)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base text-amber-950">
                      {formatCurrency(apuracao.bc_irpfm)}
                    </td>
                  </tr>

                  {/* Alíquota (XX%) */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-slate-400 font-mono font-bold mr-1.5">(×)</span>
                      Alíquota IRPF-M ({formatPercent(apuracao.aliquota_perc)})
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Parâmetro fiscal do ano {apuracao.ano_calendario} (fallback padrão: 10,00%)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatPercent(apuracao.aliquota_perc)}
                    </td>
                  </tr>

                  {/* (=) IRPF-M Devido */}
                  <tr className="bg-slate-50 font-semibold border-b border-slate-200">
                    <td className="py-3 px-4 text-slate-900">
                      <span className="text-slate-600 font-mono mr-1.5">(=)</span>
                      IRPF-M Devido
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-normal">
                      BC IRPF-M × Alíquota ({formatPercent(apuracao.aliquota_perc)})
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(apuracao.irpfm_devido)}
                    </td>
                  </tr>

                  {/* (−) IRRF Retido */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-rose-500 font-mono font-bold mr-1.5">(−)</span>
                      IRRF Retido
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Soma de{' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        irrf
                      </code>{' '}
                      onde tipo ={' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        irrf_comum
                      </code>{' '}
                      ou não informado
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      − {formatCurrency(apuracao.irrf_retido)}
                    </td>
                  </tr>

                  {/* (−) IRPF-M Retido no Exercício */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-rose-500 font-mono font-bold mr-1.5">(−)</span>
                      IRPF-M Retido no Exercício
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Soma de{' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        irrf
                      </code>{' '}
                      onde tipo ={' '}
                      <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">
                        irpfm_exercicio
                      </code>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      − {formatCurrency(apuracao.irpfm_retido_exercicio)}
                    </td>
                  </tr>

                  {/* Linha Final de Saldo: Total a Pagar / Total a Restituir */}
                  {apuracao.total_a_pagar > 0 ? (
                    <tr className="bg-rose-50/90 font-bold border-t-2 border-rose-300">
                      <td className="py-4 px-4 text-rose-950 text-sm">
                        <span className="text-rose-600 font-mono mr-1.5">(=)</span>
                        Total a Pagar (IRPF-M)
                      </td>
                      <td className="py-4 px-4 text-rose-800 text-xs font-normal">
                        IRPF-M Devido − IRRF Retido − IRPF-M Retido
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-lg text-rose-700">
                        {formatCurrency(apuracao.total_a_pagar)}
                      </td>
                    </tr>
                  ) : apuracao.total_a_restituir > 0 ? (
                    <tr className="bg-emerald-50/90 font-bold border-t-2 border-emerald-300">
                      <td className="py-4 px-4 text-emerald-950 text-sm">
                        <span className="text-emerald-600 font-mono mr-1.5">(=)</span>
                        Total a Restituir (IRPF-M)
                      </td>
                      <td className="py-4 px-4 text-emerald-800 text-xs font-normal">
                        IRRF Retido + IRPF-M Retido − IRPF-M Devido
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-lg text-emerald-700">
                        {formatCurrency(apuracao.total_a_restituir)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td className="py-4 px-4 text-slate-900 text-sm">
                        <span className="text-slate-600 font-mono mr-1.5">(=)</span>
                        Saldo IRPF-M
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-xs font-normal">
                        Imposto devido equivalente às retenções informadas
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-base text-slate-900">
                        {formatCurrency(0)}
                      </td>
                    </tr>
                  )}

                  {/* Carga Tributária */}
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      Carga Tributária IRPF-M
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      IRPF-M Devido / BC IRPF-M (percentual efetivo)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {formatPercent(apuracao.carga_tributaria_perc)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
