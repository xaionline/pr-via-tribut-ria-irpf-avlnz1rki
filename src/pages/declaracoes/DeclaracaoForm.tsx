import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { getClientes } from '@/services/clientes'
import { createDeclaracao } from '@/services/declaracoes'
import type { ClienteRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function DeclaracaoForm() {
  const [searchParams] = useSearchParams()
  const preSelectedCliente = searchParams.get('clienteId') || ''

  const [clienteId, setClienteId] = useState(preSelectedCliente)
  const [ano, setAno] = useState('2025')
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { escritorio } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    getClientes('', 1, 500).then((res) => setClientes(res.items))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId || !ano) {
      toast({
        title: 'Atenção',
        description: 'Selecione o cliente e o ano.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const dec = await createDeclaracao({
        escritorio_id: escritorio?.id,
        cliente_id: clienteId,
        ano_calendario: parseInt(ano),
        status: 'rascunho',
        progresso: 10,
      })
      toast({
        title: 'Declaração criada',
        description: 'Você pode começar a lançar os dados fiscais.',
      })
      navigate(`/app/declaracoes/${dec.id}`)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar',
        description: err?.message || 'Já pode existir uma declaração para este cliente neste ano.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/declaracoes')}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nova Declaração IRPF</h1>
          <p className="text-xs text-slate-500">
            Selecione o declarante e o ano-calendário para iniciar.
          </p>
        </div>
      </div>

      <Card className="border border-slate-200/80 shadow-subtle">
        <CardHeader>
          <CardTitle className="text-base font-bold">Identificação da Declaração</CardTitle>
          <CardDescription className="text-xs">
            Cada cliente pode ter uma declaração por ano-calendário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-semibold">Cliente / Declarante *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({c.cpf})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Ano-Calendário *</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025 (Exercício 2026)</SelectItem>
                  <SelectItem value="2024">2024 (Exercício 2025)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/app/declaracoes')}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Criando...' : 'Iniciar Declaração'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
