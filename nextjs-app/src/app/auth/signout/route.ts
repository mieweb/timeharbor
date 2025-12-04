import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Check if we have a session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')

  // Determine the correct base URL for redirect
  // This handles cases where the app is behind a proxy and req.url is localhost
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  let baseUrl = req.nextUrl.origin

  if (origin) {
    baseUrl = origin
  } else if (referer) {
    try {
      baseUrl = new URL(referer).origin
    } catch (e) {
      // Invalid referer, stick to default
    }
  }

  return NextResponse.redirect(`${baseUrl}/login`, {
    status: 302,
  })
}
