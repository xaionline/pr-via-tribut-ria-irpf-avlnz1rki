import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Plus, FileText, User, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/StatusBadge'
import { getCliente } from '@/services/clientes'
import { getDeclaracoes } from '@/services/declaracoes'
import { maskCpf, formatDate, formatCurrency } from '@/lib/formatters'
import type { ClienteRecord, DeclaracaoRecord } from '@/types'

export default function ClienteDetail() {
  const { clienteId } = useParams<{ clienteId: string }>()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<ClienteRecord | null>(null)
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clienteId) return
    setLoading(true)
    Promise.all([getCliente(clienteId), getDeclaracoes(clienteId)])
      .then(([c, decs]) => {
        setCliente(c)
        setDeclaracoes(decs)
      })
      .finally(() => setLoading(false))
  }, [clienteId])

  if (loading || !cliente) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">Carregando perfil do cliente...</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/clientes')}>
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{cliente.nome}</h1>
              <StatusBadge status={cliente.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              CPF: <span className="font-mono">{maskCpf(cliente.cpf)}</span> • Tipo:{' '}
              {cliente.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Sócio'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/clientes/${cliente.id}/editar`)}
            className="text-xs gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar</span>
          </Button>
          <Button
            onClick={() => navigate(`/app/declaracoes/nova?clienteId=${cliente.id}`)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova declaração</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="declaracoes" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border">
          <TabsTrigger value="declaracoes" className="text-xs gap-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Declarações ({declaracoes.length})</span>
          </TabsTrigger>
          <TabsTrigger value="dados" className="text-xs gap-2">
            <User className="w-3.5 h-3.5" />
            <span>Dados cadastrais</span>
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="text-xs gap-2">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Resumo fiscal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="declaracoes" className="space-y-4">
          <Card className="border border-slate-200/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold">Histórico de Declarações IRPF</CardTitle>
            </CardHeader>
            <CardContent>
              {declaracoes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhuma declaração criada para este cliente ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {declaracoes.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => navigate(`/app/declaracoes/${d.id}`)}
                      className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            Ano-calendário {d.ano_calendario}
                          </span>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Atualizado em {formatDate(d.updated)} • Progresso de preenchimento:{' '}
                          {d.progresso}%
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-emerald-600 font-semibold"
                      >
                        Acessar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados">
          <Card className="border border-slate-200/80">
            <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Nome Completo</span>
                <span className="font-semibold text-slate-800">{cliente.nome}</span>
              </div>
              <div>
                <span className="text-slate-400 block">CPF</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {maskCpf(cliente.cpf)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-800">{cliente.email || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Telefone</span>
                <span className="font-semibold text-slate-800">{cliente.telefone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Data de Nascimento</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(cliente.data_nascimento)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Endereço</span>
                <span className="font-semibold text-slate-800">{cliente.endereco || '-'}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal">
          <Card className="border border-slate-200/80 p-6 text-center text-xs">
            <DollarSign className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Resumo consolidado</h3>
            <p className="text-slate-500 mt-1">
              Acesse uma declaração ativa para simular e visualizar o saldo a pagar ou a restituir
              em detalhe.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
