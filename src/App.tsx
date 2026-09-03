/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import Index from './pages/Index'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Login from '@/pages/Login'
import Registro from '@/pages/Registro'
import Cadastro from '@/pages/Cadastro'
import Dashboard from '@/pages/Dashboard'
import PlanosPage from '@/pages/PlanosPage'
import ClientesList from '@/pages/clientes/ClientesList'
import ClienteDetail from '@/pages/clientes/ClienteDetail'
import ClienteForm from '@/pages/clientes/ClienteForm'
import EmpresasList from '@/pages/empresas/EmpresasList'
import EmpresaDetail from '@/pages/empresas/EmpresaDetail'
import EmpresaForm from '@/pages/empresas/EmpresaForm'
import PlanejadorRetiradas from '@/pages/empresas/PlanejadorRetiradas'
import CalendarioObrigacoesGlobal from '@/pages/empresas/CalendarioObrigacoesGlobal'
import DeclaracoesList from '@/pages/declaracoes/DeclaracoesList'
import DeclaracaoForm from '@/pages/declaracoes/DeclaracaoForm'
import DeclaracaoDetail from '@/pages/declaracoes/DeclaracaoDetail'
import SimuladorTributario from '@/pages/declaracoes/SimuladorTributario'
import DemonstrativoCalculo from '@/pages/declaracoes/DemonstrativoCalculo'
import DeclaracaoIbsCbsPage from '@/pages/declaracoes/DeclaracaoIbsCbs'
import ResumoDashboard from '@/pages/declaracoes/ResumoDashboard'
import TabelaProgressiva from '@/pages/TabelaProgressiva'
import Configuracoes from '@/pages/configuracoes/Configuracoes'
import ClienteDashboard from '@/pages/cliente/ClienteDashboard'
import { ClienteDemonstrativo } from '@/pages/cliente/ClienteDemonstrativo'
import AdminEscritorios from '@/pages/Admin'
import { SuperAdminRouteGuard } from '@/components/SuperAdminRouteGuard'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/app/dashboard" element={<Dashboard />} />
            <Route path="/app/planos" element={<PlanosPage />} />
            <Route path="/app/clientes" element={<ClientesList />} />
            <Route path="/app/clientes/novo" element={<ClienteForm />} />
            <Route path="/app/clientes/:id" element={<ClienteDetail />} />
            <Route path="/app/clientes/:id/editar" element={<ClienteForm />} />
            {/* Empresas (Pessoa Jurídica) */}
            <Route path="/app/empresas" element={<EmpresasList />} />
            <Route path="/app/empresas/nova" element={<EmpresaForm />} />
            <Route path="/app/empresas/:id" element={<EmpresaDetail />} />
            <Route path="/app/empresas/:id/obrigacoes" element={<EmpresaDetail />} />
            <Route path="/app/empresas/:id/planejador" element={<PlanejadorRetiradas />} />
            <Route path="/app/empresas/:id/editar" element={<EmpresaForm />} />
            <Route path="/app/obrigacoes" element={<CalendarioObrigacoesGlobal />} />
            <Route path="/app/planejador-retiradas" element={<PlanejadorRetiradas />} />
            <Route path="/app/declaracoes" element={<DeclaracoesList />} />
            <Route path="/app/declaracoes/nova" element={<DeclaracaoForm />} />
            <Route path="/app/declaracoes/:id/editar" element={<DeclaracaoForm />} />
            <Route path="/app/declaracoes/:id" element={<DeclaracaoDetail />} />
            <Route path="/app/declaracoes/:id/resumo" element={<ResumoDashboard />} />
            <Route path="/app/declaracoes/:id/simulador" element={<SimuladorTributario />} />
            <Route path="/app/declaracoes/:id/demonstrativo" element={<DemonstrativoCalculo />} />
            <Route path="/app/declaracoes/:id/ibs-cbs" element={<DeclaracaoIbsCbsPage />} />
            <Route path="/app/tabela-progressiva" element={<TabelaProgressiva />} />
            <Route path="/app/configuracoes" element={<Configuracoes />} />
            <Route path="/app/configuracoes/:tab" element={<Configuracoes />} />
            {/* Administração (apenas super_admin) */}
            <Route
              path="/app/admin"
              element={
                <SuperAdminRouteGuard>
                  <AdminEscritorios />
                </SuperAdminRouteGuard>
              }
            />
            {/* Redirecionamento canônico de rota legada para a tela única de Tabela Progressiva */}
            <Route
              path="/app/admin/tabelas"
              element={<Navigate to="/app/tabela-progressiva" replace />}
            />
            {/* Rotas do perfil de cliente (somente leitura) */}
            <Route path="/app/cliente" element={<ClienteDashboard />} />
            <Route path="/app/cliente/demonstrativo" element={<ClienteDashboard />} />
            <Route
              path="/app/cliente/demonstrativo/:declaracaoId"
              element={<ClienteDemonstrativoWrapper />}
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

/** Wrapper que extrai o parâmetro declaracaoId da rota e repassa ao componente. */
function ClienteDemonstrativoWrapper() {
  const { declaracaoId } = useParams<{ declaracaoId: string }>()
  return <ClienteDemonstrativo declaracaoId={declaracaoId || ''} />
}

export default App
