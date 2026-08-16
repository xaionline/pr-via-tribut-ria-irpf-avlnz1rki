import { useRef, useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import { formatDate, maskCpf } from '@/lib/formatters'
import type { DeclaracaoRecord, EscritorioRecord, UserRecord } from '@/types'
import { getLogoUrl, uploadLogo } from '@/services/escritorio'
import { useToast } from '@/hooks/use-toast'

interface Props {
  declaracao: DeclaracaoRecord
  escritorio: EscritorioRecord | null
  user: UserRecord | null
  onLogoUploaded: () => void
  /** Modo somente leitura — oculta o upload de logo (perfil do cliente). */
  readOnly?: boolean
}

export function DemonstrativoHeader({
  declaracao,
  escritorio,
  user,
  onLogoUploaded,
  readOnly,
}: Props) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const logoUrl = escritorio ? getLogoUrl(escritorio) : null
  const cliente = declaracao.expand?.cliente_id
  const today = new Date().toLocaleDateString('pt-BR')
  const tipoLabel = cliente?.tipo === 'socio' ? 'Sócio de Empresa' : 'Pessoa Física'

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !escritorio) return
    setUploading(true)
    try {
      await uploadLogo(escritorio.id, file)
      toast({ title: 'Logo atualizado com sucesso!' })
      onLogoUploaded()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao enviar logo.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const canUploadLogo = !readOnly

  return (
    <header className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo do escritório" className="w-16 h-16 object-contain" />
          ) : canUploadLogo ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !escritorio}
              className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span className="text-[8px] mt-0.5">Logo</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
              <Upload className="w-5 h-5" />
            </div>
          )}
          {canUploadLogo && (
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          )}
        </div>
        <div className="text-right">
          <h1 className="text-lg font-bold text-slate-900">
            Demonstrativo de Cálculo IRPF — Ano-Calendário {declaracao.ano_calendario}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Gerado em {today}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-xs">
        <div>
          <span className="text-slate-400">Nome: </span>
          <span className="font-semibold text-slate-700">{cliente?.nome || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400">CPF: </span>
          <span className="font-mono font-semibold text-slate-700">{maskCpf(cliente?.cpf)}</span>
        </div>
        <div>
          <span className="text-slate-400">Ocupação: </span>
          <span className="font-semibold text-slate-700">{tipoLabel}</span>
        </div>
      </div>

      <div className="flex justify-end mt-3 text-xs">
        <div className="text-right border-l-2 border-emerald-600 pl-3">
          <p className="text-slate-400">Responsável:</p>
          <p className="font-semibold text-slate-700">{user?.name || '-'}</p>
          <p className="text-slate-500 capitalize">{user?.cargo || ''}</p>
        </div>
      </div>
    </header>
  )
}
