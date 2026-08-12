import { useEffect, useState } from 'react'
import { Plus, Trash2, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getFontesPagadoras,
  createFontePagadora,
  deleteFontePagadora,
} from '@/services/declaracoes'
import type { FontePagadoraRecord } from '@/types'
import { useToast } from '@/hooks/use-toast'

export default function TabFontesPagadoras({ declaracaoId }: { declaracaoId: string }) {
  const [fontes, setFontes] = useState<FontePagadoraRecord[]>([])
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [tipo, setTipo] = useState<'salario' | 'aposentadoria' | 'pro_labore' | 'outros'>('salario')
  const { toast } = useToast()

  const loadData = () => {
    getFontesPagadoras(declaracaoId).then(setFontes)
  }

  useEffect(() => {
    loadData()
  }, [declaracaoId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) return
    try {
      await createFontePagadora({ declaracao_id: declaracaoId, nome, cnpj, tipo })
      toast({ title: 'Fonte adicionada' })
      setOpen(false)
      setNome('')
      setCnpj('')
      loadData()
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDelete = async (id: string) => {
    await deleteFontePagadora(id)
    toast({ title: 'Fonte removida' })
    loadData()
  }

  return (
    <Card className="border border-slate-200/80 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-bold">Fontes Pagadoras Cadastradas</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Fonte</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Nova Fonte Pagadora</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label>Nome da Empresa / Pagador *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>CNPJ / CPF do Pagador</Label>
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Rendimento Vinculado</Label>
                <Select value={tipo} onValueChange={(v: any) => setTipo(val as any)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salario">Salário / Trabalho Assalariado</SelectItem>
                    <SelectItem value="pro_labore">Pró-labore de Sócio</SelectItem>
                    <SelectItem value="aposentadoria">Aposentadoria / Pensão</SelectItem>
                    <SelectItem value="outros">Outros Rendimentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              >
                Salvar Fonte
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {fontes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Nenhuma fonte pagadora informada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {fontes.map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">{f.nome}</span>
                    <span className="text-[10px] text-slate-400">
                      CNPJ: {f.cnpj || '-'} • Tipo: {f.tipo}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
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
