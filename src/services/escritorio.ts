import pb from '@/lib/pocketbase/client'
import type { EscritorioRecord } from '@/types'

export const getEscritorio = (id: string) =>
  pb.collection('escritorios').getOne<EscritorioRecord>(id)

export const updateEscritorio = (id: string, data: Partial<EscritorioRecord>) =>
  pb.collection('escritorios').update<EscritorioRecord>(id, data)
