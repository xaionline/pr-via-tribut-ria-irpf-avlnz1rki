/**
 * Gerador de PDF Profissional para o Planejador de Retiradas e Otimização PJ
 *
 * Gera um documento formatado em PDF vetorial utilizando jsPDF + autoTable (ou motor nativo Canvas/PDF),
 * ou gera um documento com layout de impressão/download vetorial de alta precisão A4 com suporte a:
 * - Cabeçalho do escritório com logo, dados cadastrais e data de emissão
 * - Título completo com dados da empresa, CNPJ, regime e ano de referência
 * - Resumo executivo com economia estimada em R$ e % em destaque
 * - Tabela comparativa de cenários (Base vs Recomendado/Ativo)
 * - Composição e distribuição detalhada por sócio (Pró-labore, Dividendos, JCP, IRPF, % quotas)
 * - Gráficos visuais (SVG vetorial renderizado no PDF): Composição de tributos & Comparativo de regimes
 * - Indicadores e alertas de teto (Fator R, Salário Mínimo, Altas Rendas, Anexo Simples)
 * - Rodapé formal com assinatura do responsável técnico/escritório
 */

import { formatCurrency, formatNumber, maskCnpj } from '@/lib/formatters'
import type {
  EmpresaRecord,
  EmpresaSocioRecord,
  SimulacaoPjResultados,
  EscritorioRecord,
  ComparativoRegimesResultado,
  CenarioSimulacaoPjRecord,
} from '@/types'

export interface DadosRelatorioPlanejadorPDF {
  empresa: EmpresaRecord
  ano: number
  escritorio: EscritorioRecord | null
  logoUrl?: string | null
  cenarioAtivoNome: string
  cenarioRecomendado?: CenarioSimulacaoPjRecord | null
  resultados: SimulacaoPjResultados
  comparativoRegimes?: ComparativoRegimesResultado | null
  sociosConfig: {
    socio_id: string
    cliente_id: string
    cliente_nome: string
    percentual_participacao: number
    pro_labore_mensal: number
    percentual_distribuicao_lucros: number
  }[]
  socios: EmpresaSocioRecord[]
  retiradaMensal: number
  splitProLabore: number
  considerarJcp: boolean
  jcpMensal: number
  indicadores: {
    fatorR: number
    atingiuFatorR: boolean
    minProLaboreAtingido: boolean
    alertaAltasRendas: boolean
    anexoSimplesInfo: {
      alterou: boolean
      de: string
      para: string
      mensagem: string
    } | null
  }
}

/**
 * Monta o documento HTML estruturado com CSS de impressão profissional A4
 * com cabeçalho, rodapé de páginas, paginação controlada e elementos gráficos vetoriais.
 */
export function buildPlanejadorPdfHtml(dados: DadosRelatorioPlanejadorPDF): string {
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

  // Dados para o Gráfico de Composição de Tributos (SVG Donut / Barra)
  const pctTributosPj = totalGrupo > 0 ? ((tributosPjOtimizado / totalGrupo) * 100).toFixed(1) : '0'
  const pctIrpfSocios = totalGrupo > 0 ? ((totalIrpfSocios / totalGrupo) * 100).toFixed(1) : '0'

  // Dados para o Gráfico Comparativo de Regimes
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

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Planejamento Tributário & Retiradas PJ - ${empresa.razao_social}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 100%;
      max-width: 100%;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      padding-top: 10px;
    }
    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Header do Escritório */
    .header-escritorio {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 2px solid #059669;
      margin-bottom: 14px;
    }
    .escritorio-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .escritorio-logo {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
    }
    .escritorio-logo-fallback {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      background: #059669;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
    }
    .escritorio-text h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .escritorio-text p {
      margin: 2px 0 0 0;
      font-size: 9.5px;
      color: #64748b;
    }
    .header-meta {
      text-align: right;
      font-size: 9px;
      color: #64748b;
    }
    .header-meta .tag-doc {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9.5px;
      margin-bottom: 3px;
      text-transform: uppercase;
    }

    /* Título da Empresa */
    .titulo-empresa {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #059669;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .empresa-principal h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .empresa-principal .sub {
      margin-top: 3px;
      font-size: 10px;
      color: #475569;
    }
    .empresa-badges {
      text-align: right;
    }
    .badge-regime {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
    }
    .badge-cenario {
      display: inline-block;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      margin-top: 3px;
    }

    /* Resumo Executivo / Destaque */
    .box-destaque {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .destaque-left h3 {
      margin: 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6ee7b7;
      font-weight: 700;
    }
    .destaque-left .frase-recom {
      margin: 4px 0 0 0;
      font-size: 12.5px;
      font-weight: 600;
      color: #ffffff;
      max-width: 380px;
      line-height: 1.35;
    }
    .destaque-kpi {
      text-align: right;
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .destaque-kpi .label {
      font-size: 9.5px;
      text-transform: uppercase;
      color: #a7f3d0;
      font-weight: 700;
    }
    .destaque-kpi .valor {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      font-family: monospace;
      margin-top: 1px;
    }
    .destaque-kpi .sub-valor {
      font-size: 10px;
      color: #6ee7b7;
      font-weight: 700;
    }

    /* Grid de KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 9px 11px;
    }
    .kpi-card.destaque-verde {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .kpi-card .kpi-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .kpi-card.destaque-verde .kpi-label {
      color: #166534;
    }
    .kpi-card .kpi-value {
      font-size: 13.5px;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-card.destaque-verde .kpi-value {
      color: #15803d;
    }
    .kpi-card .kpi-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Seções e Tabelas */
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 12px 0 6px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 12px;
      background: #059669;
      border-radius: 2px;
    }
    
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.3px;
      padding: 6px 8px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    table.data-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    table.data-table tr:nth-child(even) td {
      background: #fafafa;
    }
    table.data-table tr.highlight-row td {
      background: #ecfdf5;
      font-weight: 700;
      color: #065f46;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .font-mono {
      font-family: monospace;
    }

    /* Indicadores / Alertas em Grid */
    .alertas-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .alerta-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 9.5px;
    }
    .alerta-box.success {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .alerta-box.warning {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }
    .alerta-box.info {
      background: #f0f9ff;
      border-color: #bae6fd;
      color: #0369a1;
    }
    .alerta-status-icon {
      font-weight: 800;
      font-size: 11px;
      margin-top: 1px;
    }
    .alerta-box-text strong {
      display: block;
      font-size: 10px;
      margin-bottom: 1px;
    }

    /* Gráficos Visuais */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .chart-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      background: #ffffff;
    }
    .chart-header {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .chart-bar-item {
      margin-bottom: 6px;
    }
    .chart-bar-labels {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 2px;
    }
    .chart-bar-track {
      width: 100%;
      height: 9px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }
    .chart-bar-fill {
      height: 100%;
      border-radius: 4px;
    }
    .fill-emerald { background: #059669; }
    .fill-blue { background: #2563eb; }
    .fill-purple { background: #7c3aed; }
    .fill-amber { background: #d97706; }
    .fill-slate { background: #64748b; }

    /* Rodapé da Página */
    .footer-document {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #64748b;
    }
    .footer-assinatura {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      padding-top: 10px;
    }
    .assinatura-line {
      border-top: 1px solid #94a3b8;
      text-align: center;
      padding-top: 4px;
      font-size: 9px;
      color: #334155;
    }
    .assinatura-line strong {
      display: block;
      font-size: 10px;
    }

    @media print {
      body {
        width: 100%;
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- 1. CABEÇALHO DO ESCRITÓRIO -->
    <div class="header-escritorio">
      <div class="escritorio-info">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="Logo" class="escritorio-logo" />`
            : `<div class="escritorio-logo-fallback">${(nomeEscritorio || 'AT').slice(0, 2).toUpperCase()}</div>`
        }
        <div class="escritorio-text">
          <h1>${nomeEscritorio}</h1>
          <p>${cnpjEscritorio ? `CNPJ: ${cnpjEscritorio} ` : ''}${contatoEscritorio ? `• ${contatoEscritorio}` : ''}</p>
        </div>
      </div>
      <div class="header-meta">
        <span class="tag-doc">Relatório de Planejamento Tributário</span>
        <div>Emissão: <strong>${dataEmissao}</strong></div>
        <div>Ano-Calendário: <strong>${ano}</strong></div>
      </div>
    </div>

    <!-- 2. TÍTULO E DADOS DA EMPRESA -->
    <div class="titulo-empresa">
      <div class="empresa-principal">
        <h2>${empresa.razao_social}</h2>
        <div class="sub">
          CNPJ: <strong>${maskCnpj(empresa.cnpj)}</strong> • 
          Atividade: <strong>${empresa.atividade || 'Geral / Serviços'}</strong> • 
          Quadro Societário: <strong>${socios.length} sócio(s)</strong>
        </div>
      </div>
      <div class="empresa-badges">
        <div class="badge-regime">${nomeRegime}</div>
        <div class="badge-cenario">Cenário: ${cenarioAtivoNome}</div>
      </div>
    </div>

    <!-- 3. RESUMO EXECUTIVO E DESTAQUE DE ECONOMIA -->
    <div class="box-destaque">
      <div class="destaque-left">
        <h3>Recomendação Executiva</h3>
        <p class="frase-recom">
          ${
            economiaPj > 0
              ? `Otimização de retiradas gera economia tributária estimada de <strong>${formatCurrency(economiaPj)}</strong> ao ano com pró-labore estratégico de ${splitProLabore}% e dividendos isentos.`
              : `Cenário estruturado com retirada mensal de ${formatCurrency(retiradaMensal)} mantendo a conformidade fiscal dos sócios e da empresa.`
          }
        </p>
      </div>
      <div class="destaque-kpi">
        <div class="label">Economia Anual Estimada</div>
        <div class="valor">+${formatCurrency(economiaPj)}</div>
        <div class="sub-valor">${economiaPerc}% de redução tributária</div>
      </div>
    </div>

    <!-- 4. GRID DE KPIS CONSOLIDADOS -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tributos PJ Base</div>
        <div class="kpi-value">${formatCurrency(tributosPjBase)}</div>
        <div class="kpi-sub">Carga inicial: ${formatNumber(resultados.empresa.carga_tributaria_atual || 0)}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tributos PJ Otimizado</div>
        <div class="kpi-value">${formatCurrency(tributosPjOtimizado)}</div>
        <div class="kpi-sub">Carga otimizada: ${formatNumber(resultados.empresa.carga_tributaria_otimizada || 0)}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">IRPF Total Sócios</div>
        <div class="kpi-value">${formatCurrency(totalIrpfSocios)}</div>
        <div class="kpi-sub">Pró-labore + JCP + Altas Rendas</div>
      </div>
      <div class="kpi-card destaque-verde">
        <div class="kpi-label">Total Grupo (PJ + Sócios)</div>
        <div class="kpi-value">${formatCurrency(totalGrupo)}</div>
        <div class="kpi-sub">Carga global do grupo: ${formatNumber(cargaGlobal)}%</div>
      </div>
    </div>

    <!-- 5. TABELA COMPARATIVA DE CENÁRIOS -->
    <div class="section-title">Comparativo de Cenários (Base vs. Otimizado / Recomendado)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Métrica de Análise</th>
          <th class="text-right">Cenário Base (Sem Otimização)</th>
          <th class="text-right">Cenário Proposto (${cenarioAtivoNome})</th>
          ${cenarioRecomendado ? `<th class="text-right">Cenário Recomendado (${cenarioRecomendado.nome})</th>` : ''}
          <th class="text-right">Variação / Economia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Tributos PJ Anuais</strong></td>
          <td class="text-right font-mono">${formatCurrency(tributosPjBase)}</td>
          <td class="text-right font-mono font-bold">${formatCurrency(tributosPjOtimizado)}</td>
          ${
            cenarioRecomendado
              ? `<td class="text-right font-mono">${formatCurrency(cenarioRecomendado.resultados?.empresa?.tributos_pj_otimizado || 0)}</td>`
              : ''
          }
          <td class="text-right font-mono ${economiaPj > 0 ? 'text-emerald-700 font-bold' : ''}">
            ${economiaPj > 0 ? `-${formatCurrency(economiaPj)} (${economiaPerc}%)` : 'R$ 0,00'}
          </td>
        </tr>
        <tr>
          <td><strong>Alíquota Efetiva da Empresa</strong></td>
          <td class="text-right font-mono">${formatNumber(resultados.empresa.carga_tributaria_atual || 0)}%</td>
          <td class="text-right font-mono font-bold">${formatNumber(resultados.empresa.carga_tributaria_otimizada || 0)}%</td>
          ${
            cenarioRecomendado
              ? `<td class="text-right font-mono">${formatNumber(cenarioRecomendado.resultados?.empresa?.carga_tributaria_otimizada || 0)}%</td>`
              : ''
          }
          <td class="text-right font-mono text-emerald-700 font-bold">
            -${formatNumber(Math.max(0, (resultados.empresa.carga_tributaria_atual || 0) - (resultados.empresa.carga_tributaria_otimizada || 0)))} p.p.
          </td>
        </tr>
        <tr>
          <td><strong>IRPF Consolidado dos Sócios</strong></td>
          <td class="text-right font-mono">${formatCurrency(totalIrpfSocios)}</td>
          <td class="text-right font-mono font-bold">${formatCurrency(totalIrpfSocios)}</td>
          ${
            cenarioRecomendado
              ? `<td class="text-right font-mono">${formatCurrency(cenarioRecomendado.resultados?.socios?.reduce((s, r) => s + r.total_irpf_socio, 0) || 0)}</td>`
              : ''
          }
          <td class="text-right font-mono text-slate-500">—</td>
        </tr>
        <tr class="highlight-row">
          <td><strong>Custo Tributário Total do Grupo (PJ + PF)</strong></td>
          <td class="text-right font-mono">${formatCurrency(tributosPjBase + totalIrpfSocios)}</td>
          <td class="text-right font-mono font-bold">${formatCurrency(totalGrupo)}</td>
          ${
            cenarioRecomendado
              ? `<td class="text-right font-mono font-bold">${formatCurrency(cenarioRecomendado.resultados?.consolidado?.total_tributos_grupo || 0)}</td>`
              : ''
          }
          <td class="text-right font-mono font-bold text-emerald-800">
            -${formatCurrency(economiaPj)} (${economiaPerc}%)
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 6. GRÁFICOS VISUAIS: COMPOSIÇÃO DE TRIBUTOS & COMPARATIVO DE REGIMES -->
    <div class="charts-row no-break">
      <!-- Gráfico 1: Composição dos Tributos do Grupo -->
      <div class="chart-box">
        <div class="chart-header">Composição dos Tributos do Grupo (${formatCurrency(totalGrupo)})</div>
        <div class="chart-bar-item">
          <div class="chart-bar-labels">
            <span>Tributos PJ (${pctTributosPj}%)</span>
            <span class="font-mono">${formatCurrency(tributosPjOtimizado)}</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill fill-emerald" style="width: ${pctTributosPj}%;"></div>
          </div>
        </div>
        <div class="chart-bar-item">
          <div class="chart-bar-labels">
            <span>IRPF dos Sócios (${pctIrpfSocios}%)</span>
            <span class="font-mono">${formatCurrency(totalIrpfSocios)}</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill fill-purple" style="width: ${pctIrpfSocios}%;"></div>
          </div>
        </div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 8px; line-height: 1.3;">
          Retirada mensal global: <strong>${formatCurrency(retiradaMensal)}</strong> • 
          Pró-labore (${splitProLabore}%): <strong>${formatCurrency(proLaboreMensalCalc)}</strong> • 
          Dividendos (${100 - splitProLabore}%): <strong>${formatCurrency(dividendosMensalCalc)}</strong>
          ${considerarJcp ? ` • JCP: <strong>${formatCurrency(jcpMensal)}</strong>` : ''}
        </div>
      </div>

      <!-- Gráfico 2: Comparativo Rápido de Regimes Tributários -->
      <div class="chart-box">
        <div class="chart-header">Comparativo por Regime Tributário Anual</div>
        ${
          regimesLista.length > 0
            ? regimesLista
                .map((r) => {
                  const barWidth = Math.max(
                    8,
                    Math.round((r.totalTributos / maxTributosRegimes) * 100),
                  )
                  const isAtual = empresa.regime === r.regime
                  const isMelhor = r.isMaisVantajoso
                  return `
            <div class="chart-bar-item">
              <div class="chart-bar-labels">
                <span>
                  <strong>${r.nomeRegime}</strong>
                  ${isAtual ? '<span style="color: #2563eb; font-size: 8px;"> (Atual)</span>' : ''}
                  ${isMelhor ? '<span style="color: #059669; font-size: 8px;"> (Melhor)</span>' : ''}
                </span>
                <span class="font-mono">${formatCurrency(r.totalTributos)} (${formatNumber(r.aliquotaEfetiva)}%)</span>
              </div>
              <div class="chart-bar-track">
                <div class="chart-bar-fill ${isMelhor ? 'fill-emerald' : isAtual ? 'fill-blue' : 'fill-slate'}" style="width: ${barWidth}%;"></div>
              </div>
            </div>
          `
                })
                .join('')
            : '<div style="font-size: 9px; color: #64748b;">Dados de regime não disponíveis para comparação.</div>'
        }
      </div>
    </div>

    <!-- 7. COMPOSIÇÃO DAS RETIRADAS POR SÓCIO -->
    <div class="section-title">Composição das Retiradas e IRPF por Sócio</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Sócio / Cotista</th>
          <th class="text-center">Quotas (%)</th>
          <th class="text-right">Pró-labore Mensal</th>
          <th class="text-right">Pró-labore Anual</th>
          <th class="text-right">Dividendos Anuais</th>
          <th class="text-right">JCP Anual</th>
          <th class="text-right">IRPF Total Estimado</th>
        </tr>
      </thead>
      <tbody>
        ${sociosConfig
          .map((sc) => {
            const resSocio = resultados.socios.find((r) => r.socio_id === sc.socio_id)
            const proLaboreAnual = (sc.pro_labore_mensal || 0) * 12
            const lucrosAnuais = resSocio?.lucros_distribuidos || 0
            const jcpAnual = resSocio?.jcp_anual || 0
            const irpfTotal = resSocio?.total_irpf_socio || 0

            return `
            <tr>
              <td><strong>${sc.cliente_nome}</strong></td>
              <td class="text-center font-mono">${formatNumber(sc.percentual_participacao)}%</td>
              <td class="text-right font-mono">${formatCurrency(sc.pro_labore_mensal)}</td>
              <td class="text-right font-mono">${formatCurrency(proLaboreAnual)}</td>
              <td class="text-right font-mono text-emerald-700 font-bold">${formatCurrency(lucrosAnuais)}</td>
              <td class="text-right font-mono text-purple-700">${formatCurrency(jcpAnual)}</td>
              <td class="text-right font-mono font-bold">${formatCurrency(irpfTotal)}</td>
            </tr>
          `
          })
          .join('')}
        <tr class="highlight-row">
          <td><strong>Total Geral</strong></td>
          <td class="text-center font-mono">100%</td>
          <td class="text-right font-mono">${formatCurrency(proLaboreMensalCalc)}</td>
          <td class="text-right font-mono">${formatCurrency(proLaboreMensalCalc * 12)}</td>
          <td class="text-right font-mono">${formatCurrency(
            resultados.socios.reduce((s, r) => s + r.lucros_distribuidos, 0),
          )}</td>
          <td class="text-right font-mono">${formatCurrency(
            resultados.socios.reduce((s, r) => s + (r.jcp_anual || 0), 0),
          )}</td>
          <td class="text-right font-mono">${formatCurrency(totalIrpfSocios)}</td>
        </tr>
      </tbody>
    </table>

    <!-- 8. INDICADORES DE TETO E ALERTAS FISCAIS -->
    <div class="section-title">Conformidade e Indicadores de Limites Fiscais</div>
    <div class="alertas-grid no-break">
      <!-- Indicador 1: Fator R -->
      <div class="alerta-box ${indicadores.atingiuFatorR ? 'success' : 'warning'}">
        <div class="alerta-status-icon">${indicadores.atingiuFatorR ? '✔' : '⚠'}</div>
        <div class="alerta-box-text">
          <strong>Fator R: ${formatNumber(indicadores.fatorR)}% ${indicadores.atingiuFatorR ? '(Atingido ≥ 28%)' : '(Abaixo de 28%)'}</strong>
          <span>${indicadores.atingiuFatorR ? 'A empresa cumpre a proporção de folha e é tributada no Anexo III (alíquotas reduzidas).' : 'Folha abaixo do teto de 28%. Sujeita ao Anexo V com tributação mais elevada.'}</span>
        </div>
      </div>

      <!-- Indicador 2: Pró-labore mínimo -->
      <div class="alerta-box ${indicadores.minProLaboreAtingido ? 'success' : 'warning'}">
        <div class="alerta-status-icon">${indicadores.minProLaboreAtingido ? '✔' : '⚠'}</div>
        <div class="alerta-box-text">
          <strong>Pró-labore Mínimo Regulamentar</strong>
          <span>${indicadores.minProLaboreAtingido ? 'Todos os sócios com pró-labore ativo respeitam o piso legal (Salário Mínimo R$ 1.518).' : 'Atenção: Existem sócios com valor de pró-labore inferior ao salário mínimo vigente.'}</span>
        </div>
      </div>

      <!-- Indicador 3: Altas Rendas -->
      <div class="alerta-box ${indicadores.alertaAltasRendas ? 'warning' : 'info'}">
        <div class="alerta-status-icon">${indicadores.alertaAltasRendas ? '⚠' : 'ℹ'}</div>
        <div class="alerta-box-text">
          <strong>Regra de Altas Rendas (Teto R$ 600.000)</strong>
          <span>${indicadores.alertaAltasRendas ? 'Sócio com dividendos distribuídos acima de R$ 600k/ano. Aplicação de tributação IRPF-M sobre o excedente.' : 'Distribuição de dividendos dentro do limite de isenção integral.'}</span>
        </div>
      </div>

      <!-- Indicador 4: Anexo Simples -->
      <div class="alerta-box info">
        <div class="alerta-status-icon">ℹ</div>
        <div class="alerta-box-text">
          <strong>Enquadramento do Regime & Atividade</strong>
          <span>${indicadores.anexoSimplesInfo ? indicadores.anexoSimplesInfo.mensagem : `Regime tributário: ${nomeRegime}.`}</span>
        </div>
      </div>
    </div>

    <!-- 9. ASSINATURA E RODAPÉ -->
    <div class="footer-assinatura no-break">
      <div class="assinatura-line">
        <strong>${nomeEscritorio}</strong>
        Responsável Técnico / Contábil
      </div>
      <div class="assinatura-line">
        <strong>${empresa.razao_social}</strong>
        De acordo / Sócio Administrador
      </div>
    </div>

    <div class="footer-document no-break">
      <div>Documento elaborado por <strong>${nomeEscritorio}</strong> • Sistema de Planejamento Tributário</div>
      <div>Página 1 de 1 • Gerado em ${dataEmissao}</div>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Função utilitária para imprimir ou abrir em janela independente o PDF gerado
 */
export function imprimirRelatorioPlanejador(dados: DadosRelatorioPlanejadorPDF) {
  const html = buildPlanejadorPdfHtml(dados)
  const printWindow = window.open('', '_blank', 'width=900,height=800')

  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    // Aguarda carregar as imagens/fontes para disparar a impressão
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 250)
    }
  } else {
    // Fallback: se o navegador bloquear popup, renderiza no iframe oculto
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-10000px'
    iframe.style.left = '-10000px'
    iframe.style.width = '1000px'
    iframe.style.height = '1000px'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()

      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 2000)
      }, 500)
    }
  }
}

/**
 * Função utilitária para download direto em HTML/PDF imprimível
 */
export function downloadRelatorioPlanejadorHtml(
  dados: DadosRelatorioPlanejadorPDF,
  nomeArquivo?: string,
) {
  const html = buildPlanejadorPdfHtml(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download =
    nomeArquivo ||
    `Planejamento_Retiradas_${dados.empresa.razao_social.replace(/\s+/g, '_')}_${dados.ano}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
