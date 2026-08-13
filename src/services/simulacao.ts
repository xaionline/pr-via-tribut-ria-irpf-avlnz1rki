import pb from '@/lib/pocketbase/client'
import type { CenarioSimulacaoRecord, SimulacaoParams } from '@/types'

export const getCenarios = (declaracaoId: string) =>
  pb.collection('cenarios_simulacao').getFullList<CenarioSimulacaoRecord>({
    filter: `declaracao_id = "${declaracaoId}"`,
    sort: '-created',
  })

export const createCenario = (data: Partial<CenarioSimulacaoRecord>) =>
  pb.collection('cenarios_simulacao').create<CenarioSimulacaoRecord>(data)

export const deleteCenario = (id: string) => pb.collection('cenarios_simulacao').delete(id)

export const aplicarCenario = (declaracaoId: string, params: SimulacaoParams) =>
  pb.send<{ success: boolean; message: string }>(
    `/backend/v1/declaracoes/${declaracaoId}/aplicar-cenario`,
    {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { 'Content-Type': 'application/json' },
    },
  )
