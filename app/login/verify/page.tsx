"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FileText, MailCheck } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

interface FormErrors {
  token?: string
}

function VerifyLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const { verifyOtp, isAuthenticated, isLoading: authLoading } = useAuth()

  const [token, setToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace("/")
    }
  }, [isAuthenticated, authLoading, router])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!token.trim()) {
      newErrors.token = "Verification code is required"
    } else if (!/^\d{6}$/.test(token.trim())) {
      newErrors.token = "Code must have 6 digits"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    if (!email) {
      setAuthError("Missing email. Please start again from login.")
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      const result = await verifyOtp(email, token.trim())

      if (result.success) {
        router.replace("/")
        return
      }

      setAuthError(result.error ?? "Invalid or expired verification code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ResAI Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify your login code
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to {email || "your email"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <Field data-invalid={!!errors.token}>
                  <FieldLabel htmlFor="token">Verification code</FieldLabel>
                  <div className="relative">
                    <MailCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="token"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={token}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, "")
                        setToken(onlyDigits)
                        if (errors.token) {
                          setErrors((prev) => ({ ...prev, token: undefined }))
                        }
                      }}
                      className="pl-10"
                      aria-invalid={!!errors.token}
                      aria-describedby={errors.token ? "token-error" : undefined}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {errors.token && (
                    <FieldError id="token-error">{errors.token}</FieldError>
                  )}
                </Field>

                {authError && (
                  <div
                    role="alert"
                    className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify and Sign In"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => router.push("/login")}
                >
                  Use another email
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Spinner />
        </div>
      }
    >
      <VerifyLoginContent />
    </Suspense>
  )
}
