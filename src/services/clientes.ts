import pb from '@/lib/pocketbase/client'
import type { ClienteRecord } from '@/types'

export const getClientes = (search?: string, page = 1, perPage = 25) => {
  const filters: string[] = []
  if (search) {
    filters.push(`(nome ~ "${search}" || cpf ~ "${search}" || email ~ "${search}")`)
  }
  const filterStr = filters.join(' && ')
  return pb.collection('clientes').getList<ClienteRecord>(page, perPage, {
    filter: filterStr || undefined,
    sort: '-created',
    expand: 'responsaveis',
  })
}

export const getCliente = (id: string) =>
  pb.collection('clientes').getOne<ClienteRecord>(id, { expand: 'responsaveis' })

export const createCliente = (data: Partial<ClienteRecord>) =>
  pb.collection('clientes').create<ClienteRecord>(data)

export const updateCliente = (id: string, data: Partial<ClienteRecord>) =>
  pb.collection('clientes').update<ClienteRecord>(id, data)

export const deleteCliente = (id: string) => pb.collection('clientes').delete(id)

/** Busca o registro de cliente vinculado ao login de um cliente (user_id). */
export const getClienteDoUsuario = (userId: string) =>
  pb.collection('clientes').getFirstListItem<ClienteRecord>(`user_id = "${userId}"`, {
    expand: 'responsaveis,user_id',
  })

/** Convida um cliente para acessar a plataforma (cria login + envia e-mail). */
export const convidarCliente = (clienteId: string, payload?: { nome?: string; email?: string }) =>
  pb.send<{
    success: boolean
    cliente_id: string
    user_id: string
    email: string
    convite_enviado: boolean
  }>(`/backend/v1/clientes/${clienteId}/convidar`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
    headers: { 'Content-Type': 'application/json' },
  })
