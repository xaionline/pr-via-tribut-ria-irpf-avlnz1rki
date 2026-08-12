import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getResultado, updateDeclaracao } from '@/services/declaracoes'
import { formatCurrency } from '@/lib/formatters'
import type { DeclaracaoRecord, ResultadoRecord } from '@/types'
import { TrendingDown, TrendingUp, DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TabVisaoGeralProps {
  declaracao: DeclaracaoRecord
  onRefresh: () => void
}

export default function TabVisaoGeral({ declaracao, onRefresh }: TabVisaoGeralProps) {
  const [resultado, setResultado] = useState<ResultadoRecord | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    getResultado(declaracao.id)
      .then((res) => setResultado(res))
      .catch(() => setResultado(null))
  }, [declaracao.id])

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateDeclaracao(declaracao.id, { status: newStatus as any })
      toast({ title: 'Status atualizado' })
      onRefresh()
    } catch {
      /* intentionally ignored */
    }
  }

  const isRestituicao = resultado && resultado.saldo_imposto < 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Status Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={declaracao.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="em_preenchimento">Em preenchimento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {declaracao.progresso}%
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${declaracao.progresso}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border ${
            isRestituicao ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5">
              {isRestituicao ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              )}
              <span>Resultado da Prévia</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                isRestituicao ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {resultado ? formatCurrency(Math.abs(resultado.saldo_imposto)) : 'R$ 0,00'}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              {resultado
                ? isRestituicao
                  ? 'Restituição a receber'
                  : 'Imposto a pagar'
                : 'Aguardando cálculo'}
            </p>
          </CardContent>
        </Card>
      </div>

      {resultado && (
        <Card className="border border-slate-200/80 shadow-subtle">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Detalhamento do Cálculo IRPF</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidação de receitas e deduções
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">Base de Cálculo</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.base_calculo)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">IRRF Devido</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.irrf_devido)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">IRRF Retido na Fonte</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.irrf_retido)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block">Destinações Aplicadas</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {formatCurrency(resultado.destinacoes_aplicadas)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
