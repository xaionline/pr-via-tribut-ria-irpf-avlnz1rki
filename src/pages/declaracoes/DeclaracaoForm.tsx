import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { getClientes } from '@/services/clientes'
import { createDeclaracao, getDeclaracao, updateDeclaracao } from '@/services/declaracoes'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import type { ClienteRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'calculada', label: 'Calculada' },
  { value: 'revisada', label: 'Revisada' },
  { value: 'apresentada', label: 'Apresentada' },
  { value: 'retificada', label: 'Retificada' },
] as const

const MODALIDADE_OPTIONS = [
  { value: 'legal', label: 'Legal (Completa)' },
  { value: 'simplificada', label: 'Simplificada (Desconto Padrão)' },
] as const

export default function DeclaracaoForm() {
  const { declaracaoId } = useParams<{ declaracaoId: string }>()
  const isEditing = !!declaracaoId
  const [searchParams] = useSearchParams()
  const preSelectedCliente = searchParams.get('clienteId') || ''
  const preSelectedAno = searchParams.get('ano') || ''

  const [clienteId, setClienteId] = useState(preSelectedCliente)
  const [ano, setAno] = useState(preSelectedAno || '2025')
  const [status, setStatus] = useState<string>('rascunho')
  const [progresso, setProgresso] = useState('10')
  const [modalidade, setModalidade] = useState<string>('')
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(isEditing)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const navigate = useNavigate()
  const { escritorio } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    getClientes('', 1, 500).then((res) => setClientes(res.items))
  }, [])

  useEffect(() => {
    if (!isEditing || !declaracaoId) return
    setPageLoading(true)
    getDeclaracao(declaracaoId)
      .then((d) => {
        setClienteId(d.cliente_id)
        setAno(String(d.ano_calendario))
        setStatus(d.status)
        setProgresso(String(d.progresso ?? 0))
        setModalidade(d.modalidade || '')
      })
      .catch(() => {
        toast({
          title: 'Falha ao carregar declaração',
          description: 'Não foi possível carregar os dados',
          variant: 'destructive',
        })
        navigate('/app/declaracoes')
      })
      .finally(() => setPageLoading(false))
  }, [declaracaoId, isEditing, navigate, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!clienteId || !ano) {
      const errors: FieldErrors = {}
      if (!clienteId) errors.cliente_id = 'Selecione um cliente.'
      if (!ano) errors.ano_calendario = 'Selecione o ano-calendário.'
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        cliente_id: clienteId,
        ano_calendario: parseInt(ano),
        status,
        progresso: parseInt(progresso) || 0,
        ...(modalidade ? { modalidade } : {}),
        ...(escritorio?.id ? { escritorio_id: escritorio.id } : {}),
      }

      if (isEditing && declaracaoId) {
        await updateDeclaracao(declaracaoId, payload)
        toast({
          title: 'Declaração atualizada',
          description: 'Os dados da declaração foram salvos',
        })
        navigate(`/app/declaracoes/${declaracaoId}`)
      } else {
        const dec = await createDeclaracao({
          ...payload,
          status: 'rascunho',
          progresso: 10,
        } as any)
        toast({
          title: 'Declaração criada',
          description: 'Você pode começar a lançar os dados fiscais',
        })
        navigate(`/app/declaracoes/${dec.id}`)
      }
    } catch (err: any) {
      const fe = extractFieldErrors(err)
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe)
      } else {
        toast({
          title: 'Falha ao salvar declaração',
          description: 'Verifique os campos e tente novamente',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-3 w-80" />
          </div>
        </div>
        <Card className="border border-slate-200/80 shadow-subtle">
          <CardHeader>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex justify-end gap-3 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Editar Declaração IRPF' : 'Nova Declaração IRPF'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEditing
              ? 'Atualize os dados principais da declaração.'
              : 'Selecione o declarante e o ano-calendário para iniciar.'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
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
                <FieldError message={fieldErrors.cliente_id} />
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
                <FieldError message={fieldErrors.ano_calendario} />
              </div>

              {isEditing && (
                <>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Progresso (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={progresso}
                        onChange={(e) => setProgresso(e.target.value)}
                        className="h-10 text-xs"
                      />
                      <FieldError message={fieldErrors.progresso} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="font-semibold">Modalidade</Label>
                      <Select value={modalidade} onValueChange={setModalidade}>
                        <SelectTrigger className="h-10 text-xs">
                          <SelectValue placeholder="Selecione a modalidade (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {MODALIDADE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError message={fieldErrors.modalidade} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Salvar' : 'Salvar'}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
