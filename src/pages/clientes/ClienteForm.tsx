import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { createCliente, getCliente, updateCliente } from '@/services/clientes'
import { validateCpf } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export default function ClienteForm() {
  const { clienteId } = useParams()
  const isEditing = !!clienteId
  const navigate = useNavigate()
  const { escritorio, user } = useAuth()
  const { toast } = useToast()

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipo, setTipo] = useState<'pessoa_fisica' | 'socio'>('pessoa_fisica')
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clienteId) return
    getCliente(clienteId).then((c) => {
      setNome(c.nome)
      setCpf(c.cpf)
      setEmail(c.email || '')
      setTelefone(c.telefone || '')
      setDataNascimento(c.data_nascimento ? c.data_nascimento.slice(0, 10) : '')
      setEndereco(c.endereco || '')
      setTipo(c.tipo)
      setStatus(c.status)
    })
  }, [clienteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !cpf) {
      toast({
        title: 'Atenção',
        description: 'Nome e CPF são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    if (!validateCpf(cpf)) {
      toast({
        title: 'CPF Inválido',
        description: 'Por favor digite um CPF válido.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      if (isEditing && clienteId) {
        await updateCliente(clienteId, {
          nome,
          cpf,
          email,
          telefone,
          data_nascimento: dataNascimento || undefined,
          endereco,
          tipo,
          status,
        })
        toast({ title: 'Sucesso', description: 'Cliente atualizado com sucesso.' })
      } else {
        await createCliente({
          escritorio_id: escritorio?.id,
          nome,
          cpf,
          email,
          telefone,
          data_nascimento: dataNascimento || undefined,
          endereco,
          tipo,
          status,
          responsaveis: user?.id ? [user.id] : [],
        })
        toast({ title: 'Sucesso', description: 'Cliente cadastrado com sucesso.' })
      }
      navigate('/app/clientes')
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/clientes')}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente Declarante'}
          </h1>
          <p className="text-xs text-slate-500">
            Cadastre os dados pessoais do declarante PF ou sócio.
          </p>
        </div>
      </div>

      <Card className="border border-slate-200/80 shadow-subtle">
        <CardHeader>
          <CardTitle className="text-base font-bold">Informações Fiscais</CardTitle>
          <CardDescription className="text-xs">
            Dados necessários para identificação no IRPF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="font-semibold">Nome Completo do Declarante *</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Data de Nascimento</Label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Email de Contato</Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Telefone / WhatsApp</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Tipo de Declarante</Label>
                <Select value={tipo} onValueChange={(val: any) => setTipo(val)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pessoa_fisica">Pessoa Física Comum</SelectItem>
                    <SelectItem value="socio">Sócio / Empresário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Status no Escritório</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="font-semibold">Endereço Residencial</Label>
                <Input
                  placeholder="Rua, número, bairro, cidade - UF"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/app/clientes')}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Salvando...' : 'Salvar Cliente'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
