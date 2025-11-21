'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  let email = formData.get('email') as string
  const password = formData.get('password') as string

  // Allow simple usernames for testing by appending a domain
  if (email && !email.includes('@')) {
    email = `${email}@example.com`
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error:', error)
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()

  let email = formData.get('email') as string
  const password = formData.get('password') as string

  // Allow simple usernames for testing by appending a domain
  if (email && !email.includes('@')) {
    email = `${email}@example.com`
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user && !data.session) {
    return { error: 'Account created! Please check your email to confirm your registration before logging in.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
