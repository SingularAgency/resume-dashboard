"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { useRouter, usePathname } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase-client"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  requestOtp: (email: string) => Promise<{ success: boolean; error?: string }>
  verifyOtp: (
    email: string,
    token: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  user: { email: string; role: number } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SUPERADMIN_ROLE = 1

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ email: string; role: number } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const sessionQueueRef = useRef<Promise<void>>(Promise.resolve())

  const clearAuthState = () => {
    setIsAuthenticated(false)
    setUser(null)
  }

  const getSupabaseConfig = (): { url: string; anonKey: string } => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error("Missing Supabase configuration.")
    }
    return { url, anonKey }
  }

  const fetchJson = async <T,>(
    path: string,
    accessToken: string,
  ): Promise<T | null> => {
    const { url, anonKey } = getSupabaseConfig()
    const response = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  }


  const getUserRole = async (accessToken: string): Promise<number | null> => {
    const rows = await fetchJson<Array<{ role: number | null }>>(
      "profiles?select=role&limit=1",
      accessToken,
    )
    if (!rows || rows.length === 0) {
      return null
    }
    const roleId = rows[0]?.role
    if (typeof roleId !== "number") {
      return null
    }
    return roleId
  }

  const applySession = async (
    session: Session | null,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!session?.user) {
      clearAuthState()
      return { success: false }
    }

    try {
      const role = await getUserRole(session.access_token)

      if (role !== SUPERADMIN_ROLE) {
        clearAuthState()
        return { success: false, error: "Access denied: superadmin role required." }
      }

      setIsAuthenticated(true)
      setUser({
        email: session.user.email ?? "",
        role: role ?? SUPERADMIN_ROLE,
      })

      return { success: true }
    } catch {
      clearAuthState()
      return {
        success: false,
        error: "Could not validate your role. Please try again.",
      }
    }
  }

  const queueApplySession = (session: Session | null): Promise<void> => {
    sessionQueueRef.current = sessionQueueRef.current.then(async () => {
      await applySession(session)
    })
    return sessionQueueRef.current
  }

  // Check for existing session on mount and listen for session changes
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      await queueApplySession(data.session)
      if (isMounted) {
        setIsLoading(false)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void queueApplySession(session)
      },
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Redirect logic based on auth state
  useEffect(() => {
    if (isLoading) return

    const publicPaths = ["/login", "/login/verify"]
    const isPublicPath = publicPaths.includes(pathname)

    if (!isAuthenticated && !isPublicPath) {
      // Not logged in and trying to access protected route
      router.push("/login")
    } else if (isAuthenticated && isPublicPath) {
      // Logged in but on login page, redirect to dashboard
      router.push("/")
    }
  }, [isAuthenticated, isLoading, pathname, router])

  const requestOtp = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch {
      return {
        success: false,
        error:
          "Could not reach Supabase. Check your internet connection and project URL.",
      }
    }
  }

  const verifyOtp = async (
    email: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      })

      if (error) {
        clearAuthState()
        return { success: false, error: error.message }
      }

      return applySession(data.session)
    } catch {
      clearAuthState()
      return {
        success: false,
        error:
          "Could not verify OTP due to a network error. Please try again.",
      }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    clearAuthState()
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        requestOtp,
        verifyOtp,
        logout,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
