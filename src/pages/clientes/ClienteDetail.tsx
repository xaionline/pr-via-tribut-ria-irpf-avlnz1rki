import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Plus,
  FileText,
  User,
  DollarSign,
  Mail,
  CheckCircle2,
  Loader2,
  Building2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCliente, convidarCliente } from '@/services/clientes'
import { getDeclaracoes } from '@/services/declaracoes'
import { getEmpresasDoCliente } from '@/services/empresas'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { maskCpf, maskCnpj, formatDate, formatCurrency } from '@/lib/formatters'
import type { ClienteRecord, DeclaracaoRecord, EmpresaSocioRecord } from '@/types'

export default function ClienteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, isConsultor } = useAuth()
  const { toast } = useToast()

  const podeConvidar = isAdmin || isConsultor

  const [cliente, setCliente] = useState<ClienteRecord | null>(null)
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [empresasSocietarias, setEmpresasSocietarias] = useState<EmpresaSocioRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [conviteOpen, setConviteOpen] = useState(false)
  const [conviteEmail, setConviteEmail] = useState('')
  const [conviteNome, setConviteNome] = useState('')
  const [conviteLoading, setConviteLoading] = useState(false)
  const [conviteSucesso, setConviteSucesso] = useState<null | { email: string; enviado: boolean }>(
    null,
  )

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getCliente(id), getDeclaracoes(id), getEmpresasDoCliente(id)])
      .then(([c, decs, empSocios]) => {
        setCliente(c)
        setConviteNome(c.nome || '')
        setConviteEmail(c.email || '')
        setDeclaracoes(decs)
        setEmpresasSocietarias(empSocios)
      })
      .finally(() => setLoading(false))
  }, [id])

  const abrirConvite = () => {
    setConviteSucesso(null)
    setConviteOpen(true)
  }

  const enviarConvite = async () => {
    if (!id) return
    if (!conviteEmail || conviteEmail.indexOf('@') < 0) {
      toast({
        title: 'E-mail inválido',
        description: 'Informe um e-mail válido do cliente.',
        variant: 'destructive',
      })
      return
    }
    setConviteLoading(true)
    try {
      const resp = await convidarCliente(id, { nome: conviteNome, email: conviteEmail })
      setConviteSucesso({ email: resp.email, enviado: resp.convite_enviado })
      // Recarrega o cliente para refletir o user_id vinculado.
      getCliente(id)
        .then(setCliente)
        .catch(() => {})
      toast({
        title: resp.convite_enviado ? 'Convite enviado' : 'Acesso criado',
        description: resp.convite_enviado
          ? `E-mail enviado para ${resp.email}.`
          : 'O acesso foi criado, mas não foi possível enviar o e-mail. Informe o cliente para usar "Esqueci minha senha".',
      })
    } catch (err) {
      toast({
        title: 'Erro ao convidar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setConviteLoading(false)
    }
  }

  const copiarLinkConvite = () => {
    const link = `${window.location.origin}/login`
    navigator.clipboard?.writeText(link).then(
      () =>
        toast({
          title: 'Link copiado',
          description: 'Link de acesso copiado para a área de transferência.',
        }),
      () => toast({ title: 'Não foi possível copiar', variant: 'destructive' }),
    )
  }

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
          {podeConvidar &&
            (cliente.user_id ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acesso liberado</span>
              </Button>
            ) : (
              <Button
                onClick={abrirConvite}
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Convidar para acesso</span>
              </Button>
            ))}
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
          <TabsTrigger value="empresas" className="text-xs gap-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Empresas PJ ({empresasSocietarias.length})</span>
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

        <TabsContent value="empresas" className="space-y-4">
          <Card className="border border-slate-200/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold">
                  Vínculos Societários em Empresas (PJ)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Empresas onde este cliente atua como sócio, administrador ou cotista.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/empresas')}
                className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                Gerenciar empresas
              </Button>
            </CardHeader>
            <CardContent>
              {empresasSocietarias.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Este cliente ainda não está vinculado como sócio em nenhuma empresa PJ.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {empresasSocietarias.map((es) => {
                    const emp = es.expand?.empresa_id
                    return (
                      <div
                        key={es.id}
                        className="p-3.5 border rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <Link
                              to={`/app/empresas/${emp?.id}`}
                              className="font-bold text-xs text-slate-900 hover:text-blue-600 block"
                            >
                              {emp?.razao_social || 'Empresa PJ'}
                            </Link>
                            <span className="text-[10px] font-mono text-slate-500">
                              {emp?.cnpj ? maskCnpj(emp.cnpj) : ''}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-blue-50 text-blue-800 font-bold"
                          >
                            {es.percentual_participacao}%
                          </Badge>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
                          <span>Pró-Labore: {formatCurrency(es.pro_labore_mensal || 0)}/mês</span>
                          <Link
                            to={`/app/empresas/${emp?.id}?tab=apuracao`}
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            Ver Apuração PJ &rarr;
                          </Link>
                        </div>
                      </div>
                    )
                  })}
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

      {/* Dialog de convite */}
      <Dialog open={conviteOpen} onOpenChange={setConviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar cliente para acesso</DialogTitle>
            <DialogDescription>
              O cliente receberá um login com acesso somente leitura ao seu demonstrativo e
              simulador.
            </DialogDescription>
          </DialogHeader>

          {conviteSucesso ? (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-800">
                  <p className="font-semibold">Acesso criado para {conviteSucesso.email}</p>
                  <p className="mt-1 text-emerald-700">
                    {conviteSucesso.enviado
                      ? 'O e-mail de convite foi enviado. O cliente define a senha na primeira entrada.'
                      : 'Não foi possível enviar o e-mail automaticamente. Copie o link abaixo e oriente o cliente a usar "Esqueci minha senha".'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={copiarLinkConvite}
              >
                <Mail className="w-3.5 h-3.5" /> Copiar link de acesso
              </Button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nome do cliente</Label>
                <Input
                  value={conviteNome}
                  onChange={(e) => setConviteNome(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">E-mail de acesso</Label>
                <Input
                  type="email"
                  value={conviteEmail}
                  onChange={(e) => setConviteEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {conviteSucesso ? (
              <Button size="sm" className="text-xs" onClick={() => setConviteOpen(false)}>
                Concluir
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setConviteOpen(false)}
                  disabled={conviteLoading}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  onClick={enviarConvite}
                  disabled={conviteLoading}
                >
                  {conviteLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Enviar convite
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
