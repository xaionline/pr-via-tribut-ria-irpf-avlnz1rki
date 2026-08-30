import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Users,
  Calculator,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getEmpresa, deleteEmpresa } from '@/services/empresas'
import { EmpresaSociosTab } from './EmpresaSociosTab'
import { EmpresaApuracaoTab } from './EmpresaApuracaoTab'
import { maskCnpj, formatDate } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { EmpresaRecord } from '@/types'

export default function EmpresaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') || 'socios'

  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [empresa, setEmpresa] = useState<EmpresaRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const carregar = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getEmpresa(id)
      setEmpresa(data)
    } catch (err) {
      toast({
        title: 'Empresa não encontrada',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
      navigate('/app/empresas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [id])

  const handleDelete = async () => {
    if (!empresa) return
    setDeleting(true)
    try {
      await deleteEmpresa(empresa.id)
      toast({
        title: 'Empresa excluída',
        description: `${empresa.razao_social} foi removida`,
      })
      navigate('/app/empresas')
    } catch (err) {
      toast({
        title: 'Falha ao excluir empresa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Carregando detalhes da empresa...
      </div>
    )
  }

  if (!empresa) return null

  return (
    <div className="space-y-6">
      <Breadcrumbs />

      {/* Header da Empresa */}
      <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/empresas')}
            className="h-10 w-10 text-slate-500 hover:text-slate-900 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {empresa.razao_social}
              </h1>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold capitalize"
              >
                {empresa.regime === 'simples'
                  ? `Simples Nacional (Anexo ${empresa.anexo_simples || 'III'})`
                  : empresa.regime === 'presumido'
                    ? 'Lucro Presumido'
                    : 'Lucro Real'}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="font-mono font-medium">CNPJ: {maskCnpj(empresa.cnpj)}</span>
              {empresa.data_abertura && <span>Abertura: {formatDate(empresa.data_abertura)}</span>}
              {empresa.atividade && (
                <span className="text-slate-600 max-w-md truncate">{empresa.atividade}</span>
              )}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/app/empresas/${empresa.id}/editar`)}
            className="text-xs gap-1.5 h-9"
          >
            <Edit className="w-3.5 h-3.5" /> Editar
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-xs gap-1.5 h-9 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <Tabs
        value={tabParam}
        onValueChange={(v) => setSearchParams({ tab: v })}
        className="space-y-6"
      >
        <TabsList className="bg-slate-100 p-1 border border-slate-200/80">
          <TabsTrigger value="socios" className="text-xs gap-1.5 data-[state=active]:bg-white">
            <Users className="w-3.5 h-3.5" />
            <span>Sócios PF & Vínculos</span>
          </TabsTrigger>
          <TabsTrigger value="apuracao" className="text-xs gap-1.5 data-[state=active]:bg-white">
            <Calculator className="w-3.5 h-3.5" />
            <span>Apuração PJ & Distribuição IRPF</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="socios" className="mt-0 focus-visible:outline-none">
          <EmpresaSociosTab empresa={empresa} />
        </TabsContent>

        <TabsContent value="apuracao" className="mt-0 focus-visible:outline-none">
          <EmpresaApuracaoTab empresa={empresa} />
        </TabsContent>
      </Tabs>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresa?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a empresa <strong>{empresa.razao_social}</strong> e todos os seus
              vínculos de sócios e faturamentos. Os clientes PF vinculados continuarão existindo
              intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
