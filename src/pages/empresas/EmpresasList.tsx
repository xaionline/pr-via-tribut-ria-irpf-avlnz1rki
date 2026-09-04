import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Plus,
  Search,
  Users,
  Calculator,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getEmpresas, deleteEmpresa } from '@/services/empresas'
import { maskCnpj, formatDate } from '@/lib/formatters'
import type { EmpresaRecord } from '@/types'

export default function EmpresasList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [search, setSearch] = useState(initialQuery)
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Exclusão
  const [deleteItem, setDeleteItem] = useState<EmpresaRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const navigate = useNavigate()
  const { isAdmin, isStarterPFOnly } = useAuth()
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getEmpresas(search, page, 10)
      setEmpresas(res.items)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalItems)
    } catch {
      toast({
        title: 'Falha ao carregar empresas',
        description: 'Tente novamente em instantes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, page])

  const handleDelete = async () => {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await deleteEmpresa(deleteItem.id)
      toast({
        title: 'Empresa removida',
        description: `${deleteItem.razao_social} foi excluída com sucesso`,
      })
      setDeleteItem(null)
      loadData()
    } catch {
      toast({
        title: 'Falha ao excluir empresa',
        description: 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const getRegimeBadge = (regime: string, anexo?: string) => {
    if (regime === 'simples') {
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 border font-medium text-[10px]">
          Simples Nacional {anexo ? `(Anexo ${anexo})` : ''}
        </Badge>
      )
    }
    if (regime === 'presumido') {
      return (
        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 border font-medium text-[10px]">
          Lucro Presumido
        </Badge>
      )
    }
    return (
      <Badge className="bg-slate-50 text-slate-700 border-slate-200 border font-medium text-[10px]">
        Lucro Real
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Empresas (Pessoa Jurídica)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastro principal das empresas, vínculo com sócios PF e apuração tributária
                (Simples e Lucro Presumido).
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            if (isStarterPFOnly) {
              toast({
                title: 'Recurso exclusivo do plano Pro',
                description:
                  'O cadastro de empresas PJ está restrito no plano Starter. Faça upgrade para o Pro para cadastrar empresas.',
                variant: 'destructive',
              })
              navigate('/app/planos')
              return
            }
            navigate('/app/empresas/nova')
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 shadow-sm text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nova empresa</span>
        </Button>
      </div>

      {/* Toolbar / Filtro */}
      <Card className="border border-slate-200/80 shadow-subtle p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar por razão social, CNPJ ou atividade/CNAE..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSearchParams({ q: e.target.value })
              }}
              className="pl-9 text-xs h-10"
            />
          </div>
          {search && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-10"
              onClick={() => {
                setSearch('')
                setSearchParams({})
              }}
            >
              Limpar busca
            </Button>
          )}
        </div>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Carregando lista de empresas...
        </div>
      ) : empresas.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {search ? `Nenhuma empresa encontrada para "${search}"` : 'Nenhuma empresa cadastrada'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'Verifique os termos da busca ou limpe o filtro.'
              : 'Cadastre a primeira empresa para gerenciar sócios, faturamentos e apuração PJ.'}
          </p>
          {!search && (
            <Button
              onClick={() => {
                if (isStarterPFOnly) {
                  toast({
                    title: 'Recurso exclusivo do plano Pro',
                    description:
                      'O cadastro de empresas PJ está restrito no plano Starter. Faça upgrade para o Pro para cadastrar empresas.',
                    variant: 'destructive',
                  })
                  navigate('/app/planos')
                  return
                }
                navigate('/app/empresas/nova')
              }}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nova empresa</span>
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Tabela Desktop */}
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Razão Social / CNPJ</th>
                    <th className="py-3 px-4">Regime Tributário</th>
                    <th className="py-3 px-4">Atividade / CNAE</th>
                    <th className="py-3 px-4">Data Abertura</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empresas.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <Link
                            to={`/app/empresas/${emp.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors block text-sm"
                          >
                            {emp.razao_social}
                          </Link>
                          <span className="text-[11px] font-mono text-slate-500">
                            {maskCnpj(emp.cnpj)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getRegimeBadge(emp.regime, emp.anexo_simples)}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {emp.atividade || 'Não especificada'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {formatDate(emp.data_abertura)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/app/empresas/${emp.id}`)}
                            className="h-8 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Acessar</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem onClick={() => navigate(`/app/empresas/${emp.id}`)}>
                                <Users className="w-3.5 h-3.5 mr-2" />
                                <span>Ver Sócios</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/app/empresas/${emp.id}/obrigacoes`)}
                              >
                                <Calendar className="w-3.5 h-3.5 mr-2 text-blue-600" />
                                <span>Obrigações Acessórias</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/app/empresas/${emp.id}?tab=apuracao`)}
                              >
                                <Calculator className="w-3.5 h-3.5 mr-2" />
                                <span>Apuração PJ</span>
                              </DropdownMenuItem>{' '}
                              <DropdownMenuItem
                                onClick={() => navigate(`/app/empresas/${emp.id}/editar`)}
                              >
                                <Edit className="w-3.5 h-3.5 mr-2" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => setDeleteItem(emp)}
                                  className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  <span>Excluir</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total de {totalItems} empresa(s) (Página {page} de {totalPages})
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="h-8 text-xs"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="h-8 text-xs"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </Card>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-3">
            {empresas.map((emp) => (
              <Card key={emp.id} className="p-4 border border-slate-200/80 shadow-subtle space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/app/empresas/${emp.id}`}
                      className="font-bold text-sm text-slate-900 hover:text-blue-600 block"
                    >
                      {emp.razao_social}
                    </Link>
                    <span className="text-xs font-mono text-slate-500">{maskCnpj(emp.cnpj)}</span>
                  </div>
                  {getRegimeBadge(emp.regime, emp.anexo_simples)}
                </div>
                {emp.atividade && (
                  <p className="text-xs text-slate-600 line-clamp-2">{emp.atividade}</p>
                )}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => navigate(`/app/empresas/${emp.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Perfil & Sócios
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs text-blue-700 bg-blue-50 border-blue-200"
                    onClick={() => navigate(`/app/empresas/${emp.id}/obrigacoes`)}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1" /> Obrigações
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresa?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Esta ação removerá a empresa <strong>{deleteItem?.razao_social}</strong> (CNPJ:{' '}
              {deleteItem?.cnpj}) e todo o histórico de faturamentos e vínculos de sócios. Os
              clientes PF continuarão existindo normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Excluir Empresa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
