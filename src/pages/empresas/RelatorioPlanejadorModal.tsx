import React from 'react'
import {
  FileDown,
  Printer,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  Users,
  TrendingUp,
  Coins,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Scale,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatNumber, maskCnpj } from '@/lib/formatters'
import type { DadosRelatorioPlanejadorPDF } from '@/services/planejadorPdf'
import {
  imprimirRelatorioPlanejador,
  downloadRelatorioPlanejadorHtml,
} from '@/services/planejadorPdf'

interface RelatorioPlanejadorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dados: DadosRelatorioPlanejadorPDF | null
}

export function RelatorioPlanejadorModal({
  open,
  onOpenChange,
  dados,
}: RelatorioPlanejadorModalProps) {
  if (!dados || !open) return null

  const {
    empresa,
    ano,
    escritorio,
    logoUrl,
    cenarioAtivoNome,
    cenarioRecomendado,
    resultados,
    comparativoRegimes,
    sociosConfig,
    socios,
    retiradaMensal,
    splitProLabore,
    considerarJcp,
    jcpMensal,
    indicadores,
  } = dados

  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const nomeEscritorio = escritorio?.nome || 'Adapta Tributária & Contabilidade'
  const cnpjEscritorio = escritorio?.cnpj ? maskCnpj(escritorio.cnpj) : ''
  const contatoEscritorio = [escritorio?.email, escritorio?.telefone].filter(Boolean).join(' • ')

  const nomeRegime =
    empresa.regime === 'simples'
      ? `Simples Nacional (Anexo ${empresa.anexo_simples || 'III'})`
      : empresa.regime === 'presumido'
        ? 'Lucro Presumido'
        : 'Lucro Real'

  const tributosPjBase = resultados.empresa.tributos_pj_atual || 0
  const tributosPjOtimizado = resultados.empresa.tributos_pj_otimizado || 0
  const economiaPj = resultados.empresa.economia_pj || 0
  const economiaPerc = tributosPjBase > 0 ? ((economiaPj / tributosPjBase) * 100).toFixed(1) : '0'

  const totalIrpfSocios = resultados.socios.reduce((s, r) => s + r.total_irpf_socio, 0)
  const totalGrupo = resultados.consolidado.total_tributos_grupo || 0
  const cargaGlobal = resultados.consolidado.carga_global_perc || 0

  const proLaboreMensalCalc = (retiradaMensal * splitProLabore) / 100
  const dividendosMensalCalc = Math.max(0, retiradaMensal - proLaboreMensalCalc)

  const pctTributosPj = totalGrupo > 0 ? ((tributosPjOtimizado / totalGrupo) * 100).toFixed(1) : '0'
  const pctIrpfSocios = totalGrupo > 0 ? ((totalIrpfSocios / totalGrupo) * 100).toFixed(1) : '0'

  const regimesLista = comparativoRegimes
    ? [
        comparativoRegimes.regimes.simples,
        comparativoRegimes.regimes.presumido,
        comparativoRegimes.regimes.real,
      ]
    : []

  const maxTributosRegimes = regimesLista.length
    ? Math.max(...regimesLista.map((r) => r.totalTributos), 1)
    : 1

  const handleImprimir = () => {
    imprimirRelatorioPlanejador(dados)
  }

  const handleDownload = () => {
    downloadRelatorioPlanejadorHtml(dados)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* BARRA SUPERIOR DE AÇÕES (FIXA) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Relatório Executivo de Planejamento Tributário & Retiradas
              </h3>
              <p className="text-[11px] text-slate-400">
                Visualização do documento pronto para reunião com o cliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download HTML/Doc
            </Button>
            <Button
              size="sm"
              onClick={handleImprimir}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Salvar em PDF
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO DOCUMENTO COM VISUALIZAÇÃO A4 FORMATADA */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/60 font-sans">
          <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 space-y-6 text-slate-900">
            {/* 1. CABEÇALHO DO ESCRITÓRIO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-emerald-600 gap-4">
              <div className="flex items-center gap-3.5">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Escritório"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xl shrink-0">
                    {(nomeEscritorio || 'AT').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                    {nomeEscritorio}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cnpjEscritorio ? `CNPJ: ${cnpjEscritorio} ` : ''}
                    {contatoEscritorio ? `• ${contatoEscritorio}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase font-bold text-[10px]">
                  Relatório de Planejamento Tributário
                </Badge>
                <div>
                  Emissão: <strong className="text-slate-800">{dataEmissao}</strong>
                </div>
                <div>
                  Ano-Calendário: <strong className="text-slate-800">{ano}</strong>
                </div>
              </div>
            </div>

            {/* 2. TÍTULO E DADOS DA EMPRESA */}
            <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-emerald-600 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{empresa.razao_social}</h2>
                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  <span>CNPJ: {maskCnpj(empresa.cnpj)}</span>
                  <span>•</span>
                  <span>Atividade: {empresa.atividade || 'Geral / Serviços'}</span>
                  <span>•</span>
                  <span>{socios.length} sócio(s)</span>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold"
                >
                  {nomeRegime}
                </Badge>
                <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Cenário: {cenarioAtivoNome}
                </div>
              </div>
            </div>

            {/* 3. RESUMO EXECUTIVO E DESTAQUE DE ECONOMIA */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Recomendação Executiva
                </span>
                <p className="text-sm font-semibold text-emerald-50 max-w-lg leading-relaxed">
                  {economiaPj > 0
                    ? `Otimização de retiradas gera economia tributária estimada de ${formatCurrency(economiaPj)} ao ano com pró-labore estratégico de ${splitProLabore}% e dividendos isentos.`
                    : `Cenário estruturado com retirada mensal de ${formatCurrency(retiradaMensal)} mantendo conformidade total fiscal.`}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-lg border border-white/20 text-left sm:text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                  Economia Anual Estimada
                </span>
                <div className="text-2xl font-black font-mono text-white mt-0.5">
                  +{formatCurrency(economiaPj)}
                </div>
                <div className="text-xs font-bold text-emerald-300 mt-0.5">
                  {economiaPerc}% de redução tributária
                </div>
              </div>
            </div>

            {/* 4. GRID DE KPIS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Tributos PJ Base
                </span>
                <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(tributosPjBase)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Carga: {formatNumber(resultados.empresa.carga_tributaria_atual || 0)}%
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Tributos PJ Otimizado
                </span>
                <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(tributosPjOtimizado)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Carga: {formatNumber(resultados.empresa.carga_tributaria_otimizada || 0)}%
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  IRPF Total Sócios
                </span>
                <div className="text-sm font-bold font-mono text-purple-700 mt-1">
                  {formatCurrency(totalIrpfSocios)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Pró-labore + JCP</div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/70">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Total Grupo (PJ + Sócios)
                </span>
                <div className="text-sm font-black font-mono text-emerald-700 mt-1">
                  {formatCurrency(totalGrupo)}
                </div>
                <div className="text-[10px] font-bold text-emerald-800 mt-0.5">
                  Carga global: {formatNumber(cargaGlobal)}%
                </div>
              </div>
            </div>

            {/* 5. TABELA COMPARATIVA DE CENÁRIOS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
                Comparativo de Cenários (Base vs. Otimizado)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Métrica de Análise</th>
                      <th className="py-2.5 px-3 text-right">Cenário Base</th>
                      <th className="py-2.5 px-3 text-right">
                        Cenário Proposto ({cenarioAtivoNome})
                      </th>
                      {cenarioRecomendado && (
                        <th className="py-2.5 px-3 text-right">
                          Recomendado ({cenarioRecomendado.nome})
                        </th>
                      )}
                      <th className="py-2.5 px-3 text-right">Variação / Economia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                        Tributos PJ Anuais
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(tributosPjBase)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {formatCurrency(tributosPjOtimizado)}
                      </td>
                      {cenarioRecomendado && (
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(
                            cenarioRecomendado.resultados?.empresa?.tributos_pj_otimizado || 0,
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-sans">
                        {economiaPj > 0
                          ? `-${formatCurrency(economiaPj)} (${economiaPerc}%)`
                          : 'R$ 0,00'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                        Alíquota Efetiva PJ
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatNumber(resultados.empresa.carga_tributaria_atual || 0)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {formatNumber(resultados.empresa.carga_tributaria_otimizada || 0)}%
                      </td>
                      {cenarioRecomendado && (
                        <td className="py-2.5 px-3 text-right">
                          {formatNumber(
                            cenarioRecomendado.resultados?.empresa?.carga_tributaria_otimizada || 0,
                          )}
                          %
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-sans">
                        -
                        {formatNumber(
                          Math.max(
                            0,
                            (resultados.empresa.carga_tributaria_atual || 0) -
                              (resultados.empresa.carga_tributaria_otimizada || 0),
                          ),
                        )}{' '}
                        p.p.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                        IRPF Consolidado dos Sócios
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(totalIrpfSocios)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {formatCurrency(totalIrpfSocios)}
                      </td>
                      {cenarioRecomendado && (
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(
                            cenarioRecomendado.resultados?.socios?.reduce(
                              (s, r) => s + r.total_irpf_socio,
                              0,
                            ) || 0,
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right text-slate-400 font-sans">—</td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-semibold">
                      <td className="py-2.5 px-3 font-sans font-bold text-emerald-950">
                        Custo Tributário Total do Grupo (PJ + PF)
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatCurrency(tributosPjBase + totalIrpfSocios)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-900">
                        {formatCurrency(totalGrupo)}
                      </td>
                      {cenarioRecomendado && (
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-900">
                          {formatCurrency(
                            cenarioRecomendado.resultados?.consolidado?.total_tributos_grupo || 0,
                          )}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800 font-sans">
                        -{formatCurrency(economiaPj)} ({economiaPerc}%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. GRÁFICOS VISUAIS: COMPOSIÇÃO DE TRIBUTOS E COMPARATIVO DE REGIMES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Composição dos Tributos do Grupo ({formatCurrency(totalGrupo)})
                </span>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>Tributos PJ ({pctTributosPj}%)</span>
                      <span className="font-mono">{formatCurrency(tributosPjOtimizado)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full"
                        style={{ width: `${pctTributosPj}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>IRPF dos Sócios ({pctIrpfSocios}%)</span>
                      <span className="font-mono">{formatCurrency(totalIrpfSocios)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full"
                        style={{ width: `${pctIrpfSocios}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  Retirada mensal: <strong>{formatCurrency(retiradaMensal)}</strong> (Pró-labore:{' '}
                  <strong>{splitProLabore}%</strong> / Dividendos:{' '}
                  <strong>{100 - splitProLabore}%</strong>)
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Comparativo por Regime Tributário
                </span>
                <div className="space-y-2">
                  {regimesLista.map((r) => {
                    const perc = Math.max(
                      8,
                      Math.round((r.totalTributos / maxTributosRegimes) * 100),
                    )
                    const isAtual = empresa.regime === r.regime
                    return (
                      <div key={r.regime}>
                        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                          <span className="flex items-center gap-1">
                            {r.nomeRegime}
                            {isAtual && (
                              <Badge className="bg-blue-100 text-blue-700 text-[9px] py-0 px-1 border-0">
                                Atual
                              </Badge>
                            )}
                            {r.isMaisVantajoso && (
                              <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1 border-0">
                                Mais Vantajoso
                              </Badge>
                            )}
                          </span>
                          <span className="font-mono">
                            {formatCurrency(r.totalTributos)} ({formatNumber(r.aliquotaEfetiva)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              r.isMaisVantajoso
                                ? 'bg-emerald-600'
                                : isAtual
                                  ? 'bg-blue-600'
                                  : 'bg-slate-400'
                            }`}
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 7. COMPOSIÇÃO DAS RETIRADAS POR SÓCIO */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
                Composição das Retiradas e IRPF por Sócio
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Sócio / Cotista</th>
                      <th className="py-2.5 px-3 text-center">Quotas (%)</th>
                      <th className="py-2.5 px-3 text-right">Pró-labore Mensal</th>
                      <th className="py-2.5 px-3 text-right">Pró-labore Anual</th>
                      <th className="py-2.5 px-3 text-right">Dividendos Anuais</th>
                      <th className="py-2.5 px-3 text-right">JCP Anual</th>
                      <th className="py-2.5 px-3 text-right">IRPF Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sociosConfig.map((sc) => {
                      const resSocio = resultados.socios.find((r) => r.socio_id === sc.socio_id)
                      const proLaboreAnual = (sc.pro_labore_mensal || 0) * 12
                      const lucrosAnuais = resSocio?.lucros_distribuidos || 0
                      const jcpAnual = resSocio?.jcp_anual || 0
                      const irpfTotal = resSocio?.total_irpf_socio || 0

                      return (
                        <tr key={sc.socio_id}>
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                            {sc.cliente_nome}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {formatNumber(sc.percentual_participacao)}%
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatCurrency(sc.pro_labore_mensal)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatCurrency(proLaboreAnual)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                            {formatCurrency(lucrosAnuais)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-purple-700">
                            {formatCurrency(jcpAnual)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(irpfTotal)}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                        Total Geral
                      </td>
                      <td className="py-2.5 px-3 text-center">100%</td>
                      <td className="py-2.5 px-3 text-right">
                        {formatCurrency(proLaboreMensalCalc)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatCurrency(proLaboreMensalCalc * 12)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                        {formatCurrency(
                          resultados.socios.reduce((s, r) => s + (r.jcp_anual || 0), 0),
                        )}{' '}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-700">
                        {formatCurrency(resultados.socios.reduce((s, r) => s + r.jcp_anual, 0))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(totalIrpfSocios)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 8. INDICADORES DE TETO E ALERTAS FISCAIS */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
                Conformidade e Indicadores de Limites Fiscais
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Indicador 1: Fator R */}
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    indicadores.atingiuFatorR
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  {indicadores.atingiuFatorR ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">
                      Fator R: {formatNumber(indicadores.fatorR)}%{' '}
                      {indicadores.atingiuFatorR ? '(Atingido ≥ 28%)' : '(< 28%)'}
                    </strong>
                    <span className="text-[11px] opacity-90">
                      {indicadores.atingiuFatorR
                        ? 'Empresa cumpre proporção de folha no Anexo III reduzindo alíquotas.'
                        : 'Folha inferior a 28%. Sujeita ao Anexo V com tributação mais elevada.'}
                    </span>
                  </div>
                </div>

                {/* Indicador 2: Pró-labore mínimo */}
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    indicadores.minProLaboreAtingido
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                      : 'bg-rose-50/70 border-rose-200 text-rose-900'
                  }`}
                >
                  {indicadores.minProLaboreAtingido ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">Pró-labore Mínimo Regulamentar</strong>
                    <span className="text-[11px] opacity-90">
                      {indicadores.minProLaboreAtingido
                        ? 'Todos os pró-labores ativos respeitam o piso legal (R$ 1.518).'
                        : 'Atenção: Existem sócios com valor de pró-labore abaixo do salário mínimo.'}
                    </span>
                  </div>
                </div>

                {/* Indicador 3: Altas Rendas */}
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    indicadores.alertaAltasRendas
                      ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <ShieldAlert
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      indicadores.alertaAltasRendas ? 'text-purple-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <strong className="block font-bold">
                      Regra de Altas Rendas (Teto R$ 600k)
                    </strong>
                    <span className="text-[11px] opacity-90">
                      {indicadores.alertaAltasRendas
                        ? 'Sócio com dividendos acima de R$ 600k/ano. Aplicação do IRPF-M sobre excedente.'
                        : 'Distribuição dentro do limite de isenção integral.'}
                    </span>
                  </div>
                </div>

                {/* Indicador 4: Anexo Simples */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Enquadramento Tributário</strong>
                    <span className="text-[11px] opacity-90">
                      {indicadores.anexoSimplesInfo
                        ? indicadores.anexoSimplesInfo.mensagem
                        : `Regime da empresa: ${nomeRegime}.`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 9. ASSINATURA E RODAPÉ */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
              <div className="border-t border-slate-300 pt-2">
                <strong className="block text-slate-800 font-bold">{nomeEscritorio}</strong>
                <span>Responsável Técnico / Contábil</span>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <strong className="block text-slate-800 font-bold">{empresa.razao_social}</strong>
                <span>De acordo / Sócio Administrador</span>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL (FIXO) */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Documento formatado para impressão A4 • Emitido por <strong>{nomeEscritorio}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={handleImprimir}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Gerar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
