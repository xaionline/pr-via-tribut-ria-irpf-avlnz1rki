import { useState, useEffect, useRef } from 'react'
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
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { maskCnpj, maskTelefone, validateCnpj } from '@/lib/formatters'
import { consultarCnpjBrasilApi } from '@/services/cnpj'
import type { CadastroPayload } from '@/services/cadastro'

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

  // Estado da checagem client-side do CNPJ
  const [checkingCnpj, setCheckingCnpj] = useState(false)
  const [cnpjSuccessInfo, setCnpjSuccessInfo] = useState<string | null>(null)
  const lastCheckedCnpj = useRef<string>('')

  const { cadastrarEscritorio } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Consulta client-side à BrasilAPI com debounce quando o CNPJ atinge 14 dígitos
  useEffect(() => {
    const digitos = cnpj.replace(/\D/g, '')

    // Se o campo ainda não atingiu 14 dígitos
    if (digitos.length === 0) {
      setCnpjSuccessInfo(null)
      lastCheckedCnpj.current = ''
      setFieldErrors((prev) => {
        if (!prev.cnpj) return prev
        const next = { ...prev }
        delete next.cnpj
        return next
      })
      return
    }

    if (digitos.length < 14) {
      setCnpjSuccessInfo(null)
      lastCheckedCnpj.current = ''
      return
    }

    // Atingiu 14 dígitos: valida dígito verificador primeiro
    if (!validateCnpj(digitos)) {
      setFieldErrors((prev) => ({
        ...prev,
        cnpj: 'CNPJ inválido (dígitos verificadores incorretos).',
      }))
      setCnpjSuccessInfo(null)
      lastCheckedCnpj.current = digitos
      return
    }

    // Se já checou com sucesso ou erro este mesmo CNPJ válido, não repete
    if (lastCheckedCnpj.current === digitos) return

    let isMounted = true
    setCheckingCnpj(true)

    const timer = setTimeout(async () => {
      const res = await consultarCnpjBrasilApi(digitos)
      if (!isMounted) return
      setCheckingCnpj(false)
      lastCheckedCnpj.current = digitos

      if (res.sucesso) {
        // Pré-preenche razão social caso o usuário ainda não tenha digitado
        if (res.razaoSocial) {
          setNomeEscritorio((prev) => (prev.trim() === '' ? res.razaoSocial! : prev))
        }
        // Pré-preenche telefone se retornado pela Receita Federal
        if (res.telefone) {
          setTelefone((prev) => (prev.trim() === '' ? maskTelefone(res.telefone!) : prev))
        }
        // Pré-preenche e-mail se retornado pela Receita Federal
        if (res.email) {
          setEmailEscritorio((prev) => (prev.trim() === '' ? res.email!.toLowerCase() : prev))
        }

        setCnpjSuccessInfo(
          `CNPJ Ativo na Receita Federal${res.razaoSocial ? ` • ${res.razaoSocial}` : ''}`,
        )
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.cnpj
          return next
        })
      } else if (res.erro === 'situacao_irregular') {
        setFieldErrors((prev) => ({
          ...prev,
          cnpj:
            res.mensagemErro ||
            'Este CNPJ está com situação cadastral irregular na Receita Federal.',
        }))
        setCnpjSuccessInfo(null)
      } else if (res.erro === 'nao_encontrado') {
        setFieldErrors((prev) => ({
          ...prev,
          cnpj: 'CNPJ não encontrado na Receita Federal.',
        }))
        setCnpjSuccessInfo(null)
      } else if (res.erro === 'invalido') {
        setFieldErrors((prev) => ({
          ...prev,
          cnpj: 'CNPJ inválido.',
        }))
        setCnpjSuccessInfo(null)
      } else {
        // Falha de rede/CORS: não bloqueia o fluxo, aceita CNPJ válido matematicamente
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.cnpj
          return next
        })
        setCnpjSuccessInfo(
          'CNPJ com dígitos verificadores válidos (consulta externa indisponível).',
        )
      }
    }, 400)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [cnpj])

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}

    if (!nomeEscritorio.trim()) {
      errs.nome_escritorio = 'Informe o nome do escritório.'
    } else if (nomeEscritorio.trim().length < 3) {
      errs.nome_escritorio = 'O nome deve ter ao menos 3 caracteres.'
    }

    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (!cleanCnpj) {
      errs.cnpj = 'Informe o CNPJ.'
    } else if (cleanCnpj.length !== 14) {
      errs.cnpj = 'CNPJ deve conter 14 dígitos.'
    } else if (!validateCnpj(cleanCnpj)) {
      errs.cnpj = 'CNPJ inválido (dígitos verificadores incorretos).'
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

  const cnpjDigitos = cnpj.replace(/\D/g, '')
  const cnpjIsMathValid = cnpjDigitos.length === 14 && validateCnpj(cnpjDigitos)
  const isCnpjBlocked =
    checkingCnpj || (cnpjDigitos.length === 14 && !cnpjIsMathValid) || Boolean(fieldErrors.cnpj)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Bloqueia se a checagem estiver em andamento ou se houver erro conhecido no CNPJ
    if (checkingCnpj) {
      toast({
        title: 'Aguarde a validação do CNPJ',
        description: 'Estamos consultando os dados cadastrais na Receita Federal.',
      })
      return
    }

    if (fieldErrors.cnpj) {
      toast({
        title: 'CNPJ inválido ou irregular',
        description: fieldErrors.cnpj,
        variant: 'destructive',
      })
      return
    }

    const errs = validate()
    setFieldErrors((prev) => ({ ...prev, ...errs }))
    if (Object.keys(errs).length > 0) return

    const payload: CadastroPayload = {
      nome_escritorio: nomeEscritorio.trim(),
      cnpj: cnpjDigitos,
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
        setFieldErrors((prev) => ({ ...prev, ...serverErrors }))
      }
      toast({
        title: 'Não foi possível concluir o cadastro',
        description:
          serverErrors?.cnpj ||
          serverErrors?._global ||
          (error as any)?.message ||
          'Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Escritório criado com sucesso!',
        description: 'Seu período de teste grátis de 14 dias está ativo.',
      })
      navigate('/app/planos')
    }
  }

  const beneficios = [
    '14 dias de teste grátis com acesso completo',
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
              Teste grátis de 14 dias
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Cadastro de escritório</h2>
            <p className="text-sm text-slate-500 mt-1">
              Informe os dados do escritório e do administrador responsável para iniciar seu trial
              de 14 dias.
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
                      className="pl-9 pr-8 text-sm h-10 font-mono"
                      aria-invalid={!!fieldErrors.cnpj}
                    />
                    {checkingCnpj && (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-3" />
                    )}
                  </div>
                  {fieldErrors.cnpj && (
                    <div className="flex items-start gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{fieldErrors.cnpj}</span>
                    </div>
                  )}
                  {!fieldErrors.cnpj && cnpjSuccessInfo && (
                    <div className="flex items-start gap-1 text-[11px] text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                      <span className="line-clamp-2">{cnpjSuccessInfo}</span>
                    </div>
                  )}
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
              disabled={loading || isCnpjBlocked}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium h-11 gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Criando escritório...</span>
                </>
              ) : checkingCnpj ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando CNPJ na Receita Federal...</span>
                </>
              ) : (
                <>
                  <span>Criar escritório e iniciar teste grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            {fieldErrors.cnpj && (
              <p className="text-center text-xs text-red-600 -mt-3">
                Corrija o CNPJ informado para prosseguir com o cadastro do teste grátis.
              </p>
            )}

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
