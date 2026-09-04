import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, Users, Building2, Bell, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RelatorioClientes } from './RelatorioClientes'
import { RelatorioEmpresas } from './RelatorioEmpresas'
import { RelatorioAlertas } from './RelatorioAlertas'
import { PainelGerencial } from './PainelGerencial'
import { PjRouteGuard } from '@/components/PjRouteGuard'

export function RelatoriosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { podeAcessarPJ } = useAuth()

  // Aba ativa sincronizada com ?tab=
  const tabParam = searchParams.get('tab') || 'clientes'
  const [activeTab, setActiveTab] = useState(tabParam)

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    setSearchParams({ tab: val })
  }

  return (
    <div className="space-y-6">
      {/* Barra de Navegação de Relatórios */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-auto flex flex-wrap gap-1">
            <TabsTrigger
              value="clientes"
              className="text-xs font-semibold gap-2 py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>1. Relatório de Clientes</span>
            </TabsTrigger>

            <TabsTrigger
              value="empresas"
              className="text-xs font-semibold gap-2 py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>2. Relatório de Empresas</span>
              {!podeAcessarPJ && (
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1 border-amber-400 text-amber-700 bg-amber-50"
                >
                  Pro
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="alertas"
              className="text-xs font-semibold gap-2 py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <Bell className="w-4 h-4 text-rose-600" />
              <span>3. Relatório de Alertas</span>
            </TabsTrigger>

            <TabsTrigger
              value="gerencial"
              className="text-xs font-semibold gap-2 py-2 px-3.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
            >
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>4. Painel Gerencial</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Relatório de Clientes */}
        <TabsContent value="clientes" className="m-0 focus-visible:outline-none">
          <RelatorioClientes />
        </TabsContent>

        {/* 2. Relatório de Empresas PJ (com bloqueio para Starter) */}
        <TabsContent value="empresas" className="m-0 focus-visible:outline-none">
          <PjRouteGuard>
            <RelatorioEmpresas />
          </PjRouteGuard>
        </TabsContent>

        {/* 3. Relatório de Alertas */}
        <TabsContent value="alertas" className="m-0 focus-visible:outline-none">
          <RelatorioAlertas />
        </TabsContent>

        {/* 4. Painel Gerencial do Escritório */}
        <TabsContent value="gerencial" className="m-0 focus-visible:outline-none">
          <PainelGerencial />
        </TabsContent>
      </Tabs>
    </div>
  )
}
export default RelatoriosPage
