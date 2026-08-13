import { ReactNode, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface UnderlineTab {
  id: string
  label: string
  count?: number
  content?: ReactNode
}

export interface UnderlineTabsProps {
  tabs: UnderlineTab[]
  defaultTabId?: string
  onChange?: (tabId: string) => void
  className?: string
}

export function UnderlineTabs({ tabs, defaultTabId, onChange, className }: UnderlineTabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId || tabs[0]?.id || '')

  const handleTabChange = (tabId: string) => {
    setActiveId(tabId)
    onChange?.(tabId)
  }

  const activeTab = tabs.find((t) => t.id === activeId)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-150 relative whitespace-nowrap touch-target',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center rounded-full font-semibold',
                    isActive
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-muted text-muted-foreground border-border',
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
      {activeTab?.content && <div className="pt-4 animate-fade-in">{activeTab.content}</div>}
    </div>
  )
}
