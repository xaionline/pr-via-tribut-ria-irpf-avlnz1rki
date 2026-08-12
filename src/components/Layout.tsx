import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { SidebarNav } from '@/components/SidebarNav'
import { Header } from '@/components/Header'
import { MobileBottomNav } from '@/components/MobileBottomNav'

export default function Layout() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Carregando sistema tributário...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <SidebarNav />
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0 pb-16 lg:pb-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
