import { useState } from 'react'
import {
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Percent,
  Layers,
  ArrowRight,
  Info,
  Building2,
  Calculator,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { ComparativoRegimesResultado, RegimeTributarioPJ } from '@/types'

interface ComparadorRegimesTabProps {
  comparativo: ComparativoRegimesResultado | null
  regimeAtual: RegimeTributarioPJ
  ano: number
  onNavigateToSimulador?: () => void
}

export function ComparadorRegimesTab({
  comparativo,
  regimeAtual,
  ano,
  onNavigateToSimulador,
}: ComparadorRegimesTabProps) {
  if (!comparativo) {
    return (
      <Card className="p-8 text-center border-dashed border-slate-300">
        <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Sem dados para comparação</h3>
        <p className="text-xs text-slate-500 mt-1">
          Lance os faturamentos mensais da empresa para calcular a comparação entre os 3 regimes.
        </p>
      </Card>
    )
  }

  const { regimes, melhorRegime, economiaAnualEstimada, receita_bruta_anual } = comparativo
  const regimeAtualObj = regimes[regimeAtual]
  const melhorRegimeObj = regimes[melhorRegime]
  const economiaEmRelacaoAtual = Math.max(
    0,
    regimeAtualObj.totalTributos - melhorRegimeObj.totalTributos,
  )

  return (
    <div className="space-y-6">
      {/* HEADER DE RECOMENDAÇÃO DO REGIME */}
      <Card className="p-5 border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-sm shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Recomendação de Planejamento Tributário — Ano {ano}
                </span>
                <Badge className="bg-emerald-600 text-white border-0 text-[11px] font-bold">
                  Mais Vantajoso: {melhorRegimeObj.nomeRegime}
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {regimeAtual === melhorRegime ? (
                  <span className="text-emerald-700">
                    A empresa já está enquadrada no regime mais vantajoso!
                  </span>
                ) : (
                  <span>
                    Economia de até{' '}
                    <strong className="text-emerald-700 font-mono font-black">
                      {formatCurrency(economiaEmRelacaoAtual)}/ano
                    </strong>{' '}
                    ao migrar para {melhorRegimeObj.nomeRegime}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Comparativo considerando a receita bruta anual de{' '}
                <strong>{formatCurrency(receita_bruta_anual)}</strong>, custos de folha de
                pagamento, insumos operacionais e regras fiscais vigentes.
              </p>
            </div>
          </div>

          {onNavigateToSimulador && (
            <Button
              onClick={onNavigateToSimulador}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-2 shadow-sm shrink-0 h-10 px-4"
            >
              <Calculator className="w-4 h-4" />
              Simular Pró-Labore & Lucros
            </Button>
          )}
        </div>
      </Card>

      {/* 3 CARDS LADO A LADO: SIMPLES vs PRESUMIDO vs REAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {/* CARD 1: SIMPLES NACIONAL */}
        <Card
          className={`rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
            regimes.simples.isMaisVantajoso
              ? 'border-emerald-500 shadow-md ring-2 ring-emerald-400/40 bg-gradient-to-b from-emerald-50/40 via-white to-white'
              : 'border-slate-200/80 bg-white shadow-subtle'
          }`}
        >
          {regimes.simples.isMaisVantajoso && (
            <div className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Menor Carga Tributária
            </div>
          )}

          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Regime Simplificado
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">Simples Nacional</h3>
              </div>
              {regimeAtual === 'simples' && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 font-bold border-blue-200"
                >
                  Regime Atual
                </Badge>
              )}
            </div>

            {/* Total e Alíquota */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">
                Total de Tributos (DAS)
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(regimes.simples.totalTributos)}
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600">Alíquota Efetiva Média:</span>
                <span className="font-mono font-bold text-blue-700">
                  {formatNumber(regimes.simples.aliquotaEfetiva)}%
                </span>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Composição do Cálculo
              </span>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                <span>Guia Única DAS:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(regimes.simples.totalTributos)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                <span>Lucro Distribuível Estimado:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(regimes.simples.lucroDistribuivel)}
                </span>
              </div>
            </div>

            {/* Comparação com o melhor */}
            {!regimes.simples.isMaisVantajoso && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>Custo adicional:</span>
                  <span className="font-mono text-amber-800">
                    +{formatCurrency(regimes.simples.diferencaParaMelhor)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  +{regimes.simples.diferencaPercentual}% de imposto em relação ao melhor regime.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-500">
            Unifica IRPJ, CSLL, PIS, COFINS, ISS e CPP em guia única calculada via RBT12 e Fator R.
          </div>
        </Card>

        {/* CARD 2: LUCRO PRESUMIDO */}
        <Card
          className={`rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
            regimes.presumido.isMaisVantajoso
              ? 'border-emerald-500 shadow-md ring-2 ring-emerald-400/40 bg-gradient-to-b from-emerald-50/40 via-white to-white'
              : 'border-slate-200/80 bg-white shadow-subtle'
          }`}
        >
          {regimes.presumido.isMaisVantajoso && (
            <div className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Menor Carga Tributária
            </div>
          )}

          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Regime Presuntivo
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">Lucro Presumido</h3>
              </div>
              {regimeAtual === 'presumido' && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 font-bold border-blue-200"
                >
                  Regime Atual
                </Badge>
              )}
            </div>

            {/* Total e Alíquota */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">
                Total de Tributos Federais + ISS
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(regimes.presumido.totalTributos)}
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600">Alíquota Efetiva Anual:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {formatNumber(regimes.presumido.aliquotaEfetiva)}%
                </span>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Composição dos Tributos
              </span>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>IRPJ (15% + Adic. 10%):</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(regimes.presumido.detalheTributos.irpj || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>CSLL (9%):</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(regimes.presumido.detalheTributos.csll || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>PIS / COFINS Cumulativo (3,65%):</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(
                    (regimes.presumido.detalheTributos.pis || 0) +
                      (regimes.presumido.detalheTributos.cofins || 0),
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>ISS Municipal:</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(regimes.presumido.detalheTributos.iss || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Lucro Distribuível Estimado:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(regimes.presumido.lucroDistribuivel)}
                </span>
              </div>
            </div>

            {/* Comparação com o melhor */}
            {!regimes.presumido.isMaisVantajoso && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>Custo adicional:</span>
                  <span className="font-mono text-amber-800">
                    +{formatCurrency(regimes.presumido.diferencaParaMelhor)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  +{regimes.presumido.diferencaPercentual}% de imposto em relação ao melhor regime.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-500">
            Margens de presunção fixas (ex: 32% serviços / 8% comércio) sem necessidade de
            comprovação de despesas.
          </div>
        </Card>

        {/* CARD 3: LUCRO REAL */}
        <Card
          className={`rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
            regimes.real.isMaisVantajoso
              ? 'border-emerald-500 shadow-md ring-2 ring-emerald-400/40 bg-gradient-to-b from-emerald-50/40 via-white to-white'
              : 'border-slate-200/80 bg-white shadow-subtle'
          }`}
        >
          {regimes.real.isMaisVantajoso && (
            <div className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Menor Carga Tributária
            </div>
          )}

          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Regime Não-Cumulativo
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">Lucro Real</h3>
              </div>
              {regimeAtual === 'real' && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 font-bold border-blue-200"
                >
                  Regime Atual
                </Badge>
              )}
            </div>

            {/* Total e Alíquota */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Total de Tributos PJ</span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(regimes.real.totalTributos)}
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600">Alíquota Efetiva Anual:</span>
                <span className="font-mono font-bold text-purple-700">
                  {formatNumber(regimes.real.aliquotaEfetiva)}%
                </span>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Composição dos Tributos
              </span>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>IRPJ Real (LALUR):</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(regimes.real.detalheTributos.irpj || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>CSLL Real (9%):</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(regimes.real.detalheTributos.csll || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>PIS / COFINS (Débito − Créditos):</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(
                    (regimes.real.detalheTributos.pis || 0) +
                      (regimes.real.detalheTributos.cofins || 0),
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>ISS Municipal:</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatCurrency(regimes.real.detalheTributos.iss || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Lucro Líquido Real Distribuível:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(regimes.real.lucroDistribuivel)}
                </span>
              </div>
            </div>

            {/* Comparação com o melhor */}
            {!regimes.real.isMaisVantajoso && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>Custo adicional:</span>
                  <span className="font-mono text-amber-800">
                    +{formatCurrency(regimes.real.diferencaParaMelhor)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  +{regimes.real.diferencaPercentual}% de imposto em relação ao melhor regime.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-500">
            Tributa estritamente o lucro contábil ajustado e permite descontar créditos sobre
            insumos e compras.
          </div>
        </Card>
      </div>

      {/* QUADRO COMPARATIVO CONSOLIDADO (TABELA) */}
      <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Quadro Comparativo Consolidado de Regimes ({ano})
          </h3>
          <p className="text-xs text-slate-500">
            Visão lado a lado da carga tributária anual, distribuição de lucros e percentuais.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">Regime Tributário</th>
                <th className="py-3 px-4 text-right">Total Tributos Anual</th>
                <th className="py-3 px-4 text-right">Carga Efetiva (%)</th>
                <th className="py-3 px-4 text-right">Lucro Distribuível</th>
                <th className="py-3 px-4 text-right">Diferença vs Melhor</th>
                <th className="py-3 px-4 text-center">Status / Vantagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {[regimes.simples, regimes.presumido, regimes.real].map((r) => (
                <tr
                  key={r.regime}
                  className={`transition-colors ${
                    r.isMaisVantajoso
                      ? 'bg-emerald-50/50 hover:bg-emerald-50 font-semibold'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{r.nomeRegime}</span>
                      {regimeAtual === r.regime && (
                        <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">
                          Atual
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(r.totalTributos)}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-700 font-semibold">
                    {formatNumber(r.aliquotaEfetiva)}%
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                    {formatCurrency(r.lucroDistribuivel)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {r.isMaisVantajoso ? (
                      <span className="text-emerald-700 font-sans font-bold">Mais Vantajoso</span>
                    ) : (
                      <span className="text-rose-600 font-medium">
                        +{formatCurrency(r.diferencaParaMelhor)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    {r.isMaisVantajoso ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Recomendado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-500">
                        +{r.diferencaPercentual}% carga
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
