import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  Crown,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  LineChart,
  Lock,
  Newspaper,
  Percent,
  RefreshCw,
  Rss,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { buscarNoticiasReceitaFederal, type NoticiaTributaria } from '@/services/noticiasRss'
import { PLANOS_ASSINATURA } from '@/types'

export default function LandingPage() {
  // Feed RSS da Receita Federal
  const [noticias, setNoticias] = useState<NoticiaTributaria[]>([])
  const [carregandoNoticias, setCarregandoNoticias] = useState(true)
  const [origemNoticias, setOrigemNoticias] = useState<'feed_ao_vivo' | 'curadas_oficiais'>(
    'curadas_oficiais',
  )
  const [atualizandoRss, setAtualizandoRss] = useState(false)

  const carregarRss = async () => {
    setAtualizandoRss(true)
    try {
      const res = await buscarNoticiasReceitaFederal()
      setNoticias(res.noticias)
      setOrigemNoticias(res.origem)
    } finally {
      setCarregandoNoticias(false)
      setAtualizandoRss(false)
    }
  }

  useEffect(() => {
    carregarRss()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Barra de Notificação Superior com Alerta de Contexto do Fisco */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-blue-900 border-b border-emerald-500/20 px-4 py-2.5 text-xs text-center font-medium text-emerald-100 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>
          <strong>Declaração Automática do Fisco em expansão:</strong> Enquanto a Receita
          pré-preenche o passado, seu escritório assume o{' '}
          <strong>planejamento e a economia tributária futura</strong>.
        </span>
        <Link
          to="/cadastro"
          className="underline decoration-emerald-400 hover:text-white font-bold ml-1 hidden sm:inline"
        >
          Teste 14 dias grátis →
        </Link>
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/30 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Inteligência Tributária <span className="text-emerald-400">IR</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                Plataforma Contábil Multi-tenant
              </span>
            </div>
          </Link>

          {/* Navegação de ancoragem desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#argumento-fisco" className="hover:text-emerald-400 transition-colors">
              O Novo Papel do Contador
            </a>
            <a href="#recursos" className="hover:text-emerald-400 transition-colors">
              Módulos PF & PJ
            </a>
            <a href="#planos" className="hover:text-emerald-400 transition-colors">
              Planos & Preços
            </a>
            <a
              href="#noticias-rfb"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
            >
              <Rss className="w-3.5 h-3.5 text-orange-400" />
              <span>Notícias RFB</span>
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Botões de Acesso */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg shadow-lg shadow-emerald-900/30 transition-all hover:shadow-emerald-700/40"
            >
              <span>Testar Grátis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Feito exclusivamente para Contadores, Consultores e Escritórios</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            O Fisco automatizou a declaração.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
              O contador domina o planejamento e a economia tributária.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Aplicativo web multi-tenant com <strong>cálculo de prévia do IRPF</strong> (Deduções
            Legais × Desconto Simplificado),
            <strong> Comparador de Regimes PJ</strong> (Simples, Presumido, Real),{' '}
            <strong>Planejador de Retiradas</strong> e o assistente de inteligência tributária{' '}
            <strong>Tribby IA</strong>.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/cadastro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base px-7 py-3.5 rounded-xl shadow-xl shadow-emerald-950/60 hover:shadow-emerald-900/80 transition-all hover:-translate-y-0.5"
            >
              <span>Começar agora — teste grátis de 14 dias</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#planos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-base px-6 py-3.5 rounded-xl transition-all"
            >
              <span>Ver planos (a partir de R$ 49/mês)</span>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Sem cartão para testar
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Multi-tenant isolado
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Padrão oficial da Receita Federal
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" /> Cancelamento simples com 1 clique
            </span>
          </div>

          {/* Destaque Visual / Mini Dashboard Preview */}
          <div className="mt-14 relative max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-emerald-950/30 overflow-hidden text-left p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-500 hidden sm:inline">
                  calculadora.goskip.app / painel-gerencial
                </span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold">
                Multi-Tenant Ativo
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Prévia IRPF Contribuinte
                </span>
                <p className="text-xl font-black text-white mt-1">Deduções Legais × Simplificado</p>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-emerald-400 font-bold">Economia identificada:</span>
                  <span className="font-mono text-emerald-300 font-bold">R$ 4.820,00</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Comparador PJ 2026/2027
                </span>
                <p className="text-xl font-black text-white mt-1">Simples × Presumido × Real</p>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-blue-400 font-bold">Melhor regime em R$:</span>
                  <span className="font-mono text-blue-300 font-bold">Presumido (-24%)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  IA Tributária Nativa
                </span>
                <p className="text-xl font-black text-white mt-1">Tribby Assistente</p>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/40">
                  <span className="text-purple-400 font-bold">Reforma Tributária:</span>
                  <span className="text-purple-300 font-semibold">RTC, IBS, CBS e IRPF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARGUMENTO DE CONTEXTO: POR QUE O CONTADOR PRECISA DESTA FERRAMENTA */}
      <section id="argumento-fisco" className="py-20 bg-slate-900 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold mb-3 px-3 py-1">
              Contexto do Mercado Contábil
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              A declaração pré-preenchida não é ameaça.{' '}
              <span className="text-emerald-400">É a maior oportunidade do seu escritório.</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              O governo federal acelera a tributação assistida e os cruzamentos em tempo real de
              notas, PIX, bancos e fontes pagadoras. O leigo acha que basta apertar um botão, mas
              sem análise técnica ele perde milhares de reais em restituição e planejamento.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-slate-950/80 border-slate-800 text-slate-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">O Fisco calcula para arrecadar</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  A pré-preenchida aplica as escolhas mais fáceis e padronizadas, ignorando deduções
                  não integradas, planejamento de livro-caixa, despesas com saúde, previdência
                  complementar (PGBL) e desmembramento societário.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 border-slate-800 text-slate-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">O Contador otimiza para poupar</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Com o aplicativo, você simula cenários tributários com 1 clique: deduções legais
                  detalhadas versus desconto simplificado de 20%, avaliando o impacto financeiro
                  real na restituição ou no saldo a pagar.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/80 border-slate-800 text-slate-200">
              <CardContent className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Transição PF ↔ PJ e Reforma</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Profissionais liberais, médicos, advogados e sócios dependem do contador para
                  definir pró-labore versus lucros isentos e escolher entre Simples, Presumido e
                  Real com vistas aos novos IBS e CBS.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* RECURSOS COMPLETOS DO PRODUTO */}
      <section id="recursos" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-3 px-3 py-1">
            Conjunto Completo de Ferramentas
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Tudo o que seu escritório precisa do IRPF às apurações PJ
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            Desenvolvido sob medida para a rotina contábil brasileira com suporte à legislação em
            vigor e antecipação dos impactos da Reforma Tributária.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Prévia IRPF */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Prévia de IRPF Completa</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Cálculo simultâneo nas modalidades Deduções Legais e Desconto Simplificado com
              apuração da melhor opção e tabela progressiva oficial atualizada.
            </p>
          </div>

          {/* 2. Módulo PJ Completo */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Módulo PJ Multirregime</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Apurações precisas para Simples Nacional (Anexos I a V), Lucro Presumido e Lucro Real
              com gestão de sócios e faturamento mensal.
            </p>
          </div>

          {/* 3. Comparador de Regimes */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Percent className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Comparador de Regimes em R$</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Coloque lado a lado a carga tributária anual estimada para cada cliente PJ e demonstre
              em reais a economia de trocar de regime.
            </p>
          </div>

          {/* 4. Planejador de Retiradas */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Planejador de Retiradas</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Equilibre Pró-labore (INSS + IRRF) e Distribuição de Lucros Isentos com cálculo
              automático do ponto ótimo de economia e geração de PDF.
            </p>
          </div>

          {/* 5. Calendário & Obrigações Acessórias */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Obrigações & Calendário</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Controle de prazos do IRPF, DCTFWeb, EFD-Reinf, DEFIS, ECD, ECF e alertas visuais de
              vencimento para evitar multas nos seus clientes.
            </p>
          </div>

          {/* 6. Assistente Tribby IA */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-950/40 to-slate-900 border border-purple-800/40 hover:border-purple-500/60 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Assistente IA "Tribby"</h3>
              <Badge className="bg-purple-600 text-white text-[9px] font-black uppercase px-1.5 py-0">
                Nativo
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
              Inteligência Artificial especialista em legislação tributária brasileira, instrução
              normativa e regras da Reforma Tributária integrada ao app.
            </p>
          </div>
        </div>

        {/* Relatórios e Exportação */}
        <div className="mt-8 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                Painel Gerencial e 4 Relatórios Unificados
              </h4>
              <p className="text-xs sm:text-sm text-slate-400">
                Relatórios exportáveis de clientes, empresas, alertas e painel executivo prontos
                para entrega com a logomarca do seu escritório.
              </p>
            </div>
          </div>
          <Link
            to="/cadastro"
            className="shrink-0 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors"
          >
            <span>Ver demonstração no trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* SEÇÃO DE PLANOS COM PREÇOS REAIS DO SISTEMA */}
      <section id="planos" className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-3 px-3 py-1">
              Transparência Total
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Planos dimensionados para o tamanho do seu escritório
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
              Todos os planos contam com <strong>14 dias de teste grátis com tudo liberado</strong>.
              Pagamento mensal seguro via Stripe com cartão de crédito ou PIX.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">
            {PLANOS_ASSINATURA.map((plano) => {
              const isPro = plano.id === 'pro'
              const isEnterprise = plano.id === 'enterprise'

              return (
                <div
                  key={plano.id}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all ${
                    isPro
                      ? 'bg-slate-950 border-2 border-blue-500 shadow-2xl shadow-blue-950/60 md:-translate-y-2'
                      : 'bg-slate-950/70 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                      Mais Popular · Escolha Recomendada
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {plano.id === 'starter' && <Zap className="w-5 h-5 text-emerald-400" />}
                        {isPro && <Crown className="w-5 h-5 text-blue-400" />}
                        {isEnterprise && <Sparkles className="w-5 h-5 text-purple-400" />}
                        <h3 className="text-xl font-black text-white">{plano.nome}</h3>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${
                          plano.id === 'starter'
                            ? 'border-emerald-500/40 text-emerald-400'
                            : isPro
                              ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                              : 'border-purple-500/40 text-purple-300 bg-purple-500/10'
                        }`}
                      >
                        {plano.id === 'starter'
                          ? 'Apenas PF'
                          : isPro
                            ? 'PF + PJ'
                            : 'Ilimitado + IA'}
                      </Badge>
                    </div>

                    {plano.subtitulo && (
                      <p className="text-xs text-slate-400 mb-4">{plano.subtitulo}</p>
                    )}

                    <div className="mb-6 pb-6 border-b border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-white">
                          {plano.precoTexto}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">/mês</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cobrança mensal no cartão ou PIX · Cancele quando quiser
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plano.features.map((feature) => {
                        const isNegativa = feature.startsWith('Sem módulo')
                        const isAi =
                          feature.toLowerCase().includes('assistente ia') ||
                          feature.toLowerCase().includes('tribby')

                        return (
                          <li
                            key={feature}
                            className={`flex items-start gap-2.5 text-xs sm:text-sm ${
                              isNegativa
                                ? 'text-slate-400 line-through'
                                : isAi
                                  ? 'text-purple-300 font-semibold bg-purple-950/40 p-1.5 rounded-lg border border-purple-800/40'
                                  : 'text-slate-300'
                            }`}
                          >
                            {isAi ? (
                              <Bot className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            ) : (
                              <Check
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  isNegativa
                                    ? 'text-slate-400'
                                    : isPro
                                      ? 'text-blue-400'
                                      : 'text-emerald-400'
                                }`}
                              />
                            )}
                            <span>{feature}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  <div>
                    <Link
                      to="/cadastro"
                      className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 transition-all ${
                        isPro
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/60'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <span>Iniciar teste de 14 dias ({plano.nome})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                      Após o cadastro, acesso direto à área do app com ativação imediata.
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Destaque do Trial de 14 Dias */}
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-blue-950/50 border border-emerald-500/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-white">
                  Trial de 14 dias com recursos Pro e Tribby liberados
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cadastre seu escritório em menos de 1 minuto e explore o sistema completo antes de
                  qualquer assinatura.
                </p>
              </div>
            </div>
            <Link
              to="/cadastro"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-md transition-colors"
            >
              Criar Escritório Grátis
            </Link>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE NOTÍCIAS TRIBUTÁRIAS COM INTEGRAÇÃO RSS DA RECEITA FEDERAL */}
      <section id="noticias-rfb" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-3">
              <Rss className="w-3.5 h-3.5" />
              <span>Feed de Notícias Oficiais</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Radar Tributário: Notícias da Receita Federal
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Acompanhe atos, comunicados, prazos do Simples Nacional, instrução normativa e regras
              do IRPF transmitidos pela Receita Federal do Brasil em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Badge
              variant="outline"
              className={`text-[11px] font-mono border-slate-800 ${
                origemNoticias === 'feed_ao_vivo'
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
                  : 'text-amber-400 bg-amber-950/40 border-amber-800/50'
              }`}
            >
              {origemNoticias === 'feed_ao_vivo' ? '● RSS Gov.br Ao Vivo' : '● Boletim Oficial RFB'}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={carregarRss}
              disabled={atualizandoRss}
              className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs gap-1.5 h-8"
              title="Atualizar feed de notícias"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${atualizandoRss ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {carregandoNoticias ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 animate-pulse"
              >
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-800 rounded w-4/5" />
                <div className="h-12 bg-slate-800/50 rounded w-full" />
                <div className="h-4 bg-slate-800/40 rounded w-1/4 pt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {noticias.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span className="font-semibold text-emerald-400">
                      {item.categoria || 'Receita Federal'}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.dataPublicacao}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                    {item.titulo}
                  </h3>

                  {item.resumo && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {item.resumo}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <span className="text-[11px] font-medium">Ler matéria na íntegra</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="https://www.gov.br/receitafederal/pt-br/assuntos/noticias"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-medium transition-colors"
          >
            <span>Acessar portal oficial de notícias da Receita Federal do Brasil (gov.br)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* FAQ / DÚVIDAS FREQUENTES */}
      <section id="faq" className="py-20 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold mb-3 px-3 py-1">
              Tira-Dúvidas
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Perguntas frequentes de escritórios e contadores
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem
              value="faq-1"
              className="border border-slate-800 bg-slate-950/80 rounded-xl px-4"
            >
              <AccordionTrigger className="text-sm font-bold text-white hover:text-emerald-400 hover:no-underline">
                Como funciona o teste grátis de 14 dias?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ao cadastrar seu escritório na rota pública de cadastro, você recebe imediatamente
                14 dias de teste com todos os recursos do plano Pro e o Assistente Tribby IA
                liberados. Não exigimos cartão de crédito antecipado para iniciar o teste.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="faq-2"
              className="border border-slate-800 bg-slate-950/80 rounded-xl px-4"
            >
              <AccordionTrigger className="text-sm font-bold text-white hover:text-emerald-400 hover:no-underline">
                Os dados dos meus clientes ficam separados de outros escritórios?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Sim, a plataforma opera sob arquitetura multi-tenant estrita com isolamento lógico
                completo por organização (escritorio_id), políticas de acesso autenticado (RLS) e
                logs de auditoria de cada alteração de declaração.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="faq-3"
              className="border border-slate-800 bg-slate-950/80 rounded-xl px-4"
            >
              <AccordionTrigger className="text-sm font-bold text-white hover:text-emerald-400 hover:no-underline">
                O aplicativo substitui o programa oficial da Receita Federal (PGD/IRPF)?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Não. O aplicativo é uma ferramenta de apoio consultivo, simulação prévia,
                comparativo de modalidades e planejamento societário para contadores. Ele não
                substitui a transmissão oficial da declaração do IRPF nem dispensa a análise crítica
                do profissional contábil habilitado.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="faq-4"
              className="border border-slate-800 bg-slate-950/80 rounded-xl px-4"
            >
              <AccordionTrigger className="text-sm font-bold text-white hover:text-emerald-400 hover:no-underline">
                Como faço para assinar ou trocar de plano depois?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Dentro da área restrita do escritório em "/app/planos", você pode assinar qualquer
                um dos planos (Starter, Pro ou Enterprise) via Stripe com cartão ou PIX, além de
                gerenciar dados de cobrança e notas fiscais a qualquer momento pelo Customer Portal
                oficial do Stripe.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="faq-5"
              className="border border-slate-800 bg-slate-950/80 rounded-xl px-4"
            >
              <AccordionTrigger className="text-sm font-bold text-white hover:text-emerald-400 hover:no-underline">
                O que é o Assistente Tribby IA?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                O Tribby é nosso assistente de inteligência artificial nativo, treinado em
                instruções normativas, regras de dedutibilidade do IRPF, Simples Nacional, Lucro
                Presumido, Real e nos impactos da Reforma Tributária sobre o Consumo (IBS e CBS).
                Ele responde dúvidas operacionais e orienta cenários de cálculo em segundos.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL PRÉ-RODAPÉ */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 border-t border-slate-800 text-center">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold mb-4 px-3 py-1">
            Junte-se a contadores de todo o Brasil
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Pronto para transformar a prévia do IRPF em consultoria de alto valor?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Economize horas de cálculo manual, antecipe a declaração dos seus clientes e entregue
            relatórios com visual impecável.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/cadastro"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-xl shadow-emerald-950/70 transition-all hover:-translate-y-0.5"
            >
              <span>Criar escritório — teste grátis de 14 dias</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-base px-6 py-3.5 rounded-xl transition-all"
            >
              <span>Já possuo conta (Entrar)</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Coluna 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Inteligência Tributária IR</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Plataforma web multi-tenant para escritórios de contabilidade calcularem a prévia do
                IRPF e realizarem planejamento tributário de múltiplos clientes.
              </p>
              <p className="text-slate-400 text-[11px] font-mono">
                Produção: calculadora.goskip.app
              </p>
            </div>

            {/* Coluna 2 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Acesso Rápido
              </h4>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/cadastro" className="hover:text-emerald-400 transition-colors">
                    Criar escritório (14 dias grátis)
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-emerald-400 transition-colors">
                    Entrar na plataforma (/login)
                  </Link>
                </li>
                <li>
                  <a href="#planos" className="hover:text-emerald-400 transition-colors">
                    Tabela de planos e preços
                  </a>
                </li>
                <li>
                  <a href="#noticias-rfb" className="hover:text-emerald-400 transition-colors">
                    Feed de notícias da Receita Federal
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Módulos</h4>
              <ul className="space-y-1.5">
                <li>
                  <span className="text-slate-400">Prévia IRPF (Legal × Simplificado)</span>
                </li>
                <li>
                  <span className="text-slate-400">Módulo PJ (Simples, Presumido, Real)</span>
                </li>
                <li>
                  <span className="text-slate-400">Comparador de Regimes em R$</span>
                </li>
                <li>
                  <span className="text-slate-400">Planejador de Retiradas (Pró-labore/Lucro)</span>
                </li>
                <li>
                  <span className="text-slate-400">Assistente IA Nativo Tribby</span>
                </li>
              </ul>
            </div>

            {/* Coluna 4 - Aviso Legal */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aviso Legal</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Os cálculos, simulações e demonstrativos apresentados constituem estimativas e
                prévias para orientação gerencial, não substituindo a análise técnica profissional
                nem o preenchimento oficial nos programas da Receita Federal do Brasil. Valores e
                condições de planos podem sofrer ajustes conforme termos vigentes.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>
              © {new Date().getFullYear()} Inteligência Tributária IR. Todos os direitos reservados.
            </p>
            <p className="flex items-center gap-2">
              <span>Feito para contadores e consultores tributários</span>
              <span>•</span>
              <span className="font-mono">v0.0.111</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
