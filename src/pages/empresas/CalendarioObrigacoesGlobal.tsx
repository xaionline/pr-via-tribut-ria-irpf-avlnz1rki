import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Building2,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { getAllEmpresas } from '@/services/empresas'
import {
  getAllObrigacoesEscritorio,
  calcularResumoObrigacoes,
  REGRAS_OBRIGACOES,
} from '@/services/obrigacoes'
import { formatDate, maskCnpj } from '@/lib/formatters'
import type {
  EmpresaRecord,
  ObrigacaoAcessoriaComStatus,
  ResumoObrigacoesAno,
  TipoObrigacaoAcessoria,
} from '@/types'

export default function CalendarioObrigacoesGlobal() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoAcessoriaComStatus[]>([])
  const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear())

  const [busca, setBusca] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [empList, obList] = await Promise.all([
        getAllEmpresas(),
        getAllObrigacoesEscritorio(selectedAno),
      ])
      setEmpresas(empList)
      setObrigacoes(obList)
    } catch (err) {
      toast({
        title: 'Erro ao carregar calendário de obrigações',
        description: 'Não foi possível carregar as informações do escritório.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [selectedAno])

  // Resumo Geral
  const resumoGeral = React.useMemo(() => {
    return calcularResumoObrigacoes(obrigacoes)
  }, [obrigacoes])

  // Filtragem
  const obrigacoesFiltradas = React.useMemo(() => {
    return obrigacoes.filter((o) => {
      const empNome = o.expand?.empresa_id?.razao_social || ''
      const empCnpj = o.expand?.empresa_id?.cnpj || ''

      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const matchNome = empNome.toLowerCase().includes(termo)
        const matchCnpj = empCnpj.includes(termo)
        const matchTipo = o.tipo.toLowerCase().includes(termo)
        const matchComp = o.competencia.toLowerCase().includes(termo)
        if (!matchNome && !matchCnpj && !matchTipo && !matchComp) return false
      }

      if (filtroEmpresa !== 'todas' && o.empresa_id !== filtroEmpresa) return false
      if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) return false

      if (filtroStatus === 'atrasado' && o.statusCalculado !== 'atrasado') return false
      if (
        filtroStatus === 'proximo' &&
        o.statusCalculado !== 'vence_hoje' &&
        o.statusCalculado !== 'vence_em_breve'
      )
        return false
      if (filtroStatus === 'em_dia' && o.statusCalculado !== 'em_dia') return false
      if (filtroStatus === 'entregue' && o.status !== 'entregue') return false

      return true
    })
  }, [obrigacoes, busca, filtroEmpresa, filtroTipo, filtroStatus])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            Painel Geral de Obrigações Acessórias (PJ)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle unificado de entregas de <strong>DAS, DCTF, EFD-Reinf, ECD e ECF</strong> de
            todas as empresas clientes do escritório contábil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
            <span className="text-xs text-slate-500 font-semibold">Exercício:</span>
            <select
              value={selectedAno}
              onChange={(e) => setSelectedAno(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 border-0 focus:outline-hidden cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* BANNER KPIS CONSOLIDADOS DO ESCRITÓRIO */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Entregues
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-white">{resumoGeral.entregues}</span>
              <span className="text-[10px] text-slate-400">de {resumoGeral.total}</span>
            </div>
          </div>

          <div
            className={`rounded-xl p-3 flex flex-col justify-between border-2 ${
              resumoGeral.atrasadas > 0
                ? 'bg-rose-950/80 border-rose-500 shadow-md animate-pulse'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-rose-500" /> Atrasadas
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-2xl font-black ${resumoGeral.atrasadas > 0 ? 'text-rose-300' : 'text-white'}`}
              >
                {resumoGeral.atrasadas}
              </span>
              <span className="text-[10px] text-rose-300/80">Risco Crítico</span>
            </div>
          </div>

          <div
            className={`rounded-xl p-3 flex flex-col justify-between border ${
              resumoGeral.venceHoje > 0 || resumoGeral.venceEmBreve > 0
                ? 'bg-amber-950/60 border-amber-500'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Próx. Vencimento
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-300">
                {resumoGeral.venceHoje + resumoGeral.venceEmBreve}
              </span>
              <span className="text-[10px] text-amber-400/80">
                {resumoGeral.venceHoje > 0 ? `${resumoGeral.venceHoje} HOJE` : 'Próx. 15d'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Em Dia / Futuras
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-white">{resumoGeral.emDia}</span>
              <span className="text-[10px] text-slate-400">Prazos ok</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Taxa Geral
            </span>
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-emerald-400">
                  {resumoGeral.taxaConformidade}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {resumoGeral.entregues}/{resumoGeral.total}
                </span>
              </div>
              <Progress value={resumoGeral.taxaConformidade} className="h-1.5 bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar por empresa, CNPJ, obrigação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filtros em Linha */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Empresa */}
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="h-9 text-xs w-[180px]">
              <SelectValue placeholder="Todas Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Empresas</SelectItem>
              {empresas.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Tipo */}
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="DAS">DAS</SelectItem>
              <SelectItem value="DCTF">DCTF</SelectItem>
              <SelectItem value="EFD_REINF">EFD-Reinf</SelectItem>
              <SelectItem value="ECD">ECD</SelectItem>
              <SelectItem value="ECF">ECF</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Status */}
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 text-xs w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="atrasado">🔴 Atrasados</SelectItem>
              <SelectItem value="proximo">🟡 Próximos</SelectItem>
              <SelectItem value="em_dia">🔵 Em dia</SelectItem>
              <SelectItem value="entregue">🟢 Entregues</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LISTA CONSOLIDADA DE OBRIGAÇÕES */}
      <div className="space-y-3">
        {obrigacoesFiltradas.length === 0 ? (
          <Card className="p-10 text-center border-dashed border-slate-300">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800">Nenhuma obrigação acessória localizada</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Selecione outro filtro ou acesse o detalhe de uma empresa para gerar o calendário
              automático de competências.
            </p>
          </Card>
        ) : (
          obrigacoesFiltradas.map((obrigacao) => {
            const emp = obrigacao.expand?.empresa_id
            const isEntregue = obrigacao.status === 'entregue'
            const isAtrasado = obrigacao.statusCalculado === 'atrasado'
            const isHoje = obrigacao.statusCalculado === 'vence_hoje'

            return (
              <div
                key={obrigacao.id}
                className={`p-4 rounded-xl border-2 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isEntregue
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : isAtrasado
                      ? 'bg-rose-50/90 border-rose-400'
                      : isHoje
                        ? 'bg-red-50/90 border-red-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      {emp?.razao_social || 'Empresa PJ'}
                    </span>

                    {emp?.cnpj && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono text-slate-500 bg-white"
                      >
                        {maskCnpj(emp.cnpj)}
                      </Badge>
                    )}

                    <Badge
                      className={`text-xs font-black px-2 py-0.5 border-0 ${
                        obrigacao.tipo === 'DAS'
                          ? 'bg-blue-600 text-white'
                          : obrigacao.tipo === 'DCTF'
                            ? 'bg-indigo-600 text-white'
                            : obrigacao.tipo === 'EFD_REINF'
                              ? 'bg-teal-600 text-white'
                              : 'bg-purple-600 text-white'
                      }`}
                    >
                      {obrigacao.tipo}
                    </Badge>

                    <Badge variant="outline" className="text-xs font-mono bg-white">
                      {obrigacao.competencia}
                    </Badge>

                    <Badge
                      className={`text-xs px-2 py-0.5 border-0 font-bold ${obrigacao.urgenciaBadge.cor}`}
                    >
                      {obrigacao.urgenciaBadge.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600">{obrigacao.nome}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-0.5">
                    <span>
                      Vencimento:{' '}
                      <strong className="text-slate-800">
                        {formatDate(obrigacao.data_vencimento)}
                      </strong>
                    </span>

                    {obrigacao.data_entrega && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Entregue em:{' '}
                        {formatDate(obrigacao.data_entrega)}
                      </span>
                    )}

                    {obrigacao.codigo_recibo && (
                      <span className="font-mono text-slate-600">
                        Recibo: <strong>{obrigacao.codigo_recibo}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/app/empresas/${obrigacao.empresa_id}/obrigacoes?ano=${selectedAno}`,
                      )
                    }
                    className="text-xs h-8 gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    <span>Abrir Empresa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
