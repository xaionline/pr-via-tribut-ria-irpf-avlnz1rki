import pb from '@/lib/pocketbase/client'

export interface AdminEscritorioDTO {
  id: string
  nome: string
  cnpj: string
  email: string
  plano?: 'starter' | 'pro' | 'enterprise'
  limite_clientes?: number
  ativo: boolean
  created: string
}

export interface CriarEscritorioPayload {
  nome: string
  cnpj: string
  email_admin: string
  nome_admin: string
  senha: string
  password?: string
}

export interface EditarEscritorioPayload {
  nome: string
  cnpj: string
  email: string
  plano: 'starter' | 'pro' | 'enterprise'
  limite_clientes: number
  ativo: boolean
}

export interface CriarEscritorioResult {
  success: boolean
  fieldErrors: Record<string, string>
  globalError?: string
  escritorio?: AdminEscritorioDTO
}

export interface EditarEscritorioResult {
  success: boolean
  fieldErrors: Record<string, string>
  globalError?: string
  escritorio?: AdminEscritorioDTO
}

export interface ExcluirEscritorioResult {
  success: boolean
  message?: string
}

export interface ReenviarEmailResult {
  success: boolean
  message?: string
  email?: string
}

export async function getEscritorios(): Promise<AdminEscritorioDTO[]> {
  const res = await pb.send<{ success: boolean; escritorios: AdminEscritorioDTO[] }>(
    '/backend/v1/admin/escritorios',
    { method: 'GET' },
  )
  return res.escritorios || []
}

export async function criarEscritorio(
  payload: CriarEscritorioPayload,
): Promise<CriarEscritorioResult> {
  try {
    const res = await pb.send<{
      success: boolean
      escritorio?: AdminEscritorioDTO
      errors?: Record<string, string>
    }>('/backend/v1/admin/escritorios', {
      method: 'POST',
      body: {
        ...payload,
        password: payload.password || payload.senha,
      },
    })
    if (!res.success) {
      const fieldErrors = res.errors || {}
      const globalError =
        fieldErrors._global ||
        (fieldErrors.cnpj ? fieldErrors.cnpj : undefined) ||
        (fieldErrors.email_admin ? fieldErrors.email_admin : undefined) ||
        'Não foi possível criar o escritório.'
      return { success: false, fieldErrors, globalError }
    }
    return { success: true, fieldErrors: {}, escritorio: res.escritorio }
  } catch (error: any) {
    const data = error?.response?.data || error?.data
    const fieldErrors: Record<string, string> = data?.errors || {}
    const globalError =
      fieldErrors._global ||
      fieldErrors.cnpj ||
      fieldErrors.email_admin ||
      fieldErrors.nome ||
      fieldErrors.nome_admin ||
      fieldErrors.senha ||
      data?.message ||
      error?.message ||
      'Não foi possível criar o escritório.'
    return { success: false, fieldErrors, globalError }
  }
}

export async function editarEscritorio(
  id: string,
  payload: EditarEscritorioPayload,
): Promise<EditarEscritorioResult> {
  try {
    const res = await pb.send<{
      success: boolean
      escritorio?: AdminEscritorioDTO
      errors?: Record<string, string>
    }>(`/backend/v1/admin/escritorios/${id}`, {
      method: 'PUT',
      body: payload,
    })
    if (!res.success) {
      const fieldErrors = res.errors || {}
      const globalError =
        fieldErrors._global ||
        (fieldErrors.cnpj ? fieldErrors.cnpj : undefined) ||
        (fieldErrors.email ? fieldErrors.email : undefined) ||
        (fieldErrors.nome ? fieldErrors.nome : undefined) ||
        'Não foi possível atualizar o escritório.'
      return { success: false, fieldErrors, globalError }
    }
    return { success: true, fieldErrors: {}, escritorio: res.escritorio }
  } catch (error: any) {
    const data = error?.response?.data || error?.data
    const fieldErrors: Record<string, string> = data?.errors || {}
    const globalError =
      fieldErrors._global ||
      fieldErrors.cnpj ||
      fieldErrors.email ||
      fieldErrors.nome ||
      fieldErrors.plano ||
      fieldErrors.limite_clientes ||
      data?.message ||
      error?.message ||
      'Não foi possível atualizar o escritório.'
    return { success: false, fieldErrors, globalError }
  }
}

export async function toggleEscritorio(id: string, ativo: boolean): Promise<boolean> {
  const res = await pb.send<{ success: boolean; alterado: boolean; ativo: boolean }>(
    `/backend/v1/admin/escritorios/${id}`,
    {
      method: 'PATCH',
      body: { ativo },
    },
  )
  return res.ativo
}

export async function excluirEscritorio(id: string): Promise<ExcluirEscritorioResult> {
  try {
    const res = await pb.send<{ success: boolean; message?: string }>(
      `/backend/v1/admin/escritorios/${id}`,
      {
        method: 'DELETE',
      },
    )
    return { success: res.success, message: res.message }
  } catch (error: any) {
    const data = error?.response?.data || error?.data
    const message = data?.message || error?.message || 'Erro ao excluir escritório.'
    return { success: false, message }
  }
}

export async function reenviarEmailAdmin(id: string): Promise<ReenviarEmailResult> {
  try {
    const res = await pb.send<{ success: boolean; message?: string; email?: string }>(
      `/backend/v1/admin/escritorios/${id}/reenviar-email`,
      {
        method: 'POST',
      },
    )
    return { success: res.success, message: res.message, email: res.email }
  } catch (error: any) {
    const data = error?.response?.data || error?.data
    const message = data?.message || error?.message || 'Erro ao reenviar e-mail.'
    return { success: false, message }
  }
}
