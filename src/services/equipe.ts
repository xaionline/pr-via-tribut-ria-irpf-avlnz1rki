import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types'

export const getMembrosEquipe = (escritorioId: string) =>
  pb.collection('users').getFullList<UserRecord>({
    filter: `escritorio_id = "${escritorioId}"`,
  })

export const updateMembroCargo = (userId: string, cargo: string) =>
  pb.collection('users').update<UserRecord>(userId, { cargo })

export const toggleMembroAtivo = (userId: string, ativo: boolean) =>
  pb.collection('users').update<UserRecord>(userId, { ativo })
