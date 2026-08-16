import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Upload } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import type { SimulacaoParams, CenarioSimulacaoRecord } from '@/types'

interface Props {
  params: SimulacaoParams
  onParamsChange: (p: SimulacaoParams) => void
  pgblLimit: number
  destinacaoLimit: number
  showMedicas: boolean
  showPensao: boolean
  onShowMedicasChange: (v: boolean) => void
  onShowPensaoChange: (v: boolean) => void
  isVisualizador: boolean
  cenarios: CenarioSimulacaoRecord[]
  onLoadCenario: (c: CenarioSimulacaoRecord) => void
  onSave: () => void
  onApply: () => void
  /** Oculta os botões Salvar/Aplicar (modo simulação do cliente). */
  hideActions?: boolean
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  hint?: string
  disabled?: boolean
}) {
  const clamp = (v: number) => Math.min(Math.max(min, isNaN(v) ? 0 : v), max)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-700">{label}</Label>
        {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={Math.max(max, min + 1)}
          step={step}
          onValueChange={(v) => onChange(v[0])}
          disabled={disabled}
          className="flex-1"
        />
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          disabled={disabled}
          className="w-24 h-8 text-xs"
        />
      </div>
    </div>
  )
}

export function SimulationControls({
  params,
  onParamsChange,
  pgblLimit,
  destinacaoLimit,
  showMedicas,
  showPensao,
  onShowMedicasChange,
  onShowPensaoChange,
  isVisualizador,
  cenarios,
  onLoadCenario,
  onSave,
  onApply,
  hideActions,
}: Props) {
  const set = (key: keyof SimulacaoParams, v: number) => onParamsChange({ ...params, [key]: v })
  const readOnly = !!hideActions || isVisualizador

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold">Ajuste os parâmetros e veja o impacto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cenarios.length > 0 && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
              Cenários salvos
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {cenarios.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onLoadCenario(c)}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <SliderInput
          label="Aporte adicional em Previdência Privada (PGBL)"
          value={params.pgbl_adicional}
          min={0}
          max={pgblLimit}
          step={1000}
          onChange={(v) => set('pgbl_adicional', v)}
          hint={`Limite disponível: ${formatCurrency(pgblLimit)}`}
          disabled={pgblLimit <= 0}
        />

        <SliderInput
          label="Destinação Crianças/Idosos/Hospital"
          value={params.destinacao}
          min={0}
          max={destinacaoLimit}
          step={1000}
          onChange={(v) => set('destinacao', v)}
          disabled={destinacaoLimit <= 0}
        />

        <SliderInput
          label="Número de dependentes"
          value={params.dependentes}
          min={0}
          max={10}
          step={1}
          onChange={(v) => set('dependentes', v)}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-slate-700">
              Considerar despesas médicas adicionais
            </Label>
            <Switch checked={showMedicas} onCheckedChange={onShowMedicasChange} />
          </div>
          {showMedicas && (
            <Input
              type="number"
              value={params.despesas_medicas || ''}
              step="0.01"
              placeholder="Valor em R$"
              onChange={(e) => set('despesas_medicas', Number(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-slate-700">
              Considerar pensão alimentícia
            </Label>
            <Switch checked={showPensao} onCheckedChange={onShowPensaoChange} />
          </div>
          {showPensao && (
            <Input
              type="number"
              value={params.pensao_alimenticia || ''}
              step="0.01"
              placeholder="Valor em R$"
              onChange={(e) => set('pensao_alimenticia', Number(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          )}
        </div>

        {hideActions ? (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Modo simulação — as alterações não são salvas na declaração.
            </p>
          </div>
        ) : (
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5"
              onClick={onSave}
              disabled={isVisualizador}
            >
              <Save className="w-3.5 h-3.5" />
              Salvar cenário
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onApply}
              disabled={isVisualizador}
            >
              <Upload className="w-3.5 h-3.5" />
              Aplicar à declaração
            </Button>
          </div>
        )}
        {/* readOnly mantido para referência futura de desabilitar sliders */}
        {readOnly ? null : null}
      </CardContent>
    </Card>
  )
}
