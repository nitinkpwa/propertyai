'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'buyer' | 'seller' | 'broker' | 'builder'>('buyer')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    if (mode === 'signup' && !name) { setError('Please enter your name'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        // Step 1: Sign up with Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, role }
          }
        })

        if (signUpError) throw signUpError
        if (!data.user) throw new Error('Signup failed')

        // Step 2: Upsert profile (handles cases where trigger already created it)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: name,
            role: role,
          }, { onConflict: 'id' })

        // Ignore profile error — trigger may have already created it
        if (profileError) {
          console.log('Profile upsert note:', profileError.message)
        }

        setMessage('✅ Account created! You can now sign in.')
        setMode('login')
        setPassword('')

      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        if (!data.user) throw new Error('Login failed')

        // Get profile to determine role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const userRole = profile?.role || 'buyer'

        // Redirect based on role
        if (userRole === 'buyer') {
          router.push('/buyer')
        } else {
          router.push('/seller')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('User already registered')) {
        setError('This email is already registered. Please sign in instead.')
        setMode('login')
      } else if (msg.includes('Invalid login credentials')) {
        setError('Wrong email or password. Please try again.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account first.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const S = {
    page: { minHeight: '100vh', background: '#FDF6EE', display: 'flex', flexDirection: 'column' as const, fontFamily: 'Inter, sans-serif' },
    nav: { background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center' },
    body: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
    card: { background: '#fff', borderRadius: '20px', border: '1px solid #F5E8D8', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(44,26,14,0.08)' },
    title: { fontSize: '1.5rem', fontWeight: 800, color: '#2C1A0E', marginBottom: '0.25rem', margin: 0 },
    sub: { fontSize: '14px', color: '#6B4226', marginBottom: '1.5rem', marginTop: '4px' },
    tabs: { display: 'flex', background: '#FDF6EE', borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' },
    tab: (active: boolean) => ({
      flex: 1, padding: '8px', borderRadius: '7px', border: 'none', cursor: 'pointer',
      fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
      background: active ? '#2C1A0E' : 'transparent',
      color: active ? '#fff' : '#6B4226', transition: 'all 0.2s'
    }),
    label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C1A0E', marginBottom: '6px' },
    input: {
      width: '100%', padding: '11px 14px', borderRadius: '10px',
      border: '1.5px solid #F5E8D8', fontSize: '14px', color: '#2C1A0E',
      background: '#FDF6EE', fontFamily: 'Inter, sans-serif',
      boxSizing: 'border-box' as const, outline: 'none', marginBottom: '1rem',
      display: 'block'
    },
    btn: {
      width: '100%', padding: '13px', background: '#F4860A', color: '#fff',
      border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      opacity: 1,
    },
    error: { background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' },
    success: { background: '#DCFCE7', color: '#16A34A', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem' },
    roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' },
    roleBtn: (active: boolean) => ({
      padding: '10px', borderRadius: '10px',
      border: `2px solid ${active ? '#F4860A' : '#F5E8D8'}`,
      background: active ? '#FFF4E8' : '#fff', cursor: 'pointer',
      fontSize: '13px', fontWeight: active ? 700 : 400,
      color: active ? '#B05A00' : '#6B4226',
      fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
    }),
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
      </nav>

      <div style={S.body}>
        <div style={S.card}>
          <h1 style={S.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p style={S.sub}>{mode === 'login' ? 'Sign in to your PropertyAI account' : 'Join PropertyAI for free'}</p>

          <div style={S.tabs}>
            <button style={S.tab(mode === 'login')} onClick={() => { setMode('login'); setError(''); setMessage('') }}>Sign In</button>
            <button style={S.tab(mode === 'signup')} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Sign Up</button>
          </div>

          {error && <div style={S.error}>{error}</div>}
          {message && <div style={S.success}>{message}</div>}

          {mode === 'signup' && (
            <>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />

              <label style={S.label}>I am a...</label>
              <div style={S.roleGrid}>
                {(['buyer', 'seller', 'broker', 'builder'] as const).map(r => (
                  <button key={r} style={S.roleBtn(role === r)} onClick={() => setRole(r)}>
                    {r === 'buyer' ? '🏠 Buyer' : r === 'seller' ? '🏷️ Seller' : r === 'broker' ? '🤝 Broker' : '🏗️ Builder'}
                  </button>
                ))}
              </div>
            </>
          )}

          <label style={S.label}>Email Address</label>
          <input
            style={S.input} type="email" placeholder="you@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
          />

          <label style={S.label}>Password</label>
          <input
            style={S.input} type="password" placeholder="Min 6 characters"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />

          <button
            style={{ ...S.btn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '13px', color: '#6B4226', marginTop: '1rem' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span
              style={{ color: '#F4860A', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}