import pb from '@/lib/pocketbase/client'
import type { EscritorioRecord, MembroEquipeDTO, CargoUser } from '@/types'

export interface RetencaoRelatorioDTO {
  success: boolean
  gerado_em: string
  politicas: {
    declaracoes_retencao_anos: number
    clientes_arquivamento_anos: number
    clientes_exclusao_anos: number
  }
  declaracoes_elegiveis: {
    id: string
    ano_calendario: number
    cliente_id: string
    status: string
    updated: string
  }[]
  clientes_arquivar: {
    id: string
    nome: string
    cpf: string
    updated: string
  }[]
  clientes_excluir: {
    id: string
    nome: string
    cpf: string
    updated: string
  }[]
}

export interface LgpdExportacaoDTO {
  success: boolean
  encontrado: boolean
  titular?: {
    id: string
    nome: string
    cpf: string
    email?: string
    telefone?: string
    data_nascimento?: string
    endereco?: string
    status: string
    created: string
    updated: string
  }
  declaracoes?: {
    id: string
    ano_calendario: number
    status: string
    modalidade?: string
    created: string
    updated: string
  }[]
  dependentes?: {
    nome: string
    cpf?: string
    data_nascimento?: string
    declaracao_id: string
  }[]
  exportado_em?: string
}

// ---------- Escritório ----------
export const getEscritorioConfig = (id: string) =>
  pb.collection('escritorios').getOne<EscritorioRecord>(id)

export const atualizarEscritorio = (id: string, data: Partial<EscritorioRecord>) =>
  pb.collection('escritorios').update<EscritorioRecord>(id, data)

export const uploadLogoEscritorio = (id: string, file: File) => {
  const formData = new FormData()
  formData.append('logo', file)
  return pb.collection('escritorios').update<EscritorioRecord>(id, formData)
}

export const getLogoUrl = (escritorio: EscritorioRecord): string | null => {
  if (!escritorio.logo) return null
  return pb.files.getURL(escritorio as unknown as Record<string, unknown>, escritorio.logo)
}

// ---------- Usuários ----------
export const listarUsuarios = (escritorioId: string) =>
  pb.collection('users').getFullList<MembroEquipeDTO>({
    filter: `escritorio_id = "${escritorioId}"`,
    sort: 'name',
  })

export const convidarUsuario = (payload: {
  name: string
  email: string
  cargo: CargoUser
  enviar_convite: boolean
}) =>
  pb.send<{ success: boolean; id: string; email: string; convite_enviado: boolean }>(
    '/backend/v1/configuracoes/usuarios',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    },
  )

export const atualizarUsuario = (id: string, payload: { cargo?: CargoUser; ativo?: boolean }) =>
  pb.send<{ success: boolean; alterado: boolean }>(`/backend/v1/configuracoes/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

export const redefinirSenhaUsuario = (id: string) =>
  pb.send<{ success: boolean; convite_enviado: boolean }>(
    `/backend/v1/configuracoes/usuarios/${id}/redefinir-senha`,
    { method: 'POST' },
  )

export const removerUsuario = (id: string) =>
  pb.send<{ success: boolean }>(`/backend/v1/configuracoes/usuarios/${id}`, {
    method: 'DELETE',
  })

// ---------- Retenção / LGPD ----------
export const solicitarRelatorioRetencao = () =>
  pb.send<RetencaoRelatorioDTO>('/backend/v1/configuracoes/retensao/relatorio', {
    method: 'POST',
  })

export const exportarDadosTitular = (cpf: string) =>
  pb.send<LgpdExportacaoDTO>('/backend/v1/configuracoes/lgpd/exportar', {
    method: 'GET',
    params: { cpf },
  })

export const solicitarExclusaoTitular = (cpf: string) =>
  pb.send<{ success: boolean; cliente_id: string; anonimizado: boolean }>(
    '/backend/v1/configuracoes/lgpd/excluir',
    {
      method: 'POST',
      body: JSON.stringify({ cpf, confirmar: true }),
      headers: { 'Content-Type': 'application/json' },
    },
  )
