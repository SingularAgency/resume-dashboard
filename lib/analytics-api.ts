import { supabase } from "@/lib/supabase-client"

const analyticsBaseUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL

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

export async function analyticsGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const token = await getAccessTokenOrThrow()
  const url = buildUrl(path, query)
  let response: Response

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })
  } catch {
    throw new Error(
      `Could not reach Analytics API at ${url}. Check backend URL/CORS and network connectivity.`,
    )
  }

  if (!response.ok) {
    const message = `Analytics API request failed (${response.status})`
    throw new Error(message)
  }

  return (await response.json()) as T
}
