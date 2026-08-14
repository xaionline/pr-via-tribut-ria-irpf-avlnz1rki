import { useEffect, useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { Building2, Save, Upload, Loader2, ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  atualizarEscritorio,
  getEscritorioConfig,
  getLogoUrl,
  uploadLogoEscritorio,
} from '@/services/configuracoes'
import { maskCnpj, maskTelefone, maskCep } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type { EscritorioRecord } from '@/types'

export function EscritorioTab() {
  const { escritorio, user } = useAuth()
  const { toast } = useToast()
  const escId = escritorio?.id || user?.escritorio_id || ''

  const [dados, setDados] = useState<EscritorioRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Campos do formulário.
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [cep, setCep] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const carregar = async () => {
    if (!escId) {
      setLoading(false)
      setErro(true)
      return
    }
    setLoading(true)
    setErro(false)
    try {
      const esc = await getEscritorioConfig(escId)
      setDados(esc)
      setNome(esc.nome || '')
      setCnpj(esc.cnpj || '')
      setTelefone(esc.telefone || '')
      setEmail(esc.email || '')
      setLogradouro(esc.logradouro || '')
      setNumero(esc.numero || '')
      setComplemento(esc.complemento || '')
      setBairro(esc.bairro || '')
      setCidade(esc.cidade || '')
      setEstado(esc.estado || '')
      setCep(esc.cep || '')
    } catch (err) {
      setErro(true)
      toast({
        title: 'Falha ao carregar dados do escritório',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escId])

  const salvar = async () => {
    if (!escId) return
    setSaving(true)
    try {
      const payload: Partial<EscritorioRecord> = {
        nome,
        cnpj: cnpj.replace(/\D/g, ''),
        telefone: telefone.replace(/\D/g, ''),
        email,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado: estado.toUpperCase().slice(0, 2),
        cep: cep.replace(/\D/g, ''),
      }
      const atualizado = await atualizarEscritorio(escId, payload)
      setDados(atualizado)
      toast({ title: 'Configurações salvas' })
    } catch (err) {
      toast({
        title: 'Falha ao salvar configurações',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogo = async (file?: File | null) => {
    if (!file || !escId) return
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem.',
        variant: 'destructive',
      })
      return
    }
    setUploading(true)
    try {
      const atualizado = await uploadLogoEscritorio(escId, file)
      setDados(atualizado)
      toast({ title: 'Logo atualizado' })
    } catch (err) {
      toast({
        title: 'Falha ao enviar logo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleLogo(e.target.files?.[0])
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    handleLogo(e.dataTransfer.files?.[0])
  }

  const logoUrl = dados ? getLogoUrl(dados) : null
  const dirty =
    nome !== (dados?.nome || '') ||
    cnpj !== (dados?.cnpj || '') ||
    telefone !== (dados?.telefone || '') ||
    email !== (dados?.email || '') ||
    logradouro !== (dados?.logradouro || '') ||
    numero !== (dados?.numero || '') ||
    complemento !== (dados?.complemento || '') ||
    bairro !== (dados?.bairro || '') ||
    cidade !== (dados?.cidade || '') ||
    estado !== (dados?.estado || '') ||
    cep !== (dados?.cep || '')

  if (loading) return <EscritorioSkeleton />

  if (erro) {
    return (
      <Card className="p-10 text-center border-dashed border-rose-200 bg-rose-50/40">
        <p className="text-sm text-slate-600">Não foi possível carregar os dados do escritório.</p>
        <Button onClick={carregar} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-xs">
          Repetir
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed cursor-pointer flex items-center justify-center transition-colors ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50'
              }`}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo do escritório"
                  className="w-full h-full object-cover"
                />
              ) : uploading ? (
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] mt-1">Logo</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3.5 h-3.5" />
              {logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </Button>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Logo do escritório
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Arraste e solte uma imagem ou clique para selecionar. A imagem é exibida em formato
              circular nos demonstrativos e documentos do escritório. Formatos: PNG, JPG, WebP.
            </p>
          </div>
        </div>
      </Card>

      {/* Dados cadastrais */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Dados cadastrais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome do escritório" className="sm:col-span-2">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
          <Field label="CNPJ">
            <Input
              value={maskCnpj(cnpj)}
              onChange={(e) => setCnpj(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              className="h-10 text-xs font-mono tabular-nums"
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={maskTelefone(telefone)}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              className="h-10 text-xs font-mono tabular-nums"
            />
          </Field>
          <Field label="E-mail de contato" className="sm:col-span-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@escritorio.com.br"
              className="h-10 text-xs"
            />
          </Field>
        </div>
      </Card>

      {/* Endereço */}
      <Card className="p-5 border border-slate-200/80 shadow-subtle">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Endereço</h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <Field label="Logradouro" className="sm:col-span-7">
            <Input
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
          <Field label="Número" className="sm:col-span-2">
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
          <Field label="Complemento" className="sm:col-span-3">
            <Input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
          <Field label="Bairro" className="sm:col-span-5">
            <Input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
          <Field label="Cidade" className="sm:col-span-4">
            <Input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="h-10 text-xs"
            />
          </Field>
          <Field label="Estado" className="sm:col-span-1">
            <Input
              value={estado}
              onChange={(e) => setEstado(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
              placeholder="SP"
              maxLength={2}
              className="h-10 text-xs uppercase"
            />
          </Field>
          <Field label="CEP" className="sm:col-span-2">
            <Input
              value={maskCep(cep)}
              onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="00000-000"
              inputMode="numeric"
              className="h-10 text-xs font-mono tabular-nums"
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={salvar}
          disabled={saving || !dirty}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
    </div>
  )
}

function EscritorioSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="p-5 border border-slate-200/80">
        <div className="flex gap-5">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </Card>
      <Card className="p-5 border border-slate-200/80 space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
      <Card className="p-5 border border-slate-200/80 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )
}
