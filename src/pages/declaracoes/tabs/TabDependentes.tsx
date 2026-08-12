import { useEffect, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getDependentes, createDependente, deleteDependente } from '@/services/declaracoes'
import { formatDate, maskCpf } from '@/lib/formatters'
import type { DependenteRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function TabDependentes({ declaracaoId }: { declaracaoId: string }) {
  const [dependentes, setDependentes] = useState<DependenteRecord[]>([])
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const { toast } = useToast()

  const loadData = () => {
    getDependentes(declaracaoId).then(setDependentes)
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) return
    try {
      await createDependente({
        declaracao_id: declaracaoId,
        nome,
        cpf,
        data_nascimento: dataNascimento || undefined,
      })
      toast({ title: 'Dependente adicionado' })
      setOpen(false)
      setNome('')
      setCpf('')
      setDataNascimento('')
      loadData()
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDelete = async (id: string) => {
    await deleteDependente(id)
    toast({ title: 'Dependente removido' })
    loadData()
  }

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold">Dependentes</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Dependente</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Novo Dependente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>CPF</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              >
                Salvar Dependente
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {dependentes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhum dependente informado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {dependentes.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">{d.nome}</span>
                    <span className="text-[10px] text-slate-400">
                      CPF: {maskCpf(d.cpf)}
                      {d.data_nascimento ? ` • Nasc.: ${formatDate(d.data_nascimento)}` : ''}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
