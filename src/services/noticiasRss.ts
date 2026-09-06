/**
 * Serviço de notícias tributárias da Receita Federal (executado exclusivamente no client / browser).
 *
 * Utiliza fetch direto com tentativa de proxies CORS públicos leves e fallback
 * para uma lista curada e atualizada de notícias de impacto tributário.
 * NUNCA executa requisições de saída a partir do backend PocketBase.
 */

export interface NoticiaTributaria {
  id: string
  titulo: string
  resumo?: string
  link: string
  dataPublicacao: string
  categoria?: string
  origem: 'oficial_rfb' | 'curada'
}

/** Notícias curadas da Receita Federal como fallback imediato e confiável */
export const NOTICIAS_CURADAS_RFB: NoticiaTributaria[] = [
  {
    id: 'curada-1',
    titulo: 'Receita Federal e PGFN publicam novo edital de transação para controvérsia sobre IRRF',
    resumo:
      'Edital PGFN/RFB permite regularizar débitos fiscais com descontos e prazos estendidos, impactando planejamento tributário de investidores e pessoas físicas.',
    link: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/setembro/receita-federal-e-pgfn-publicam-novo-edital-de-transacao-para-controversia-sobre-irrf-de-investidores-nao-residentes',
    dataPublicacao: '04/09/2026',
    categoria: 'Tributação',
    origem: 'curada',
  },
  {
    id: 'curada-2',
    titulo:
      'Receita Federal alerta: prazo para opção pelo Simples Nacional e escolha do modelo de IBS e CBS',
    resumo:
      'Empresas devem definir forma de recolhimento dos novos tributos da Reforma Tributária sobre o Consumo (RTC). Planejamento de regimes é mandatório.',
    link: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/setembro/receita-federal-alerta-comeca-hoje-o-prazo-para-opcao-pelo-simples-nacional-e-para-a-escolha-do-modelo-de-recolhimento-do-ibs-e-da-cbs-em-2027',
    dataPublicacao: '01/09/2026',
    categoria: 'Reforma Tributária',
    origem: 'curada',
  },
  {
    id: 'curada-3',
    titulo:
      'Instrução Normativa aperfeiçoa regras de acompanhamento da fruição de benefícios fiscais',
    resumo:
      'Alterações em normas da RFB entram em vigor prevendo período de adaptação para empresas e escritórios contábeis até o fim do exercício.',
    link: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/setembro/receita-federal-aperfeicoa-regras-de-acompanhamento-da-fruicao-de-beneficios-fiscais',
    dataPublicacao: '02/09/2026',
    categoria: 'Legislação',
    origem: 'curada',
  },
  {
    id: 'curada-4',
    titulo:
      'Receita Federal disponibiliza o Perguntas e Respostas do ITR e novidades no sistema web',
    resumo:
      'Orientações e nova plataforma digital Minhas Declarações facilitam a entrega e integração de procurações eletrônicas por contadores.',
    link: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/setembro/receita-federal-disponibiliza-o-perguntas-e-respostas-do-imposto-territorial-rural-itr-2026',
    dataPublicacao: '01/09/2026',
    categoria: 'Declarações',
    origem: 'curada',
  },
  {
    id: 'curada-5',
    titulo:
      'Prorrogada para 2027 obrigatoriedade de emissão de notas e CNPJ de pessoas físicas para a CBS',
    resumo:
      'Decreto regulamentador amplia o prazo de adaptação de produtores rurais e pessoas físicas no contexto da Reforma Tributária.',
    link: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/emissao-do-cnpj-e-de-documentos-fiscais-por-pessoas-fisicas-contribuintes-da-cbs-comecara-em-1o-de-janeiro-de-2027',
    dataPublicacao: '22/07/2026',
    categoria: 'Reforma Tributária',
    origem: 'curada',
  },
  {
    id: 'curada-6',
    titulo:
      'Receita Federal intensifica fiscalização de deduções e declaração pré-preenchida do IRPF',
    resumo:
      'Cruzamento automatizado de dados pelo Fisco exige que profissionais de contabilidade façam simulações prévias e cálculo detalhado de deduções legais vs. desconto simplificado.',
    link: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias',
    dataPublicacao: '28/08/2026',
    categoria: 'IRPF & Planejamento',
    origem: 'curada',
  },
]

/** Parse de XML RSS / Atom no navegador */
function parseRssXml(xmlText: string): NoticiaTributaria[] {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

    // Verifica erros no XML
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      return []
    }

    const items = xmlDoc.querySelectorAll('item, entry')
    const noticias: NoticiaTributaria[] = []

    items.forEach((item, index) => {
      if (index >= 9) return // limita a 9 notícias

      const titleNode = item.querySelector('title')
      const linkNode = item.querySelector('link')
      const descNode = item.querySelector('description, summary, content')
      const dateNode = item.querySelector('pubDate, updated, date, dc\\:date')
      const catNode = item.querySelector('category')

      const rawTitle = titleNode?.textContent?.trim() || ''
      if (!rawTitle) return

      let link = ''
      if (linkNode) {
        link = linkNode.textContent?.trim() || linkNode.getAttribute('href') || ''
      }

      // Se não tiver link ou for relativo, direciona para o portal da RFB
      if (!link || link.startsWith('/')) {
        link = link
          ? `https://www.gov.br${link}`
          : 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias'
      }

      // Limpeza de texto com tags HTML
      let rawDesc = descNode?.textContent?.trim() || ''
      if (rawDesc.includes('<')) {
        const tmp = document.createElement('div')
        tmp.innerHTML = rawDesc
        rawDesc = tmp.textContent || tmp.innerText || ''
      }
      if (rawDesc.length > 200) {
        rawDesc = rawDesc.substring(0, 197) + '...'
      }

      let dataFormatada = ''
      const rawDate = dateNode?.textContent?.trim()
      if (rawDate) {
        try {
          const parsedDate = new Date(rawDate)
          if (!isNaN(parsedDate.getTime())) {
            dataFormatada = parsedDate.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          }
        } catch {
          dataFormatada = rawDate.slice(0, 10)
        }
      }
      if (!dataFormatada) {
        dataFormatada = new Date().toLocaleDateString('pt-BR')
      }

      noticias.push({
        id: `rfb-${index}-${Date.now()}`,
        titulo: rawTitle,
        resumo: rawDesc || undefined,
        link,
        dataPublicacao: dataFormatada,
        categoria: catNode?.textContent?.trim() || 'Receita Federal',
        origem: 'oficial_rfb',
      })
    })

    return noticias
  } catch {
    return []
  }
}

/**
 * Busca notícias tributárias da Receita Federal no cliente.
 * Tenta endpoints conhecidos com fallback resiliente para nunca travar a página.
 */
export async function buscarNoticiasReceitaFederal(): Promise<{
  noticias: NoticiaTributaria[]
  origem: 'feed_ao_vivo' | 'curadas_oficiais'
}> {
  const feedUrls = [
    'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/ultimas-noticias/RSS',
    'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/RSS',
  ]

  // Proxies CORS conhecidos
  for (const feedUrl of feedUrls) {
    const proxyAttempts = [
      // 1. Direct fetch (caso CORS seja liberado em algum ambiente)
      { url: feedUrl, isJsonWrapper: false },
      // 2. AllOrigins CORS Proxy
      {
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
        isJsonWrapper: false,
      },
      // 3. Jsproxy/CORSflare fallback
      {
        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`,
        isJsonWrapper: false,
      },
    ]

    for (const attempt of proxyAttempts) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 4000)

        const response = await fetch(attempt.url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
        })
        clearTimeout(timer)

        if (!response.ok) continue

        const text = await response.text()
        if (
          text &&
          (text.includes('<rss') || text.includes('<feed') || text.includes('<channel'))
        ) {
          const parsed = parseRssXml(text)
          if (parsed.length > 0) {
            return { noticias: parsed, origem: 'feed_ao_vivo' }
          }
        }
      } catch {
        // Tenta próxima estratégia sem travar
        continue
      }
    }
  }

  // Fallback curado sempre disponível
  return {
    noticias: NOTICIAS_CURADAS_RFB,
    origem: 'curadas_oficiais',
  }
}
