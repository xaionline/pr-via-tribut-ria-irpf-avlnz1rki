import pb from '@/lib/pocketbase/client'

export interface AdminEscritorioDTO {
  id: string
  nome: string
  cnpj: string
  email: string
  ativo: boolean
  created: string
}

export interface CriarEscritorioPayload {
  nome: string
  cnpj: string
  email_admin: string
  nome_admin: string
  senha: string
}

export interface CriarEscritorioResult {
  success: boolean
  fieldErrors: Record<string, string>
  globalError?: string
  escritorio?: AdminEscritorioDTO
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
      body: payload,
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
