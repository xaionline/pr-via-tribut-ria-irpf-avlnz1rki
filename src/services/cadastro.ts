import pb from '@/lib/pocketbase/client'

export interface CadastroPayload {
  nome_escritorio: string
  cnpj: string
  telefone: string
  email_escritorio: string
  nome_admin: string
  email_admin: string
  senha: string
  senha_confirm: string
}

export interface CadastroFieldErrors {
  nome_escritorio?: string
  cnpj?: string
  telefone?: string
  email_escritorio?: string
  nome_admin?: string
  email_admin?: string
  senha?: string
  senha_confirm?: string
  _global?: string
}

export interface CadastroResult {
  success: boolean
  fieldErrors: CadastroFieldErrors
  globalError?: string
}

/**
 * Cria escritório + administrador via rota pública backend.
 * Não realiza login — o login automático fica a cargo do chamador.
 */
export async function cadastrarEscritorio(payload: CadastroPayload): Promise<CadastroResult> {
  try {
    await pb.send('/backend/v1/cadastro', {
      method: 'POST',
      body: payload,
    })
    return { success: true, fieldErrors: {} }
  } catch (error: any) {
    const data = error?.response?.data
    const fieldErrors: CadastroFieldErrors = data?.errors || {}
    const globalError =
      fieldErrors._global || data?.message || 'Não foi possível concluir o cadastro.'
    return { success: false, fieldErrors, globalError }
  }
}
