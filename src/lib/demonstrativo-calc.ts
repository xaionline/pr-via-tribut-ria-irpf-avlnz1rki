import type {
  ResultadoRecord,
  RendimentoRecord,
  DespesaDedutivelRecord,
  AtividadeRuralRecord,
  DestinacaoFiscalRecord,
  IrrfRecord,
  TabelaProgressivaRecord,
  FaixaProgressiva,
} from '@/types'
import { formatCurrency } from '@/lib/formatters'

export interface CalcStep {
  num: string
  label: string
  value: string
  isPercent?: boolean
  isResult?: boolean
  isFinal?: boolean
  breakdown?: Array<{ label: string; value: string }>
}

export interface CalcData {
  resultado: ResultadoRecord
  rendimentos: RendimentoRecord[]
  despesas: DespesaDedutivelRecord[]
  atividadesRurais: AtividadeRuralRecord[]
  destinacoes: DestinacaoFiscalRecord[]
  irrfs?: IrrfRecord[]
  tabela?: TabelaProgressivaRecord
}

const catLabels: Record<string, string> = {
  saude: 'Saúde',
  educacao: 'Educação',
  previdencia: 'Previdência',
  pensao: 'Pensão Alimentícia',
  dependentes: 'Dependentes',
  outras: 'Outras',
}

function findMatchingFaixa(baseCalc: number, faixas: FaixaProgressiva[]): FaixaProgressiva | null {
  if (!faixas || faixas.length === 0) return null
  // As faixas são armazenadas em valores ANUAIS — não há multiplicação por 12.
  for (let i = faixas.length - 1; i >= 0; i--) {
    const limInf = faixas[i].limite_inferior || 0
    if (baseCalc > limInf) return faixas[i]
  }
  return null
}

export function computeSteps(data: CalcData): CalcStep[] {
  const { resultado, rendimentos, despesas, atividadesRurais, destinacoes, irrfs, tabela } = data
  const det = resultado?.detalhamento || {}
  const legal = det.legal || {}
  const demo = det.demonstrativo || {}

  const rendTrib = demo.rendimento_tributavel ?? det.rendimento_tributavel ?? 0
  const deducoes = legal.total_deducoes ?? demo.deducoes ?? 0
  const baseCalc = legal.base_calculo ?? demo.base_calculo ?? 0
  const irrfDevido = legal.irrf_devido ?? demo.irrf_devido ?? 0
  const destAplic = legal.destinacoes_aplicadas ?? demo.destinacoes_aplicadas ?? 0
  const irrfRetido = legal.irrf_retido ?? demo.irrf_retido ?? 0
  const saldo = legal.saldo_imposto ?? demo.saldo_imposto ?? 0

  const faixas = tabela?.faixas || []
  const faixa = findMatchingFaixa(baseCalc, faixas)
  const aliquota = faixa?.aliquota || 0
  // A parcela a deduzir já é anual nas faixas armazenadas (parcela_deduzir).
  const parcelaDeduzir =
    faixa?.parcela_deduzir != null ? faixa.parcela_deduzir : (faixa?.deducao || 0) * 12
  const faixaNum = faixa ? faixas.indexOf(faixa) + 1 : 0

  const ativRuralBase20 = atividadesRurais.reduce((s, a) => s + (a.receita_bruta || 0) * 0.2, 0)

  const rendTribBreakdown: Array<{ label: string; value: string }> = [
    ...rendimentos
      .filter((r) => r.tipo === 'tributavel')
      .map((r) => ({
        label: r.expand?.fonte_pagadora_id?.nome || r.descricao || 'Sem fonte',
        value: formatCurrency(r.valor),
      })),
    ...atividadesRurais
      .filter((a) => (a.receita_bruta || 0) > 0)
      .map((a) => ({
        label: `Atividade Rural (20% de ${formatCurrency(a.receita_bruta)})`,
        value: formatCurrency((a.receita_bruta || 0) * 0.2),
      })),
  ]

  const despesaBreakdown = despesas.map((d) => ({
    label: `${catLabels[d.categoria] || d.categoria} — ${d.descricao}`,
    value: formatCurrency(d.valor),
  }))

  const ruralBreakdown = atividadesRurais.map((a) => ({
    label: `Receita Bruta: ${formatCurrency(a.receita_bruta)} (20% tributável)`,
    value: formatCurrency((a.receita_bruta || 0) * 0.2),
  }))

  const destBreakdown = destinacoes.map((d) => ({
    label: d.tipo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: formatCurrency(d.valor),
  }))

  const irrfBreakdown =
    irrfs && irrfs.length > 0
      ? irrfs.map((item) => ({
          label: item.fonte_pagadora + (item.cnpj_fonte ? ` (${item.cnpj_fonte})` : ''),
          value: formatCurrency(item.valor),
        }))
      : rendimentos
          .filter((r) => r.tipo === 'tributavel')
          .map((r) => ({
            label: r.expand?.fonte_pagadora_id?.nome || r.descricao || 'Sem fonte',
            value: formatCurrency(r.valor),
          }))

  return [
    {
      num: '01',
      label: 'Total de Rendimentos Tributáveis',
      value: formatCurrency(rendTrib),
      breakdown: rendTribBreakdown,
    },
    {
      num: '02',
      label: '(−) Despesas Dedutíveis (modalidade legal)',
      value: formatCurrency(deducoes),
      breakdown: despesaBreakdown,
    },
    {
      num: '03',
      label: '(+) Base Atividade Rural (20% da Receita Bruta)',
      value: formatCurrency(ativRuralBase20),
      breakdown: ruralBreakdown,
    },
    { num: '04', label: '(=) Base de Cálculo', value: formatCurrency(baseCalc), isResult: true },
    {
      num: '05',
      label: `(×) Alíquota aplicável${faixaNum ? ` (faixa ${faixaNum})` : ''}`,
      value: `${aliquota.toFixed(1).replace('.', ',')}%`,
      isPercent: true,
    },
    { num: '06', label: '(−) Parcela a Deduzir da faixa', value: formatCurrency(parcelaDeduzir) },
    { num: '07', label: '(=) Imposto Devido', value: formatCurrency(irrfDevido), isResult: true },
    {
      num: '08',
      label: '(−) Destinações (limitadas a 6%)',
      value: formatCurrency(destAplic),
      breakdown: destBreakdown,
    },
    {
      num: '09',
      label: '(=) IR Devido após destinações',
      value: formatCurrency(irrfDevido - destAplic),
      isResult: true,
    },
    {
      num: '10',
      label: '(−) IRRF Retido na Fonte',
      value: formatCurrency(irrfRetido),
      breakdown: irrfBreakdown,
    },
    { num: '11', label: '(=) IMPOSTO A PAGAR', value: formatCurrency(saldo), isFinal: true },
  ]
}
