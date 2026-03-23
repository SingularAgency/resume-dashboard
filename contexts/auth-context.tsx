"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { useRouter, usePathname } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  user: { email: string } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "resai_auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ email: string } | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
        if (storedAuth) {
          const authData = JSON.parse(storedAuth)
          if (authData.email && authData.expiresAt > Date.now()) {
            setIsAuthenticated(true)
            setUser({ email: authData.email })
          } else {
            // Clear expired session
            localStorage.removeItem(AUTH_STORAGE_KEY)
          }
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  // Redirect logic based on auth state
  useEffect(() => {
    if (isLoading) return

    const publicPaths = ["/login"]
    const isPublicPath = publicPaths.includes(pathname)

    if (!isAuthenticated && !isPublicPath) {
      // Not logged in and trying to access protected route
      router.push("/login")
    } else if (isAuthenticated && isPublicPath) {
      // Logged in but on login page, redirect to dashboard
      router.push("/")
    }
  }, [isAuthenticated, isLoading, pathname, router])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call - replace with real auth later
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // For demo: accept valid email format with 6+ char password
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6

    if (isValid) {
      const authData = {
        email,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      setIsAuthenticated(true)
      setUser({ email })
      return true
    }

    return false
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setIsAuthenticated(false)
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
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
