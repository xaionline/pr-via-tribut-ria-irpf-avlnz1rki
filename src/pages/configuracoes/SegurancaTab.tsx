import { useState } from 'react'
import {
  ShieldCheck,
  KeyRound,
  Database,
  Lock,
  FileText,
  Download,
  Trash2,
  Loader2,
  Search,
  CalendarClock,
  HardDriveDownload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  atualizarEscritorio,
  exportarDadosTitular,
  solicitarExclusaoTitular,
  solicitarRelatorioRetencao,
} from '@/services/configuracoes'
import { formatDateTime, formatDate, maskCpf } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { LgpdExportacaoDTO, RetencaoRelatorioDTO } from '@/services/configuracoes'

export function SegurancaTab() {
  const { escritorio, user } = useAuth()
  const { toast } = useToast()
  const escId = escritorio?.id || user?.escritorio_id || ''

  const [inatividade, setInatividade] = useState(String(escritorio?.sessao_inatividade_min || 30))
  const [salvandoSessao, setSalvandoSessao] = useState(false)

  const ultimaRevisao = escritorio?.ultima_revisao_politicas
  const ultimoBackup = escritorio?.ultimo_backup_status || 'Concluído em 14/08/2026 às 03:00'

  // Relatório de retenção
  const [relatorio, setRelatorio] = useState<RetencaoRelatorioDTO | null>(null)
  const [relatorioOpen, setRelatorioOpen] = useState(false)
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false)

  // Exportação LGPD
  const [exportOpen, setExportOpen] = useState(false)
  const [cpfBusca, setCpfBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultadoExport, setResultadoExport] = useState<LgpdExportacaoDTO | null>(null)

  // Exclusão LGPD
  const [exclusaoOpen, setExclusaoOpen] = useState(false)
  const [cpfExclusao, setCpfExclusao] = useState('')
  const [excluindo, setExcluindo] = useState(false)

  const salvarInatividade = async (valor: string) => {
    if (!escId) return
    setSalvandoSessao(true)
    try {
      await atualizarEscritorio(escId, { sessao_inatividade_min: Number(valor) })
      setInatividade(valor)
      toast({ title: 'Configurações salvas' })
    } catch (err) {
      toast({
        title: 'Falha ao salvar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSalvandoSessao(false)
    }
  }

  const gerarRelatorio = async () => {
    setGerandoRelatorio(true)
    try {
      const res = await solicitarRelatorioRetencao()
      setRelatorio(res)
      setRelatorioOpen(true)
      toast({ title: 'Relatório de retenção gerado' })
    } catch (err) {
      toast({
        title: 'Falha ao gerar relatório',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setGerandoRelatorio(false)
    }
  }

  const buscarTitular = async () => {
    const cpf = cpfBusca.replace(/\D/g, '')
    if (cpf.length !== 11) {
      toast({ title: 'CPF inválido', variant: 'destructive' })
      return
    }
    setBuscando(true)
    setResultadoExport(null)
    try {
      const res = await exportarDadosTitular(cpf)
      setResultadoExport(res)
      if (!res.encontrado) {
        toast({ title: 'Titular não encontrado' })
      }
    } catch (err) {
      toast({
        title: 'Falha ao exportar dados',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setBuscando(false)
    }
  }

  const confirmarExclusao = async () => {
    const cpf = cpfExclusao.replace(/\D/g, '')
    if (cpf.length !== 11) {
      toast({ title: 'CPF inválido', variant: 'destructive' })
      return
    }
    setExcluindo(true)
    try {
      await solicitarExclusaoTitular(cpf)
      toast({ title: 'Exclusão processada', description: 'Dados do titular anonimizados.' })
      setExclusaoOpen(false)
      setCpfExclusao('')
    } catch (err) {
      toast({
        title: 'Falha ao processar exclusão',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  const abrirExport = () => {
    setCpfBusca('')
    setResultadoExport(null)
    setExportOpen(true)
  }

  const abrirExclusao = () => {
    setCpfExclusao('')
    setExclusaoOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Autenticação */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <SectionHeader icon={KeyRound} title="Autenticação" />
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem label="Autenticação em dois fatores (2FA)">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px] bg-slate-50 text-slate-600 border-slate-200"
                >
                  Recurso disponível
                </Badge>
                <span className="text-[11px] text-slate-500">Configurável por usuário</span>
              </div>
            </InfoItem>
            <InfoItem label="Tempo de inatividade da sessão">
              <Select
                value={inatividade}
                onValueChange={(v) => salvarInatividade(v)}
                disabled={salvandoSessao}
              >
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
            </InfoItem>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-2">Política de senha</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Mínimo de 12 caracteres',
                'Letra maiúscula',
                'Letra minúscula',
                'Número',
                'Caractere especial',
              ].map((req) => (
                <Badge
                  key={req}
                  variant="outline"
                  className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 gap-1"
                >
                  <Lock className="w-3 h-3" />
                  {req}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Política aplicada automaticamente — somente leitura.
            </p>
          </div>
        </div>
      </Card>

      {/* Retenção de Dados */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <SectionHeader icon={Database} title="Retenção de Dados" />
        <div className="space-y-3 mt-4">
          <RetentionRow label="Declarações" value="Período de retenção: 5 anos" />
          <RetentionRow
            label="Clientes inativos"
            value="Arquivamento após 2 anos e exclusão após 5 anos"
          />
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={gerarRelatorio}
              disabled={gerandoRelatorio}
            >
              {gerandoRelatorio ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              Solicitar relatório de retenção
            </Button>
          </div>
        </div>
      </Card>

      {/* Conformidade LGPD */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <SectionHeader icon={ShieldCheck} title="Conformidade LGPD" />
        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Conformidade ativa
              </Badge>
              <span className="text-[11px] text-slate-500">
                Última revisão de políticas: {formatDate(ultimaRevisao) || '10/01/2026'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={abrirExport}>
                <Download className="w-3.5 h-3.5" />
                Exportar dados de titular
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={abrirExclusao}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Solicitar exclusão de titular
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Backup */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <SectionHeader icon={HardDriveDownload} title="Backup" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <InfoItem label="Frequência">
            <span className="text-xs text-slate-700">Diário</span>
          </InfoItem>
          <InfoItem label="RPO (Objetivo de Recuperação)">
            <span className="text-xs text-slate-700">24h</span>
          </InfoItem>
          <InfoItem label="RTO (Tempo de Recuperação)">
            <span className="text-xs text-slate-700">4h</span>
          </InfoItem>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-600">Status do último backup:</span>
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            {ultimoBackup}
          </Badge>
        </div>
      </Card>

      {/* Modal relatório de retenção */}
      <Dialog open={relatorioOpen} onOpenChange={setRelatorioOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Relatório de retenção
            </DialogTitle>
            <DialogDescription>
              Itens elegíveis conforme a política de retenção do escritório.
            </DialogDescription>
          </DialogHeader>
          {relatorio && (
            <div className="space-y-4 py-2">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Gerado em {formatDateTime(relatorio.gerado_em)}
              </div>

              <RelatorioBloco
                titulo="Declarações elegíveis para descarte"
                descricao="Ano-calendário anterior ao período de retenção (5 anos)."
                itens={relatorio.declaracoes_elegiveis.map((d) => ({
                  id: d.id,
                  principal: `Ano ${d.ano_calendario}`,
                  secundario: `Status: ${d.status}`,
                }))}
              />

              <RelatorioBloco
                titulo="Clientes a arquivar"
                descricao="Inativos há mais de 2 anos."
                itens={relatorio.clientes_arquivar.map((c) => ({
                  id: c.id,
                  principal: c.nome,
                  secundario: maskCpf(c.cpf),
                }))}
              />

              <RelatorioBloco
                titulo="Clientes elegíveis para exclusão"
                descricao="Inativos há mais de 5 anos."
                itens={relatorio.clientes_excluir.map((c) => ({
                  id: c.id,
                  principal: c.nome,
                  secundario: maskCpf(c.cpf),
                }))}
              />
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setRelatorioOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal exportar dados titular */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Exportar dados pessoais
            </DialogTitle>
            <DialogDescription>
              Busque um titular pelo CPF para visualizar o dossiê de dados pessoais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={maskCpf(cpfBusca)}
                  onChange={(e) => setCpfBusca(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  className="pl-9 h-10 text-xs font-mono tabular-nums"
                />
              </div>
              <Button
                onClick={buscarTitular}
                disabled={buscando}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
              >
                {buscando ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Buscar
              </Button>
            </div>

            {resultadoExport && !resultadoExport.encontrado && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  Nenhum titular encontrado para o CPF informado.
                </p>
              </div>
            )}

            {resultadoExport?.encontrado && resultadoExport.titular && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <DataRow label="Nome" value={resultadoExport.titular.nome} />
                  <DataRow label="CPF" value={maskCpf(resultadoExport.titular.cpf)} />
                  <DataRow label="E-mail" value={resultadoExport.titular.email || '-'} />
                  <DataRow label="Telefone" value={resultadoExport.titular.telefone || '-'} />
                  <DataRow
                    label="Nascimento"
                    value={formatDate(resultadoExport.titular.data_nascimento)}
                  />
                  <DataRow label="Endereço" value={resultadoExport.titular.endereco || '-'} />
                  <DataRow label="Status" value={resultadoExport.titular.status} />
                  <DataRow label="Cadastro" value={formatDate(resultadoExport.titular.created)} />
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-semibold mb-1">
                    Declarações ({resultadoExport.declaracoes?.length || 0})
                  </p>
                  <ul className="space-y-1">
                    {resultadoExport.declaracoes?.map((d) => (
                      <li key={d.id} className="flex justify-between text-[11px] text-slate-500">
                        <span>Ano {d.ano_calendario}</span>
                        <span>{d.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-slate-600">
                  <p className="font-semibold mb-1">
                    Dependentes ({resultadoExport.dependentes?.length || 0})
                  </p>
                  <ul className="space-y-1">
                    {resultadoExport.dependentes?.map((d, i) => (
                      <li key={i} className="text-[11px] text-slate-500">
                        {d.nome} {d.cpf ? `— ${maskCpf(d.cpf)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação exclusão titular */}
      <AlertDialog open={exclusaoOpen} onOpenChange={setExclusaoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dados de titular</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os dados pessoais do titular serão anonimizados e o
              cadastro será marcado como inativo. Informe o CPF para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="exc-cpf" className="text-xs">
              CPF do titular
            </Label>
            <Input
              id="exc-cpf"
              value={maskCpf(cpfExclusao)}
              onChange={(e) => setCpfExclusao(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className="h-10 text-xs font-mono tabular-nums mt-1.5"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              disabled={excluindo}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {excluindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-emerald-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    </div>
  )
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <div>{children}</div>
    </div>
  )
}

function RetentionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
      <div className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-700">{label}</span>
      </div>
      <span className="text-[11px] text-slate-500">{value}</span>
    </div>
  )
}

function RelatorioBloco({
  titulo,
  descricao,
  itens,
}: {
  titulo: string
  descricao: string
  itens: { id: string; principal: string; secundario: string }[]
}) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-700">{titulo}</p>
        <p className="text-[10px] text-slate-500">{descricao}</p>
      </div>
      {itens.length === 0 ? (
        <p className="px-3 py-3 text-[11px] text-slate-400">Nenhum item elegível.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {itens.map((it) => (
            <li key={it.id} className="px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-slate-700">{it.principal}</span>
              <span className="text-[11px] text-slate-500 font-mono">{it.secundario}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 font-medium text-right">{value}</span>
    </div>
  )
}
