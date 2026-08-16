import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord, EscritorioRecord } from '@/types'

import type { CadastroPayload } from '@/services/cadastro'

interface AuthContextType {
  user: UserRecord | null
  escritorio: EscritorioRecord | null
  isAuthenticated: boolean
  isAdmin: boolean
  isConsultor: boolean
  isVisualizador: boolean
  isCliente: boolean
  /** Registro legado (mantido para compatibilidade com a tela de /registro). */
  signUp: (
    email: string,
    pass: string,
    name: string,
    nomeEscritorio: string,
  ) => Promise<{ error: any }>
  /**
   * Onboarding multi-tenant: cria escritório + admin via rota pública
   * e faz login automático em caso de sucesso.
   */
  cadastrarEscritorio: (payload: CadastroPayload) => Promise<{ error: any }>
  signIn: (email: string, pass: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserRecord | null>(
    pb.authStore.isValid ? (pb.authStore.record as unknown as UserRecord) : null,
  )
  const [escritorio, setEscritorio] = useState<EscritorioRecord | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  const loadEscritorio = async (escId?: string) => {
    if (!escId) {
      setEscritorio(null)
      return
    }
    try {
      const esc = await pb.collection('escritorios').getOne<EscritorioRecord>(escId)
      setEscritorio(esc)
    } catch (_) {
      setEscritorio(null)
    }
  }

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      const u = pb.authStore.isValid ? (record as unknown as UserRecord) : null
      setUser(u)
      setIsAuthenticated(pb.authStore.isValid)
      if (u?.escritorio_id) {
        loadEscritorio(u.escritorio_id)
      }
    })

    if (pb.authStore.isValid && pb.authStore.record) {
      const u = pb.authStore.record as unknown as UserRecord
      setUser(u)
      if (u.escritorio_id) {
        loadEscritorio(u.escritorio_id)
      }
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, pass: string, name: string, nomeEscritorio: string) => {
    try {
      // 1. Create escritorio
      const esc = await pb.collection('escritorios').create<EscritorioRecord>({
        nome: nomeEscritorio,
        plano: 'pro',
        limite_clientes: 100,
      })

      // 2. Create user with escritorio_id and admin cargo
      await pb.collection('users').create({
        email,
        password: pass,
        passwordConfirm: pass,
        name,
        escritorio_id: esc.id,
        cargo: 'admin',
        ativo: true,
      })

      // 3. Login
      await pb.collection('users').authWithPassword(email, pass)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const cadastrarEscritorio = async (payload: CadastroPayload) => {
    try {
      const { cadastrarEscritorio: apiCall } = await import('@/services/cadastro')
      const result = await apiCall(payload)
      if (!result.success) {
        return {
          error: {
            fieldErrors: result.fieldErrors,
            message: result.globalError,
          },
        }
      }
      // Login automático com as credenciais do admin recém-criado.
      await pb.collection('users').authWithPassword(payload.email_admin, payload.senha)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, pass: string) => {
    try {
      await pb.collection('users').authWithPassword(email, pass)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  const cargo = user?.cargo || 'admin'
  const isAdmin = cargo === 'admin'
  const isConsultor = cargo === 'consultor'
  const isVisualizador = cargo === 'visualizador'
  const isCliente = cargo === 'cliente'

  return (
    <AuthContext.Provider
      value={{
        user,
        escritorio,
        isAuthenticated,
        isAdmin,
        isConsultor,
        isVisualizador,
        isCliente,
        signUp,
        cadastrarEscritorio,
        signIn,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
