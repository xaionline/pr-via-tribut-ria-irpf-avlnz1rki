import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/hooks/use-auth'
import { createCliente, getCliente, updateCliente } from '@/services/clientes'
import { validateCpf } from '@/lib/formatters'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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
    setFieldErrors({})

    const errors: FieldErrors = {}
    if (!nome) errors.nome = 'Informe o nome do declarante'
    if (!cpf) errors.cpf = 'Informe o CPF do declarante'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    if (!validateCpf(cpf)) {
      setFieldErrors({ cpf: 'CPF com dígitos verificadores incorretos' })
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
        toast({ title: 'Cliente atualizado' })
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
        toast({ title: 'Cliente cadastrado' })
      }
      navigate('/app/clientes')
    } catch (err: any) {
      const fe = extractFieldErrors(err)
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe)
      } else {
        toast({
          title: 'Falha ao salvar cliente',
          description: 'Verifique os campos e tente novamente',
          variant: 'destructive',
        })
      }
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
          <CardTitle className="text-base font-bold">Informações fiscais</CardTitle>
          <CardDescription className="text-xs">
            Dados necessários para identificação no IRPF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="font-semibold">Nome Completo do Declarante *</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    if (fieldErrors.nome) setFieldErrors({ ...fieldErrors, nome: undefined })
                  }}
                  className="h-10 text-xs"
                />
                <FieldError message={fieldErrors.nome} />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => {
                    setCpf(e.target.value)
                    if (fieldErrors.cpf) setFieldErrors({ ...fieldErrors, cpf: undefined })
                  }}
                  className="h-10 text-xs"
                />
                <FieldError message={fieldErrors.cpf} />
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

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
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
                <span>{loading ? 'Salvando...' : 'Salvar'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
