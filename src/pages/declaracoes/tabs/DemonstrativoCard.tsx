import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, RefreshCw, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

interface DemonstrativoCardProps {
  detalhamento: any
  modalidade: string
  onTrocar: () => void
  isVisualizador: boolean
}

export function DemonstrativoCard({
  detalhamento,
  modalidade,
  onTrocar,
  isVisualizador,
}: DemonstrativoCardProps) {
  const demo = detalhamento?.demonstrativo
  const chosen = modalidade === 'simplificada' ? detalhamento?.simplificada : detalhamento?.legal
  const rendTrib = demo?.rendimento_tributavel ?? detalhamento?.rendimento_tributavel ?? 0
  const deducoes = demo?.deducoes ?? chosen?.total_deducoes ?? 0
  const baseCalc = demo?.base_calculo ?? chosen?.base_calculo ?? 0
  const irrfDevido = demo?.irrf_devido ?? chosen?.irrf_devido ?? 0
  const irrfRetido = demo?.irrf_retido ?? chosen?.irrf_retido ?? 0
  const destinacoes = demo?.destinacoes_aplicadas ?? chosen?.destinacoes_aplicadas ?? 0
  const saldo = demo?.saldo_imposto ?? chosen?.saldo_imposto ?? 0
  const isRestituicao = saldo < 0

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-600" />
              Demonstrativo Final
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Demonstrativo consolidado da modalidade escolhida
            </CardDescription>
          </div>
          <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[10px] capitalize">
            {modalidade === 'legal' ? 'Legal' : 'Simplificada'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">
        <Row label="Rendimentos tributáveis" value={formatCurrency(rendTrib)} />
        <Row label="(−) Deduções" value={formatCurrency(deducoes)} muted />
        <Divider />
        <Row label="Base de cálculo" value={formatCurrency(baseCalc)} bold />
        <Divider />
        <Row label="Imposto devido (IRRF)" value={formatCurrency(irrfDevido)} />
        <Row label="(−) IRRF retido na fonte" value={formatCurrency(irrfRetido)} muted />
        <Row label="(−) Destinações aplicadas" value={formatCurrency(destinacoes)} muted />
        <Divider />
        <div className="flex justify-between items-center pt-2">
          <span
            className={`font-bold flex items-center gap-1 ${isRestituicao ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {isRestituicao ? 'Restituição a receber' : 'Imposto a pagar'}
          </span>
          <span
            className={`font-mono font-bold text-lg ${isRestituicao ? 'text-emerald-700' : 'text-rose-700'}`}
          >
            {formatCurrency(Math.abs(saldo))}
          </span>
        </div>
        {!isVisualizador && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={onTrocar}>
              <RefreshCw className="w-3.5 h-3.5" />
              Trocar modalidade
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex justify-between py-0.5">
      <span className={muted ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
      <span
        className={`font-mono ${bold ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}
      >
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-dashed border-slate-200 my-1.5" />
}
