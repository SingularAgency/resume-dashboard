import { supabase } from "@/lib/supabase-client"

const analyticsBaseUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL

export type AnalyticsGetOptions = {
  signal?: AbortSignal
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === "object" && "name" in error && (error as { name?: string }).name === "AbortError") {
    return true
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true
  }
  return false
}

function getAnalyticsBaseUrl(): string {
  if (!analyticsBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_ANALYTICS_API_URL")
  }
  const normalized = analyticsBaseUrl.replace(/\/+$/, "")
  // Backend routes are mounted under /api/v1.
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`
}

async function getAccessTokenOrThrow(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.")
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error("Authentication required: missing access token.")
  }
  return token
}

async function refreshAccessTokenOrThrow(): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client is unavailable.")
  }
  const { data, error } = await supabase.auth.refreshSession()
  if (error) {
    throw new Error(`Failed to refresh auth session: ${error.message}`)
  }
  const token = data.session?.access_token
  if (!token) {
    throw new Error("Authentication required: could not refresh access token.")
  }
  return token
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const base = getAnalyticsBaseUrl()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${base}${normalizedPath}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function requestWithToken(url: string, token: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    signal,
  })
}

async function readResponseDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.clone().json()) as { detail?: string; message?: string }
    if (typeof data.detail === "string" && data.detail.trim().length > 0) return data.detail
    if (typeof data.message === "string" && data.message.trim().length > 0) return data.message
    return null
  } catch {
    return null
  }
}

function isNetworkError(error: unknown): boolean {
  if (isAbortError(error)) return false
  return error instanceof TypeError
}

export async function analyticsGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  options?: AnalyticsGetOptions,
): Promise<T> {
  const url = buildUrl(path, query)
  let response: Response
  const signal = options?.signal
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError")
  }

  try {
    const token = await getAccessTokenOrThrow()
    response = await requestWithToken(url, token, signal)

    // Retry once after refreshing the session when auth is rejected.
    if (response.status === 401 || response.status === 403) {
      const refreshedToken = await refreshAccessTokenOrThrow()
      response = await requestWithToken(url, refreshedToken, signal)
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }
    if (!isNetworkError(error)) {
      throw error
    }
    throw new Error(
      `Could not reach Analytics API at ${url}. Check backend URL/CORS and network connectivity.`,
    )
  }

  if (!response.ok) {
    const detail = await readResponseDetail(response)
    const message = detail
      ? `Analytics API request failed (${response.status}): ${detail}`
      : `Analytics API request failed (${response.status})`
    throw new Error(message)
  }

  return (await response.json()) as T
}
