import { useState, useEffect, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
  FileText,
  Building2,
  Users,
  Loader2,
  Trash2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import pb from '@/lib/pocketbase/client'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import {
  processarCsvInformes,
  processarCsvFaturamentos,
  MODELO_CSV_INFORMES,
  MODELO_CSV_FATURAMENTOS,
  LinhaInformeCsv,
  LinhaFaturamentoCsv,
} from '@/lib/importacao-csv'
import {
  getImportacoes,
  criarRegistroImportacao,
  finalizarRegistroImportacao,
  reverterImportacao,
  obterOuCriarFontePagadora,
} from '@/services/importacao'
import type {
  ImportacaoInformeRecord,
  ClienteRecord,
  EmpresaRecord,
  DeclaracaoRecord,
  TipoRendimento,
} from '@/types'

export default function ImportacaoLotePage() {
  const { toast } = useToast()
  const { user, isStarterPFOnly } = useAuth()

  const [activeTab, setActiveTab] = useState<'informes' | 'faturamentos' | 'historico'>('informes')

  // Dados auxiliares para cruzamento
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const [loadingDados, setLoadingDados] = useState(true)

  // Arquivo e prévia de Informes
  const [arquivoInformes, setArquivoInformes] = useState<File | null>(null)
  const [linhasInformes, setLinhasInformes] = useState<LinhaInformeCsv[]>([])
  const [validasInformes, setValidasInformes] = useState(0)
  const [invalidasInformes, setInvalidasInformes] = useState(0)
  const [importandoInformes, setImportandoInformes] = useState(false)
  const fileInputInformesRef = useRef<HTMLInputElement>(null)

  // Arquivo e prévia de Faturamentos
  const [arquivoFaturamentos, setArquivoFaturamentos] = useState<File | null>(null)
  const [linhasFaturamentos, setLinhasFaturamentos] = useState<LinhaFaturamentoCsv[]>([])
  const [validasFaturamentos, setValidasFaturamentos] = useState(0)
  const [invalidasFaturamentos, setInvalidasFaturamentos] = useState(0)
  const [importandoFaturamentos, setImportandoFaturamentos] = useState(false)
  const fileInputFaturamentosRef = useRef<HTMLInputElement>(null)

  // Histórico e reversão
  const [historico, setHistorico] = useState<ImportacaoInformeRecord[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [importacaoParaReverter, setImportacaoParaReverter] =
    useState<ImportacaoInformeRecord | null>(null)
  const [revertendo, setRevertendo] = useState(false)

  // Carregar clientes, empresas e declarações
  const carregarDadosAuxiliares = async () => {
    setLoadingDados(true)
    try {
      const [cliList, empList, decList] = await Promise.all([
        pb.collection('clientes').getFullList<ClienteRecord>({ sort: 'nome' }),
        pb
          .collection('empresas')
          .getFullList<EmpresaRecord>({ sort: 'razao_social' })
          .catch(() => []),
        pb.collection('declaracoes').getFullList<DeclaracaoRecord>({ sort: '-ano_calendario' }),
      ])
      setClientes(cliList)
      setEmpresas(empList)
      setDeclaracoes(decList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar cadastros',
        description: err?.message || 'Não foi possível carregar clientes e empresas.',
        variant: 'destructive',
      })
    } finally {
      setLoadingDados(false)
    }
  }

  const carregarHistorico = async () => {
    setLoadingHistorico(true)
    try {
      const lista = await getImportacoes()
      setHistorico(lista)
    } catch (err: any) {
      console.warn('Erro ao carregar histórico:', err)
    } finally {
      setLoadingHistorico(false)
    }
  }

  useEffect(() => {
    carregarDadosAuxiliares()
    carregarHistorico()
  }, [])

  // Download dos modelos
  const baixarModelo = (tipo: 'informes' | 'faturamentos') => {
    const conteudo = tipo === 'informes' ? MODELO_CSV_INFORMES : MODELO_CSV_FATURAMENTOS
    const nomeArquivo =
      tipo === 'informes'
        ? 'modelo_importacao_informes_rendimentos.csv'
        : 'modelo_importacao_faturamentos_mensais.csv'

    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Modelo baixado!',
      description: `Arquivo ${nomeArquivo} salvo no seu computador.`,
    })
  }

  // Upload e Parsing Informes
  const handleFileChangeInformes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processarArquivoInformes(file)
  }

  const processarArquivoInformes = (file: File) => {
    setArquivoInformes(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || ''
      const res = processarCsvInformes(
        text,
        clientes.map((c) => ({ id: c.id, cpf: c.cpf, nome: c.nome })),
      )
      setLinhasInformes(res.linhas)
      setValidasInformes(res.totalValidas)
      setInvalidasInformes(res.totalInvalidas)

      if (res.linhas.length === 0) {
        toast({
          title: 'Arquivo vazio ou formato inválido',
          description: 'O arquivo não possui dados ou cabeçalhos reconhecidos.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Arquivo processado',
          description: `${res.totalValidas} linhas válidas e ${res.totalInvalidas} com avisos/erros.`,
        })
      }
    }
    reader.readAsText(file)
  }

  // Upload e Parsing Faturamentos
  const handleFileChangeFaturamentos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processarArquivoFaturamentos(file)
  }

  const processarArquivoFaturamentos = (file: File) => {
    setArquivoFaturamentos(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || ''
      const res = processarCsvFaturamentos(
        text,
        empresas.map((emp) => ({
          id: emp.id,
          cnpj: emp.cnpj,
          razao_social: emp.razao_social,
        })),
      )
      setLinhasFaturamentos(res.linhas)
      setValidasFaturamentos(res.totalValidas)
      setInvalidasFaturamentos(res.totalInvalidas)

      if (res.linhas.length === 0) {
        toast({
          title: 'Arquivo vazio ou formato inválido',
          description: 'O arquivo não possui dados ou cabeçalhos reconhecidos.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Arquivo processado',
          description: `${res.totalValidas} linhas válidas e ${res.totalInvalidas} com avisos/erros.`,
        })
      }
    }
    reader.readAsText(file)
  }

  // Executar importação de Informes
  const executarImportacaoInformes = async () => {
    const linhasAProcessar = linhasInformes.filter((l) => l.valida)
    if (linhasAProcessar.length === 0) {
      toast({
        title: 'Nenhuma linha válida',
        description: 'Corrija os erros na planilha antes de confirmar a importação.',
        variant: 'destructive',
      })
      return
    }

    setImportandoInformes(true)

    // Agrupar por cliente para criar ou identificar a declaração
    let registroImportacao: ImportacaoInformeRecord | null = null
    const idsRendimentos: string[] = []
    const idsDespesas: string[] = []
    let rendimentosCriados = 0
    let despesasCriadas = 0

    try {
      // 1. Criar registro inicial na collection importacoes_informes
      registroImportacao = await criarRegistroImportacao({
        nomeArquivo: arquivoInformes?.name || 'informes_rendimentos.csv',
        file: arquivoInformes || undefined,
        tipo: 'informes_rendimentos',
        totalLinhas: linhasInformes.length,
        userId: user?.id,
      })

      // Mapa para declarações criadas ou encontradas nesta execução
      // Chave: `clienteId_ano`
      const mapaDecs = new Map<string, DeclaracaoRecord>()

      // 2. Iterar linhas válidas e inserir no banco
      for (const linha of linhasAProcessar) {
        const cpfLimpo = linha.cpfCliente.replace(/\D/g, '')
        const cliente = clientes.find((c) => (c.cpf || '').replace(/\D/g, '') === cpfLimpo)
        if (!cliente) continue

        const keyDec = `${cliente.id}_${linha.anoCalendario}`
        let dec = mapaDecs.get(keyDec)

        if (!dec) {
          // Busca declaração existente no banco
          dec = declaracoes.find(
            (d) => d.cliente_id === cliente.id && d.ano_calendario === linha.anoCalendario,
          )

          // Se não existir, cria uma nova em rascunho
          if (!dec) {
            dec = await pb.collection('declaracoes').create<DeclaracaoRecord>({
              cliente_id: cliente.id,
              ano_calendario: linha.anoCalendario,
              status: 'rascunho',
              progresso: 10,
              modalidade: 'legal',
            })
            // Atualiza lista local
            setDeclaracoes((prev) => [dec!, ...prev])
          }
          mapaDecs.set(keyDec, dec)
        }

        // Se a importação ainda não tem declaracao_id ou cliente_id vinculado, atualiza
        if (!registroImportacao.declaracao_id && dec.id) {
          await pb.collection('importacoes_informes').update(registroImportacao.id, {
            declaracao_id: dec.id,
            cliente_id: cliente.id,
          })
          registroImportacao.declaracao_id = dec.id
          registroImportacao.cliente_id = cliente.id
        }

        if (linha.tipoRegistro === 'rendimento') {
          // Obter ou criar fonte pagadora se informada
          let fonteId: string | undefined = undefined
          if (linha.nomeFonte || linha.cnpjFonte) {
            const fonte = await obterOuCriarFontePagadora(
              dec.id,
              linha.nomeFonte || 'Fonte Pagadora Informada',
              linha.cnpjFonte,
            )
            fonteId = fonte.id
          }

          const novoRendimento = await pb.collection('rendimentos').create({
            declaracao_id: dec.id,
            fonte_pagadora_id: fonteId,
            descricao: linha.descricao,
            tipo: linha.categoriaOuTipo as TipoRendimento,
            valor: linha.valor,
            origem: 'importado',
            importacao_id: registroImportacao.id,
            confianca: 100,
          })
          idsRendimentos.push(novoRendimento.id)
          rendimentosCriados++
        } else {
          // Despesa dedutível
          const novaDespesa = await pb.collection('despesas_dedutiveis').create({
            declaracao_id: dec.id,
            categoria: linha.categoriaOuTipo,
            descricao: linha.descricao,
            valor: linha.valor,
            importacao_id: registroImportacao.id,
          })
          idsDespesas.push(novaDespesa.id)
          despesasCriadas++
        }
      }

      // 3. Finalizar registro de importação
      await finalizarRegistroImportacao(registroImportacao.id, 'concluida', {
        tipo: 'informes_rendimentos',
        totalLinhas: linhasInformes.length,
        linhasValidas: linhasAProcessar.length,
        linhasComErro: invalidasInformes,
        rendimentosCriados,
        despesasCriadas,
        idsCriados: {
          rendimentos: idsRendimentos,
          despesas: idsDespesas,
        },
      })

      toast({
        title: 'Importação concluída com sucesso!',
        description: `${rendimentosCriados} rendimentos e ${despesasCriadas} despesas importados e vinculados.`,
      })

      // Reset
      setArquivoInformes(null)
      setLinhasInformes([])
      setValidasInformes(0)
      setInvalidasInformes(0)
      if (fileInputInformesRef.current) fileInputInformesRef.current.value = ''
      carregarHistorico()
      setActiveTab('historico')
    } catch (err: any) {
      if (registroImportacao?.id) {
        await finalizarRegistroImportacao(registroImportacao.id, 'falhou', {
          tipo: 'informes_rendimentos',
          totalLinhas: linhasInformes.length,
          linhasValidas: 0,
          linhasComErro: linhasInformes.length,
          mensagensErro: [err?.message || 'Falha na gravação dos registros'],
        }).catch(() => {})
      }
      toast({
        title: 'Erro ao processar importação',
        description: err?.message || 'Não foi possível gravar os dados importados.',
        variant: 'destructive',
      })
    } finally {
      setImportandoInformes(false)
    }
  }

  // Executar importação de Faturamentos
  const executarImportacaoFaturamentos = async () => {
    const linhasAProcessar = linhasFaturamentos.filter((l) => l.valida)
    if (linhasAProcessar.length === 0) {
      toast({
        title: 'Nenhuma linha válida',
        description: 'Corrija os erros na planilha antes de confirmar a importação.',
        variant: 'destructive',
      })
      return
    }

    setImportandoFaturamentos(true)

    let registroImportacao: ImportacaoInformeRecord | null = null
    const idsFaturamentos: string[] = []
    let faturamentosCriados = 0

    try {
      // 1. Criar registro inicial na collection importacoes_informes
      // Como a collection exige declaracao_id no schema do PocketBase (migração 0007),
      // vinculamos à primeira declaração existente ou rascunho dummy para cumprir constraint de relação
      const fallbackDecId = declaracoes[0]?.id

      registroImportacao = await criarRegistroImportacao({
        nomeArquivo: arquivoFaturamentos?.name || 'faturamentos_mensais.csv',
        file: arquivoFaturamentos || undefined,
        declaracaoId: fallbackDecId,
        tipo: 'faturamentos_mensais',
        totalLinhas: linhasFaturamentos.length,
        userId: user?.id,
      })

      // 2. Gravar faturamentos
      for (const linha of linhasAProcessar) {
        const cnpjLimpo = linha.cnpjEmpresa.replace(/\D/g, '')
        const emp = empresas.find((e) => (e.cnpj || '').replace(/\D/g, '') === cnpjLimpo)
        if (!emp) continue

        // Verifica se já existe para este ano/mês
        let fatRecord = null
        try {
          fatRecord = await pb
            .collection('empresas_faturamentos')
            .getFirstListItem(
              `empresa_id = "${emp.id}" && ano_calendario = ${linha.anoCalendario} && mes = ${linha.mes}`,
            )
        } catch {
          /* intentionally ignored */
        }

        if (fatRecord) {
          // Atualiza faturamento existente vinculando a importação
          const atualizado = await pb.collection('empresas_faturamentos').update(fatRecord.id, {
            receita_bruta: linha.receitaBruta,
            folha: linha.folha,
            lucro_contabil: linha.lucroContabil,
            compras_insumos: linha.comprasInsumos,
            importacao_id: registroImportacao.id,
          })
          idsFaturamentos.push(atualizado.id)
          faturamentosCriados++
        } else {
          // Cria novo
          const novo = await pb.collection('empresas_faturamentos').create({
            empresa_id: emp.id,
            ano_calendario: linha.anoCalendario,
            mes: linha.mes,
            receita_bruta: linha.receitaBruta,
            folha: linha.folha,
            lucro_contabil: linha.lucroContabil,
            compras_insumos: linha.comprasInsumos,
            importacao_id: registroImportacao.id,
          })
          idsFaturamentos.push(novo.id)
          faturamentosCriados++
        }
      }

      // 3. Finalizar registro
      await finalizarRegistroImportacao(registroImportacao.id, 'concluida', {
        tipo: 'faturamentos_mensais',
        totalLinhas: linhasFaturamentos.length,
        linhasValidas: linhasAProcessar.length,
        linhasComErro: invalidasFaturamentos,
        faturamentosCriados,
        idsCriados: {
          faturamentos: idsFaturamentos,
        },
      })

      toast({
        title: 'Faturamentos importados!',
        description: `${faturamentosCriados} competências mensais registradas com sucesso.`,
      })

      // Reset
      setArquivoFaturamentos(null)
      setLinhasFaturamentos([])
      setValidasFaturamentos(0)
      setInvalidasFaturamentos(0)
      if (fileInputFaturamentosRef.current) fileInputFaturamentosRef.current.value = ''
      carregarHistorico()
      setActiveTab('historico')
    } catch (err: any) {
      if (registroImportacao?.id) {
        await finalizarRegistroImportacao(registroImportacao.id, 'falhou', {
          tipo: 'faturamentos_mensais',
          totalLinhas: linhasFaturamentos.length,
          linhasValidas: 0,
          linhasComErro: linhasFaturamentos.length,
          mensagensErro: [err?.message || 'Falha na gravação dos faturamentos'],
        }).catch(() => {})
      }
      toast({
        title: 'Erro ao importar faturamentos',
        description: err?.message || 'Não foi possível gravar os faturamentos.',
        variant: 'destructive',
      })
    } finally {
      setImportandoFaturamentos(false)
    }
  }

  // Reversão de importação
  const handleConfirmarReversao = async () => {
    if (!importacaoParaReverter) return
    setRevertendo(true)
    try {
      const res = await reverterImportacao(importacaoParaReverter.id, user?.id)
      toast({
        title: 'Importação revertida com sucesso!',
        description: `Removidos: ${res.rendimentosRemovidos} rendimento(s), ${res.despesasRemovidas} despesa(s) e ${res.faturamentosRemovidos} faturamento(s).`,
      })
      setImportacaoParaReverter(null)
      carregarHistorico()
    } catch (err: any) {
      toast({
        title: 'Erro ao reverter importação',
        description: err?.message || 'Ocorreu uma falha ao tentar desfazer os registros.',
        variant: 'destructive',
      })
    } finally {
      setRevertendo(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Importação em Lote
                </h1>
                <Badge className="bg-amber-400 text-slate-900 border-0 text-[10px] font-black uppercase">
                  Enterprise
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Importe informes de rendimentos/despesas e faturamentos de PJ via planilha CSV com
                validação prévia e histórico com reversão.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-slate-100 p-1">
          <TabsTrigger value="informes" className="text-xs sm:text-sm gap-1.5">
            <Users className="w-4 h-4" />
            <span>Informes PF</span>
          </TabsTrigger>
          <TabsTrigger
            value="faturamentos"
            disabled={isStarterPFOnly}
            className="text-xs sm:text-sm gap-1.5"
          >
            <Building2 className="w-4 h-4" />
            <span>Faturamentos PJ</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs sm:text-sm gap-1.5">
            <History className="w-4 h-4" />
            <span>Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: INFORMES DE RENDIMENTOS E DESPESAS (PF) */}
        <TabsContent value="informes" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Bloco 1: Instruções e Download de Modelo */}
            <Card className="border-slate-200 shadow-sm md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  Modelo de Planilha CSV
                </CardTitle>
                <CardDescription className="text-xs">
                  Baixe a planilha modelo pré-formatada para preenchimento dos informes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-600">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <p className="font-semibold text-slate-800">Colunas obrigatórias:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                    <li>
                      <code>cpf_cliente</code> (cliente já cadastrado)
                    </li>
                    <li>
                      <code>ano_calendario</code> (ex: 2024, 2025)
                    </li>
                    <li>
                      <code>tipo_registro</code> (rendimento ou despesa)
                    </li>
                    <li>
                      <code>categoria_ou_tipo</code> (tributavel, isento, saude, educacao...)
                    </li>
                    <li>
                      <code>descricao</code> (descrição do rendimento/gasto)
                    </li>
                    <li>
                      <code>valor</code> (formato brasileiro 1.500,00 ou 1500.00)
                    </li>
                    <li>
                      <code>cnpj_fonte</code> e <code>nome_fonte</code> (opcionais)
                    </li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => baixarModelo('informes')}
                  className="w-full text-xs font-semibold gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Modelo de Informes (.CSV)
                </Button>
              </CardContent>
            </Card>

            {/* Bloco 2: Upload do arquivo */}
            <Card className="border-slate-200 shadow-sm md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  Upload do Arquivo CSV
                </CardTitle>
                <CardDescription className="text-xs">
                  Arraste ou selecione o arquivo com os informes de rendimentos e despesas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onClick={() => fileInputInformesRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-purple-50/20 group"
                >
                  <input
                    ref={fileInputInformesRef.current ? fileInputInformesRef : undefined}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={handleFileChangeInformes}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    {arquivoInformes
                      ? arquivoInformes.name
                      : 'Clique para selecionar seu arquivo CSV'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Aceita separador ponto e vírgula (;) ou vírgula (,), UTF-8
                  </p>
                </div>

                {linhasInformes.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {validasInformes} válidas
                      </Badge>
                      {invalidasInformes > 0 && (
                        <Badge className="bg-rose-100 text-rose-800 border-0 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          {invalidasInformes} com erro
                        </Badge>
                      )}
                      <span className="text-slate-500 text-[11px]">
                        Total de {linhasInformes.length} linha(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setArquivoInformes(null)
                          setLinhasInformes([])
                          setValidasInformes(0)
                          setInvalidasInformes(0)
                          if (fileInputInformesRef.current) fileInputInformesRef.current.value = ''
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Limpar
                      </Button>
                      <Button
                        size="sm"
                        disabled={validasInformes === 0 || importandoInformes}
                        onClick={executarImportacaoInformes}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      >
                        {importandoInformes ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar Importação ({validasInformes})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prévia da Tabela de Informes */}
          {linhasInformes.length > 0 && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Validação e Prévia das Linhas
                  </CardTitle>
                  <span className="text-[11px] text-slate-500">
                    Apenas linhas válidas serão inseridas no banco
                  </span>
                </div>
              </CardHeader>
              <div className="max-h-[380px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] sticky top-0 z-10 shadow-xs">
                    <TableRow>
                      <TableHead className="w-14">Linha</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead>CPF Cliente</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Categoria/Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Fonte Pagadora</TableHead>
                      <TableHead>Erros / Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {linhasInformes.map((l) => (
                      <TableRow
                        key={l.linhaNum}
                        className={!l.valida ? 'bg-rose-50/50 hover:bg-rose-50' : ''}
                      >
                        <TableCell className="font-mono text-[11px] text-slate-500">
                          #{l.linhaNum}
                        </TableCell>
                        <TableCell>
                          {l.valida ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] py-0 border-0">
                              Válida
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px] py-0 border-0">
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.cpfCliente || '-'}</TableCell>
                        <TableCell>{l.anoCalendario || '-'}</TableCell>
                        <TableCell className="capitalize">{l.tipoRegistro}</TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {l.categoriaOuTipo}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={l.descricao}>
                          {l.descricao}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">
                          {formatCurrency(l.valor)}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-500 truncate max-w-[160px]">
                          {l.nomeFonte || l.cnpjFonte || '-'}
                        </TableCell>
                        <TableCell className="text-rose-600 text-[11px]">
                          {l.erros.length > 0 ? l.erros.join('; ') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: FATURAMENTOS MENSAIS (PJ) */}
        <TabsContent value="faturamentos" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Bloco 1: Modelo Faturamentos */}
            <Card className="border-slate-200 shadow-sm md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  Modelo de Faturamentos (.CSV)
                </CardTitle>
                <CardDescription className="text-xs">
                  Baixe a planilha modelo para importação dos faturamentos e folhas de empresas PJ.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-600">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <p className="font-semibold text-slate-800">Colunas esperadas:</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                    <li>
                      <code>cnpj_empresa</code> (empresa cadastrada no app)
                    </li>
                    <li>
                      <code>ano_calendario</code> (ex: 2024, 2025)
                    </li>
                    <li>
                      <code>mes</code> (competência de 1 a 12)
                    </li>
                    <li>
                      <code>receita_bruta</code> (ex: 85000,00)
                    </li>
                    <li>
                      <code>folha</code> (salários + pró-labore + encargos)
                    </li>
                    <li>
                      <code>lucro_contabil</code> (opcional)
                    </li>
                    <li>
                      <code>compras_insumos</code> (opcional, Lucro Real)
                    </li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => baixarModelo('faturamentos')}
                  className="w-full text-xs font-semibold gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Modelo de Faturamentos (.CSV)
                </Button>
              </CardContent>
            </Card>

            {/* Bloco 2: Upload Faturamentos */}
            <Card className="border-slate-200 shadow-sm md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  Upload de Faturamentos Mensais
                </CardTitle>
                <CardDescription className="text-xs">
                  Arraste ou escolha o arquivo CSV de faturamentos das empresas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onClick={() => fileInputFaturamentosRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-purple-50/20 group"
                >
                  <input
                    ref={fileInputFaturamentosRef.current ? fileInputFaturamentosRef : undefined}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={handleFileChangeFaturamentos}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    {arquivoFaturamentos
                      ? arquivoFaturamentos.name
                      : 'Clique para selecionar seu arquivo CSV de faturamentos'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Valores em reais com vírgula decimal (ex: 95.000,00 ou 95000.00)
                  </p>
                </div>

                {linhasFaturamentos.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {validasFaturamentos} válidas
                      </Badge>
                      {invalidasFaturamentos > 0 && (
                        <Badge className="bg-rose-100 text-rose-800 border-0 flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          {invalidasFaturamentos} com erro
                        </Badge>
                      )}
                      <span className="text-slate-500 text-[11px]">
                        Total de {linhasFaturamentos.length} competência(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setArquivoFaturamentos(null)
                          setLinhasFaturamentos([])
                          setValidasFaturamentos(0)
                          setInvalidasFaturamentos(0)
                          if (fileInputFaturamentosRef.current)
                            fileInputFaturamentosRef.current.value = ''
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Limpar
                      </Button>
                      <Button
                        size="sm"
                        disabled={validasFaturamentos === 0 || importandoFaturamentos}
                        onClick={executarImportacaoFaturamentos}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      >
                        {importandoFaturamentos ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirmar Importação ({validasFaturamentos})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Prévia da Tabela de Faturamentos */}
          {linhasFaturamentos.length > 0 && (
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-200 py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Validação e Prévia das Competências
                  </CardTitle>
                  <span className="text-[11px] text-slate-500">
                    Atualiza meses existentes ou insere novas competências na empresa
                  </span>
                </div>
              </CardHeader>
              <div className="max-h-[380px] overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] sticky top-0 z-10 shadow-xs">
                    <TableRow>
                      <TableHead className="w-14">Linha</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead>CNPJ Empresa</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Receita Bruta</TableHead>
                      <TableHead className="text-right">Folha</TableHead>
                      <TableHead className="text-right">Lucro Contábil</TableHead>
                      <TableHead className="text-right">Compras Insumos</TableHead>
                      <TableHead>Erros / Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {linhasFaturamentos.map((l) => (
                      <TableRow
                        key={l.linhaNum}
                        className={!l.valida ? 'bg-rose-50/50 hover:bg-rose-50' : ''}
                      >
                        <TableCell className="font-mono text-[11px] text-slate-500">
                          #{l.linhaNum}
                        </TableCell>
                        <TableCell>
                          {l.valida ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] py-0 border-0">
                              Válida
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px] py-0 border-0">
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.cnpjEmpresa || '-'}</TableCell>
                        <TableCell>{l.anoCalendario || '-'}</TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {l.mes ? `${String(l.mes).padStart(2, '0')}/${l.anoCalendario}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">
                          {formatCurrency(l.receitaBruta)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {formatCurrency(l.folha)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {formatCurrency(l.lucroContabil)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {formatCurrency(l.comprasInsumos)}
                        </TableCell>
                        <TableCell className="text-rose-600 text-[11px]">
                          {l.erros.length > 0 ? l.erros.join('; ') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: HISTÓRICO DE IMPORTAÇÕES E REVERSÃO */}
        <TabsContent value="historico" className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200 py-3.5 px-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  Histórico de Importações do Escritório
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhe os arquivos processados e reverta lotes quando necessário.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={carregarHistorico}
                disabled={loadingHistorico}
                className="text-xs h-8 border-slate-300"
              >
                {loadingHistorico ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RotateCcw className="w-3 h-3 mr-1" />
                )}
                Atualizar
              </Button>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 text-[11px]">
                  <TableRow>
                    <TableHead>Data / Hora</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Totais Processados</TableHead>
                    <TableHead>Importado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {loadingHistorico ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                        Carregando histórico de importações...
                      </TableCell>
                    </TableRow>
                  ) : historico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                        Nenhuma importação realizada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historico.map((item) => {
                      const detalhes = item.detalhes
                      const ehInformes = detalhes?.tipo === 'informes_rendimentos'
                      const foiCancelada = item.status === 'cancelada'
                      const podeReverter = item.status === 'concluida'

                      return (
                        <TableRow
                          key={item.id}
                          className={foiCancelada ? 'opacity-60 bg-slate-50/60' : ''}
                        >
                          <TableCell className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {formatDateTime(item.created)}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]" title={item.nome_arquivo}>
                              {item.nome_arquivo}
                            </span>
                          </TableCell>
                          <TableCell>
                            {ehInformes ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50/50"
                              >
                                Informes PF
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-emerald-200 text-emerald-700 bg-emerald-50/50"
                              >
                                Faturamentos PJ
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.status === 'concluida' && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">
                                Concluída
                              </Badge>
                            )}
                            {item.status === 'processando' && (
                              <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]">
                                Processando
                              </Badge>
                            )}
                            {item.status === 'falhou' && (
                              <Badge className="bg-rose-100 text-rose-800 border-0 text-[10px]">
                                Falhou
                              </Badge>
                            )}
                            {item.status === 'cancelada' && (
                              <Badge className="bg-slate-200 text-slate-700 border-0 text-[10px]">
                                Revertida
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600 text-[11px]">
                            {ehInformes ? (
                              <span>
                                {detalhes?.rendimentosCriados || 0} rendimentos,{' '}
                                {detalhes?.despesasCriadas || 0} despesas
                              </span>
                            ) : (
                              <span>{detalhes?.faturamentosCriados || 0} faturamentos mensais</span>
                            )}
                            {foiCancelada && item.reversao && (
                              <p className="text-[10px] text-amber-700 mt-0.5">
                                Revertido em {formatDateTime(item.reversao.revertidoEm)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 text-[11px]">
                            {item.expand?.importado_por?.name || user?.name || 'Admin'}
                          </TableCell>
                          <TableCell className="text-right">
                            {podeReverter ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setImportacaoParaReverter(item)}
                                className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reverter
                              </Button>
                            ) : foiCancelada ? (
                              <span className="text-[11px] text-slate-400 italic">Desfeita</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Confirmação de Reversão */}
      <AlertDialog
        open={!!importacaoParaReverter}
        onOpenChange={(open) => !open && setImportacaoParaReverter(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Confirmar reversão da importação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2 pt-2">
              <p>
                Você está prestes a reverter a importação do arquivo{' '}
                <strong>{importacaoParaReverter?.nome_arquivo}</strong> realizada em{' '}
                <strong>{formatDateTime(importacaoParaReverter?.created)}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-800 text-[11px]">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Impacto da reversão:
                </p>
                <p className="mt-1">
                  Todos os rendimentos, despesas ou faturamentos gerados exclusivamente por esta
                  importação serão excluídos permanentemente. Registros criados manualmente ou por
                  outras importações permanecerão intocados.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revertendo} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revertendo}
              onClick={handleConfirmarReversao}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
            >
              {revertendo ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Revertendo...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3" />
                  Sim, reverter importação
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
