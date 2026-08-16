import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building,
  Phone,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type { CadastroPayload } from '@/services/cadastro'

/** Máscara CNPJ: 00.000.000/0000-00 */
function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** Máscara telefone: (00) 0000-0000 / (00) 00000-0000 */
function maskTelefone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export default function Cadastro() {
  const [nomeEscritorio, setNomeEscritorio] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [emailEscritorio, setEmailEscritorio] = useState('')
  const [nomeAdmin, setNomeAdmin] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const { cadastrarEscritorio } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}

    if (!nomeEscritorio.trim()) {
      errs.nome_escritorio = 'Informe o nome do escritório.'
    } else if (nomeEscritorio.trim().length < 3) {
      errs.nome_escritorio = 'O nome deve ter ao menos 3 caracteres.'
    }

    const cnpjDigitos = cnpj.replace(/\D/g, '')
    if (!cnpjDigitos) {
      errs.cnpj = 'Informe o CNPJ.'
    } else if (cnpjDigitos.length !== 14) {
      errs.cnpj = 'CNPJ deve conter 14 dígitos.'
    }

    const telDigitos = telefone.replace(/\D/g, '')
    if (!telDigitos) {
      errs.telefone = 'Informe o telefone.'
    } else if (telDigitos.length < 10) {
      errs.telefone = 'Telefone inválido.'
    }

    if (!emailEscritorio.trim()) {
      errs.email_escritorio = 'Informe o e-mail do escritório.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEscritorio.trim())) {
      errs.email_escritorio = 'E-mail inválido.'
    }

    if (!nomeAdmin.trim()) {
      errs.nome_admin = 'Informe o nome completo.'
    } else if (nomeAdmin.trim().length < 3) {
      errs.nome_admin = 'O nome deve ter ao menos 3 caracteres.'
    }

    if (!emailAdmin.trim()) {
      errs.email_admin = 'Informe o e-mail do administrador.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAdmin.trim())) {
      errs.email_admin = 'E-mail inválido.'
    }

    if (!password) {
      errs.senha = 'Informe a senha.'
    } else if (password.length < 8) {
      errs.senha = 'A senha deve ter no mínimo 8 caracteres.'
    }

    if (!confirmPassword) {
      errs.senha_confirm = 'Confirme a senha.'
    } else if (password !== confirmPassword) {
      errs.senha_confirm = 'As senhas não coincidem.'
    }

    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: CadastroPayload = {
      nome_escritorio: nomeEscritorio.trim(),
      cnpj: cnpj.replace(/\D/g, ''),
      telefone,
      email_escritorio: emailEscritorio.trim().toLowerCase(),
      nome_admin: nomeAdmin.trim(),
      email_admin: emailAdmin.trim().toLowerCase(),
      senha: password,
      senha_confirm: confirmPassword,
    }

    setLoading(true)
    const { error } = await cadastrarEscritorio(payload)
    setLoading(false)

    if (error) {
      const serverErrors = (error as any)?.fieldErrors
      if (serverErrors && typeof serverErrors === 'object') {
        setFieldErrors(serverErrors)
      }
      toast({
        title: 'Não foi possível concluir o cadastro',
        description:
          (error as any)?.message ||
          serverErrors?._global ||
          'Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Escritório criado', description: 'Acesso liberado.' })
      navigate('/app/dashboard')
    }
  }

  const beneficios = [
    'Prévia tributária do IRPF para seus clientes',
    'Gestão de declarações e clientes em um só lugar',
    'Isolamento total entre escritórios',
  ]

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Painel lateral (desktop) */}
      <aside className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Prévia Tributária IRPF</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-4">
            Crie o escritório da sua contabilidade em poucos minutos
          </h1>
          <p className="text-emerald-100/80 text-sm leading-relaxed max-w-md">
            Plataforma multi-tenant para contadores e consultores tributários. Cadastre-se, crie seu
            administrador e comece a atender seus clientes.
          </p>

          <ul className="mt-10 space-y-4 max-w-md">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-emerald-50/90">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-emerald-100/60">
          © {new Date().getFullYear()} Prévia Tributária IRPF. Todos os direitos reservados.
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Logo mobile */}
          <div className="lg:hidden flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-base font-semibold text-slate-900">Prévia Tributária IRPF</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Cadastro de escritório</h2>
            <p className="text-sm text-slate-500 mt-1">
              Informe os dados do escritório e do administrador responsável.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bloco: Escritório */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Dados do escritório
              </legend>

              <div className="space-y-1.5">
                <Label htmlFor="nome_escritorio" className="text-xs font-semibold text-slate-700">
                  Nome do escritório *
                </Label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="nome_escritorio"
                    placeholder="Silva & Contadores Associados"
                    value={nomeEscritorio}
                    onChange={(e) => setNomeEscritorio(e.target.value)}
                    className="pl-9 text-sm h-10"
                    aria-invalid={!!fieldErrors.nome_escritorio}
                  />
                </div>
                {fieldErrors.nome_escritorio && (
                  <p className="text-xs text-red-600">{fieldErrors.nome_escritorio}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                    CNPJ *
                  </Label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="cnpj"
                      inputMode="numeric"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                      className="pl-9 text-sm h-10"
                      aria-invalid={!!fieldErrors.cnpj}
                    />
                  </div>
                  {fieldErrors.cnpj && <p className="text-xs text-red-600">{fieldErrors.cnpj}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefone" className="text-xs font-semibold text-slate-700">
                    Telefone *
                  </Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="telefone"
                      inputMode="tel"
                      placeholder="(00) 00000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                      className="pl-9 text-sm h-10"
                      aria-invalid={!!fieldErrors.telefone}
                    />
                  </div>
                  {fieldErrors.telefone && (
                    <p className="text-xs text-red-600">{fieldErrors.telefone}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email_escritorio" className="text-xs font-semibold text-slate-700">
                  E-mail do escritório *
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="email_escritorio"
                    type="email"
                    placeholder="contato@escritorio.com.br"
                    value={emailEscritorio}
                    onChange={(e) => setEmailEscritorio(e.target.value)}
                    className="pl-9 text-sm h-10"
                    aria-invalid={!!fieldErrors.email_escritorio}
                  />
                </div>
                {fieldErrors.email_escritorio && (
                  <p className="text-xs text-red-600">{fieldErrors.email_escritorio}</p>
                )}
              </div>
            </fieldset>

            {/* Bloco: Administrador */}
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Administrador responsável
              </legend>

              <div className="space-y-1.5">
                <Label htmlFor="nome_admin" className="text-xs font-semibold text-slate-700">
                  Nome completo *
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="nome_admin"
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

              <div className="space-y-1.5">
                <Label htmlFor="email_admin" className="text-xs font-semibold text-slate-700">
                  E-mail do administrador *
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    id="email_admin"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-xs font-semibold text-slate-700">
                    Senha *
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="senha"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-sm h-10"
                      aria-invalid={!!fieldErrors.senha}
                    />
                  </div>
                  {fieldErrors.senha && <p className="text-xs text-red-600">{fieldErrors.senha}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="senha_confirm" className="text-xs font-semibold text-slate-700">
                    Confirmar senha *
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="senha_confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 text-sm h-10"
                      aria-invalid={!!fieldErrors.senha_confirm}
                    />
                  </div>
                  {fieldErrors.senha_confirm && (
                    <p className="text-xs text-red-600">{fieldErrors.senha_confirm}</p>
                  )}
                </div>
              </div>
            </fieldset>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-11 gap-2 shadow-md"
            >
              {loading ? (
                'Criando escritório...'
              ) : (
                <>
                  <span>Criar escritório e acessar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Já tem conta?{' '}
                <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                  Fazer login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
