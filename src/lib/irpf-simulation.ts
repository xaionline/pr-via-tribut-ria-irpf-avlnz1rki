import type { FaixaProgressiva, SimulacaoParams, SimulacaoResultados } from '@/types'
import { formatCurrency } from '@/lib/formatters'

export interface SimulationBaseData {
  rendTributavel: number
  deducoesAtuais: number
  previdenciaAtual: number
  destinacoesAtuais: number
  irrfDevidoAtual: number
  irrfRetidoAtual: number
  faixas: FaixaProgressiva[]
}

function calcIRPF(baseCalculo: number, faixas: FaixaProgressiva[]): number {
  if (!Array.isArray(faixas) || faixas.length === 0) return 0
  for (let i = faixas.length - 1; i >= 0; i--) {
    const f = faixas[i]
    const limInfAnual = (f.limite_inferior || 0) * 12
    if (baseCalculo > limInfAnual) {
      const aliq = (f.aliquota || 0) / 100
      const dedAnual = (f.deducao || 0) * 12
      return Math.max(0, baseCalculo * aliq - dedAnual)
    }
  }
  return 0
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

export function getPgblLimit(rendTributavel: number, previdenciaAtual: number): number {
  return Math.max(0, rendTributavel * 0.12 - previdenciaAtual)
}

export function getDestinacaoLimit(irrfDevido: number): number {
  return Math.max(0, irrfDevido * 0.06)
}

export function simulate(base: SimulationBaseData, params: SimulacaoParams): SimulacaoResultados {
  const { rendTributavel, deducoesAtuais, destinacoesAtuais, irrfDevidoAtual, faixas } = base

  const deducaoDep = params.dependentes * 2275.08
  const novasDeducoes =
    deducoesAtuais +
    params.pgbl_adicional +
    params.despesas_medicas +
    params.pensao_alimenticia +
    deducaoDep
  const novaBase = Math.max(0, rendTributavel - novasDeducoes)
  const novoIrrfDevido = calcIRPF(novaBase, faixas)

  const imposto_atual = round2(irrfDevidoAtual)
  const aliquota_atual = rendTributavel > 0 ? round2((irrfDevidoAtual / rendTributavel) * 100) : 0
  const imposto_otimizado = round2(novoIrrfDevido)
  const aliquota_otimizada =
    rendTributavel > 0 ? round2((novoIrrfDevido / rendTributavel) * 100) : 0

  const economiaImposto = Math.max(0, irrfDevidoAtual - novoIrrfDevido)
  const economia = round2(economiaImposto + params.destinacao)

  const custoTotal =
    params.pgbl_adicional + params.destinacao + params.despesas_medicas + params.pensao_alimenticia
  const roi = custoTotal > 0 ? round2((economia / custoTotal) * 100) : 0

  const baseSemPrev = Math.max(0, rendTributavel - deducoesAtuais)
  const baseComPrev = Math.max(0, rendTributavel - deducoesAtuais - params.pgbl_adicional)
  const baseComDep = Math.max(0, baseComPrev - deducaoDep)
  const reducaoPrevidencia = Math.max(
    0,
    calcIRPF(baseSemPrev, faixas) - calcIRPF(baseComPrev, faixas),
  )
  const reducaoDependentes = Math.max(
    0,
    calcIRPF(baseComPrev, faixas) - calcIRPF(baseComDep, faixas),
  )
  const reducaoDestinacao = params.destinacao
  const reducaoOutros = Math.max(
    0,
    economia - reducaoPrevidencia - reducaoDestinacao - reducaoDependentes,
  )

  const totalReducao = reducaoPrevidencia + reducaoDestinacao + reducaoDependentes + reducaoOutros
  const pct = (v: number) => (totalReducao > 0 ? round2((v / totalReducao) * 100) : 0)

  const breakdown = [
    {
      componente: 'Dedução Previdência Privada',
      reducao: round2(reducaoPrevidencia),
      percentual: pct(reducaoPrevidencia),
    },
    {
      componente: 'Dedução Destinações',
      reducao: round2(reducaoDestinacao),
      percentual: pct(reducaoDestinacao),
    },
    {
      componente: 'Dedução Dependentes',
      reducao: round2(reducaoDependentes),
      percentual: pct(reducaoDependentes),
    },
    { componente: 'Outros', reducao: round2(reducaoOutros), percentual: pct(reducaoOutros) },
  ]

  const recomendacao = `Com base no perfil do cliente, o cenário ótimo é aportar ${formatCurrency(params.pgbl_adicional)} em PGBL + ${formatCurrency(params.destinacao)} em FUNDRURAL, gerando economia de ${formatCurrency(economia)} (ROI de ${roi}%). Esta configuração maximiza o aproveitamento do limite de 12% sem ultrapassá-lo.`

  return {
    imposto_atual,
    aliquota_atual,
    imposto_otimizado,
    aliquota_otimizada,
    economia,
    roi,
    breakdown,
    recomendacao,
  }
}

export function computeSensitivityData(
  base: SimulationBaseData,
  params: SimulacaoParams,
  pgblLimit: number,
): Array<{ pgbl: number; economia: number }> {
  if (pgblLimit <= 0) {
    const r = simulate(base, { ...params, pgbl_adicional: 0 })
    return [{ pgbl: 0, economia: r.economia }]
  }
  const steps = Math.min(20, Math.ceil(pgblLimit / 1000) + 1)
  const data: Array<{ pgbl: number; economia: number }> = []
  for (let i = 0; i <= steps; i++) {
    const pgbl = round2(Math.min(pgblLimit, (pgblLimit / steps) * i))
    const r = simulate(base, { ...params, pgbl_adicional: pgbl })
    data.push({ pgbl, economia: r.economia })
  }
  return data
}
