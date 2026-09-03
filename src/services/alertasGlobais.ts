import pb from '@/lib/pocketbase/client'
import { getAllEmpresas, getSociosDaEmpresa, getFaturamentosEmpresa } from './empresas'
import { getCenariosPj } from './simulacaoPj'
import { processarApuracaoEmpresa } from './apuracaoPj'
import { getObrigacoesEmpresa } from './obrigacoes'
import type {
  EmpresaRecord,
  AlertaEmpresaGlobal,
  AlertasConfigRecord,
  TipoAlertaEmpresa,
} from '@/types'
import { formatCurrency, formatNumber, maskCnpj, formatDate } from '@/lib/formatters'

const SALARIO_MINIMO_2025 = 1518

// =========================================================================
// OBTENÇÃO E PERSISTÊNCIA DAS CONFIGURAÇÕES DE ALERTAS DO ESCRITÓRIO
// =========================================================================

export async function getAlertasConfig(escritorioId: string): Promise<AlertasConfigRecord | null> {
  try {
    const record = await pb
      .collection('alertas_config')
      .getFirstListItem<AlertasConfigRecord>(`escritorio_id = "${escritorioId}"`)
    return record
  } catch (_) {
    return null
  }
}

export async function saveAlertasConfig(
  escritorioId: string,
  data: Partial<Omit<AlertasConfigRecord, 'id' | 'created' | 'updated' | 'escritorio_id'>>,
): Promise<AlertasConfigRecord> {
  const existing = await getAlertasConfig(escritorioId)
  if (existing) {
    return pb.collection('alertas_config').update<AlertasConfigRecord>(existing.id, data)
  }
  return pb.collection('alertas_config').create<AlertasConfigRecord>({
    escritorio_id: escritorioId,
    enviar_email_geral: true,
    enviar_fator_r: true,
    enviar_pro_labore: true,
    enviar_altas_rendas: true,
    enviar_anexo_simples: true,
    enviar_obrigacoes_acessorias: true,
    enviar_mensalidade: true,
    config_alertas_custom: {},
    ...data,
  })
}

// =========================================================================
// ENVIO DE E-MAILS DE ALERTA PARA O PROPRIETÁRIO
// =========================================================================

export interface DispararAlertaEmailParams {
  alertas: AlertaEmpresaGlobal[]
  email_destinatario?: string
  tipo_alerta?: string
  empresa_nome?: string
  assunto?: string
}

export interface DispararAlertaEmailResponse {
  success: boolean
  enviado: boolean
  email_destinatario: string
  aviso?: string | null
  message: string
}

export async function dispararAlertaEmail(
  params: DispararAlertaEmailParams,
): Promise<DispararAlertaEmailResponse> {
  return pb.send<DispararAlertaEmailResponse>('/backend/v1/alertas/enviar-email', {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// =========================================================================
// MOTOR DE CÁLCULO DE ALERTAS AGREGADOS POR EMPRESA
// =========================================================================

export async function calcularAlertasGlobaisDasEmpresas(
  empresas: EmpresaRecord[],
  anoCalendario = new Date().getFullYear(),
): Promise<{
  alertas: AlertaEmpresaGlobal[]
  totalCriticos: number
  totalAtencao: number
  totalInformativos: number
  empresasAnalisadas: number
}> {
  const todosAlertas: AlertaEmpresaGlobal[] = []

  await Promise.all(
    empresas.map(async (empresa) => {
      try {
        const [socios, faturamentos, cenarios, apuracao, obrigacoes] = await Promise.all([
          getSociosDaEmpresa(empresa.id).catch(() => []),
          getFaturamentosEmpresa(empresa.id, anoCalendario).catch(() => []),
          getCenariosPj(empresa.id, anoCalendario).catch(() => []),
          processarApuracaoEmpresa(empresa, anoCalendario).catch(() => null),
          getObrigacoesEmpresa(empresa.id, anoCalendario).catch(() => []),
        ])

        const faturamentosAno = faturamentos.filter((f) => f.ano_calendario === anoCalendario)
        const receitaBrutaAnual = faturamentosAno.reduce(
          (sum, f) => sum + (Number(f.receita_bruta) || 0),
          0,
        )
        const folhaAnual = faturamentosAno.reduce((sum, f) => sum + (Number(f.folha) || 0), 0)

        // 1. INDICADOR FATOR R (Simples Nacional)
        // Regra do Planejador: Se a empresa é do Simples e o Fator R é < 28%, gera alerta de atenção/crítico
        if (empresa.regime === 'simples') {
          const fatorR = receitaBrutaAnual > 0 ? (folhaAnual / receitaBrutaAnual) * 100 : 0
          const anexo = empresa.anexo_simples || 'III'

          if (receitaBrutaAnual > 0) {
            if (fatorR < 28) {
              const diferencaFolhaNecessaria = Math.max(0, receitaBrutaAnual * 0.28 - folhaAnual)
              const diferencaMensal = Math.round(diferencaFolhaNecessaria / 12)

              const isCritico = anexo === 'V' // No Anexo V, não atingir Fator R acarreta alíquotas abusivas (15.5% vs 6%)
              todosAlertas.push({
                id: `fator_r_${empresa.id}_${anoCalendario}`,
                empresa_id: empresa.id,
                empresa_nome: empresa.razao_social,
                empresa_cnpj: maskCnpj(empresa.cnpj),
                empresa_regime: empresa.regime,
                tipo: 'fator_r',
                severidade: isCritico ? 'critico' : 'atencao',
                titulo: isCritico
                  ? `Fator R Crítico: ${formatNumber(fatorR)}% (< 28% no Anexo V)`
                  : `Fator R abaixo do ideal: ${formatNumber(fatorR)}%`,
                descricao: isCritico
                  ? `A empresa está tributando no Anexo V (alíquota a partir de 15,50%). Aumentando o pró-labore em ${formatCurrency(diferencaMensal)}/mês a empresa atinge 28% e migra para o Anexo III (alíquota a partir de 6,00%).`
                  : `Fator R anual acumulado em ${formatNumber(fatorR)}%. A meta para enquadramento no Anexo III é ≥ 28,00%.`,
                impacto: isCritico
                  ? 'Sobrepreço tributário de até 9,5% na receita'
                  : 'Risco de retenção em anexo superior',
                acao: 'Ajustar pró-labore no Planejador de Retiradas para atingir 28%',
                link: `/app/empresas/${empresa.id}/planejador`,
                valor_atual: `${formatNumber(fatorR)}%`,
                valor_meta: '≥ 28,00%',
                destaque: isCritico,
                ano_calendario: anoCalendario,
              })
            }
          }
        }

        // 2. INDICADOR PRÓ-LABORE MÍNIMO DOS SÓCIOS
        // Regra do Planejador: Pró-labore dos sócios que retiram deve ser ≥ 1 Salário Mínimo (R$ 1.518,00)
        // Se houver sócios cadastrados com pró-labore > 0 porém menor que o salário mínimo, ou pró-labore zerado em empresa com faturamento ativo
        if (socios.length > 0) {
          const sociosAbaixoMinimo = socios.filter((s) => {
            const pl = Number(s.pro_labore_mensal) || 0
            return pl > 0 && pl < SALARIO_MINIMO_2025
          })

          const sociosZerados = socios.filter((s) => (Number(s.pro_labore_mensal) || 0) === 0)

          if (sociosAbaixoMinimo.length > 0) {
            const nomes = sociosAbaixoMinimo
              .map((s) => s.expand?.cliente_id?.nome || 'Sócio')
              .join(', ')
            todosAlertas.push({
              id: `pro_labore_invalido_${empresa.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'pro_labore',
              severidade: 'critico',
              titulo: `Pró-labore abaixo do Salário Mínimo (${formatCurrency(SALARIO_MINIMO_2025)})`,
              descricao: `Os sócios (${nomes}) possuem pró-labore cadastrado inferior ao piso legal de 1 salário mínimo (${formatCurrency(SALARIO_MINIMO_2025)}), gerando risco de autuação do INSS e previdenciária.`,
              impacto: 'Risco de glosa e multa previdenciária pelo INSS/Receita Federal',
              acao: 'Regularizar valor de pró-labore no cadastro dos sócios',
              link: `/app/empresas/${empresa.id}/planejador`,
              valor_atual: formatCurrency(Number(sociosAbaixoMinimo[0].pro_labore_mensal) || 0),
              valor_meta: formatCurrency(SALARIO_MINIMO_2025),
              destaque: true,
              ano_calendario: anoCalendario,
            })
          } else if (receitaBrutaAnual > 100000 && sociosZerados.length === socios.length) {
            todosAlertas.push({
              id: `sem_pro_labore_${empresa.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'pro_labore',
              severidade: 'atencao',
              titulo: 'Nenhum sócio com pró-labore cadastrado',
              descricao: `Empresa com faturamento ativo (${formatCurrency(receitaBrutaAnual)}/ano) mas sem retirada de pró-labore definida para nenhum dos ${socios.length} sócio(s). Sócios administradores devem recolher previdência sobre remuneração fixa.`,
              impacto: 'Exposição fiscal por descaracterização de dividendos',
              acao: 'Definir pró-labore mensal para os sócios atuantes',
              link: `/app/empresas/${empresa.id}/planejador`,
              valor_atual: 'R$ 0,00',
              valor_meta: formatCurrency(SALARIO_MINIMO_2025),
              destaque: false,
              ano_calendario: anoCalendario,
            })
          }
        }

        // 3. INDICADOR TETO DE ALTAS RENDAS (DIVIDENDOS > R$ 600k)
        // Regra do Planejador: Dividendos acumulados ou lucro apurado por sócio que exceda R$ 600.000,00 no ano ativam a tributação mínima do IRPF-M (Altas Rendas).
        const lucroDisponivel = apuracao?.lucroDistribuivel || 0
        socios.forEach((socio) => {
          const pct = Number(socio.percentual_participacao) || 100 / (socios.length || 1)
          const cotaLucro = (lucroDisponivel * pct) / 100
          const nomeSocio = socio.expand?.cliente_id?.nome || 'Sócio'

          if (cotaLucro > 600000) {
            const excesso = cotaLucro - 600000
            const estimativaTributo = excesso * 0.1 // 10% de imposto mínimo aproximado
            todosAlertas.push({
              id: `altas_rendas_${empresa.id}_${socio.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'altas_rendas',
              severidade: 'critico',
              titulo: `Teto Altas Rendas Excedido: ${nomeSocio} (${formatCurrency(cotaLucro)})`,
              descricao: `A cota de lucros anuais do sócio ${nomeSocio} ultrapassou o teto de isenção de R$ 600.000,00. O valor excedente (${formatCurrency(excesso)}) estará sujeito à alíquota de IRPF-M (Altas Rendas) com imposto estimado em ${formatCurrency(estimativaTributo)}.`,
              impacto: `Tributação adicional no IRPF do sócio de aprox. ${formatCurrency(estimativaTributo)}`,
              acao: 'Simular retenção de lucros ou divisão com JCP no Planejador',
              link: `/app/empresas/${empresa.id}/planejador`,
              valor_atual: formatCurrency(cotaLucro),
              valor_meta: 'Max R$ 600.000,00 isento',
              destaque: true,
              ano_calendario: anoCalendario,
            })
          }
        })

        // 4. INDICADOR MUDANÇA DE ANEXO DO SIMPLES / REGIME DESVANTAJOSO
        if (apuracao && apuracao.comparativoRegimes) {
          const comp = apuracao.comparativoRegimes
          if (
            comp.melhorRegime &&
            comp.melhorRegime !== empresa.regime &&
            comp.economiaAnualEstimada > 5000
          ) {
            const regimeAtualNome =
              empresa.regime === 'simples'
                ? 'Simples Nacional'
                : empresa.regime === 'presumido'
                  ? 'Lucro Presumido'
                  : 'Lucro Real'
            const melhorRegimeNome =
              comp.melhorRegime === 'simples'
                ? 'Simples Nacional'
                : comp.melhorRegime === 'presumido'
                  ? 'Lucro Presumido'
                  : 'Lucro Real'

            todosAlertas.push({
              id: `regime_otimizacao_${empresa.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'anexo_simples',
              severidade: 'atencao',
              titulo: `Oportunidade Tributária: Economia de ${formatCurrency(comp.economiaAnualEstimada)}/ano`,
              descricao: `A empresa está operando no ${regimeAtualNome}, porém a apuração aponta que o ${melhorRegimeNome} proporcionaria uma economia tributária anual de ${formatCurrency(comp.economiaAnualEstimada)}.`,
              impacto: `Economia líquida de ${formatCurrency(comp.economiaAnualEstimada)} no ano ${anoCalendario}`,
              acao: 'Analisar Comparador de Regimes e Planejador de Retiradas',
              link: `/app/empresas/${empresa.id}/planejador`,
              valor_atual: regimeAtualNome,
              valor_meta: melhorRegimeNome,
              destaque: false,
              ano_calendario: anoCalendario,
            })
          }
        }

        // 5. INDICADOR DE OBRIGAÇÕES ACESSÓRIAS (ATRASADAS E PRÓXIMAS DO VENCIMENTO)
        if (obrigacoes.length > 0) {
          const atrasadas = obrigacoes.filter((o) => o.statusCalculado === 'atrasado')
          const hoje = obrigacoes.filter((o) => o.statusCalculado === 'vence_hoje')
          const emBreve = obrigacoes.filter(
            (o) => o.statusCalculado === 'vence_em_breve' && o.diasAteVencimento <= 5,
          )

          if (atrasadas.length > 0) {
            const listaNomes = atrasadas
              .map(
                (o) => `${o.tipo} (${o.competencia}) - Venceu em ${formatDate(o.data_vencimento)}`,
              )
              .slice(0, 3)
              .join('; ')
            const totalAtrasadas = atrasadas.length

            todosAlertas.push({
              id: `obrigacoes_atrasadas_${empresa.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'obrigacao_acessoria',
              severidade: 'critico',
              titulo: `${totalAtrasadas} Obrigação(ões) Acessória(s) ATRASADA(S)!`,
              descricao: `A empresa possui ${totalAtrasadas} obrigação(ões) com prazo expirado e ainda não transmitida(s): ${listaNomes}${totalAtrasadas > 3 ? '...' : ''}. Sujeito a multas por atraso da Receita Federal (MAED).`,
              impacto: 'Risco de multas automáticas (MAED) e bloqueio de CND Federal',
              acao: 'Transmitir obrigação e marcar como entregue no Calendário',
              link: `/app/empresas/${empresa.id}/obrigacoes`,
              valor_atual: `${totalAtrasadas} pendente(s) atrasada(s)`,
              valor_meta: '0 em atraso',
              destaque: true,
              ano_calendario: anoCalendario,
            })
          }

          if (hoje.length > 0) {
            const nomesHoje = hoje.map((o) => `${o.tipo} (${o.competencia})`).join(', ')
            todosAlertas.push({
              id: `obrigacoes_hoje_${empresa.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'obrigacao_acessoria',
              severidade: 'critico',
              titulo: `Obrigação VENCE HOJE: ${nomesHoje}`,
              descricao: `A transmissão de ${nomesHoje} vence hoje. Conclua o envio até as 23:59 para evitar incidência de penalidades e juros de mora.`,
              impacto: 'Evitar aplicação de multa no fechamento do expediente',
              acao: 'Emitir guia ou recibo no Calendário de Obrigações',
              link: `/app/empresas/${empresa.id}/obrigacoes`,
              valor_atual: 'Vence HOJE',
              valor_meta: 'Entregar hoje',
              destaque: true,
              ano_calendario: anoCalendario,
            })
          }

          if (emBreve.length > 0) {
            const proxima = emBreve[0]
            todosAlertas.push({
              id: `obrigacoes_em_breve_${empresa.id}_${anoCalendario}`,
              empresa_id: empresa.id,
              empresa_nome: empresa.razao_social,
              empresa_cnpj: maskCnpj(empresa.cnpj),
              empresa_regime: empresa.regime,
              tipo: 'obrigacao_acessoria',
              severidade: 'atencao',
              titulo: `Vencimento Próximo: ${proxima.tipo} (${proxima.competencia}) em ${proxima.diasAteVencimento} dias`,
              descricao: `Prazo de entrega da declaração ${proxima.tipo} previsto para ${formatDate(proxima.data_vencimento)}. Restam ${proxima.diasAteVencimento} dia(s) para conferência e envio.`,
              impacto: 'Conferência prévia de documentos para transmissão em lote',
              acao: 'Acessar Calendário de Obrigações Acessórias',
              link: `/app/empresas/${empresa.id}/obrigacoes`,
              valor_atual: `${proxima.diasAteVencimento} dias restantes`,
              valor_meta: 'Transmitir no prazo',
              destaque: false,
              ano_calendario: anoCalendario,
            })
          }
        }
      } catch (err) {
        console.error(`Erro ao analisar alertas para a empresa ${empresa.razao_social}:`, err)
      }
    }),
  )

  // Ordenação: Críticos primeiro, depois atenção, depois informativos
  const severidadeOrdem: Record<string, number> = {
    critico: 1,
    atencao: 2,
    informativo: 3,
    ok: 4,
  }

  todosAlertas.sort((a, b) => {
    const diff = (severidadeOrdem[a.severidade] || 5) - (severidadeOrdem[b.severidade] || 5)
    if (diff !== 0) return diff
    return a.empresa_nome.localeCompare(b.empresa_nome)
  })

  const totalCriticos = todosAlertas.filter((a) => a.severidade === 'critico').length
  const totalAtencao = todosAlertas.filter((a) => a.severidade === 'atencao').length
  const totalInformativos = todosAlertas.filter((a) => a.severidade === 'informativo').length

  return {
    alertas: todosAlertas,
    totalCriticos,
    totalAtencao,
    totalInformativos,
    empresasAnalisadas: empresas.length,
  }
}
