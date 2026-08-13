import { ReactNode } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, UserPlus, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface ClienteSemDecl {
  id: string
  nome: string
}
interface Oportunidade {
  clienteNome: string
  potencial: number
}
interface Variacao {
  clienteNome: string
  prevVal: number
  currentVal: number
  increased: boolean
}

interface Props {
  clientesSemDecl: ClienteSemDecl[]
  oportunidades: Oportunidade[]
  variacoes: Variacao[]
  onIniciar: (clienteId: string) => void
}

function EmptyMsg() {
  return <p className="text-[11px] text-slate-400 py-1">Nenhum alerta no momento</p>
}

function SemDeclContent({
  items,
  onIniciar,
}: {
  items: ClienteSemDecl[]
  onIniciar: (id: string) => void
}) {
  if (items.length === 0) return <EmptyMsg />
  return (
    <div className="space-y-1.5">
      {items.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-700 truncate">{c.nome}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 shrink-0"
            onClick={() => onIniciar(c.id)}
          >
            Iniciar
          </Button>
        </div>
      ))}
    </div>
  )
}

function OportContent({ items }: { items: Oportunidade[] }) {
  if (items.length === 0) return <EmptyMsg />
  return (
    <div className="space-y-1.5">
      {items.map((o, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-700 truncate">{o.clienteNome}</span>
          <span className="text-[11px] font-mono text-green-600">
            +{formatCurrency(o.potencial)}
          </span>
        </div>
      ))}
    </div>
  )
}

function VarContent({ items }: { items: Variacao[] }) {
  if (items.length === 0) return <EmptyMsg />
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="space-y-0.5">
          <span className="text-[11px] text-slate-700">{v.clienteNome}</span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400">{formatCurrency(v.prevVal)}</span>
            <span className="text-slate-400">→</span>
            <span
              className={cn(
                'font-mono flex items-center gap-0.5',
                v.increased ? 'text-red-500' : 'text-green-600',
              )}
            >
              {v.increased ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {formatCurrency(v.currentVal)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DesktopSection({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: ReactNode
  count: number
  children: ReactNode
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            {icon}
            {title}
          </CardTitle>
          {count > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
              {count}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">{children}</CardContent>
    </Card>
  )
}

export function AlertsSidebar({ clientesSemDecl, oportunidades, variacoes, onIniciar }: Props) {
  return (
    <div className="lg:col-span-1">
      <div className="hidden lg:block space-y-3">
        <DesktopSection
          title="Clientes sem declaração 2024"
          icon={<UserPlus className="w-3.5 h-3.5 text-blue-600" />}
          count={clientesSemDecl.length}
        >
          <SemDeclContent items={clientesSemDecl} onIniciar={onIniciar} />
        </DesktopSection>
        <DesktopSection
          title="Oportunidades de otimização"
          icon={<Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
          count={oportunidades.length}
        >
          <OportContent items={oportunidades} />
        </DesktopSection>
        <DesktopSection
          title="Variações anormais"
          icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
          count={variacoes.length}
        >
          <VarContent items={variacoes} />
        </DesktopSection>
      </div>

      <Accordion type="single" collapsible className="lg:hidden">
        <AccordionItem value="sem-decl">
          <AccordionTrigger className="text-xs font-bold">
            Clientes sem declaração 2024 ({clientesSemDecl.length})
          </AccordionTrigger>
          <AccordionContent>
            <SemDeclContent items={clientesSemDecl} onIniciar={onIniciar} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="oportunidades">
          <AccordionTrigger className="text-xs font-bold">
            Oportunidades de otimização ({oportunidades.length})
          </AccordionTrigger>
          <AccordionContent>
            <OportContent items={oportunidades} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="variacoes">
          <AccordionTrigger className="text-xs font-bold">
            Variações anormais ({variacoes.length})
          </AccordionTrigger>
          <AccordionContent>
            <VarContent items={variacoes} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
