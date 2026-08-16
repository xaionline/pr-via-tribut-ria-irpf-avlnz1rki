import { useEffect, useState } from 'react'
import {
  Plus,
  MoreVertical,
  Mail,
  Trash2,
  ShieldCheck,
  Loader2,
  Users as UsersIcon,
  RefreshCw,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useAuth } from '@/hooks/use-auth'
import {
  convidarUsuario,
  listarUsuarios,
  redefinirSenhaUsuario,
  removerUsuario,
  atualizarUsuario,
} from '@/services/configuracoes'
import { relativeTime } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { CargoUser, MembroEquipeDTO } from '@/types'

const CARGO_LABEL: Record<CargoUser, string> = {
  admin: 'Admin',
  consultor: 'Consultor',
  visualizador: 'Visualizador',
  cliente: 'Cliente',
}

const CARGO_BADGE: Record<CargoUser, string> = {
  admin: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  consultor: 'bg-blue-50 text-blue-700 border-blue-200',
  visualizador: 'bg-slate-100 text-slate-600 border-slate-200',
  cliente: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function UsuariosTab() {
  const { escritorio, user } = useAuth()
  const { toast } = useToast()
  const escId = escritorio?.id || user?.escritorio_id || ''

  const [membros, setMembros] = useState<MembroEquipeDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Convite
  const [conviteOpen, setConviteOpen] = useState(false)
  const [convNome, setConvNome] = useState('')
  const [convEmail, setConvEmail] = useState('')
  const [convCargo, setConvCargo] = useState<CargoUser>('consultor')
  const [convEnviar, setConvEnviar] = useState(true)
  const [convSaving, setConvSaving] = useState(false)

  // Cargo inline
  const [cargoUserId, setCargoUserId] = useState<string | null>(null)
  const [novoCargo, setNovoCargo] = useState<CargoUser>('consultor')

  // Remoção
  const [removerUser, setRemoverUser] = useState<MembroEquipeDTO | null>(null)
  const [removing, setRemoving] = useState(false)

  // Reset
  const [resetUser, setResetUser] = useState<MembroEquipeDTO | null>(null)
  const [resetting, setResetting] = useState(false)

  const carregar = async () => {
    if (!escId) {
      setLoading(false)
      setErro(true)
      return
    }
    setLoading(true)
    setErro(false)
    try {
      const lista = await listarUsuarios(escId)
      setMembros(lista)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Falha ao carregar usuários',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escId])

  const abrirConvite = () => {
    setConvNome('')
    setConvEmail('')
    setConvCargo('consultor')
    setConvEnviar(true)
    setConviteOpen(true)
  }

  const confirmarConvite = async () => {
    if (!convNome.trim() || !convEmail.trim()) {
      toast({ title: 'Preencha nome e e-mail', variant: 'destructive' })
      return
    }
    setConvSaving(true)
    try {
      await convidarUsuario({
        name: convNome.trim(),
        email: convEmail.trim().toLowerCase(),
        cargo: convCargo,
        enviar_convite: convEnviar,
      })
      setConviteOpen(false)
      toast({
        title: convEnviar ? `Convite enviado para ${convEmail}` : 'Usuário adicionado',
      })
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao convidar usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setConvSaving(false)
    }
  }

  const alterarCargo = async (userId: string, cargo: CargoUser) => {
    try {
      await atualizarUsuario(userId, { cargo })
      setMembros((prev) => prev.map((m) => (m.id === userId ? { ...m, cargo } : m)))
      setCargoUserId(null)
      toast({ title: 'Cargo atualizado' })
    } catch (err) {
      toast({
        title: 'Falha ao alterar cargo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const toggleAtivo = async (membro: MembroEquipeDTO) => {
    const proximo = !membro.ativo
    try {
      await atualizarUsuario(membro.id, { ativo: proximo })
      setMembros((prev) => prev.map((m) => (m.id === membro.id ? { ...m, ativo: proximo } : m)))
      toast({ title: proximo ? 'Usuário ativado' : 'Usuário desativado' })
    } catch (err) {
      toast({
        title: 'Falha ao alterar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const confirmarReset = async () => {
    if (!resetUser) return
    setResetting(true)
    try {
      await redefinirSenhaUsuario(resetUser.id)
      toast({
        title: 'E-mail de redefinição enviado',
        description: resetUser.email,
      })
      setResetUser(null)
    } catch (err) {
      toast({
        title: 'Falha ao redefinir senha',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setResetting(false)
    }
  }

  const confirmarRemocao = async () => {
    if (!removerUser) return
    setRemoving(true)
    try {
      await removerUsuario(removerUser.id)
      setMembros((prev) => prev.filter((m) => m.id !== removerUser.id))
      toast({ title: 'Usuário removido', description: removerUser.name })
      setRemoverUser(null)
    } catch (err) {
      toast({
        title: 'Falha ao remover usuário',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Usuários de Acesso</h2>
          <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
            {membros.length} {membros.length === 1 ? 'usuário' : 'usuários'}
          </Badge>
        </div>
        <Button
          onClick={abrirConvite}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Convidar usuário
        </Button>
      </div>

      {loading ? (
        <UsuariosSkeleton />
      ) : erro ? (
        <Card className="p-10 text-center border-dashed border-rose-200 bg-rose-50/40">
          <p className="text-sm text-slate-600">Não foi possível carregar a lista de usuários.</p>
          <Button
            onClick={carregar}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Repetir
          </Button>
        </Card>
      ) : membros.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-slate-300">
          <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">Nenhum usuário cadastrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Convide membros da equipe para colaborar no escritório.
          </p>
          <Button
            onClick={abrirConvite}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Convidar usuário
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Último acesso</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membros.map((m) => {
                    const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'US'
                    const isSelf = m.id === user?.id
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <AvatarFallback className="text-[10px] font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-semibold text-slate-900">{m.name}</span>
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] text-slate-400">(você)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{m.email}</td>
                        <td className="py-3 px-4">
                          {cargoUserId === m.id ? (
                            <Select
                              value={novoCargo}
                              onValueChange={(v) => setNovoCargo(v as CargoUser)}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="consultor">Consultor</SelectItem>
                                <SelectItem value="visualizador">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${CARGO_BADGE[m.cargo]}`}
                            >
                              {CARGO_LABEL[m.cargo]}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {cargoUserId === m.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px]"
                                onClick={() => alterarCargo(m.id, novoCargo)}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px]"
                                onClick={() => setCargoUserId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={m.ativo}
                                onCheckedChange={() => toggleAtivo(m)}
                                disabled={isSelf}
                              />
                              <span
                                className={`text-[11px] ${
                                  m.ativo ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {m.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                              {!m.verified && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  Pendente
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {m.ultimo_acesso ? relativeTime(m.ultimo_acesso) : 'Nunca acessou'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setCargoUserId(m.id)
                                  setNovoCargo(m.cargo)
                                }}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                                <span>Alterar cargo</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setResetUser(m)}>
                                <Mail className="w-3.5 h-3.5 mr-2" />
                                <span>Redefinir senha</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => setRemoverUser(m)}
                                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                <span>Remover usuário</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {membros.map((m) => {
              const initials = m.name ? m.name.slice(0, 2).toUpperCase() : 'US'
              const isSelf = m.id === user?.id
              return (
                <Card key={m.id} className="p-3 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8 bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-slate-900 truncate">
                        {m.name}
                        {isSelf && <span className="ml-1 text-[10px] text-slate-400">(você)</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] ${CARGO_BADGE[m.cargo]}`}>
                      {CARGO_LABEL[m.cargo]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={m.ativo}
                        onCheckedChange={() => toggleAtivo(m)}
                        disabled={isSelf}
                      />
                      <span className={m.ativo ? 'text-emerald-700' : 'text-slate-400'}>
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <span>{m.ultimo_acesso ? relativeTime(m.ultimo_acesso) : 'Nunca acessou'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        setCargoUserId(m.id)
                        setNovoCargo(m.cargo)
                      }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Cargo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs"
                      onClick={() => setResetUser(m)}
                    >
                      <Mail className="w-3.5 h-3.5 mr-1" /> Senha
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      disabled={isSelf}
                      onClick={() => setRemoverUser(m)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Modal convite */}
      <Dialog open={conviteOpen} onOpenChange={setConviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              Adicione um novo membro ao escritório e defina seu nível de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="conv-nome" className="text-xs">
                Nome
              </Label>
              <Input
                id="conv-nome"
                value={convNome}
                onChange={(e) => setConvNome(e.target.value)}
                placeholder="Nome completo"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conv-email" className="text-xs">
                E-mail
              </Label>
              <Input
                id="conv-email"
                type="email"
                value={convEmail}
                onChange={(e) => setConvEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cargo</Label>
              <Select value={convCargo} onValueChange={(v) => setConvCargo(v as CargoUser)}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="consultor">Consultor</SelectItem>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <Checkbox
                checked={convEnviar}
                onCheckedChange={(v) => setConvEnviar(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                Enviar convite por e-mail com instruções de acesso.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
              onClick={confirmarConvite}
              disabled={convSaving}
            >
              {convSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {convEnviar ? 'Enviar convite' : 'Adicionar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação remoção */}
      <AlertDialog open={!!removerUser} onOpenChange={(o) => !o && setRemoverUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário{' '}
              <strong className="text-slate-700">{removerUser?.name}</strong> perderá o acesso ao
              escritório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarRemocao}
              disabled={removing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação reset de senha */}
      <AlertDialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir senha</AlertDialogTitle>
            <AlertDialogDescription>
              Um e-mail de redefinição de senha será enviado para{' '}
              <strong className="text-slate-700">{resetUser?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarReset}
              disabled={resetting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Enviar e-mail
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UsuariosSkeleton() {
  return (
    <Card className="border border-slate-200/80 overflow-hidden">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-5 w-16 ml-auto" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </Card>
  )
}
