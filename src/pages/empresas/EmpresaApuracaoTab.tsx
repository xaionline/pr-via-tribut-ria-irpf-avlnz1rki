import { useEffect, useState } from 'react'
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  Building,
  Info,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getApuracaoEmpresaCompleta, sincronizarDistribuicaoComIRPF } from '@/services/apuracaoPj'
import { upsertFaturamentoMes } from '@/services/empresas'
import { formatCurrency, maskCpf } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  EmpresaRecord,
  EmpresaFaturamentoRecord,
  EmpresaSocioRecord,
  ApuracaoSimplesAnual,
  ApuracaoPresumidoAnual,
  ApuracaoLucroRealAnual,
  DistribuicaoSocioResultado,
} from '@/types'

interface EmpresaApuracaoTabProps {
  empresa: EmpresaRecord
}

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function EmpresaApuracaoTab({ empresa }: EmpresaApuracaoTabProps) {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()
  const [ano, setAno] = useState<number>(2024)
  const [loading, setLoading] = useState(true)

  // Dados apurados
  const [faturamentos, setFaturamentos] = useState<EmpresaFaturamentoRecord[]>([])
  const [socios, setSocios] = useState<EmpresaSocioRecord[]>([])
  const [apuracaoSimples, setApuracaoSimples] = useState<ApuracaoSimplesAnual | null>(null)
  const [apuracaoPresumido, setApuracaoPresumido] = useState<ApuracaoPresumidoAnual | null>(null)
  const [apuracaoReal, setApuracaoReal] = useState<ApuracaoLucroRealAnual | null>(null)
  const [distribuicoes, setDistribuicoes] = useState<DistribuicaoSocioResultado[]>([])

  // Modal Lançamento de Faturamento e Dados Contábeis
  const [fatDialogOpen, setFatDialogOpen] = useState(false)
  const [fatMes, setFatMes] = useState<number>(1)
  const [fatReceita, setFatReceita] = useState<string>('')
  const [fatFolha, setFatFolha] = useState<string>('')
  const [fatLucroContabil, setFatLucroContabil] = useState<string>('')
  const [fatAdicoes, setFatAdicoes] = useState<string>('')
  const [fatExclusoes, setFatExclusoes] = useState<string>('')
  const [fatInsumos, setFatInsumos] = useState<string>('')
  const [fatOutrosCreditos, setFatOutrosCreditos] = useState<string>('')
  const [savingFat, setSavingFat] = useState(false)

  // Sincronização IRPF
  const [syncing, setSyncing] = useState(false)
  const [syncResultModal, setSyncResultModal] = useState<any | null>(null)

  const carregarApuracao = async () => {
    setLoading(true)
    try {
      const res = await getApuracaoEmpresaCompleta(empresa.id, ano)
      setFaturamentos(res.faturamentos)
      setSocios(res.socios)
      setApuracaoSimples(res.apuracaoSimples)
      setApuracaoPresumido(res.apuracaoPresumido)
      setApuracaoReal(res.apuracaoReal)
      setDistribuicoes(res.distribuicoes)
    } catch (err) {
      toast({
        title: 'Falha ao processar apuração',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarApuracao()
  }, [empresa.id, ano])

  const handleOpenFatMes = (mesNum: number) => {
    setFatMes(mesNum)
    const existing = faturamentos.find((f) => f.ano_calendario === ano && f.mes === mesNum)
    setFatReceita(existing ? String(existing.receita_bruta) : '')
    setFatFolha(existing && existing.folha !== undefined ? String(existing.folha) : '')
    setFatLucroContabil(
      existing && existing.lucro_contabil !== undefined ? String(existing.lucro_contabil) : '',
    )
    setFatAdicoes(
      existing && existing.adicoes_lalur !== undefined ? String(existing.adicoes_lalur) : '',
    )
    setFatExclusoes(
      existing && existing.exclusoes_lalur !== undefined ? String(existing.exclusoes_lalur) : '',
    )
    setFatInsumos(
      existing && existing.compras_insumos !== undefined ? String(existing.compras_insumos) : '',
    )
    setFatOutrosCreditos(
      existing && existing.outros_creditos_pis_cofins !== undefined
        ? String(existing.outros_creditos_pis_cofins)
        : '',
    )
    setFatDialogOpen(true)
  }

  const handleSaveFaturamento = async (e: React.FormEvent) => {
    e.preventDefault()
    const recNum = parseFloat(fatReceita.replace(',', '.')) || 0
    const folhaNum = parseFloat(fatFolha.replace(',', '.')) || 0
    const lcNum = parseFloat(fatLucroContabil.replace(',', '.')) || 0
    const adicNum = parseFloat(fatAdicoes.replace(',', '.')) || 0
    const exclNum = parseFloat(fatExclusoes.replace(',', '.')) || 0
    const insNum = parseFloat(fatInsumos.replace(',', '.')) || 0
    const outrosCredNum = parseFloat(fatOutrosCreditos.replace(',', '.')) || 0

    setSavingFat(true)
    try {
      await upsertFaturamentoMes(
        empresa.id,
        ano,
        fatMes,
        recNum,
        folhaNum,
        lcNum,
        adicNum,
        exclNum,
        insNum,
        outrosCredNum,
      )
      toast({
        title: `Faturamento e lançamentos de ${MESES_NOMES[fatMes - 1]}/${ano} atualizados!`,
      })
      setFatDialogOpen(false)
      await carregarApuracao()
    } catch (err) {
      toast({
        title: 'Erro ao salvar faturamento',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingFat(false)
    }
  }

  const handleSincronizarIRPF = async () => {
    if (distribuicoes.length === 0) {
      toast({
        title: 'Nenhum sócio vinculado',
        description: 'Vincule ao menos um sócio na aba "Sócios" para distribuir.',
        variant: 'destructive',
      })
      return
    }

    setSyncing(true)
    try {
      const res = await sincronizarDistribuicaoComIRPF(empresa, ano, distribuicoes)
      setSyncResultModal(res)
      toast({
        title: 'Distribuição sincronizada com sucesso no IRPF!',
        description: `${res.rendimentos_criados} rendimentos gerados para ${res.total_socios_atualizados} sócio(s).`,
      })
    } catch (err) {
      toast({
        title: 'Falha na sincronização com o IRPF',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Controle de Ano e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-xl shadow-subtle">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Ano-Calendário de Apuração
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger className="w-32 h-8 text-xs font-bold font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs font-mono">
                      Ano {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                variant="outline"
                className="text-xs capitalize font-semibold bg-blue-50 text-blue-700 border-blue-200"
              >
                Regime:{' '}
                {empresa.regime === 'simples'
                  ? `Simples Nacional (Anexo ${empresa.anexo_simples || 'III'})`
                  : empresa.regime === 'presumido'
                    ? 'Lucro Presumido'
                    : 'Lucro Real (Não-Cumulativo)'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarApuracao}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recalcular
          </Button>
          <Button
            size="sm"
            onClick={handleSincronizarIRPF}
            disabled={syncing || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Distribuir ao IRPF dos Sócios
          </Button>
        </div>
      </div>

      {/* Cards de KPIs da Apuração */}
      {empresa.regime === 'simples' && apuracaoSimples && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Receita Bruta Anual
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(apuracaoSimples.receita_bruta_anual)}
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Total DAS Simples
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">
              {formatCurrency(apuracaoSimples.total_das)}
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Alíquota Média Efetiva
            </span>
            <div className="text-xl font-bold font-mono text-blue-700 mt-1">
              {apuracaoSimples.aliquota_efetiva_media.toFixed(2)}%
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-emerald-50/50 border-emerald-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase">
              Lucro Distribuível Estimado
            </span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {formatCurrency(apuracaoSimples.lucro_distribuivel)}
            </div>
          </Card>
        </div>
      )}

      {empresa.regime === 'presumido' && apuracaoPresumido && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Receita Bruta Anual
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(apuracaoPresumido.receita_bruta_anual)}
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Total Tributos PJ
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">
              {formatCurrency(apuracaoPresumido.total_tributos_pj)}
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Carga Tributária Efetiva
            </span>
            <div className="text-xl font-bold font-mono text-indigo-700 mt-1">
              {apuracaoPresumido.aliquota_efetiva_anual.toFixed(2)}%
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-emerald-50/50 border-emerald-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase">
              Lucro Isento Máximo
            </span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {formatCurrency(apuracaoPresumido.lucro_presumido_isento_maximo)}
            </div>
          </Card>
        </div>
      )}

      {empresa.regime === 'real' && apuracaoReal && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Receita Bruta Anual
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(apuracaoReal.receita_bruta_anual)}
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Total Tributos PJ
            </span>
            <div className="text-xl font-bold font-mono text-rose-600 mt-1">
              {formatCurrency(apuracaoReal.total_tributos_pj)}
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-white shadow-subtle">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Carga Efetiva Real
            </span>
            <div className="text-xl font-bold font-mono text-purple-700 mt-1">
              {apuracaoReal.aliquota_efetiva_anual.toFixed(2)}%
            </div>
          </Card>
          <Card className="p-4 border-slate-200/80 bg-emerald-50/50 border-emerald-200 shadow-subtle">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase">
              Lucro Líquido Distribuível
            </span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {formatCurrency(apuracaoReal.lucro_distribuivel)}
            </div>
          </Card>
        </div>
      )}

      {/* Tabela Demonstrativa Mês a Mês (Simples Nacional) */}
      {empresa.regime === 'simples' && apuracaoSimples && (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Demonstrativo Mensal — Simples Nacional (LC 123/2006)
              </h3>
              <p className="text-xs text-slate-500">
                Cálculo do RBT12, enquadramento de faixa, alíquota efetiva e guia DAS.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-2.5 px-3">Mês</th>
                  <th className="py-2.5 px-3 text-right">Receita Bruta</th>
                  <th className="py-2.5 px-3 text-right">Folha Salários</th>
                  <th className="py-2.5 px-3 text-right">RBT12</th>
                  <th className="py-2.5 px-3 text-center">Faixa / Anexo</th>
                  <th className="py-2.5 px-3 text-right">Alíq. Nominal</th>
                  <th className="py-2.5 px-3 text-right">Alíq. Efetiva</th>
                  <th className="py-2.5 px-3 text-right">DAS Devido</th>
                  <th className="py-2.5 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {apuracaoSimples.meses.map((m) => (
                  <tr key={m.mes} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                      {MESES_NOMES[m.mes - 1]}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(m.receita_bruta)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {formatCurrency(m.folha)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {formatCurrency(m.rbt12)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <Badge variant="outline" className="text-[10px] bg-slate-50">
                        {m.faixa}ª Faixa ({m.anexo_aplicado})
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {m.aliquota_nominal.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                      {m.aliquota_efetiva.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {formatCurrency(m.valor_das)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenFatMes(m.mes)}
                        className="h-7 text-[11px] text-blue-600 hover:text-blue-800"
                      >
                        Lançar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tabela Demonstrativa Trimestral (Lucro Presumido) */}
      {empresa.regime === 'presumido' && apuracaoPresumido && (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Demonstrativo Trimestral — Lucro Presumido (IRPJ, CSLL, PIS, COFINS, ISS)
            </h3>
            <p className="text-xs text-slate-500">
              Cálculo das bases de presunção, IRPJ Básico + Adicional de 10% e contribuições
              federais/municipais.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-2.5 px-3">Trimestre</th>
                  <th className="py-2.5 px-3 text-right">Receita Trimestre</th>
                  <th className="py-2.5 px-3 text-right">Base IRPJ</th>
                  <th className="py-2.5 px-3 text-right">IRPJ Devido</th>
                  <th className="py-2.5 px-3 text-right">CSLL (9%)</th>
                  <th className="py-2.5 px-3 text-right">PIS/COFINS (3.65%)</th>
                  <th className="py-2.5 px-3 text-right">ISS</th>
                  <th className="py-2.5 px-3 text-right">Total Tributos</th>
                  <th className="py-2.5 px-3 text-right">Alíq. Efetiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {apuracaoPresumido.trimestres.map((t) => (
                  <tr key={t.trimestre} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                      {t.trimestre}º Trimestre
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(t.receita_bruta)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {formatCurrency(t.base_calculo_irpj)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                      {formatCurrency(t.irpj_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600">
                      {formatCurrency(t.csll_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600">
                      {formatCurrency(t.pis_total + t.cofins_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700">
                      {formatCurrency(t.iss_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                      {formatCurrency(t.total_tributos_trimestre)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                      {t.aliquota_efetiva_trimestre.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tabela Demonstrativa Trimestral (Lucro Real) */}
      {empresa.regime === 'real' && apuracaoReal && (
        <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Demonstrativo Trimestral — Lucro Real (LALUR, PIS/COFINS Não-Cumulativos com Créditos)
            </h3>
            <p className="text-xs text-slate-500">
              Cálculo com base no Lucro Contábil ajustado (adições/exclusões), créditos sobre
              insumos e tributação efetiva.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-2.5 px-3">Trimestre</th>
                  <th className="py-2.5 px-3 text-right">Receita Bruta</th>
                  <th className="py-2.5 px-3 text-right">Lucro Real (LALUR)</th>
                  <th className="py-2.5 px-3 text-right">IRPJ Devido</th>
                  <th className="py-2.5 px-3 text-right">CSLL (9%)</th>
                  <th className="py-2.5 px-3 text-right">PIS Líquido</th>
                  <th className="py-2.5 px-3 text-right">COFINS Líquido</th>
                  <th className="py-2.5 px-3 text-right">Total Tributos</th>
                  <th className="py-2.5 px-3 text-right">Alíq. Efetiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {apuracaoReal.trimestres.map((t) => (
                  <tr key={t.trimestre} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                      {t.trimestre}º Trimestre
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(t.receita_bruta)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                      {formatCurrency(t.lucro_real_base)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                      {formatCurrency(t.irpj_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600">
                      {formatCurrency(t.csll_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-700">
                      {formatCurrency(t.pis_liquido)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-700">
                      {formatCurrency(t.cofins_liquido)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                      {formatCurrency(t.total_tributos_trimestre)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                      {t.aliquota_efetiva_trimestre.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lançamento Rápido dos Faturamentos Mensais */}
      <Card className="p-4 border border-slate-200/80 shadow-subtle">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Faturamento Mensal da Empresa ({ano})
          </h4>
          <span className="text-xs text-slate-500">Clique no mês para alterar valores</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mesNum) => {
            const fat = faturamentos.find((f) => f.ano_calendario === ano && f.mes === mesNum)
            const valor = fat ? Number(fat.receita_bruta) : 0
            return (
              <button
                key={mesNum}
                onClick={() => handleOpenFatMes(mesNum)}
                className="p-2.5 rounded-lg border text-left transition-colors bg-white hover:border-blue-300 hover:bg-blue-50/40"
              >
                <div className="text-[10px] font-semibold text-slate-400 uppercase">
                  {MESES_NOMES[mesNum - 1]}
                </div>
                <div className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                  {formatCurrency(valor)}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Seção de Distribuição para Sócios PF */}
      <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Distribuição Proporcional aos Sócios (Vínculo PJ ↔ PF)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Pró-labore lançado como <strong>Tributável</strong>, Lucros como{' '}
              <strong>Isentos e Dividendos</strong> (alimentando a base de Altas Rendas) e JCP como{' '}
              <strong>Exclusiva</strong> no IRPF.
            </p>
          </div>

          <Button
            onClick={handleSincronizarIRPF}
            disabled={syncing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Sincronizar com Declarações IRPF
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                <th className="py-3 px-4">Sócio PF</th>
                <th className="py-3 px-4 text-center">Cota</th>
                <th className="py-3 px-4 text-right">Pró-Labore Anual (Tributável)</th>
                <th className="py-3 px-4 text-right">Lucros / Dividendos (Isento)</th>
                <th className="py-3 px-4 text-right">JCP (Exclusiva)</th>
                <th className="py-3 px-4 text-right">Base IRPF-M (Altas Rendas)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {distribuicoes.map((d) => (
                <tr key={d.socio_id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-sans">
                    <span className="font-bold text-slate-900 block">{d.cliente_nome}</span>
                    <span className="text-[11px] font-mono text-slate-500">{maskCpf(d.cpf)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-800 border-blue-200 font-bold"
                    >
                      {d.percentual.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">
                    {formatCurrency(d.pro_labore_anual)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">
                    {formatCurrency(d.lucros_distribuidos)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {formatCurrency(d.jcp_distribuido)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-indigo-700">
                    {formatCurrency(d.dividendos_altas_rendas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Faturamento Mês & Lançamentos Contábeis / Créditos */}
      <Dialog open={fatDialogOpen} onOpenChange={setFatDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveFaturamento}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Calculator className="w-5 h-5 text-blue-600" />
                Lançar Faturamento & Contabilidade — {MESES_NOMES[fatMes - 1]}/{ano}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Informe os valores mensais de faturamento, folha, lucro contábil e insumos geradores
                de crédito.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fat-rec" className="text-xs font-semibold text-slate-700">
                    Receita Bruta do Mês (R$) *
                  </Label>
                  <Input
                    id="fat-rec"
                    type="number"
                    step="0.01"
                    value={fatReceita}
                    onChange={(e) => setFatReceita(e.target.value)}
                    placeholder="0,00"
                    className="h-10 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fat-folha" className="text-xs font-semibold text-slate-700">
                    Folha de Pagamento / Salários (R$)
                  </Label>
                  <Input
                    id="fat-folha"
                    type="number"
                    step="0.01"
                    value={fatFolha}
                    onChange={(e) => setFatFolha(e.target.value)}
                    placeholder="0,00"
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Bloco Lucro Real: Lucro Contábil, LALUR e Créditos */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Parâmetros para Lucro Real & Não-Cumulativo
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fat-lc" className="text-xs font-semibold text-slate-700">
                    Lucro Líquido Contábil Antes dos Tributos (R$)
                  </Label>
                  <Input
                    id="fat-lc"
                    type="number"
                    step="0.01"
                    value={fatLucroContabil}
                    onChange={(e) => setFatLucroContabil(e.target.value)}
                    placeholder="Deixe em branco para estimativa automática"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fat-adic" className="text-xs font-semibold text-slate-700">
                      Adições LALUR (R$)
                    </Label>
                    <Input
                      id="fat-adic"
                      type="number"
                      step="0.01"
                      value={fatAdicoes}
                      onChange={(e) => setFatAdicoes(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fat-excl" className="text-xs font-semibold text-slate-700">
                      Exclusões LALUR (R$)
                    </Label>
                    <Input
                      id="fat-excl"
                      type="number"
                      step="0.01"
                      value={fatExclusoes}
                      onChange={(e) => setFatExclusoes(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fat-ins" className="text-xs font-semibold text-slate-700">
                      Compras de Insumos (R$)
                    </Label>
                    <Input
                      id="fat-ins"
                      type="number"
                      step="0.01"
                      value={fatInsumos}
                      onChange={(e) => setFatInsumos(e.target.value)}
                      placeholder="0,00 (Gera crédito PIS/COFINS)"
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="fat-outros-cred"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Outros Créditos PIS/COFINS (R$)
                    </Label>
                    <Input
                      id="fat-outros-cred"
                      type="number"
                      step="0.01"
                      value={fatOutrosCreditos}
                      onChange={(e) => setFatOutrosCreditos(e.target.value)}
                      placeholder="0,00 (Energia, aluguel PJ, etc)"
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFatDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                disabled={savingFat}
              >
                {savingFat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar Lançamentos
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso da Sincronização com IRPF */}
      <Dialog open={!!syncResultModal} onOpenChange={(o) => !o && setSyncResultModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Sincronização Concluída!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Os rendimentos foram integrados diretamente nas declarações IRPF dos sócios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1 text-emerald-900">
              <p>
                <strong>Total de sócios atualizados:</strong>{' '}
                {syncResultModal?.total_socios_atualizados}
              </p>
              <p>
                <strong>Rendimentos lançados:</strong> {syncResultModal?.rendimentos_criados}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800">Detalhamento por Sócio:</span>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {syncResultModal?.detalhes?.map((item: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border text-xs space-y-1">
                    <div className="font-semibold text-slate-800">{item.socio_nome}</div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Pró-Labore: {formatCurrency(item.pro_labore)}</span>
                      <span className="font-semibold text-emerald-700">
                        Lucros: {formatCurrency(item.lucros)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => setSyncResultModal(null)}
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
