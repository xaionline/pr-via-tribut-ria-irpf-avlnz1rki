import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, ArrowLeft, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getEmpresa, createEmpresa, updateEmpresa } from '@/services/empresas'
import { maskCnpj } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { RegimeTributarioPJ, AnexoSimplesNacional } from '@/types'

export default function EmpresaForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { escritorio } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)

  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [regime, setRegime] = useState<RegimeTributarioPJ>('simples')
  const [atividade, setAtividade] = useState('')
  const [anexoSimples, setAnexoSimples] = useState<AnexoSimplesNacional>('III')
  const [dataAbertura, setDataAbertura] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getEmpresa(id)
      .then((emp) => {
        setRazaoSocial(emp.razao_social || '')
        setCnpj(emp.cnpj || '')
        setRegime(emp.regime || 'simples')
        setAtividade(emp.atividade || '')
        setAnexoSimples(emp.anexo_simples || 'III')
        setDataAbertura(emp.data_abertura ? emp.data_abertura.split('T')[0] : '')
      })
      .catch((err) => {
        toast({
          title: 'Erro ao carregar empresa',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
        navigate('/app/empresas')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 14)
    setCnpj(maskCnpj(raw))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!razaoSocial.trim()) {
      toast({ title: 'Informe a Razão Social', variant: 'destructive' })
      return
    }
    const cleanCnpj = cnpj.replace(/\D/g, '')
    if (cleanCnpj.length !== 14) {
      toast({ title: 'Informe um CNPJ válido com 14 dígitos', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (isEditing && id) {
        await updateEmpresa(id, {
          razao_social: razaoSocial.trim(),
          cnpj: maskCnpj(cleanCnpj),
          regime,
          atividade: atividade.trim(),
          anexo_simples: regime === 'simples' ? anexoSimples : undefined,
          data_abertura: dataAbertura || undefined,
        })
        toast({ title: 'Empresa atualizada com sucesso!' })
        navigate(`/app/empresas/${id}`)
      } else {
        const nova = await createEmpresa({
          escritorio_id: escritorio?.id || '',
          razao_social: razaoSocial.trim(),
          cnpj: maskCnpj(cleanCnpj),
          regime,
          atividade: atividade.trim(),
          anexo_simples: regime === 'simples' ? anexoSimples : undefined,
          data_abertura: dataAbertura || undefined,
        })
        toast({ title: 'Empresa cadastrada com sucesso!' })
        navigate(`/app/empresas/${nova.id}`)
      }
    } catch (err) {
      toast({
        title: 'Falha ao salvar empresa',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">Carregando dados da empresa...</div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Breadcrumbs />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/empresas')}>
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Editar Empresa' : 'Nova Empresa (Pessoa Jurídica)'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEditing
              ? 'Atualize os dados cadastrais e regime tributário da empresa'
              : 'Cadastre a empresa principal para vincular seus sócios e realizar apurações'}
          </p>
        </div>
      </div>

      <Card className="border border-slate-200/80 shadow-subtle">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="razao" className="text-xs font-semibold text-slate-700">
                  Razão Social / Nome Empresarial *
                </Label>
                <Input
                  id="razao"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex: Tech & Soluções Digitais LTDA"
                  className="h-10 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                  CNPJ *
                </Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  className="h-10 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="regime" className="text-xs font-semibold text-slate-700">
                  Regime Tributário *
                </Label>
                <Select value={regime} onValueChange={(v) => setRegime(v as RegimeTributarioPJ)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simples">Simples Nacional</SelectItem>
                    <SelectItem value="presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="real">Lucro Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {regime === 'simples' && (
                <div className="space-y-1.5">
                  <Label htmlFor="anexo" className="text-xs font-semibold text-slate-700">
                    Anexo Padrão do Simples *
                  </Label>
                  <Select
                    value={anexoSimples}
                    onValueChange={(v) => setAnexoSimples(v as AnexoSimplesNacional)}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">Anexo I — Comércio</SelectItem>
                      <SelectItem value="II">Anexo II — Indústria</SelectItem>
                      <SelectItem value="III">Anexo III — Serviços (Geral)</SelectItem>
                      <SelectItem value="IV">
                        Anexo IV — Serviços (Construção/Vigilância)
                      </SelectItem>
                      <SelectItem value="V">Anexo V — Intelectuais (Fator R)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="data_abertura" className="text-xs font-semibold text-slate-700">
                  Data de Abertura / Início
                </Label>
                <Input
                  id="data_abertura"
                  type="date"
                  value={dataAbertura}
                  onChange={(e) => setDataAbertura(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="atividade" className="text-xs font-semibold text-slate-700">
                  Atividade Econômica / CNAE / Descrição dos Serviços
                </Label>
                <Input
                  id="atividade"
                  value={atividade}
                  onChange={(e) => setAtividade(e.target.value)}
                  placeholder="Ex: Desenvolvimento de programas de computador sob encomenda (CNAE 6201-5/01)"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/empresas')}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs shadow-sm"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isEditing ? 'Salvar alterações' : 'Cadastrar empresa'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
