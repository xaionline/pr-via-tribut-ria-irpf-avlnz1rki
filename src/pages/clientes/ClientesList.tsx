import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Filter, User, MoreVertical, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getClientes, deleteCliente } from '@/services/clientes'
import { maskCpf } from '@/lib/formatters'
import type { ClienteRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function ClientesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [search, setSearch] = useState(initialQuery)
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getClientes(search, page, 10)
      setClientes(res.items)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalItems)
    } catch (_) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, page])

  useRealtime('clientes', () => loadData())

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) return
    try {
      await deleteCliente(id)
      toast({ title: 'Cliente removido', description: `${name} foi excluído.` })
      loadData()
    } catch (_) {
      toast({ title: 'Erro', description: 'Falha ao excluir o cliente.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Clientes do Escritório
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie declarantes pessoa física e sócios de empresas vinculados ao seu escritório.
          </p>
        </div>

        <Button
          onClick={() => navigate('/app/clientes/novo')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      {/* Toolbar / Search & Filter */}
      <Card className="border border-slate-200/80 shadow-subtle p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSearchParams({ q: e.target.value })
              }}
              className="pl-9 text-xs h-10"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-xs h-10">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filtros</span>
          </Button>
        </div>
      </Card>

      {/* Main Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Carregando lista de clientes...
        </div>
      ) : clientes.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum cliente encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'Tente ajustar os termos de pesquisa ou remover os filtros.'
              : 'Cadastre o primeiro cliente para começar a apurar a prévia do imposto.'}
          </p>
          {!search && (
            <Button
              onClick={() => navigate('/app/clientes/novo')}
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Cliente</span>
            </Button>
          )}
        </Card>
      ) : (
        <>
          <Card className="hidden md:block border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
                    <th className="py-3 px-4">Nome / Declarante</th>
                    <th className="py-3 px-4">CPF</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientes.map((c) => {
                    const initials = c.nome ? c.nome.slice(0, 2).toUpperCase() : 'CL'
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link
                                to={`/app/clientes/${c.id}`}
                                className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
                              >
                                {c.nome}
                              </Link>
                              {c.email && <p className="text-[10px] text-slate-400">{c.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{maskCpf(c.cpf)}</td>
                        <td className="py-3 px-4 text-slate-600 capitalize">
                          {c.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Sócio'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 text-xs">
                              <DropdownMenuItem onClick={() => navigate(`/app/clientes/${c.id}`)}>
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                <span>Ver Perfil</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/app/clientes/${c.id}/editar`)}
                              >
                                <Edit className="w-3.5 h-3.5 mr-2" />
                                <span>Editar</span>
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(c.id, c.nome)}
                                  className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  <span>Excluir</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total de {totalItems} clientes (Página {page} de {totalPages})
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

          <div className="md:hidden space-y-3">
            {clientes.map((c) => {
              const initials = c.nome ? c.nome.slice(0, 2).toUpperCase() : 'CL'
              return (
                <Card key={c.id} className="p-3 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8 bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/app/clientes/${c.id}`}
                        className="font-semibold text-xs text-slate-900 hover:text-emerald-600 transition-colors block truncate"
                      >
                        {c.nome}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono">{maskCpf(c.cpf)}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                    <span>{c.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Sócio'}</span>
                    {c.email && <span className="truncate ml-2">{c.email}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs touch-target"
                      onClick={() => navigate(`/app/clientes/${c.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-xs touch-target"
                      onClick={() => navigate(`/app/clientes/${c.id}/editar`)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="md:hidden flex items-center justify-between text-xs text-slate-500 mt-3">
            <span>
              Pág. {page} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-9 text-xs touch-target"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="h-9 text-xs touch-target"
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
