import { validateCpf, validateCnpj } from '@/lib/formatters'
import type { TipoRendimento } from '@/types'

/**
 * Converte string com formatação numérica brasileira ou internacional em número:
 * - "1.234,56" -> 1234.56
 * - "1234,56" -> 1234.56
 * - "1234.56" -> 1234.56
 * - "R$ 1.500,00" -> 1500
 */
export function parseValorMonetario(valorStr: string | number | undefined | null): number | null {
  if (valorStr === undefined || valorStr === null) return null
  if (typeof valorStr === 'number') {
    return isNaN(valorStr) ? null : valorStr
  }

  let limpo = valorStr.toString().trim()
  if (!limpo) return null

  // Remove "R$", espaços e outros caracteres não numéricos exceto , . e -
  limpo = limpo.replace(/[R$\s]/gi, '')

  // Se possui ponto e vírgula (ex: 1.234,56), o ponto é milhar e a vírgula é decimal
  if (limpo.includes('.') && limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  } else if (limpo.includes(',')) {
    // Se só tem vírgula, trata como decimal
    limpo = limpo.replace(',', '.')
  }

  const num = parseFloat(limpo)
  return isNaN(num) ? null : num
}

/**
 * Faz o parsing de uma linha CSV lidando com aspas duplas, ponto e vírgula ou vírgula como separador.
 */
export function parseCsvLine(linha: string, separador: string): string[] {
  const resultado: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i]
    if (char === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i++ // pula aspas escapadas
      } else {
        dentroDeAspas = !dentroDeAspas
      }
    } else if (char === separador && !dentroDeAspas) {
      resultado.push(atual.trim())
      atual = ''
    } else {
      atual += char
    }
  }
  resultado.push(atual.trim())
  return resultado
}

/**
 * Detecta o separador mais provável da primeira linha (; ou ,).
 */
export function detectarSeparador(conteudo: string): string {
  const primeiraLinha = conteudo.split(/\r\n|\n|\r/)[0] || ''
  const pontoEVirgulaCount = (primeiraLinha.match(/;/g) || []).length
  const virgulaCount = (primeiraLinha.match(/,/g) || []).length
  return pontoEVirgulaCount >= virgulaCount ? ';' : ','
}

// ==========================================
// ESTRUTURAS DE LINHA - INFORMES DE RENDIMENTOS
// ==========================================

export interface LinhaInformeCsv {
  linhaNum: number
  cpfCliente: string
  anoCalendario: number
  tipoRegistro: 'rendimento' | 'despesa'
  categoriaOuTipo: string // para rendimento: tributavel, isento, etc; para despesa: saude, educacao, etc
  descricao: string
  valor: number
  cnpjFonte?: string
  nomeFonte?: string
  // Erros encontrados
  erros: string[]
  valida: boolean
}

// ==========================================
// ESTRUTURAS DE LINHA - FATURAMENTOS MENSAIS
// ==========================================

export interface LinhaFaturamentoCsv {
  linhaNum: number
  cnpjEmpresa: string
  anoCalendario: number
  mes: number
  receitaBruta: number
  folha: number
  lucroContabil?: number
  comprasInsumos?: number
  // Erros encontrados
  erros: string[]
  valida: boolean
}

const TIPOS_RENDIMENTO_VALIDOS: TipoRendimento[] = [
  'tributavel',
  'isento',
  'exclusiva',
  'dividendos',
  'exterior',
]

const CATEGORIAS_DESPESA_VALIDAS = [
  'saude',
  'educacao',
  'previdencia',
  'pensao',
  'dependentes',
  'outras',
]

/**
 * Valida e converte CSV de Informes de Rendimentos
 * Cabeçalhos esperados:
 * cpf_cliente;ano_calendario;tipo_registro;categoria_ou_tipo;descricao;valor;cnpj_fonte;nome_fonte
 */
export function processarCsvInformes(
  conteudoCsv: string,
  clientesCadastrados: { id: string; cpf: string; nome: string }[],
): { linhas: LinhaInformeCsv[]; totalValidas: number; totalInvalidas: number } {
  const linhasTexto = conteudoCsv
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (linhasTexto.length <= 1) {
    return { linhas: [], totalValidas: 0, totalInvalidas: 0 }
  }

  const separador = detectarSeparador(conteudoCsv)
  const cabecalho = parseCsvLine(linhasTexto[0], separador).map((c) =>
    c.toLowerCase().replace(/[\s_-]/g, ''),
  )

  // Mapeia colunas
  const idxCpf = cabecalho.findIndex((c) => c.includes('cpf'))
  const idxAno = cabecalho.findIndex((c) => c.includes('ano'))
  const idxTipoRegistro = cabecalho.findIndex((c) => c.includes('registro') || c === 'tipo')
  const idxCat = cabecalho.findIndex(
    (c) => c.includes('categoria') || c.includes('subtipo') || c.includes('tiporendimento'),
  )
  const idxDesc = cabecalho.findIndex((c) => c.includes('desc'))
  const idxValor = cabecalho.findIndex((c) => c.includes('valor'))
  const idxCnpjFonte = cabecalho.findIndex(
    (c) => c.includes('cnpjfonte') || c.includes('fontecnpj'),
  )
  const idxNomeFonte = cabecalho.findIndex(
    (c) => c.includes('nomefonte') || c.includes('fontenome'),
  )

  const mapaClientesCpf = new Map<string, { id: string; nome: string }>()
  for (const c of clientesCadastrados) {
    const cpfLimpo = (c.cpf || '').replace(/\D/g, '')
    if (cpfLimpo) {
      mapaClientesCpf.set(cpfLimpo, { id: c.id, nome: c.nome })
    }
  }

  const resultado: LinhaInformeCsv[] = []

  for (let i = 1; i < linhasTexto.length; i++) {
    const rawCols = parseCsvLine(linhasTexto[i], separador)
    const erros: string[] = []

    const cpfRaw = idxCpf >= 0 ? rawCols[idxCpf] || '' : ''
    const cpfLimpo = cpfRaw.replace(/\D/g, '')

    if (!cpfLimpo) {
      erros.push('CPF do cliente não informado')
    } else if (!validateCpf(cpfLimpo)) {
      erros.push(`CPF inválido (${cpfRaw})`)
    } else if (!mapaClientesCpf.has(cpfLimpo)) {
      erros.push(`Cliente não cadastrado no escritório (CPF: ${cpfRaw})`)
    }

    const anoRaw = idxAno >= 0 ? rawCols[idxAno] : ''
    const ano = parseInt(anoRaw || '', 10)
    if (isNaN(ano) || ano < 2000 || ano > 2100) {
      erros.push(`Ano-calendário inválido: "${anoRaw}" (esperado ex: 2024, 2025)`)
    }

    const tipoRegRaw = (idxTipoRegistro >= 0 ? rawCols[idxTipoRegistro] || '' : '')
      .toLowerCase()
      .trim()
    const tipoRegistro =
      tipoRegRaw.includes('desp') || tipoRegRaw === 'd'
        ? ('despesa' as const)
        : ('rendimento' as const)

    const catRaw = (idxCat >= 0 ? rawCols[idxCat] || '' : '').toLowerCase().trim()
    if (!catRaw) {
      erros.push('Tipo/Categoria obrigatória')
    } else if (tipoRegistro === 'rendimento') {
      const match = TIPOS_RENDIMENTO_VALIDOS.find((t) => t === catRaw || catRaw.includes(t))
      if (!match) {
        erros.push(
          `Tipo de rendimento inválido ("${catRaw}"). Válidos: tributavel, isento, exclusiva, dividendos, exterior`,
        )
      }
    } else {
      const match = CATEGORIAS_DESPESA_VALIDAS.find((c) => c === catRaw || catRaw.includes(c))
      if (!match) {
        erros.push(
          `Categoria de despesa inválida ("${catRaw}"). Válidas: saude, educacao, previdencia, pensao, dependentes, outras`,
        )
      }
    }

    const desc = idxDesc >= 0 ? rawCols[idxDesc] || '' : ''
    if (!desc.trim()) {
      erros.push('Descrição não informada')
    }

    const valorRaw = idxValor >= 0 ? rawCols[idxValor] : ''
    const valor = parseValorMonetario(valorRaw)
    if (valor === null || valor <= 0) {
      erros.push(`Valor monetário inválido: "${valorRaw}"`)
    }

    const cnpjFonteRaw = idxCnpjFonte >= 0 ? rawCols[idxCnpjFonte] || '' : ''
    const cnpjFonteLimpo = cnpjFonteRaw.replace(/\D/g, '')
    if (cnpjFonteLimpo && !validateCnpj(cnpjFonteLimpo)) {
      erros.push(`CNPJ da fonte pagadora inválido (${cnpjFonteRaw})`)
    }

    const nomeFonte = idxNomeFonte >= 0 ? rawCols[idxNomeFonte] || '' : ''

    resultado.push({
      linhaNum: i + 1,
      cpfCliente: cpfRaw,
      anoCalendario: isNaN(ano) ? 0 : ano,
      tipoRegistro,
      categoriaOuTipo: catRaw,
      descricao: desc,
      valor: valor || 0,
      cnpjFonte: cnpjFonteRaw,
      nomeFonte,
      erros,
      valida: erros.length === 0,
    })
  }

  const totalValidas = resultado.filter((r) => r.valida).length
  const totalInvalidas = resultado.length - totalValidas

  return { linhas: resultado, totalValidas, totalInvalidas }
}

/**
 * Valida e converte CSV de Faturamentos Mensais
 * Cabeçalhos esperados:
 * cnpj_empresa;ano_calendario;mes;receita_bruta;folha;lucro_contabil;compras_insumos
 */
export function processarCsvFaturamentos(
  conteudoCsv: string,
  empresasCadastradas: { id: string; cnpj: string; razao_social: string }[],
): { linhas: LinhaFaturamentoCsv[]; totalValidas: number; totalInvalidas: number } {
  const linhasTexto = conteudoCsv
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (linhasTexto.length <= 1) {
    return { linhas: [], totalValidas: 0, totalInvalidas: 0 }
  }

  const separador = detectarSeparador(conteudoCsv)
  const cabecalho = parseCsvLine(linhasTexto[0], separador).map((c) =>
    c.toLowerCase().replace(/[\s_-]/g, ''),
  )

  const idxCnpj = cabecalho.findIndex((c) => c.includes('cnpj'))
  const idxAno = cabecalho.findIndex((c) => c.includes('ano'))
  const idxMes = cabecalho.findIndex((c) => c.includes('mes'))
  const idxReceita = cabecalho.findIndex((c) => c.includes('receita') || c.includes('faturamento'))
  const idxFolha = cabecalho.findIndex((c) => c.includes('folha') || c.includes('salario'))
  const idxLucro = cabecalho.findIndex((c) => c.includes('lucro'))
  const idxInsumos = cabecalho.findIndex((c) => c.includes('insumo') || c.includes('compra'))

  const mapaEmpresas = new Map<string, { id: string; razao_social: string }>()
  for (const emp of empresasCadastradas) {
    const cnpjLimpo = (emp.cnpj || '').replace(/\D/g, '')
    if (cnpjLimpo) {
      mapaEmpresas.set(cnpjLimpo, { id: emp.id, razao_social: emp.razao_social })
    }
  }

  const resultado: LinhaFaturamentoCsv[] = []

  for (let i = 1; i < linhasTexto.length; i++) {
    const rawCols = parseCsvLine(linhasTexto[i], separador)
    const erros: string[] = []

    const cnpjRaw = idxCnpj >= 0 ? rawCols[idxCnpj] || '' : ''
    const cnpjLimpo = cnpjRaw.replace(/\D/g, '')

    if (!cnpjLimpo) {
      erros.push('CNPJ da empresa não informado')
    } else if (!validateCnpj(cnpjLimpo)) {
      erros.push(`CNPJ inválido (${cnpjRaw})`)
    } else if (!mapaEmpresas.has(cnpjLimpo)) {
      erros.push(`Empresa não cadastrada no escritório (CNPJ: ${cnpjRaw})`)
    }

    const anoRaw = idxAno >= 0 ? rawCols[idxAno] : ''
    const ano = parseInt(anoRaw || '', 10)
    if (isNaN(ano) || ano < 2000 || ano > 2100) {
      erros.push(`Ano-calendário inválido: "${anoRaw}" (esperado ex: 2024, 2025)`)
    }

    const mesRaw = idxMes >= 0 ? rawCols[idxMes] : ''
    const mes = parseInt(mesRaw || '', 10)
    if (isNaN(mes) || mes < 1 || mes > 12) {
      erros.push(`Mês inválido: "${mesRaw}" (esperado 1 a 12)`)
    }

    const recRaw = idxReceita >= 0 ? rawCols[idxReceita] : ''
    const rec = parseValorMonetario(recRaw)
    if (rec === null || rec < 0) {
      erros.push(`Receita bruta inválida: "${recRaw}"`)
    }

    const folhaRaw = idxFolha >= 0 ? rawCols[idxFolha] : ''
    const folha = folhaRaw ? parseValorMonetario(folhaRaw) : 0
    if (folha === null || folha < 0) {
      erros.push(`Valor da folha inválido: "${folhaRaw}"`)
    }

    const lucroRaw = idxLucro >= 0 ? rawCols[idxLucro] : ''
    const lucro = lucroRaw ? parseValorMonetario(lucroRaw) : 0

    const insumosRaw = idxInsumos >= 0 ? rawCols[idxInsumos] : ''
    const insumos = insumosRaw ? parseValorMonetario(insumosRaw) : 0

    resultado.push({
      linhaNum: i + 1,
      cnpjEmpresa: cnpjRaw,
      anoCalendario: isNaN(ano) ? 0 : ano,
      mes: isNaN(mes) ? 0 : mes,
      receitaBruta: rec || 0,
      folha: folha || 0,
      lucroContabil: lucro || 0,
      comprasInsumos: insumos || 0,
      erros,
      valida: erros.length === 0,
    })
  }

  const totalValidas = resultado.filter((r) => r.valida).length
  const totalInvalidas = resultado.length - totalValidas

  return { linhas: resultado, totalValidas, totalInvalidas }
}

/**
 * Conteúdos de exemplo para download dos modelos de planilha
 */
export const MODELO_CSV_INFORMES = `cpf_cliente;ano_calendario;tipo_registro;categoria_ou_tipo;descricao;valor;cnpj_fonte;nome_fonte
169.667.308-90;2025;rendimento;tributavel;Salário mensal e 13º;95400,00;12.345.678/0001-90;Empresa Exemplo LTDA
169.667.308-90;2025;rendimento;dividendos;Distribuição de lucros isentos;35000,00;12.345.678/0001-90;Empresa Exemplo LTDA
169.667.308-90;2025;despesa;saude;Plano de saúde Unimed titular;8400,00;00.000.000/0001-91;Unimed Seguros
169.667.308-90;2025;despesa;educacao;Mensalidade Pós-Graduação FGV;14500,00;61.520.407/0001-09;Fundação Getulio Vargas`

export const MODELO_CSV_FATURAMENTOS = `cnpj_empresa;ano_calendario;mes;receita_bruta;folha;lucro_contabil;compras_insumos
12.345.678/0001-90;2025;1;85000,00;24000,00;18500,00;12000,00
12.345.678/0001-90;2025;2;92000,00;24000,00;21000,00;14500,00
12.345.678/0001-90;2025;3;88500,00;24500,00;19800,00;13200,00`
