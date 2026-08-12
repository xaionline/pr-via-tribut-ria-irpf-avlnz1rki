import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, ArrowRight, Lock, Mail, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export default function Registro() {
  const [name, setName] = useState('')
  const [nomeEscritorio, setNomeEscritorio] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !nomeEscritorio || !email || !password) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Atenção', description: 'As senhas não coincidem.', variant: 'destructive' })
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password, name, nomeEscritorio)
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: 'Verifique se o email já está cadastrado ou tente outra senha.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Escritório criado com sucesso!',
        description: 'Bem-vindo ao Prévia Tributária IRPF.',
      })
      navigate('/app/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />

      <Card className="w-full max-w-lg bg-white shadow-2xl border-slate-100 z-10 my-8 animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Cadastrar Novo Escritório
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Crie sua conta administrativa para gerenciar clientes e declarações
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Seu Nome Completo</Label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  placeholder="Dr. Carlos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Nome do Escritório / Consultoria
              </Label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  placeholder="Silva & Contadores Associados"
                  value={nomeEscritorio}
                  onChange={(e) => setNomeEscritorio(e.target.value)}
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Email do Administrador</Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  type="email"
                  placeholder="carlos@silva.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs h-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 text-xs h-10"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10 gap-2 shadow-md mt-4"
            >
              {loading ? (
                'Criando Conta...'
              ) : (
                <>
                  <span>Criar Escritório e Acessar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Já tem um escritório cadastrado?{' '}
                <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
                  Fazer Login
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
