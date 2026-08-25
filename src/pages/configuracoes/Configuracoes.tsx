import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Settings, Building2, Users, ShieldCheck } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { EscritorioTab } from './EscritorioTab'
import { UsuariosTab } from './UsuariosTab'
import { SegurancaTab } from './SegurancaTab'

import { Calculator } from 'lucide-react'
import { IbsCbsTab } from './IbsCbsTab'

type TabKey = 'escritorio' | 'usuarios' | 'seguranca' | 'ibs-cbs'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'escritorio', label: 'Dados do Escritório', icon: Building2 },
  { key: 'usuarios', label: 'Usuários de Acesso', icon: Users },
  { key: 'seguranca', label: 'Segurança e Políticas', icon: ShieldCheck },
  { key: 'ibs-cbs', label: 'Parâmetros IBS/CBS', icon: Calculator },
]

const VALID_TABS: TabKey[] = ['escritorio', 'usuarios', 'seguranca', 'ibs-cbs']

export default function Configuracoes() {
  const navigate = useNavigate()
  const params = useParams()
  const { isAdmin, loading } = useAuth()
  const { toast } = useToast()

  const tabParam = params.tab as TabKey | undefined

  // Redireciona para a aba padrão quando acessado /app/configuracoes
  useEffect(() => {
    if (loading) return
    if (!isAdmin) {
      toast({ title: 'Acesso restrito ao administrador', variant: 'destructive' })
      navigate('/app/dashboard', { replace: true })
      return
    }
    if (!tabParam || !VALID_TABS.includes(tabParam)) {
      navigate('/app/configuracoes/escritorio', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin, tabParam])

  const activeTab: TabKey = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'escritorio'

  const onTabChange = (value: string) => {
    navigate(`/app/configuracoes/${value}`, { replace: true })
  }

  if (loading) return null

  if (!isAdmin) return null

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os dados do escritório, usuários e políticas de segurança.
          </p>
        </div>
      </div>

      {/* Tabs — Desktop */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <div className="hidden sm:block">
          <TabsList>
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Tabs — Mobile (dropdown) */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={onTabChange}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map((t) => (
                <SelectItem key={t.key} value={t.key} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conteúdo controlado pelo subpath ativo. */}
        <div className="mt-6">
          {activeTab === 'escritorio' && <EscritorioTab />}
          {activeTab === 'usuarios' && <UsuariosTab />}
          {activeTab === 'seguranca' && <SegurancaTab />}
          {activeTab === 'ibs-cbs' && <IbsCbsTab />}
        </div>
      </Tabs>
    </div>
  )
}
