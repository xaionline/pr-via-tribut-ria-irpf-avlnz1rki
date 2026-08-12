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
