import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Plus,
  Building2,
  Mail,
  Lock,
  User,
  FileText,
  Trash2,
  Edit2,
  Send,
  AlertTriangle,
  Layers,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { maskCnpj, formatDate } from '@/lib/formatters'
import {
  getEscritorios,
  criarEscritorio,
  editarEscritorio,
  toggleEscritorio,
  excluirEscritorio,
  reenviarEmailAdmin,
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

  // Modal: Novo Escritório
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Modal: Editar Escritório
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEscritorio, setEditingEscritorio] = useState<AdminEscritorioDTO | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCnpj, setEditCnpj] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPlano, setEditPlano] = useState<'starter' | 'pro' | 'enterprise'>('pro')
  const [editLimiteClientes, setEditLimiteClientes] = useState<number>(100)
  const [editAtivo, setEditAtivo] = useState(true)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})

  // Modal: Confirmação de Exclusão em Cascata
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingEscritorio, setDeletingEscritorio] = useState<AdminEscritorioDTO | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Ações em andamento (loading por ID)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

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

  const resetNovoForm = () => {
    setNome('')
    setCnpj('')
    setEmailAdmin('')
    setNomeAdmin('')
    setSenha('')
    setShowPassword(false)
    setFieldErrors({})
  }

  const validateNovo = (): Record<string, string> => {
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateNovo()
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
      title: 'Escritório criado com sucesso',
      description: `${result.escritorio?.nome || 'Escritório'} foi cadastrado.`,
    })
    setDialogOpen(false)
    resetNovoForm()
    loadData()
  }

  // Abre modal de edição pré-preenchendo os dados
  const handleOpenEdit = (esc: AdminEscritorioDTO) => {
    setEditingEscritorio(esc)
    setEditNome(esc.nome || '')
    setEditCnpj(esc.cnpj ? applyCnpjMask(esc.cnpj) : '')
    setEditEmail(esc.email || '')
    setEditPlano(esc.plano || 'pro')
    setEditLimiteClientes(esc.limite_clientes ?? 100)
    setEditAtivo(esc.ativo ?? true)
    setEditFieldErrors({})
    setEditDialogOpen(true)
  }

  const validateEdit = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!editNome.trim()) errs.nome = 'Informe o nome do escritório.'
    else if (editNome.trim().length < 3) errs.nome = 'O nome deve ter ao menos 3 caracteres.'

    const cnpjDigitos = editCnpj.replace(/\D/g, '')
    if (cnpjDigitos && cnpjDigitos.length !== 14) {
      errs.cnpj = 'CNPJ deve conter 14 dígitos.'
    }

    if (editEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      errs.email = 'E-mail inválido.'
    }

    if (!editPlano) {
      errs.plano = 'Selecione um plano.'
    }

    if (isNaN(editLimiteClientes) || editLimiteClientes < 1) {
      errs.limite_clientes = 'Informe um limite válido (mínimo 1).'
    }

    return errs
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEscritorio) return

    const errs = validateEdit()
    setEditFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setEditSubmitting(true)
    const result = await editarEscritorio(editingEscritorio.id, {
      nome: editNome.trim(),
      cnpj: editCnpj.replace(/\D/g, ''),
      email: editEmail.trim().toLowerCase(),
      plano: editPlano,
      limite_clientes: Number(editLimiteClientes),
      ativo: editAtivo,
    })
    setEditSubmitting(false)

    if (!result.success) {
      if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        setEditFieldErrors(result.fieldErrors)
      }
      toast({
        title: 'Não foi possível atualizar o escritório',
        description: result.globalError || 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Escritório atualizado',
      description: `Os dados de ${result.escritorio?.nome || editNome} foram salvos com sucesso.`,
    })
    setEditDialogOpen(false)
    setEditingEscritorio(null)
    loadData()
  }

  // Toggle ativo
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
        title: 'Falha ao atualizar status do escritório',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  // Reenvio de e-mail para o admin
  const handleReenviarEmail = async (esc: AdminEscritorioDTO) => {
    setSendingEmailId(esc.id)
    try {
      const result = await reenviarEmailAdmin(esc.id)
      if (result.success) {
        toast({
          title: 'E-mail reenviado com sucesso',
          description:
            result.message || `Instruções de acesso enviadas para o administrador de ${esc.nome}.`,
        })
      } else {
        toast({
          title: 'Não foi possível reenviar o e-mail',
          description: result.message || 'Verifique o e-mail cadastrado e tente novamente.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro de comunicação',
        description: 'Ocorreu um erro ao reenviar o e-mail.',
        variant: 'destructive',
      })
    } finally {
      setSendingEmailId(null)
    }
  }

  // Modal de exclusão
  const handleOpenDelete = (esc: AdminEscritorioDTO) => {
    setDeletingEscritorio(esc)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingEscritorio) return
    setDeleting(true)
    try {
      const result = await excluirEscritorio(deletingEscritorio.id)
      if (result.success) {
        toast({
          title: 'Escritório excluído com sucesso',
          description: `${deletingEscritorio.nome} e todas as suas tabelas relacionadas foram removidos em cascata.`,
        })
        setEscritorios((prev) => prev.filter((e) => e.id !== deletingEscritorio.id))
        setDeleteDialogOpen(false)
        setDeletingEscritorio(null)
      } else {
        toast({
          title: 'Erro ao excluir escritório',
          description: result.message || 'Não foi possível excluir o escritório.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao excluir escritório',
        description: 'Ocorreu uma falha inesperada durante a exclusão.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
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
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">CNPJ</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Plano / Limite</th>
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
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="capitalize text-[10px] px-2 py-0.5 font-medium"
                        >
                          {esc.plano || 'pro'}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          ({esc.limite_clientes ?? 100} clientes)
                        </span>
                      </div>
                    </td>
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
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Switch Ativo/Inativo */}
                        <div
                          className="mr-2 flex items-center"
                          title="Ativar ou desativar escritório"
                        >
                          <Switch
                            checked={esc.ativo}
                            disabled={togglingId === esc.id}
                            onCheckedChange={() => handleToggle(esc)}
                            aria-label={`Ativar/desativar ${esc.nome}`}
                          />
                        </div>

                        {/* Reenviar E-mail */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200 gap-1.5 text-xs font-normal"
                          onClick={() => handleReenviarEmail(esc)}
                          disabled={sendingEmailId === esc.id}
                          title="Reenviar e-mail de acesso ao administrador"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {sendingEmailId === esc.id ? 'Enviando...' : 'Reenviar e-mail'}
                          </span>
                        </Button>

                        {/* Editar */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200 gap-1.5 text-xs font-normal"
                          onClick={() => handleOpenEdit(esc)}
                          title="Editar escritório"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </Button>

                        {/* Excluir */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5 text-xs font-normal"
                          onClick={() => handleOpenDelete(esc)}
                          title="Excluir escritório e todos os dados vinculados"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet: cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {escritorios.map((esc) => (
              <div key={esc.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center justify-center text-xs shrink-0">
                      {esc.nome ? esc.nome.slice(0, 2).toUpperCase() : 'ES'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-sm">{esc.nome}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {esc.cnpj ? maskCnpj(esc.cnpj) : 'Sem CNPJ'}
                      </p>
                    </div>
                  </div>
                  {esc.ativo ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 rounded-full shrink-0"
                    >
                      Ativo
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border text-[10px] px-2 py-0.5 rounded-full shrink-0"
                    >
                      Inativo
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block">E-mail:</span>
                    <span className="truncate">{esc.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Plano & Limite:</span>
                    <span className="capitalize font-medium">{esc.plano || 'pro'}</span>
                    <span className="text-slate-400 text-[11px]">
                      {' '}
                      ({esc.limite_clientes ?? 100} clis)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Criado em {formatDate(esc.created)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-xs">
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

                {/* Ações Mobile */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200 gap-1 px-2"
                    onClick={() => handleReenviarEmail(esc)}
                    disabled={sendingEmailId === esc.id}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingEmailId === esc.id ? 'Enviando...' : 'Reenviar e-mail'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs text-slate-700 hover:text-blue-700 hover:bg-blue-50 border-slate-200 gap-1 px-2"
                    onClick={() => handleOpenEdit(esc)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1 px-2.5"
                    onClick={() => handleOpenDelete(esc)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal: Novo escritório */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetNovoForm()
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

          <form onSubmit={handleCreateSubmit} className="space-y-4">
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
                Senha inicial * (mínimo 8 caracteres)
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="adm-senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-9 pr-10 text-sm h-10"
                  aria-invalid={!!fieldErrors.senha}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {fieldErrors.senha ? (
                <p className="text-xs text-red-600">{fieldErrors.senha}</p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Defina a senha com pelo menos 8 caracteres para o primeiro acesso do
                  administrador.
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
                  resetNovoForm()
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

      {/* Modal: Editar escritório */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            setEditingEscritorio(null)
            setEditFieldErrors({})
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              Editar escritório
            </DialogTitle>
            <DialogDescription>
              Atualize as informações cadastrais, parâmetros de plano e status de funcionamento
              deste escritório.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Nome do escritório */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-nome" className="text-xs font-semibold text-slate-700">
                Nome do escritório *
              </Label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="edit-nome"
                  placeholder="Nome do escritório"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!editFieldErrors.nome}
                />
              </div>
              {editFieldErrors.nome && (
                <p className="text-xs text-red-600">{editFieldErrors.nome}</p>
              )}
            </div>

            {/* CNPJ */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-cnpj" className="text-xs font-semibold text-slate-700">
                CNPJ
              </Label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="edit-cnpj"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  value={editCnpj}
                  onChange={(e) => setEditCnpj(applyCnpjMask(e.target.value))}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!editFieldErrors.cnpj}
                />
              </div>
              {editFieldErrors.cnpj && (
                <p className="text-xs text-red-600">{editFieldErrors.cnpj}</p>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-700">
                E-mail do escritório
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="contato@escritorio.com.br"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="pl-9 text-sm h-10"
                  aria-invalid={!!editFieldErrors.email}
                />
              </div>
              {editFieldErrors.email && (
                <p className="text-xs text-red-600">{editFieldErrors.email}</p>
              )}
            </div>

            {/* Plano & Limite de Clientes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-plano" className="text-xs font-semibold text-slate-700">
                  Plano *
                </Label>
                <div className="relative">
                  <Select
                    value={editPlano}
                    onValueChange={(val: 'starter' | 'pro' | 'enterprise') => setEditPlano(val)}
                  >
                    <SelectTrigger id="edit-plano" className="h-10 text-sm">
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editFieldErrors.plano && (
                  <p className="text-xs text-red-600">{editFieldErrors.plano}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-limite" className="text-xs font-semibold text-slate-700">
                  Limite de clientes *
                </Label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="edit-limite"
                    type="number"
                    min={1}
                    max={10000}
                    placeholder="100"
                    value={editLimiteClientes}
                    onChange={(e) => setEditLimiteClientes(Number(e.target.value))}
                    className="pl-9 text-sm h-10"
                    aria-invalid={!!editFieldErrors.limite_clientes}
                  />
                </div>
                {editFieldErrors.limite_clientes && (
                  <p className="text-xs text-red-600">{editFieldErrors.limite_clientes}</p>
                )}
              </div>
            </div>

            {/* Status Ativo (Switch) */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="space-y-0.5">
                <Label
                  htmlFor="edit-ativo-switch"
                  className="text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Escritório Ativo
                </Label>
                <p className="text-[11px] text-slate-500">
                  Quando inativo, os membros da equipe e clientes deste escritório não conseguirão
                  acessar a plataforma.
                </p>
              </div>
              <Switch id="edit-ativo-switch" checked={editAtivo} onCheckedChange={setEditAtivo} />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-xs"
                onClick={() => {
                  setEditDialogOpen(false)
                  setEditingEscritorio(null)
                }}
                disabled={editSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação: Exclusão em Cascata */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteDialogOpen(open)
            if (!open) setDeletingEscritorio(null)
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base text-slate-900">
              Excluir escritório definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                Você está prestes a excluir o escritório{' '}
                <strong className="text-slate-900">{deletingEscritorio?.nome}</strong>.
              </p>
              <p className="text-red-600 font-medium bg-red-50 p-2.5 rounded-md border border-red-200">
                Atenção: esta ação é irreversível. Todas as tabelas relacionadas serão excluídas em
                cascata, incluindo usuários, clientes, declarações, rendimentos, despesas,
                dependentes, IRRF e resultados vinculados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting} className="text-xs h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 gap-1.5"
            >
              {deleting ? (
                'Excluindo em cascata...'
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir escritório
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
