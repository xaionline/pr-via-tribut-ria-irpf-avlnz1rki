import type { EscritorioRecord } from '@/types'
import { maskCnpj } from '@/lib/formatters'

export interface GerarDocumentoPdfOptions {
  titulo: string
  subtitulo?: string
  tipoRelatorio: string
  periodo?: string
  escritorio?: EscritorioRecord | null
  logoUrl?: string | null
  kpis?: { label: string; valor: string; sub?: string }[]
  colunas: { titulo: string; align?: 'left' | 'right' | 'center'; width?: string }[]
  linhas: (string | number)[][]
  totais?: (string | number)[]
  observacoes?: string[]
}

/**
 * Constrói o HTML para impressão/PDF de relatórios tabulares e executivos
 */
export function buildDocumentoPdfHtml(options: GerarDocumentoPdfOptions): string {
  const {
    titulo,
    subtitulo,
    tipoRelatorio,
    periodo,
    escritorio,
    logoUrl,
    kpis = [],
    colunas,
    linhas,
    totais,
    observacoes = [],
  } = options

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

  const kpisHtml =
    kpis.length > 0
      ? `
    <div class="kpi-grid">
      ${kpis
        .map(
          (k) => `
        <div class="kpi-card">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value">${k.valor}</div>
          ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
        </div>
      `,
        )
        .join('')}
    </div>`
      : ''

  const colunasHtml = colunas
    .map(
      (c) =>
        `<th style="text-align: ${c.align || 'left'}; ${c.width ? `width: ${c.width};` : ''}">${c.titulo}</th>`,
    )
    .join('')

  const linhasHtml = linhas
    .map(
      (linha, idx) => `
      <tr class="${idx % 2 === 1 ? 'row-alt' : ''}">
        ${linha
          .map((celula, colIdx) => {
            const align = colunas[colIdx]?.align || 'left'
            return `<td style="text-align: ${align};">${celula !== undefined && celula !== null ? celula : '-'}</td>`
          })
          .join('')}
      </tr>
    `,
    )
    .join('')

  const totaisHtml = totais
    ? `
      <tr class="row-totais">
        ${totais
          .map((celula, colIdx) => {
            const align = colunas[colIdx]?.align || 'left'
            return `<td style="text-align: ${align}; font-weight: 800;">${celula !== undefined && celula !== null ? celula : ''}</td>`
          })
          .join('')}
      </tr>`
    : ''

  const obsHtml =
    observacoes.length > 0
      ? `
    <div class="box-observacoes">
      <div class="obs-title">Notas e Observações Técnicas</div>
      <ul>
        ${observacoes.map((o) => `<li>${o}</li>`).join('')}
      </ul>
    </div>`
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo} - ${nomeEscritorio}</title>
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
      font-size: 10.5px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 100%;
    }
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
      width: 48px;
      height: 48px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
    }
    .escritorio-logo-fallback {
      width: 48px;
      height: 48px;
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
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .escritorio-text p {
      margin: 2px 0 0 0;
      font-size: 9px;
      color: #64748b;
    }
    .header-meta {
      text-align: right;
      font-size: 8.5px;
      color: #64748b;
    }
    .header-meta .tag-doc {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9px;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .relatorio-header {
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
    .relatorio-header h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .relatorio-header .sub {
      margin-top: 2px;
      font-size: 9.5px;
      color: #475569;
    }
    .relatorio-periodo-tag {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      white-space: nowrap;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .kpi-card .kpi-label {
      font-size: 8.5px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .kpi-card .kpi-value {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      font-family: ui-monospace, monospace;
      margin-top: 2px;
    }
    .kpi-card .kpi-sub {
      font-size: 8px;
      color: #64748b;
      margin-top: 2px;
    }
    table.relatorio-tabela {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5px;
    }
    table.relatorio-tabela th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 6px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    table.relatorio-tabela td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    table.relatorio-tabela tr.row-alt td {
      background: #fbfcfe;
    }
    table.relatorio-tabela tr.row-totais td {
      background: #f1f5f9;
      border-top: 2px solid #94a3b8;
      border-bottom: 2px solid #94a3b8;
      color: #0f172a;
    }
    .box-observacoes {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 12px;
      font-size: 8.5px;
      color: #475569;
    }
    .box-observacoes .obs-title {
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 4px;
    }
    .box-observacoes ul {
      margin: 0;
      padding-left: 16px;
    }
    .box-observacoes li {
      margin-bottom: 2px;
    }
    .footer-doc {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header-escritorio">
      <div class="escritorio-info">
        ${
          logoUrl
            ? `<img src="${logoUrl}" alt="Logo" class="escritorio-logo" />`
            : `<div class="escritorio-logo-fallback">${nomeEscritorio.slice(0, 2).toUpperCase()}</div>`
        }
        <div class="escritorio-text">
          <h1>${nomeEscritorio}</h1>
          ${cnpjEscritorio ? `<p>CNPJ: ${cnpjEscritorio}</p>` : ''}
          ${contatoEscritorio ? `<p>${contatoEscritorio}</p>` : ''}
        </div>
      </div>
      <div class="header-meta">
        <div class="tag-doc">${tipoRelatorio}</div>
        <div>Emissão: ${dataEmissao}</div>
        <div>Software: Inteligência Tributária</div>
      </div>
    </div>

    <div class="relatorio-header">
      <div>
        <h2>${titulo}</h2>
        ${subtitulo ? `<div class="sub">${subtitulo}</div>` : ''}
      </div>
      ${periodo ? `<div class="relatorio-periodo-tag">Período: ${periodo}</div>` : ''}
    </div>

    ${kpisHtml}

    <table class="relatorio-tabela">
      <thead>
        <tr>${colunasHtml}</tr>
      </thead>
      <tbody>
        ${linhasHtml}
        ${totaisHtml}
      </tbody>
    </table>

    ${obsHtml}

    <div class="footer-doc">
      <span>Relatório gerado eletronicamente pela plataforma Inteligência Tributária</span>
      <span>${dataEmissao} • Página 1</span>
    </div>
  </div>
</body>
</html>`
}

/**
 * Dispara janela de impressão ou download em PDF para o navegador
 */
export function imprimirDocumentoHtml(html: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=800')

  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 250)
    }
  } else {
    // Fallback com iframe oculto
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
 * Converte dados tabulares para arquivo CSV delimitado por ponto e vírgula com BOM UTF-8
 */
export function exportarParaCsv(
  nomeArquivo: string,
  colunas: string[],
  linhas: (string | number | undefined | null)[][],
) {
  const escapeCsv = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const cabecalho = colunas.map(escapeCsv).join(';')
  const linhasCsv = linhas.map((linha) => linha.map(escapeCsv).join(';'))
  const csvCompleto = [cabecalho, ...linhasCsv].join('\r\n')

  // BOM \uFEFF para Excel abrir em UTF-8 corretamente com acentos
  const blob = new Blob(['\uFEFF' + csvCompleto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
