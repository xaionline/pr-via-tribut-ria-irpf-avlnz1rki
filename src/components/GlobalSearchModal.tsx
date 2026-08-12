import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, FileText } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { getClientes } from '@/services/clientes'
import { getDeclaracoes } from '@/services/declaracoes'
import type { ClienteRecord, DeclaracaoRecord } from '@/types'

interface GlobalSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('')
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [declaracoes, setDeclaracoes] = useState<DeclaracaoRecord[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const fetchResults = async () => {
      try {
        const cRes = await getClientes(query, 1, 5)
        setClientes(cRes.items)
        const dRes = await getDeclaracoes()
        const filteredD = dRes
          .filter((d) => d.expand?.cliente_id?.nome?.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5)
        setDeclaracoes(filteredD)
      } catch {
        /* intentionally ignored */
      }
    }
    fetchResults()
  }, [query, open])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar clientes por nome, CPF ou ano da declaração..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {clientes.length > 0 && (
          <CommandGroup heading="Clientes">
            {clientes.map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() => {
                  onOpenChange(false)
                  navigate(`/app/clientes/${c.id}`)
                }}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-emerald-600" />
                <span>{c.nome}</span>
                <span className="ml-2 text-xs text-slate-400">({c.cpf})</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {declaracoes.length > 0 && (
          <CommandGroup heading="Declarações">
            {declaracoes.map((d) => (
              <CommandItem
                key={d.id}
                onSelect={() => {
                  onOpenChange(false)
                  navigate(`/app/declaracoes/${d.id}`)
                }}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                <span>
                  {d.expand?.cliente_id?.nome} - Ano {d.ano_calendario}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
