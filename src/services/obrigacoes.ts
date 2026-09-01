import pb from '@/lib/pocketbase/client'
import type {
  ObrigacaoAcessoriaRecord,
  ObrigacaoAcessoriaComStatus,
  ResumoObrigacoesAno,
  TipoObrigacaoAcessoria,
  EmpresaRecord,
  StatusObrigacaoAcessoria,
  StatusCalculadoObrigacao,
} from '@/types'

/**
 * Retorna as regras oficiais e descrições padrão para cada tipo de obrigação acessória
 */
export const REGRAS_OBRIGACOES: Record<
  TipoObrigacaoAcessoria,
  {
    nome: string
    descricao: string
    periodicidade: 'mensal' | 'anual'
    regimesAplicaveis: ('simples' | 'presumido' | 'real')[]
    regraVencimento: string
    orgao: string
  }
> = {
  DAS: {
    nome: 'DAS — Documento de Arrecadação do Simples Nacional',
    descricao: 'Guia única mensal de recolhimento dos tributos do Simples Nacional (PGDAS-D).',
    periodicidade: 'mensal',
    regimesAplicaveis: ['simples'],
    regraVencimento: 'Até o dia 20 do mês seguinte à competência apurada (ou dia útil anterior).',
    orgao: 'Receita Federal / Comitê Gestor do Simples Nacional',
  },
  DCTF: {
    nome: 'DCTF Mensal — Declaração de Débitos e Créditos Tributários Federais',
    descricao:
      'Declaração com informações sobre IRPJ, CSLL, PIS, COFINS, IPI e outros tributos federais.',
    periodicidade: 'mensal',
    regimesAplicaveis: ['presumido', 'real'],
    regraVencimento:
      'Até o 15º dia útil do 2º mês subsequente ao mês de ocorrência dos fatos geradores.',
    orgao: 'Receita Federal do Brasil (RFB)',
  },
  EFD_REINF: {
    nome: 'EFD-Reinf — Escrituração Fiscal Digital de Retenções e Outras Informações',
    descricao:
      'Módulo do SPED com informações de rendimentos pagos, retenções de IRRF, CSLL/PIS/COFINS e CPRB.',
    periodicidade: 'mensal',
    regimesAplicaveis: ['simples', 'presumido', 'real'],
    regraVencimento: 'Até o dia 15 do mês seguinte ao fato gerador (antecipa se não for dia útil).',
    orgao: 'Receita Federal do Brasil / SPED',
  },
  ECD: {
    nome: 'ECD — Escrituração Contábil Digital (SPED Contábil)',
    descricao:
      'Transmissão eletrônica dos livros contábeis (Diário, Razão, Balancetes e Balanços Patrimoniais).',
    periodicidade: 'anual',
    regimesAplicaveis: ['simples', 'presumido', 'real'],
    regraVencimento: 'Último dia útil do mês de maio do ano seguinte ao ano-calendário.',
    orgao: 'SPED / Receita Federal',
  },
  ECF: {
    nome: 'ECF — Escrituração Contábil Fiscal (SPED ECF)',
    descricao:
      'Declaração que interliga os dados contábeis da ECD à base de cálculo do IRPJ e CSLL (Lalur/Lacs).',
    periodicidade: 'anual',
    regimesAplicaveis: ['presumido', 'real'],
    regraVencimento: 'Último dia útil do mês de julho do ano seguinte ao ano-calendário.',
    orgao: 'SPED / Receita Federal',
  },
}

/**
 * Calcula a diferença em dias entre a data de vencimento e hoje (à meia-noite local)
 */
export function calcularDiasAteVencimento(dataVencimentoStr: string): number {
  if (!dataVencimentoStr) return 0
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Extrai apenas ano, mês, dia para evitar desvios de timezone
  const parts = dataVencimentoStr.slice(0, 10).split('-')
  if (parts.length < 3) return 0
  const venc = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0)

  const diffMs = venc.getTime() - hoje.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Enriquece o registro com o status calculado em tempo real e badges de urgência visual
 */
export function enriquecerObrigacaoComStatus(
  obrigacao: ObrigacaoAcessoriaRecord,
): ObrigacaoAcessoriaComStatus {
  if (obrigacao.status === 'dispensada') {
    return {
      ...obrigacao,
      statusCalculado: 'dispensada',
      diasAteVencimento: 999,
      isAtrasado: false,
      isVenceHoje: false,
      isVenceEmBreve: false,
      urgenciaBadge: {
        label: 'Dispensada',
        cor: 'bg-slate-100 text-slate-600 border-slate-300',
        severidade: 'neutro',
      },
    }
  }

  if (obrigacao.status === 'entregue') {
    return {
      ...obrigacao,
      statusCalculado: 'entregue',
      diasAteVencimento: 0,
      isAtrasado: false,
      isVenceHoje: false,
      isVenceEmBreve: false,
      urgenciaBadge: {
        label: 'Entregue / Em dia',
        cor: 'bg-emerald-500 text-white border-emerald-600',
        severidade: 'ok',
      },
    }
  }

  const dias = calcularDiasAteVencimento(obrigacao.data_vencimento)

  if (dias < 0) {
    const diasAtraso = Math.abs(dias)
    return {
      ...obrigacao,
      statusCalculado: 'atrasado',
      diasAteVencimento: dias,
      isAtrasado: true,
      isVenceHoje: false,
      isVenceEmBreve: false,
      urgenciaBadge: {
        label: `Atrasado há ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}!`,
        cor: 'bg-rose-600 text-white border-rose-700 animate-pulse font-extrabold shadow-sm',
        severidade: 'critico',
      },
    }
  }

  if (dias === 0) {
    return {
      ...obrigacao,
      statusCalculado: 'vence_hoje',
      diasAteVencimento: 0,
      isAtrasado: false,
      isVenceHoje: true,
      isVenceEmBreve: true,
      urgenciaBadge: {
        label: 'Vence HOJE!',
        cor: 'bg-red-600 text-white border-red-700 font-black animate-bounce shadow-md',
        severidade: 'critico',
      },
    }
  }

  if (dias <= 5) {
    return {
      ...obrigacao,
      statusCalculado: 'vence_em_breve',
      diasAteVencimento: dias,
      isAtrasado: false,
      isVenceHoje: false,
      isVenceEmBreve: true,
      urgenciaBadge: {
        label: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
        cor: 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-sm',
        severidade: 'atencao',
      },
    }
  }

  if (dias <= 15) {
    return {
      ...obrigacao,
      statusCalculado: 'vence_em_breve',
      diasAteVencimento: dias,
      isAtrasado: false,
      isVenceHoje: false,
      isVenceEmBreve: true,
      urgenciaBadge: {
        label: `Vence em ${dias} dias`,
        cor: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        severidade: 'atencao',
      },
    }
  }

  return {
    ...obrigacao,
    statusCalculado: 'em_dia',
    diasAteVencimento: dias,
    isAtrasado: false,
    isVenceHoje: false,
    isVenceEmBreve: false,
    urgenciaBadge: {
      label: `Vence em ${dias} dias`,
      cor: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
      severidade: 'ok',
    },
  }
}

/**
 * Calcula os totais do resumo de obrigações de uma empresa ou de todas as empresas no ano
 */
export function calcularResumoObrigacoes(
  obrigacoes: ObrigacaoAcessoriaComStatus[],
): ResumoObrigacoesAno {
  const total = obrigacoes.length
  const entregues = obrigacoes.filter((o) => o.status === 'entregue').length
  const atrasadas = obrigacoes.filter((o) => o.statusCalculado === 'atrasado').length
  const venceHoje = obrigacoes.filter((o) => o.statusCalculado === 'vence_hoje').length
  const venceEmBreve = obrigacoes.filter((o) => o.statusCalculado === 'vence_em_breve').length
  const emDia = obrigacoes.filter((o) => o.statusCalculado === 'em_dia').length

  const taxaConformidade = total > 0 ? Math.round((entregues / total) * 100) : 100

  return {
    total,
    entregues,
    atrasadas,
    venceHoje,
    venceEmBreve,
    emDia,
    taxaConformidade,
  }
}

// =========================================================================
// OPERAÇÕES DE API / CRUD POCKETBASE
// =========================================================================

/**
 * Busca obrigações de uma empresa específica para um determinado ano-calendário
 */
export async function getObrigacoesEmpresa(
  empresaId: string,
  anoCalendario: number,
): Promise<ObrigacaoAcessoriaComStatus[]> {
  const records = await pb.collection('empresas_obrigacoes').getFullList<ObrigacaoAcessoriaRecord>({
    filter: `empresa_id = "${empresaId}" && ano_calendario = ${anoCalendario}`,
    sort: 'data_vencimento,tipo',
    expand: 'empresa_id',
  })

  return records.map(enriquecerObrigacaoComStatus)
}

/**
 * Busca todas as obrigações do escritório contábil (visão consolidada de todas as empresas)
 */
export async function getAllObrigacoesEscritorio(
  anoCalendario = new Date().getFullYear(),
): Promise<ObrigacaoAcessoriaComStatus[]> {
  const records = await pb.collection('empresas_obrigacoes').getFullList<ObrigacaoAcessoriaRecord>({
    filter: `ano_calendario = ${anoCalendario}`,
    sort: 'data_vencimento,tipo',
    expand: 'empresa_id',
  })

  return records.map(enriquecerObrigacaoComStatus)
}

/**
 * Marca uma obrigação como entregue com a data de transmissão informada
 */
export async function marcarObrigacaoEntregue(
  id: string,
  dataEntrega: string = new Date().toISOString(),
  codigoRecibo?: string,
  observacao?: string,
): Promise<ObrigacaoAcessoriaRecord> {
  const payload: Partial<ObrigacaoAcessoriaRecord> = {
    status: 'entregue',
    data_entrega: dataEntrega,
  }
  if (codigoRecibo !== undefined) payload.codigo_recibo = codigoRecibo
  if (observacao !== undefined) payload.observacao = observacao

  return pb.collection('empresas_obrigacoes').update<ObrigacaoAcessoriaRecord>(id, payload)
}

/**
 * Reverte o status de uma obrigação para pendente
 */
export async function desmarcarObrigacaoEntregue(id: string): Promise<ObrigacaoAcessoriaRecord> {
  return pb.collection('empresas_obrigacoes').update<ObrigacaoAcessoriaRecord>(id, {
    status: 'pendente',
    data_entrega: null,
  })
}

/**
 * Ajusta / edita manualmente a data de vencimento e detalhes de uma obrigação
 */
export async function atualizarDataVencimentoObrigacao(
  id: string,
  novaDataVencimento: string,
  observacao?: string,
): Promise<ObrigacaoAcessoriaRecord> {
  const payload: Partial<ObrigacaoAcessoriaRecord> = {
    data_vencimento: novaDataVencimento,
  }
  if (observacao !== undefined) {
    payload.observacao = observacao
  }
  return pb.collection('empresas_obrigacoes').update<ObrigacaoAcessoriaRecord>(id, payload)
}

/**
 * Atualiza campos livres de uma obrigação
 */
export async function updateObrigacao(
  id: string,
  data: Partial<Omit<ObrigacaoAcessoriaRecord, 'id' | 'created' | 'updated'>>,
): Promise<ObrigacaoAcessoriaRecord> {
  return pb.collection('empresas_obrigacoes').update<ObrigacaoAcessoriaRecord>(id, data)
}

/**
 * Gera automaticamente o calendário de obrigações acessórias do ano para uma empresa
 * de acordo com o seu regime tributário caso ainda não existam no banco de dados.
 */
export async function gerarObrigacoesParaEmpresa(
  empresa: EmpresaRecord,
  ano: number,
): Promise<ObrigacaoAcessoriaComStatus[]> {
  const existentes = await getObrigacoesEmpresa(empresa.id, ano)
  if (existentes.length > 0) {
    return existentes
  }

  const regime = empresa.regime || 'simples'
  const empId = empresa.id
  const escId = empresa.escritorio_id

  const novosItens: Omit<ObrigacaoAcessoriaRecord, 'id' | 'created' | 'updated'>[] = []

  if (regime === 'simples') {
    // DAS mensal (12 competências)
    for (let m = 1; m <= 12; m++) {
      const mesStr = m < 10 ? '0' + m : '' + m
      const vencAno = m === 12 ? ano + 1 : ano
      const vencMes = m === 12 ? '01' : m + 1 < 10 ? '0' + (m + 1) : '' + (m + 1)
      const vencData = `${vencAno}-${vencMes}-20 00:00:00.000Z`

      novosItens.push({
        empresa_id: empId,
        escritorio_id: escId,
        tipo: 'DAS',
        nome: REGRAS_OBRIGACOES.DAS.nome,
        ano_calendario: ano,
        competencia: `${mesStr}/${ano}`,
        mes_competencia: m,
        data_vencimento: vencData,
        data_vencimento_original: vencData,
        status: 'pendente',
        data_entrega: null,
      })
    }

    // EFD-Reinf mensal
    for (let m = 1; m <= 12; m++) {
      const mesStr = m < 10 ? '0' + m : '' + m
      const vencAno = m === 12 ? ano + 1 : ano
      const vencMes = m === 12 ? '01' : m + 1 < 10 ? '0' + (m + 1) : '' + (m + 1)
      const vencData = `${vencAno}-${vencMes}-15 00:00:00.000Z`

      novosItens.push({
        empresa_id: empId,
        escritorio_id: escId,
        tipo: 'EFD_REINF',
        nome: REGRAS_OBRIGACOES.EFD_REINF.nome,
        ano_calendario: ano,
        competencia: `${mesStr}/${ano}`,
        mes_competencia: m,
        data_vencimento: vencData,
        data_vencimento_original: vencData,
        status: 'pendente',
        data_entrega: null,
      })
    }

    // ECD anual
    novosItens.push({
      empresa_id: empId,
      escritorio_id: escId,
      tipo: 'ECD',
      nome: REGRAS_OBRIGACOES.ECD.nome,
      ano_calendario: ano,
      competencia: `Anual/${ano - 1}`,
      mes_competencia: 0,
      data_vencimento: `${ano}-05-30 00:00:00.000Z`,
      data_vencimento_original: `${ano}-05-30 00:00:00.000Z`,
      status: 'pendente',
      data_entrega: null,
      observacao: 'Obrigatória apenas para optantes com escrituração contábil digital',
    })
  } else {
    // Lucro Presumido ou Lucro Real: DCTF, EFD-Reinf, ECD, ECF

    // DCTF Mensal (15º dia útil do 2º mês subsequente ~ dia 22)
    for (let m = 1; m <= 12; m++) {
      const mesStr = m < 10 ? '0' + m : '' + m
      let vencAno = ano
      let mSub = m + 2
      if (mSub > 12) {
        mSub -= 12
        vencAno = ano + 1
      }
      const vencMes = mSub < 10 ? '0' + mSub : '' + mSub
      const vencData = `${vencAno}-${vencMes}-22 00:00:00.000Z`

      novosItens.push({
        empresa_id: empId,
        escritorio_id: escId,
        tipo: 'DCTF',
        nome: REGRAS_OBRIGACOES.DCTF.nome,
        ano_calendario: ano,
        competencia: `${mesStr}/${ano}`,
        mes_competencia: m,
        data_vencimento: vencData,
        data_vencimento_original: vencData,
        status: 'pendente',
        data_entrega: null,
      })
    }

    // EFD-Reinf mensal
    for (let m = 1; m <= 12; m++) {
      const mesStr = m < 10 ? '0' + m : '' + m
      const vencAno = m === 12 ? ano + 1 : ano
      const vencMes = m === 12 ? '01' : m + 1 < 10 ? '0' + (m + 1) : '' + (m + 1)
      const vencData = `${vencAno}-${vencMes}-15 00:00:00.000Z`

      novosItens.push({
        empresa_id: empId,
        escritorio_id: escId,
        tipo: 'EFD_REINF',
        nome: REGRAS_OBRIGACOES.EFD_REINF.nome,
        ano_calendario: ano,
        competencia: `${mesStr}/${ano}`,
        mes_competencia: m,
        data_vencimento: vencData,
        data_vencimento_original: vencData,
        status: 'pendente',
        data_entrega: null,
      })
    }

    // ECD anual
    novosItens.push({
      empresa_id: empId,
      escritorio_id: escId,
      tipo: 'ECD',
      nome: REGRAS_OBRIGACOES.ECD.nome,
      ano_calendario: ano,
      competencia: `Anual/${ano - 1}`,
      mes_competencia: 0,
      data_vencimento: `${ano}-05-30 00:00:00.000Z`,
      data_vencimento_original: `${ano}-05-30 00:00:00.000Z`,
      status: 'pendente',
      data_entrega: null,
    })

    // ECF anual
    novosItens.push({
      empresa_id: empId,
      escritorio_id: escId,
      tipo: 'ECF',
      nome: REGRAS_OBRIGACOES.ECF.nome,
      ano_calendario: ano,
      competencia: `Anual/${ano - 1}`,
      mes_competencia: 0,
      data_vencimento: `${ano}-07-31 00:00:00.000Z`,
      data_vencimento_original: `${ano}-07-31 00:00:00.000Z`,
      status: 'pendente',
      data_entrega: null,
    })
  }

  // Cria os registros no PocketBase
  const criadas: ObrigacaoAcessoriaRecord[] = []
  for (const item of novosItens) {
    try {
      const rec = await pb.collection('empresas_obrigacoes').create<ObrigacaoAcessoriaRecord>(item)
      criadas.push(rec)
    } catch (err) {
      console.warn('Erro ao criar obrigacao acessoria:', err)
    }
  }

  return criadas.map(enriquecerObrigacaoComStatus)
}
