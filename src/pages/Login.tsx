import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, ArrowRight, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: 'Atenção', description: 'Preencha email e senha', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        title: 'Erro de autenticação',
        description: 'Credenciais inválidas. Verifique seu email e senha.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Bem-vindo', description: 'Acesso realizado com sucesso.' })
      const cargo = pb.authStore.model?.cargo
      navigate(cargo === 'cliente' ? '/app/cliente' : '/app/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />

      <Card className="w-full max-w-md bg-white shadow-2xl border-slate-100 z-10 animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Prévia Tributária IRPF
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            Sistema Multi-tenant para Contadores e Consultores
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email profissional
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contador@escritorio.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Senha
                </Label>
                <a href="#" className="text-[11px] text-emerald-600 hover:underline">
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10 gap-2 shadow-md mt-2"
            >
              {loading ? (
                'Entrando...'
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Ainda não tem conta para o escritório?{' '}
                <Link to="/cadastro" className="text-emerald-600 font-semibold hover:underline">
                  Criar novo escritório
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
