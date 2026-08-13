import pb from '@/lib/pocketbase/client'
import type { EscritorioRecord } from '@/types'

export const getEscritorio = (id: string) =>
  pb.collection('escritorios').getOne<EscritorioRecord>(id)

export const updateEscritorio = (id: string, data: Partial<EscritorioRecord>) =>
  pb.collection('escritorios').update<EscritorioRecord>(id, data)

export const uploadLogo = (id: string, file: File) => {
  const formData = new FormData()
  formData.append('logo', file)
  return pb.collection('escritorios').update<EscritorioRecord>(id, formData)
}

export const getLogoUrl = (escritorio: EscritorioRecord): string | null => {
  if (!escritorio.logo) return null
  return pb.files.getURL(escritorio as any, escritorio.logo)
}
