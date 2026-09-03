import pb from '@/lib/pocketbase/client'
import type {
  AssinaturaRecord,
  AssinaturaStatusDTO,
  PlanoAssinatura,
  StatusAssinatura,
} from '@/types'

// =========================================================================
// SISTEMA DE ASSINATURA / PAGAMENTO STRIPE
// =========================================================================

/** Resultado de criação de sessão de Checkout (cartão + PIX). */
export interface CheckoutResult {
  success: boolean
  stripe_configurado?: boolean
  checkout_url?: string
  session_id?: string
  plano?: PlanoAssinatura
  trial_dias?: number
  message?: string
}

/** Resultado de criação de sessão do Customer Portal. */
export interface PortalResult {
  success: boolean
  stripe_configurado?: boolean
  portal_url?: string
  message?: string
}

/**
 * Obtém a URL do Stripe Payment Link para o plano informado.
 * O backend formata o link incluindo client_reference_id e prefilled_email
 * sem realizar chamadas de rede de saída síncronas para a api.stripe.com.
 */
export async function criarCheckout(plano: PlanoAssinatura): Promise<CheckoutResult> {
  return pb.send<CheckoutResult>('/backend/v1/stripe/checkout', {
    method: 'POST',
    body: JSON.stringify({ plano }),
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Constrói a URL do Stripe Payment Link diretamente no cliente caso as URLs
 * já estejam disponíveis (ex.: vindas de getAssinaturaStatus ou fallback).
 */
export function buildPaymentLinkUrl(
  baseLink: string,
  escritorioId?: string,
  email?: string,
): string {
  if (!baseLink) return ''
  const separator = baseLink.includes('?') ? '&' : '?'
  let url = baseLink
  const params: string[] = []
  if (escritorioId) {
    params.push(`client_reference_id=${encodeURIComponent(escritorioId)}`)
  }
  if (email) {
    params.push(`prefilled_email=${encodeURIComponent(email)}`)
  }
  if (params.length > 0) {
    url += separator + params.join('&')
  }
  return url
}

/**
 * Cria uma sessão do Billing Portal (Customer Portal) para gerenciar
 * assinatura, cartão e faturas.
 */
export async function criarPortalSession(): Promise<PortalResult> {
  return pb.send<PortalResult>('/backend/v1/stripe/portal', {
    method: 'POST',
  })
}

/** Estado completo da assinatura do escritório autenticado. */
export async function getAssinaturaStatus(): Promise<AssinaturaStatusDTO> {
  return pb.send<AssinaturaStatusDTO>('/backend/v1/stripe/status', { method: 'GET' })
}

/** Histórico de assinaturas/faturas do escritório. */
export async function getAssinaturas(escritorioId: string): Promise<AssinaturaRecord[]> {
  return pb.collection('assinaturas').getFullList<AssinaturaRecord>({
    filter: `escritorio_id = "${escritorioId}"`,
    sort: '-created',
  })
}

// =========================================================================
// LÓGICA DE ESTADO DE ACESSO (usada pela guarda de rota e pelos alertas)
// =========================================================================

/** Situação de acesso calculada a partir do estado do escritório. */
export interface SituacaoAcesso {
  /** true quando pode usar o app normalmente */
  liberado: boolean
  status: StatusAssinatura
  /** Rótulo amigável do motivo do bloqueio */
  motivo?: string
  /** Data ISO do vencimento (mensalidade ou trial) para o alerta */
  dataVencimento?: string
  /** Data ISO do bloqueio (após falha de pagamento, +24h) */
  dataBloqueio?: string
}

export function calcularSituacaoAcesso(
  escritorio: {
    ativo?: boolean
    assinatura_status?: StatusAssinatura
    data_vencimento?: string
    data_bloqueio?: string
    trial_ate?: string
  } | null,
): SituacaoAcesso {
  if (!escritorio) {
    return { liberado: true, status: 'trial' }
  }

  const status: StatusAssinatura = escritorio.assinatura_status || 'trial'

  // Escritório desativado manualmente (super_admin) ou bloqueado por inadimplência
  if (!escritorio.ativo || status === 'bloqueado') {
    return {
      liberado: false,
      status: status === 'bloqueado' ? 'bloqueado' : 'cancelado',
      motivo:
        status === 'bloqueado'
          ? 'Assinatura bloqueada por inadimplência. Regularize o pagamento para reativar o acesso.'
          : 'Acesso desativado. Regularize a assinatura para reativar o acesso.',
      dataBloqueio: escritorio.data_bloqueio,
    }
  }

  // Cancelado no Stripe: exige nova assinatura
  if (status === 'cancelado') {
    return {
      liberado: false,
      status: 'cancelado',
      motivo: 'Assinatura cancelada. Assine um plano para retomar o acesso.',
    }
  }

  // Trial: libera até trial_ate; após expirar, bloqueia
  if (status === 'trial') {
    const trialAte = escritorio.trial_ate
    if (trialAte && new Date(trialAte).getTime() < Date.now()) {
      return {
        liberado: false,
        status: 'trial',
        motivo: 'Seu período de teste de 14 dias terminou. Assine um plano para continuar.',
        dataVencimento: trialAte,
      }
    }
    return { liberado: true, status: 'trial', dataVencimento: trialAte }
  }

  // Atrasado: ainda acessa, mas o bloqueio acontece em 24h após a falha
  if (status === 'atrasado') {
    const dataBloqueio = escritorio.data_bloqueio
    if (dataBloqueio && new Date(dataBloqueio).getTime() < Date.now()) {
      return {
        liberado: false,
        status: 'atrasado',
        motivo: 'Pagamento em atraso. O prazo de regularização de 24h expirou.',
        dataBloqueio,
      }
    }
    return {
      liberado: true,
      status: 'atrasado',
      motivo: 'Pagamento em atraso — regularize em até 24h para evitar o bloqueio.',
      dataBloqueio,
    }
  }

  // Ativo: acesso liberado
  return { liberado: true, status: 'ativo', dataVencimento: escritorio.data_vencimento }
}
