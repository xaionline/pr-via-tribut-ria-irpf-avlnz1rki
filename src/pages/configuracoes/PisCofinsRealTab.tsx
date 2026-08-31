import { useEffect, useState } from 'react'
import {
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Percent,
  Coins,
  Info,
  Loader2,
  RefreshCw,
  Sprout,
  Package,
  Layers,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  getTabelasPisCofinsReal,
  createTabelaPisCofinsReal,
  updateTabelaPisCofinsReal,
  deleteTabelaPisCofinsReal,
  getTabelaPisCofinsRealAnoAnterior,
  getTabelasInsumosReal,
  createTabelaInsumoReal,
  updateTabelaInsumoReal,
  deleteTabelaInsumoReal,
  getTabelasProdutosAgro,
  createTabelaProdutoAgro,
  updateTabelaProdutoAgro,
  deleteTabelaProdutoAgro,
  clonarTabelasInsumosEAgroDeAnoAnterior,
} from '@/services/tabelasPj'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  TabelaPisCofinsRealRecord,
  TabelaInsumoRealRecord,
  TabelaProdutoAgroRecord,
  CategoriaInsumoReal,
  TipoCreditoInsumo,
} from '@/types'

export function PisCofinsRealTab() {
  const { toast } = useToast()
  const [subTab, setSubTab] = useState<'pis_cofins' | 'categorias_insumos' | 'produtos_agro'>(
    'pis_cofins',
  )
  const [anoFiltro, setAnoFiltro] = useState<number>(2024)

  // Dados
  const [tabelasPisCofins, setTabelasPisCofins] = useState<TabelaPisCofinsRealRecord[]>([])
  const [tabelasInsumos, setTabelasInsumos] = useState<TabelaInsumoRealRecord[]>([])
  const [tabelasAgro, setTabelasAgro] = useState<TabelaProdutoAgroRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  // Dialog PIS/COFINS Geral
  const [dialogPisOpen, setDialogPisOpen] = useState(false)
  const [editingPis, setEditingPis] = useState<TabelaPisCofinsRealRecord | null>(null)
  const [anoPis, setAnoPis] = useState<string>('')
  const [aliquotaPis, setAliquotaPis] = useState<string>('1.65')
  const [aliquotaCofins, setAliquotaCofins] = useState<string>('7.60')
  const [aliquotaCreditoPis, setAliquotaCreditoPis] = useState<string>('1.65')
  const [aliquotaCreditoCofins, setAliquotaCreditoCofins] = useState<string>('7.60')
  const [observacaoPis, setObservacaoPis] = useState<string>('')
  const [inheritedFromAno, setInheritedFromAno] = useState<number | null>(null)

  // Dialog Categoria de Insumo
  const [dialogInsumoOpen, setDialogInsumoOpen] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<TabelaInsumoRealRecord | null>(null)
  const [insumoAno, setInsumoAno] = useState<string>('2024')
  const [insumoCategoria, setInsumoCategoria] = useState<CategoriaInsumoReal>('comercial_servico')
  const [insumoDescricao, setInsumoDescricao] = useState<string>('')
  const [insumoAliqPis, setInsumoAliqPis] = useState<string>('1.65')
  const [insumoAliqCofins, setInsumoAliqCofins] = useState<string>('7.60')
  const [insumoPermiteCredito, setInsumoPermiteCredito] = useState<boolean>(true)
  const [insumoTipoCredito, setInsumoTipoCredito] = useState<TipoCreditoInsumo>('padrao')
  const [insumoObs, setInsumoObs] = useState<string>('')

  // Dialog Produto Agro
  const [dialogAgroOpen, setDialogAgroOpen] = useState(false)
  const [editingAgro, setEditingAgro] = useState<TabelaProdutoAgroRecord | null>(null)
  const [agroAno, setAgroAno] = useState<string>('2024')
  const [agroCodigo, setAgroCodigo] = useState<string>('')
  const [agroNome, setAgroNome] = useState<string>('')
  const [agroPctPis, setAgroPctPis] = useState<string>('50')
  const [agroPctCofins, setAgroPctCofins] = useState<string>('50')
  const [agroAliqEffPis, setAgroAliqEffPis] = useState<string>('0.825')
  const [agroAliqEffCofins, setAgroAliqEffCofins] = useState<string>('3.80')
  const [agroNcm, setAgroNcm] = useState<string>('')
  const [agroBaseLegal, setAgroBaseLegal] = useState<string>('')

  // Dialog Excluir
  const [deletePisItem, setDeletePisItem] = useState<TabelaPisCofinsRealRecord | null>(null)
  const [deleteInsumoItem, setDeleteInsumoItem] = useState<TabelaInsumoRealRecord | null>(null)
  const [deleteAgroItem, setDeleteAgroItem] = useState<TabelaProdutoAgroRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cloning, setCloning] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(false)
    try {
      const [pisData, insumosData, agroData] = await Promise.all([
        getTabelasPisCofinsReal(),
        getTabelasInsumosReal(),
        getTabelasProdutosAgro(),
      ])
      setTabelasPisCofins(pisData)
      setTabelasInsumos(insumosData)
      setTabelasAgro(agroData)
    } catch (err) {
      setErro(true)
      toast({
        title: 'Erro ao carregar parâmetros de PIS/COFINS e Insumos',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  // Anos disponíveis
  const anosDisponiveis = Array.from(
    new Set([
      ...tabelasPisCofins.map((t) => t.ano),
      ...tabelasInsumos.map((t) => t.ano),
      ...tabelasAgro.map((t) => t.ano),
      2024,
      2025,
      2026,
      2027,
    ]),
  ).sort((a, b) => b - a)

  // ==========================================
  // HANDLERS: PIS/COFINS GERAL
  // ==========================================
  const handleOpenNovoPis = async () => {
    setEditingPis(null)
    const currentYear = new Date().getFullYear()
    setAnoPis(String(currentYear))

    const prevTable = await getTabelaPisCofinsRealAnoAnterior(currentYear)
    if (prevTable) {
      setAliquotaPis(String(prevTable.aliquota_pis))
      setAliquotaCofins(String(prevTable.aliquota_cofins))
      setAliquotaCreditoPis(String(prevTable.aliquota_credito_pis))
      setAliquotaCreditoCofins(String(prevTable.aliquota_credito_cofins))
      setObservacaoPis(prevTable.observacao || '')
      setInheritedFromAno(prevTable.ano)
    } else {
      setAliquotaPis('1.65')
      setAliquotaCofins('7.60')
      setAliquotaCreditoPis('1.65')
      setAliquotaCreditoCofins('7.60')
      setObservacaoPis('Regime Não-Cumulativo Padrão (Leis 10.637/2002 e 10.833/2003)')
      setInheritedFromAno(null)
    }
    setDialogPisOpen(true)
  }

  const handleOpenEditPis = (item: TabelaPisCofinsRealRecord) => {
    setEditingPis(item)
    setAnoPis(String(item.ano))
    setAliquotaPis(String(item.aliquota_pis))
    setAliquotaCofins(String(item.aliquota_cofins))
    setAliquotaCreditoPis(String(item.aliquota_credito_pis))
    setAliquotaCreditoCofins(String(item.aliquota_credito_cofins))
    setObservacaoPis(item.observacao || '')
    setInheritedFromAno(null)
    setDialogPisOpen(true)
  }

  const handleSavePis = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(anoPis, 10)
    const pisNum = parseFloat(aliquotaPis.replace(',', '.'))
    const cofinsNum = parseFloat(aliquotaCofins.replace(',', '.'))
    const credPisNum = parseFloat(aliquotaCreditoPis.replace(',', '.'))
    const credCofinsNum = parseFloat(aliquotaCreditoCofins.replace(',', '.'))

    if (isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      toast({ title: 'Informe um ano válido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingPis) {
        await updateTabelaPisCofinsReal(editingPis.id, {
          ano: anoNum,
          aliquota_pis: pisNum,
          aliquota_cofins: cofinsNum,
          aliquota_credito_pis: credPisNum,
          aliquota_credito_cofins: credCofinsNum,
          observacao: observacaoPis,
        })
        toast({ title: `PIS/COFINS Geral para ${anoNum} atualizado!` })
      } else {
        const jaExiste = tabelasPisCofins.some((t) => t.ano === anoNum)
        if (jaExiste) {
          toast({
            title: `Já existe configuração para o ano ${anoNum}`,
            description: 'Edite o registro existente.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await createTabelaPisCofinsReal({
          ano: anoNum,
          aliquota_pis: pisNum,
          aliquota_cofins: cofinsNum,
          aliquota_credito_pis: credPisNum,
          aliquota_credito_cofins: credCofinsNum,
          observacao: observacaoPis,
        })
        toast({ title: `PIS/COFINS Geral para ${anoNum} cadastrado!` })
      }
      setDialogPisOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar parâmetros',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePis = async () => {
    if (!deletePisItem) return
    setDeleting(true)
    try {
      await deleteTabelaPisCofinsReal(deletePisItem.id)
      toast({ title: `Parâmetros do ano ${deletePisItem.ano} excluídos!` })
      setDeletePisItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ==========================================
  // HANDLERS: CATEGORIAS DE INSUMOS
  // ==========================================
  const handleOpenNovoInsumo = () => {
    setEditingInsumo(null)
    setInsumoAno(String(anoFiltro))
    setInsumoCategoria('comercial_servico')
    setInsumoDescricao('Comercial / Serviços')
    setInsumoAliqPis('1.65')
    setInsumoAliqCofins('7.60')
    setInsumoPermiteCredito(true)
    setInsumoTipoCredito('padrao')
    setInsumoObs('')
    setDialogInsumoOpen(true)
  }

  const handleOpenEditInsumo = (item: TabelaInsumoRealRecord) => {
    setEditingInsumo(item)
    setInsumoAno(String(item.ano))
    setInsumoCategoria(item.categoria)
    setInsumoDescricao(item.descricao)
    setInsumoAliqPis(String(item.aliquota_credito_pis))
    setInsumoAliqCofins(String(item.aliquota_credito_cofins))
    setInsumoPermiteCredito(item.permite_credito !== false)
    setInsumoTipoCredito(item.tipo_credito || 'padrao')
    setInsumoObs(item.observacao || '')
    setDialogInsumoOpen(true)
  }

  const handleSaveInsumo = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(insumoAno, 10)
    const pisNum = parseFloat(insumoAliqPis.replace(',', '.')) || 0
    const cofinsNum = parseFloat(insumoAliqCofins.replace(',', '.')) || 0

    if (isNaN(anoNum) || !insumoDescricao.trim()) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingInsumo) {
        await updateTabelaInsumoReal(editingInsumo.id, {
          ano: anoNum,
          categoria: insumoCategoria,
          descricao: insumoDescricao,
          aliquota_credito_pis: pisNum,
          aliquota_credito_cofins: cofinsNum,
          permite_credito: insumoPermiteCredito,
          tipo_credito: insumoTipoCredito,
          observacao: insumoObs,
        })
        toast({ title: `Categoria de insumo para ${anoNum} atualizada!` })
      } else {
        const duplicado = tabelasInsumos.some(
          (t) => t.ano === anoNum && t.categoria === insumoCategoria,
        )
        if (duplicado) {
          toast({
            title: `Já existe a categoria "${insumoCategoria}" cadastrada para o ano ${anoNum}`,
            description: 'Edite o registro existente.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await createTabelaInsumoReal({
          ano: anoNum,
          categoria: insumoCategoria,
          descricao: insumoDescricao,
          aliquota_credito_pis: pisNum,
          aliquota_credito_cofins: cofinsNum,
          permite_credito: insumoPermiteCredito,
          tipo_credito: insumoTipoCredito,
          observacao: insumoObs,
        })
        toast({ title: `Categoria de insumo para ${anoNum} cadastrada!` })
      }
      setDialogInsumoOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar categoria de insumo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteInsumo = async () => {
    if (!deleteInsumoItem) return
    setDeleting(true)
    try {
      await deleteTabelaInsumoReal(deleteInsumoItem.id)
      toast({ title: `Categoria ${deleteInsumoItem.descricao} excluída!` })
      setDeleteInsumoItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ==========================================
  // HANDLERS: PRODUTOS AGRO (CRÉDITO PRESUMIDO)
  // ==========================================
  const handleOpenNovoAgro = () => {
    setEditingAgro(null)
    setAgroAno(String(anoFiltro))
    setAgroCodigo('')
    setAgroNome('')
    setAgroPctPis('50')
    setAgroPctCofins('50')
    setAgroAliqEffPis('0.825')
    setAgroAliqEffCofins('3.80')
    setAgroNcm('')
    setAgroBaseLegal('Lei 10.925/2004')
    setDialogAgroOpen(true)
  }

  const handleOpenEditAgro = (item: TabelaProdutoAgroRecord) => {
    setEditingAgro(item)
    setAgroAno(String(item.ano))
    setAgroCodigo(item.codigo)
    setAgroNome(item.nome)
    setAgroPctPis(String(item.percentual_presumido_pis))
    setAgroPctCofins(String(item.percentual_presumido_cofins))
    setAgroAliqEffPis(String(item.aliquota_efetiva_pis))
    setAgroAliqEffCofins(String(item.aliquota_efetiva_cofins))
    setAgroNcm(item.ncm || '')
    setAgroBaseLegal(item.base_legal || '')
    setDialogAgroOpen(true)
  }

  // Atualizar alíquotas efetivas automaticamente ao mudar os percentuais de presunção
  const handlePctPisChange = (pctStr: string) => {
    setAgroPctPis(pctStr)
    const pct = parseFloat(pctStr.replace(',', '.')) || 0
    const eff = (1.65 * pct) / 100
    setAgroAliqEffPis(eff.toFixed(4))
  }

  const handlePctCofinsChange = (pctStr: string) => {
    setAgroPctCofins(pctStr)
    const pct = parseFloat(pctStr.replace(',', '.')) || 0
    const eff = (7.6 * pct) / 100
    setAgroAliqEffCofins(eff.toFixed(4))
  }

  const handleSaveAgro = async (e: React.FormEvent) => {
    e.preventDefault()
    const anoNum = parseInt(agroAno, 10)
    const pctPis = parseFloat(agroPctPis.replace(',', '.')) || 0
    const pctCofins = parseFloat(agroPctCofins.replace(',', '.')) || 0
    const effPis = parseFloat(agroAliqEffPis.replace(',', '.')) || 0
    const effCofins = parseFloat(agroAliqEffCofins.replace(',', '.')) || 0
    const codigoClean = agroCodigo.trim().toLowerCase().replace(/\s+/g, '_')

    if (isNaN(anoNum) || !codigoClean || !agroNome.trim()) {
      toast({ title: 'Preencha código e nome do produto', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingAgro) {
        await updateTabelaProdutoAgro(editingAgro.id, {
          ano: anoNum,
          codigo: codigoClean,
          nome: agroNome.trim(),
          percentual_presumido_pis: pctPis,
          percentual_presumido_cofins: pctCofins,
          aliquota_efetiva_pis: effPis,
          aliquota_efetiva_cofins: effCofins,
          ncm: agroNcm.trim(),
          base_legal: agroBaseLegal.trim(),
        })
        toast({ title: `Produto agro ${agroNome} atualizado!` })
      } else {
        const duplicado = tabelasAgro.some((t) => t.ano === anoNum && t.codigo === codigoClean)
        if (duplicado) {
          toast({
            title: `Produto com código "${codigoClean}" já existe em ${anoNum}`,
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        await createTabelaProdutoAgro({
          ano: anoNum,
          codigo: codigoClean,
          nome: agroNome.trim(),
          percentual_presumido_pis: pctPis,
          percentual_presumido_cofins: pctCofins,
          aliquota_efetiva_pis: effPis,
          aliquota_efetiva_cofins: effCofins,
          ncm: agroNcm.trim(),
          base_legal: agroBaseLegal.trim(),
        })
        toast({ title: `Produto agro ${agroNome} cadastrado para ${anoNum}!` })
      }
      setDialogAgroOpen(false)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao salvar produto agro',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAgro = async () => {
    if (!deleteAgroItem) return
    setDeleting(true)
    try {
      await deleteTabelaProdutoAgro(deleteAgroItem.id)
      toast({ title: `Produto ${deleteAgroItem.nome} excluído!` })
      setDeleteAgroItem(null)
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Herança e clonagem do ano anterior para categorias e agro
  const handleClonarAnoAnterior = async () => {
    const anoOrigem = anoFiltro - 1
    setCloning(true)
    try {
      const res = await clonarTabelasInsumosEAgroDeAnoAnterior(anoFiltro, anoOrigem)
      toast({
        title: `Parâmetros herdados do ano ${anoOrigem} com sucesso!`,
        description: `${res.insumosClonados} categoria(s) e ${res.produtosAgroClonados} produto(s) agro clonados para ${anoFiltro}.`,
      })
      await carregar()
    } catch (err) {
      toast({
        title: 'Falha ao herdar do ano anterior',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCloning(false)
    }
  }

  // Listas filtradas pelo ano selecionado
  const insumosAno = tabelasInsumos.filter((t) => t.ano === anoFiltro)
  const agroAnoList = tabelasAgro.filter((t) => t.ano === anoFiltro)

  return (
    <div className="space-y-6">
      {/* Banner de Cabeçalho */}
      <Card className="p-4 sm:p-5 border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 shadow-subtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                PIS, COFINS e Categorias de Insumos — Lucro Real (Não-Cumulativo)
              </h2>
              <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                Configuração Anual Editável
              </Badge>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Defina as alíquotas de débito de PIS/COFINS (1,65% / 7,60%) e as tabelas anuais de
              crédito por natureza de insumo (Comercial 9,25%, Rural/Agro com crédito presumido por
              produto, Monofásico e Ativo Imobilizado).
            </p>
          </div>
        </div>
      </Card>

      {/* Navegação entre Sub-Abas */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-100/80 p-1">
            <TabsTrigger value="pis_cofins" className="text-xs gap-1.5 font-semibold">
              <Coins className="w-3.5 h-3.5" /> Alíquotas Gerais PIS/COFINS
            </TabsTrigger>
            <TabsTrigger value="categorias_insumos" className="text-xs gap-1.5 font-semibold">
              <Layers className="w-3.5 h-3.5" /> Categorias de Insumos (4 Tipos)
            </TabsTrigger>
            <TabsTrigger value="produtos_agro" className="text-xs gap-1.5 font-semibold">
              <Sprout className="w-3.5 h-3.5" /> Tabela de Produtos Agro (Soja, Milho, Cana...)
            </TabsTrigger>
          </TabsList>

          {/* Seletor de Ano Filtro para as abas detalhadas */}
          {subTab !== 'pis_cofins' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-semibold text-slate-500">Ano de Vigência:</span>
              <Select value={String(anoFiltro)} onValueChange={(v) => setAnoFiltro(Number(v))}>
                <SelectTrigger className="w-28 h-8 text-xs font-bold font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs font-mono">
                      Ano {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ==========================================
            SUB-ABA 1: PIS/COFINS GERAL
            ========================================== */}
        <TabsContent value="pis_cofins" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Histórico de Alíquotas PIS/COFINS (Débito e Crédito Geral)
              </h3>
              <p className="text-xs text-slate-500">
                {tabelasPisCofins.length} ano(s) cadastrado(s)
              </p>
            </div>
            <Button
              onClick={handleOpenNovoPis}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo ano
            </Button>
          </div>

          {loading ? (
            <Card className="p-5 border border-slate-200/80">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </Card>
          ) : erro ? (
            <Card className="p-10 text-center border-dashed border-rose-200 bg-rose-50/40">
              <p className="text-sm text-slate-600">Não foi possível carregar os parâmetros.</p>
              <Button
                onClick={carregar}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Repetir
              </Button>
            </Card>
          ) : tabelasPisCofins.length === 0 ? (
            <Card className="p-10 text-center border-dashed border-slate-300">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-800">Nenhum parâmetro cadastrado</h4>
              <Button
                onClick={handleOpenNovoPis}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Novo ano
              </Button>
            </Card>
          ) : (
            <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="py-3 px-4">Ano-Calendário</th>
                      <th className="py-3 px-4 text-right">PIS (Débito)</th>
                      <th className="py-3 px-4 text-right">COFINS (Débito)</th>
                      <th className="py-3 px-4 text-right">Crédito PIS Padrão</th>
                      <th className="py-3 px-4 text-right">Crédito COFINS Padrão</th>
                      <th className="py-3 px-4">Observação / Base Legal</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {tabelasPisCofins.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{p.ano}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-700">
                          {p.aliquota_pis.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-blue-700">
                          {p.aliquota_cofins.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                          {p.aliquota_credito_pis.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                          {p.aliquota_credito_cofins.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate font-sans">
                          {p.observacao || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditPis(p)}
                              className="h-8 w-8 text-slate-600 hover:text-emerald-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletePisItem(p)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ==========================================
            SUB-ABA 2: CATEGORIAS DE INSUMOS
            ========================================== */}
        <TabsContent value="categorias_insumos" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Alíquotas e Regras por Categoria de Insumo — Ano {anoFiltro}
              </h3>
              <p className="text-xs text-slate-500">
                Alíquotas específicas para insumos comerciais, rurais/agropecuários, monofásicos e
                imobilizado.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClonarAnoAnterior}
                disabled={cloning}
                className="text-xs gap-1.5 h-9"
              >
                {cloning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Herdar do Ano {anoFiltro - 1}
              </Button>
              <Button
                onClick={handleOpenNovoInsumo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Categoria
              </Button>
            </div>
          </div>

          {insumosAno.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">
                Nenhuma categoria cadastrada para o ano {anoFiltro}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Herde as alíquotas do ano anterior ou cadastre novas categorias.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={handleClonarAnoAnterior}
                  className="text-xs gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Herdar de {anoFiltro - 1}
                </Button>
                <Button
                  onClick={handleOpenNovoInsumo}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Categoria
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="py-3 px-4">Categoria / Descrição</th>
                      <th className="py-3 px-4 text-center">Tipo de Crédito</th>
                      <th className="py-3 px-4 text-right">Crédito PIS</th>
                      <th className="py-3 px-4 text-right">Crédito COFINS</th>
                      <th className="py-3 px-4 text-right">Total Crédito</th>
                      <th className="py-3 px-4 text-center">Permite Crédito</th>
                      <th className="py-3 px-4">Observações</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insumosAno.map((item) => {
                      const totalAliq = item.aliquota_credito_pis + item.aliquota_credito_cofins
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{item.descricao}</span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {item.categoria}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize font-semibold ${
                                item.tipo_credito === 'padrao'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : item.tipo_credito === 'presumido'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : item.tipo_credito === 'depreciacao'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.tipo_credito}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {item.aliquota_credito_pis.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {item.aliquota_credito_cofins.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-800">
                            {totalAliq.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.permite_credito !== false ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">Sim</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Vedado (0%)
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                            {item.observacao || '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditInsumo(item)}
                                className="h-8 w-8 text-slate-600 hover:text-emerald-700"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteInsumoItem(item)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ==========================================
            SUB-ABA 3: PRODUTOS AGRO (CRÉDITO PRESUMIDO)
            ========================================== */}
        <TabsContent value="produtos_agro" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Tabela de Produtos Rurais / Agropecuários — Ano {anoFiltro}
              </h3>
              <p className="text-xs text-slate-500">
                Percentuais de crédito presumido agropecuário por produto (Soja, Milho, Cana de
                Açúcar, Leite, Trigo, etc.).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClonarAnoAnterior}
                disabled={cloning}
                className="text-xs gap-1.5 h-9"
              >
                {cloning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Herdar do Ano {anoFiltro - 1}
              </Button>
              <Button
                onClick={handleOpenNovoAgro}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Produto Agro
              </Button>
            </div>
          </div>

          {agroAnoList.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-slate-300">
              <Sprout className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">
                Nenhum produto agro cadastrado para o ano {anoFiltro}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Herde a tabela padrão (Soja, Milho, Cana, etc.) do ano anterior ou cadastre novos
                produtos.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={handleClonarAnoAnterior}
                  className="text-xs gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Herdar de {anoFiltro - 1}
                </Button>
                <Button
                  onClick={handleOpenNovoAgro}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Produto
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border border-slate-200/80 shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="py-3 px-4">Produto Agropecuário</th>
                      <th className="py-3 px-4 font-mono text-center">NCM</th>
                      <th className="py-3 px-4 text-right">% Presumido PIS</th>
                      <th className="py-3 px-4 text-right">Alíq. Efetiva PIS</th>
                      <th className="py-3 px-4 text-right">% Presumido COFINS</th>
                      <th className="py-3 px-4 text-right">Alíq. Efetiva COFINS</th>
                      <th className="py-3 px-4 text-right">Total Efetivo</th>
                      <th className="py-3 px-4">Base Legal</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {agroAnoList.map((prod) => {
                      const totalEfetivo = prod.aliquota_efetiva_pis + prod.aliquota_efetiva_cofins
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{prod.nome}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 uppercase font-normal block pl-5">
                              {prod.codigo}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500">
                            {prod.ncm || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {prod.percentual_presumido_pis.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {prod.aliquota_efetiva_pis.toFixed(4)}%
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            {prod.percentual_presumido_cofins.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700">
                            {prod.aliquota_efetiva_cofins.toFixed(4)}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-blue-800">
                            {totalEfetivo.toFixed(4)}%
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate text-[11px]">
                            {prod.base_legal || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditAgro(prod)}
                                className="h-8 w-8 text-slate-600 hover:text-emerald-700"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteAgroItem(prod)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ==========================================
          MODAL 1: EDITAR / CRIAR PIS/COFINS GERAL
          ========================================== */}
      <Dialog open={dialogPisOpen} onOpenChange={setDialogPisOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSavePis}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Coins className="w-5 h-5 text-emerald-600" />
                {editingPis
                  ? `Editar PIS/COFINS Geral — Ano ${editingPis.ano}`
                  : 'Novos Parâmetros PIS/COFINS'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure as alíquotas federais de PIS e COFINS não-cumulativos.
              </DialogDescription>
            </DialogHeader>

            {!editingPis && inheritedFromAno && (
              <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-800">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Herança automática:</strong> Valores sugeridos do ano anterior{' '}
                  <strong>({inheritedFromAno})</strong>.
                </span>
              </div>
            )}

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="pc-ano" className="text-xs font-semibold text-slate-700">
                  Ano-Calendário *
                </Label>
                <Input
                  id="pc-ano"
                  type="number"
                  min="2020"
                  max="2100"
                  value={anoPis}
                  onChange={(e) => setAnoPis(e.target.value)}
                  className="h-10 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pc-pis" className="text-xs font-semibold text-slate-700">
                    PIS Débito (%) *
                  </Label>
                  <Input
                    id="pc-pis"
                    type="number"
                    step="0.01"
                    value={aliquotaPis}
                    onChange={(e) => setAliquotaPis(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 1,65%</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pc-cofins" className="text-xs font-semibold text-slate-700">
                    COFINS Débito (%) *
                  </Label>
                  <Input
                    id="pc-cofins"
                    type="number"
                    step="0.01"
                    value={aliquotaCofins}
                    onChange={(e) => setAliquotaCofins(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 7,60%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pc-cred-pis" className="text-xs font-semibold text-slate-700">
                    Crédito PIS Padrão (%) *
                  </Label>
                  <Input
                    id="pc-cred-pis"
                    type="number"
                    step="0.01"
                    value={aliquotaCreditoPis}
                    onChange={(e) => setAliquotaCreditoPis(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 1,65%</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pc-cred-cofins" className="text-xs font-semibold text-slate-700">
                    Crédito COFINS Padrão (%) *
                  </Label>
                  <Input
                    id="pc-cred-cofins"
                    type="number"
                    step="0.01"
                    value={aliquotaCreditoCofins}
                    onChange={(e) => setAliquotaCreditoCofins(e.target.value)}
                    className="h-10 text-xs font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Padrão: 7,60%</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pc-obs" className="text-xs font-semibold text-slate-700">
                  Observações / Base Legal
                </Label>
                <Input
                  id="pc-obs"
                  type="text"
                  value={observacaoPis}
                  onChange={(e) => setObservacaoPis(e.target.value)}
                  placeholder="Ex: Regime Não-Cumulativo Padrão"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogPisOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingPis ? 'Salvar alterações' : 'Cadastrar parâmetros'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAL 2: EDITAR / CRIAR CATEGORIA INSUMO
          ========================================== */}
      <Dialog open={dialogInsumoOpen} onOpenChange={setDialogInsumoOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveInsumo}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Layers className="w-5 h-5 text-emerald-600" />
                {editingInsumo
                  ? `Editar Categoria de Insumo — Ano ${editingInsumo.ano}`
                  : 'Nova Categoria de Insumo'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Defina alíquotas de crédito de PIS/COFINS para esta natureza de gasto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ins-ano" className="text-xs font-semibold text-slate-700">
                    Ano-Calendário *
                  </Label>
                  <Input
                    id="ins-ano"
                    type="number"
                    min="2020"
                    max="2100"
                    value={insumoAno}
                    onChange={(e) => setInsumoAno(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ins-cat" className="text-xs font-semibold text-slate-700">
                    Tipo / Categoria *
                  </Label>
                  <Select
                    value={insumoCategoria}
                    onValueChange={(v) => {
                      const cat = v as CategoriaInsumoReal
                      setInsumoCategoria(cat)
                      if (cat === 'comercial_servico') {
                        setInsumoDescricao('Comercial / Serviços / Insumos Gerais')
                        setInsumoAliqPis('1.65')
                        setInsumoAliqCofins('7.60')
                        setInsumoTipoCredito('padrao')
                        setInsumoPermiteCredito(true)
                      } else if (cat === 'rural_agro') {
                        setInsumoDescricao('Rural / Agropecuário (Crédito Presumido por Produto)')
                        setInsumoAliqPis('0.825')
                        setInsumoAliqCofins('3.80')
                        setInsumoTipoCredito('presumido')
                        setInsumoPermiteCredito(true)
                      } else if (cat === 'monofasico') {
                        setInsumoDescricao('Produtos Monofásicos / Alíquota Zero')
                        setInsumoAliqPis('0.00')
                        setInsumoAliqCofins('0.00')
                        setInsumoTipoCredito('isento_vedado')
                        setInsumoPermiteCredito(false)
                      } else if (cat === 'imobilizado') {
                        setInsumoDescricao('Bens do Ativo Imobilizado (Depreciação / Aquisição)')
                        setInsumoAliqPis('1.65')
                        setInsumoAliqCofins('7.60')
                        setInsumoTipoCredito('depreciacao')
                        setInsumoPermiteCredito(true)
                      }
                    }}
                  >
                    <SelectTrigger id="ins-cat" className="h-9 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comercial_servico" className="text-xs">
                        Comercial / Serviço
                      </SelectItem>
                      <SelectItem value="rural_agro" className="text-xs">
                        Rural / Agropecuário
                      </SelectItem>
                      <SelectItem value="monofasico" className="text-xs">
                        Monofásico / Alíq. Zero
                      </SelectItem>
                      <SelectItem value="imobilizado" className="text-xs">
                        Ativo Imobilizado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ins-desc" className="text-xs font-semibold text-slate-700">
                  Nome / Descrição da Categoria *
                </Label>
                <Input
                  id="ins-desc"
                  type="text"
                  value={insumoDescricao}
                  onChange={(e) => setInsumoDescricao(e.target.value)}
                  className="h-9 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ins-pis" className="text-xs font-semibold text-slate-700">
                    Alíquota Crédito PIS (%) *
                  </Label>
                  <Input
                    id="ins-pis"
                    type="number"
                    step="0.0001"
                    value={insumoAliqPis}
                    onChange={(e) => setInsumoAliqPis(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ins-cofins" className="text-xs font-semibold text-slate-700">
                    Alíquota Crédito COFINS (%) *
                  </Label>
                  <Input
                    id="ins-cofins"
                    type="number"
                    step="0.0001"
                    value={insumoAliqCofins}
                    onChange={(e) => setInsumoAliqCofins(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div className="space-y-0.5">
                  <Label htmlFor="ins-permite" className="text-xs font-semibold text-slate-800">
                    Gera Crédito Tributário?
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Desative caso o insumo seja vedado por lei (ex: monofásico).
                  </p>
                </div>
                <Switch
                  id="ins-permite"
                  checked={insumoPermiteCredito}
                  onCheckedChange={setInsumoPermiteCredito}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ins-obs" className="text-xs font-semibold text-slate-700">
                  Base Legal / Observações
                </Label>
                <Input
                  id="ins-obs"
                  type="text"
                  value={insumoObs}
                  onChange={(e) => setInsumoObs(e.target.value)}
                  placeholder="Ex: Art. 3º Lei 10.833/2003"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogInsumoOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingInsumo ? 'Salvar alterações' : 'Cadastrar categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAL 3: EDITAR / CRIAR PRODUTO AGRO
          ========================================== */}
      <Dialog open={dialogAgroOpen} onOpenChange={setDialogAgroOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveAgro}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Sprout className="w-5 h-5 text-emerald-600" />
                {editingAgro
                  ? `Editar Produto Agro — Ano ${editingAgro.ano}`
                  : 'Novo Produto Rural / Agropecuário'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure percentuais de crédito presumido de PIS e COFINS da agroindústria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="agr-ano" className="text-xs font-semibold text-slate-700">
                    Ano-Calendário *
                  </Label>
                  <Input
                    id="agr-ano"
                    type="number"
                    min="2020"
                    max="2100"
                    value={agroAno}
                    onChange={(e) => setAgroAno(e.target.value)}
                    className="h-9 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="agr-cod" className="text-xs font-semibold text-slate-700">
                    Código Identificador *
                  </Label>
                  <Input
                    id="agr-cod"
                    type="text"
                    value={agroCodigo}
                    onChange={(e) => setAgroCodigo(e.target.value)}
                    placeholder="ex: soja, milho, cana"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="agr-nome" className="text-xs font-semibold text-slate-700">
                    Nome do Produto *
                  </Label>
                  <Input
                    id="agr-nome"
                    type="text"
                    value={agroNome}
                    onChange={(e) => setAgroNome(e.target.value)}
                    placeholder="ex: Soja em Grão"
                    className="h-9 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="agr-ncm" className="text-xs font-semibold text-slate-700">
                    NCM (Opcional)
                  </Label>
                  <Input
                    id="agr-ncm"
                    type="text"
                    value={agroNcm}
                    onChange={(e) => setAgroNcm(e.target.value)}
                    placeholder="1201.90.00"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Percentuais de presunção e alíquotas efetivas */}
              <div className="p-3 bg-slate-50 rounded-lg border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Cálculo do Crédito Presumido (Base: 1,65% PIS e 7,60% COFINS)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="agr-pct-pis" className="text-xs font-semibold text-slate-700">
                      % Presumido PIS
                    </Label>
                    <div className="relative">
                      <Input
                        id="agr-pct-pis"
                        type="number"
                        step="0.1"
                        value={agroPctPis}
                        onChange={(e) => handlePctPisChange(e.target.value)}
                        className="h-9 text-xs font-mono pr-6"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="agr-eff-pis" className="text-xs font-semibold text-emerald-800">
                      Alíquota Efetiva PIS
                    </Label>
                    <Input
                      id="agr-eff-pis"
                      type="number"
                      step="0.0001"
                      value={agroAliqEffPis}
                      onChange={(e) => setAgroAliqEffPis(e.target.value)}
                      className="h-9 text-xs font-mono font-bold bg-emerald-50/50 text-emerald-800 border-emerald-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="agr-pct-cofins"
                      className="text-xs font-semibold text-slate-700"
                    >
                      % Presumido COFINS
                    </Label>
                    <div className="relative">
                      <Input
                        id="agr-pct-cofins"
                        type="number"
                        step="0.1"
                        value={agroPctCofins}
                        onChange={(e) => handlePctCofinsChange(e.target.value)}
                        className="h-9 text-xs font-mono pr-6"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-slate-400">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="agr-eff-cofins"
                      className="text-xs font-semibold text-emerald-800"
                    >
                      Alíquota Efetiva COFINS
                    </Label>
                    <Input
                      id="agr-eff-cofins"
                      type="number"
                      step="0.0001"
                      value={agroAliqEffCofins}
                      onChange={(e) => setAgroAliqEffCofins(e.target.value)}
                      className="h-9 text-xs font-mono font-bold bg-emerald-50/50 text-emerald-800 border-emerald-200"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="agr-legal" className="text-xs font-semibold text-slate-700">
                  Base Legal
                </Label>
                <Input
                  id="agr-legal"
                  type="text"
                  value={agroBaseLegal}
                  onChange={(e) => setAgroBaseLegal(e.target.value)}
                  placeholder="Ex: Lei 10.925/2004, Art. 8º"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogAgroOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingAgro ? 'Salvar alterações' : 'Cadastrar produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAIS DE CONFIRMAÇÃO DE EXCLUSÃO
          ========================================== */}
      <AlertDialog open={!!deletePisItem} onOpenChange={(o) => !o && setDeletePisItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Parâmetros do Ano {deletePisItem?.ano}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a configuração geral de PIS/COFINS Não-Cumulativo para este ano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePis}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Excluir registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteInsumoItem} onOpenChange={(o) => !o && setDeleteInsumoItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria {deleteInsumoItem?.descricao}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a regra de crédito para esta categoria no ano{' '}
              {deleteInsumoItem?.ano}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInsumo}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Excluir categoria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAgroItem} onOpenChange={(o) => !o && setDeleteAgroItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto {deleteAgroItem?.nome}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá o produto agro da tabela de crédito presumido no ano{' '}
              {deleteAgroItem?.ano}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgro}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Excluir produto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
