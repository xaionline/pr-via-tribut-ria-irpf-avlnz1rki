import pb from '@/lib/pocketbase/client'
import type { TabelaProgressivaRecord } from '@/types'

export const getTabelas = () =>
  pb.collection('tabelas_progressivas').getFullList<TabelaProgressivaRecord>({
    sort: '-ano',
  })

export const createTabela = (data: Partial<TabelaProgressivaRecord>) =>
  pb.collection('tabelas_progressivas').create<TabelaProgressivaRecord>(data)

export const updateTabela = (id: string, data: Partial<TabelaProgressivaRecord>) =>
  pb.collection('tabelas_progressivas').update<TabelaProgressivaRecord>(id, data)
