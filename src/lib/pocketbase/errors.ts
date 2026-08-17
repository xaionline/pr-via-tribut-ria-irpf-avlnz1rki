import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

/**
 * Extrai erros de validação por campo de um ClientResponseError do PocketBase.
 *
 * O PocketBase pode retornar os detalhes de validação de duas formas:
 *  - `{ data: { <field>: { code, message } } }` (formato de SDK normalizado)
 *  - `{ data: { <field>: "<mensagem>" } }`        (formato bruto do backend)
 * além de um possível `{ data: { message: "<mensagem global>" } }`.
 *
 * Este utilitário normaliza todos esses formatos em um mapa `campo -> mensagem`
 * legível para exibição inline nos formulários.
 */
export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}

  const errors: FieldErrors = {}

  for (const [field, detail] of Object.entries(data as Record<string, unknown>)) {
    if (detail == null) continue

    if (typeof detail === 'string') {
      errors[field] = detail
      continue
    }

    if (typeof detail === 'object') {
      const d = detail as Record<string, unknown>
      // Formato de ValidationError do PocketBase: { code, message }
      if (typeof d.message === 'string' && d.message.trim() !== '') {
        errors[field] = d.message
        continue
      }
      // Algumas respostas trazem o texto em `data[field].data` ou um array em
      // `data[field].details`; extrai o primeiro texto disponível.
      if (typeof d.data === 'string') {
        errors[field] = d.data
        continue
      }
      if (Array.isArray(d.details) && typeof d.details[0] === 'string') {
        errors[field] = d.details[0]
        continue
      }
    }
  }

  return errors
}

/**
 * Retorna uma mensagem de erro única e legível para exibição em toast.
 *
 * Prioriza:
 *  1. Mensagens de campos conhecidos (via extractFieldErrors)
 *  2. Uma mensagem global explícita em `data.message`
 *  3. `error.message` (definido pelo SDK a partir do status)
 *
 * Nunca retorna um texto genérico do tipo "verifique os campos" — se não houver
 * nada específico, retorna a mensagem original do erro.
 */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }

  const data = error.response?.data
  const fieldErrors = extractFieldErrors(error)
  const fieldMessages = Object.values(fieldErrors)

  if (fieldMessages.length > 0) {
    return fieldMessages.join(' ')
  }

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.message === 'string' && d.message.trim() !== '') {
      return d.message
    }
  }

  return error.message || 'Ocorreu um erro inesperado.'
}
