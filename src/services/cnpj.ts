import { validateCnpj } from '@/lib/formatters'

export interface ConsultaCnpjResult {
  sucesso: boolean
  cnpj: string
  razaoSocial?: string
  nomeFantasia?: string
  situacaoCadastral?: string // ex: "ATIVA", "BAIXADA", "INAPTA", "SUSPENSA", "NULA"
  isAtiva?: boolean
  cidade?: string
  uf?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cep?: string
  telefone?: string
  email?: string
  erro?: 'invalido' | 'nao_encontrado' | 'situacao_irregular' | 'falha_rede'
  mensagemErro?: string
}

/**
 * Consulta client-side à BrasilAPI com fallback silencioso para restrições de rede / CORS.
 * Importante: se a rede ou a API externa falhar, não bloqueia o fluxo do usuário —
 * apenas retorna sucesso: false com erro: 'falha_rede'.
 */
export async function consultarCnpjBrasilApi(cnpj: string): Promise<ConsultaCnpjResult> {
  const digitos = cnpj.replace(/\D/g, '')

  if (!validateCnpj(digitos)) {
    return {
      sucesso: false,
      cnpj: digitos,
      erro: 'invalido',
      mensagemErro: 'CNPJ inválido.',
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return {
        sucesso: false,
        cnpj: digitos,
        erro: 'nao_encontrado',
        mensagemErro: 'CNPJ não encontrado na Receita Federal.',
      }
    }

    if (response.status === 400) {
      return {
        sucesso: false,
        cnpj: digitos,
        erro: 'invalido',
        mensagemErro: 'CNPJ inválido ou mal formatado.',
      }
    }

    if (!response.ok) {
      return {
        sucesso: false,
        cnpj: digitos,
        erro: 'falha_rede',
        mensagemErro: 'Não foi possível consultar a Receita Federal no momento.',
      }
    }

    const data = await response.json()

    // BrasilAPI retorna descricao_situacao_cadastral (ex.: "ATIVA", "BAIXADA", "INAPTA")
    // e situacao_cadastral (código numérico, 2 = ATIVA na RFB).
    const sitDesc = (data.descricao_situacao_cadastral || '').toString().trim().toUpperCase()
    const sitCodigo = Number(data.situacao_cadastral)
    const isAtiva = sitDesc === 'ATIVA' || sitCodigo === 2

    if (!isAtiva) {
      return {
        sucesso: false,
        cnpj: digitos,
        razaoSocial: data.razao_social || data.nome_fantasia || '',
        nomeFantasia: data.nome_fantasia || '',
        situacaoCadastral: sitDesc || 'IRREGULAR',
        isAtiva: false,
        erro: 'situacao_irregular',
        mensagemErro: `Este CNPJ está com situação cadastral irregular (${sitDesc || 'Inativa'}) na Receita Federal.`,
      }
    }

    const ddd = data.ddd_telefone_1 ? String(data.ddd_telefone_1).replace(/\D/g, '') : ''
    const telefone = ddd ? ddd : ''

    return {
      sucesso: true,
      cnpj: digitos,
      razaoSocial: data.razao_social || data.nome_fantasia || '',
      nomeFantasia: data.nome_fantasia || '',
      situacaoCadastral: sitDesc || 'ATIVA',
      isAtiva: true,
      cidade: data.municipio || '',
      uf: data.uf || '',
      logradouro: [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' '),
      numero: data.numero || '',
      bairro: data.bairro || '',
      cep: data.cep || '',
      telefone,
      email: data.email || '',
    }
  } catch (err: any) {
    // Falhas de CORS, offline, timeout ou abort degradam silenciosamente
    return {
      sucesso: false,
      cnpj: digitos,
      erro: 'falha_rede',
      mensagemErro:
        'Não foi possível consultar os dados externos do CNPJ (prosseguindo normalmente).',
    }
  }
}
