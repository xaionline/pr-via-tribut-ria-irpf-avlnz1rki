import pb from '@/lib/pocketbase/client'
import type { TabelaProgressivaRecord } from '@/types'

export const getTabelas = () =>
  pb.collection('tabelas_progressivas').getFullList<TabelaProgressivaRecord>({
    sort: '-ano_calendario',
  })

/** Busca a tabela progressiva de um ano-calendário específico via hook de backend. */
export const getTabelaPorAno = (ano: number) =>
  pb.send<{
    success: boolean
    message?: string
    ano_calendario: number
    descricao?: string
    data_vigencia_inicio?: string
    data_vigencia_fim?: string
    faixas: TabelaProgressivaRecord['faixas']
  }>(`/backend/v1/tabelas-progressivas/${ano}`, { method: 'GET' })

export const createTabela = (data: Partial<TabelaProgressivaRecord>) =>
  pb.collection('tabelas_progressivas').create<TabelaProgressivaRecord>(data)

export const updateTabela = (id: string, data: Partial<TabelaProgressivaRecord>) =>
  pb.collection('tabelas_progressivas').update<TabelaProgressivaRecord>(id, data)
