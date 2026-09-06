import { TribbyChat } from '@/components/TribbyChat'

export default function AssistenteIaPage() {
  return (
    <div className="h-[calc(100vh-8.5rem)] sm:h-[calc(100vh-7.5rem)] flex flex-col rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <TribbyChat showHistorySidebar={true} className="flex-1" />
    </div>
  )
}
