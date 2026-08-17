import { useEffect, useState } from 'react'
import { ShieldCheck, Plus, Building2, Mail, Lock, User, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { maskCnpj, formatDate } from '@/lib/formatters'
import {
  getEscritorios,
  criarEscritorio,
  toggleEscritorio,
  type AdminEscritorioDTO,
} from '@/services/admin'

/** Máscara CNPJ ao digitar: 00.000.000/0000-00 */
function applyCnpjMask(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function AdminEscritorios() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [escritorios, setEscritorios] = useState<AdminEscritorioDTO[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // formulário
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [senha, setSenha] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const lista = await getEscritorios()
      setEscritorios(lista)
    } catch {
      toast({
        title: 'Falha ao carregar escritórios',
        description: 'Tente novamente em instantes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setNome('')
    setCnpj('')
    setEmailAdmin('')
    setNomeAdmin('')
    setSenha('')
    setFieldErrors({})
  }

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'Informe o nome do escritório.'
    else if (nome.trim().length < 3) errs.nome = 'O nome deve ter ao menos 3 caracteres.'

    const cnpjDigitos = cnpj.replace(/\D/g, '')
    if (!cnpjDigitos) errs.cnpj = 'Informe o CNPJ.'
    else if (cnpjDigitos.length !== 14) errs.cnpj = 'CNPJ deve conter 14 dígitos.'

    if (!emailAdmin.trim()) errs.email_admin = 'Informe o e-mail do administrador.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAdmin.trim()))
      errs.email_admin = 'E-mail inválido.'

    if (!nomeAdmin.trim()) errs.nome_admin = 'Informe o nome do administrador.'
    else if (nomeAdmin.trim().length < 3) errs.nome_admin = 'O nome deve ter ao menos 3 caracteres.'

    if (!senha) errs.senha = 'Informe a senha inicial.'
    else if (senha.length < 8) errs.senha = 'A senha deve ter no mínimo 8 caracteres.'

    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    const result = await criarEscritorio({
      nome: nome.trim(),
      cnpj: cnpj.replace(/\D/g, ''),
      email_admin: emailAdmin.trim().toLowerCase(),
      nome_admin: nomeAdmin.trim(),
      senha,
    })
    setSubmitting(false)

    if (!result.success) {
      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        setFieldErrors(result.fieldErrors)
      }
      toast({
        title: 'Não foi possível criar o escritório',
        description: result.globalError || 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Escritório criado',
      description: `${result.escritorio?.nome || 'Escritório'} foi cadastrado com sucesso.`,
    })
    setDialogOpen(false)
    resetForm()
    loadData()
  }

  const handleToggle = async (esc: AdminEscritorioDTO) => {
    setTogglingId(esc.id)
    try {
      const novoAtivo = await toggleEscritorio(esc.id, !esc.ativo)
      setEscritorios((prev) => prev.map((e) => (e.id === esc.id ? { ...e, ativo: novoAtivo } : e)))
      toast({
        title: novoAtivo ? 'Escritório ativado' : 'Escritório desativado',
        description: esc.nome,
      })
    } catch {
      toast({
        title: 'Falha ao atualizar escritório',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administração</h1>
            <p className="text-xs text-slate-500 mt-1">
              Gerencie todos os escritórios cadastrados na plataforma.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Novo escritório</span>
        </Button>
      </div>

      {/* Lista de escritórios */}
      {loading ? (
        <Card className="border border-slate-200/80 shadow-subtle">
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : escritorios.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum escritório cadastrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crie o primeiro escritório manualmente utilizando o botão “Novo escritório”.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo escritório</span>
          </Button>
        </Card>
      ) : (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Criação</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escritorios.map((esc) => (
                  <tr key={esc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center justify-center text-xs shrink-0">
                          {esc.nome ? esc.nome.slice(0, 2).toUpperCase() : 'ES'}
                        </div>
                        <span className="font-semibold text-slate-900">{esc.nome}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {esc.cnpj ? maskCnpj(esc.cnpj) : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{esc.email || '-'}</td>
                    <td className="py-3 px-4">
                      {esc.ativo ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-muted text-muted-foreground border-border text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(esc.created)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={esc.ativo}
                          disabled={togglingId === esc.id}
                          onCheckedChange={() => handleToggle(esc)}
                          aria-label={`Ativar/desativar ${esc.nome}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {escritorios.map((esc) => (
              <div key={esc.id} className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center justify-center text-xs shrink-0">
                    {esc.nome ? esc.nome.slice(0, 2).toUpperCase() : 'ES'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{esc.nome}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {esc.cnpj ? maskCnpj(esc.cnpj) : '-'}
                    </p>
                  </div>
                  {esc.ativo ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 rounded-full"
                    >
                      Ativo
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border text-[10px] px-2 py-0.5 rounded-full"
                    >
                      Inativo
                    </Badge>
                  )}
                </div>
                {esc.email && <p className="text-[10px] text-slate-500 truncate">{esc.email}</p>}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    Criado em {formatDate(esc.created)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">
                      {esc.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <Switch
                      checked={esc.ativo}
                      disabled={togglingId === esc.id}
                      onCheckedChange={() => handleToggle(esc)}
                      aria-label={`Ativar/desativar ${esc.nome}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: novo escritório */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Novo escritório
            </DialogTitle>
            <DialogDescription>
              Crie o escritório e seu administrador responsável. O administrador poderá acessar a
              plataforma com a senha inicial informada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome do escritório */}
            <div className="space-y-1.5">
              <Label htmlFor="adm-nome" className="text-xs font-semibold text-slate-700">
                Nome do escritório *
              </Label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="adm-nome"
                  placeholder="Silva & Contadores Associados"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!fieldErrors.nome}
                />
              </div>
              {fieldErrors.nome && <p className="text-xs text-red-600">{fieldErrors.nome}</p>}
            </div>

            {/* CNPJ */}
            <div className="space-y-1.5">
              <Label htmlFor="adm-cnpj" className="text-xs font-semibold text-slate-700">
                CNPJ *
              </Label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="adm-cnpj"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(applyCnpjMask(e.target.value))}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!fieldErrors.cnpj}
                />
              </div>
              {fieldErrors.cnpj && <p className="text-xs text-red-600">{fieldErrors.cnpj}</p>}
            </div>

            {/* Nome do administrador */}
            <div className="space-y-1.5">
              <Label htmlFor="adm-nome-admin" className="text-xs font-semibold text-slate-700">
                Nome do administrador *
              </Label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="adm-nome-admin"
                  placeholder="Dr. Carlos Silva"
                  value={nomeAdmin}
                  onChange={(e) => setNomeAdmin(e.target.value)}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!fieldErrors.nome_admin}
                />
              </div>
              {fieldErrors.nome_admin && (
                <p className="text-xs text-red-600">{fieldErrors.nome_admin}</p>
              )}
            </div>

            {/* E-mail do administrador */}
            <div className="space-y-1.5">
              <Label htmlFor="adm-email" className="text-xs font-semibold text-slate-700">
                E-mail do administrador *
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="adm-email"
                  type="email"
                  placeholder="carlos@escritorio.com.br"
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!fieldErrors.email_admin}
                />
              </div>
              {fieldErrors.email_admin && (
                <p className="text-xs text-red-600">{fieldErrors.email_admin}</p>
              )}
            </div>

            {/* Senha inicial */}
            <div className="space-y-1.5">
              <Label htmlFor="adm-senha" className="text-xs font-semibold text-slate-700">
                Senha inicial *
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="adm-senha"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!fieldErrors.senha}
                />
              </div>
              {fieldErrors.senha ? (
                <p className="text-xs text-red-600">{fieldErrors.senha}</p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  O administrador poderá redefinir a senha após o primeiro acesso.
                </p>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-xs"
                onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={submitting}
              >
                {submitting ? (
                  'Criando...'
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Criar escritório
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
