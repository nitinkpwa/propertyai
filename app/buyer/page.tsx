'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'saved' | 'chats' | 'inquiries' | 'visits'

export default function BuyerDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('saved')
  const [user, setUser] = useState<{ email: string; full_name: string } | null>(null)
  const [savedProps, setSavedProps] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUser(profile)
    await loadData(authUser.id)
    setLoading(false)
  }

  const loadData = async (userId: string) => {
    const [{ data: saved }, { data: convos }, { data: inqs }] = await Promise.all([
      supabase.from('saved_properties').select('*, property:properties(*)').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('inquiries').select('*, property:properties(title,location)').eq('from_user_id', userId).order('created_at', { ascending: false }),
    ])
    setSavedProps(saved || [])
    setChats(convos || [])
    setInquiries(inqs || [])
  }

  const removeSaved = async (id: string) => {
    await supabase.from('saved_properties').delete().eq('id', id)
    setSavedProps(prev => prev.filter(p => p.id !== id))
  }

  const deleteChat = async (id: string) => {
    await supabase.from('conversations').delete().eq('id', id)
    setChats(prev => prev.filter(c => c.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  const S = {
    page: { minHeight: '100vh', background: '#FDF6EE', fontFamily: 'Inter, sans-serif' },
    nav: { background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    wrap: { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap' as const, gap: '1rem' },
    avatar: { width: '52px', height: '52px', borderRadius: '50%', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' as const },
    tab: (active: boolean) => ({ padding: '8px 18px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: active ? '#2C1A0E' : '#fff', color: active ? '#F4860A' : '#6B4226', border2: `1px solid ${active ? 'transparent' : '#F5E8D8'}`, transition: 'all 0.2s' }),
    card: { background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '1.25rem', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
    empty: { textAlign: 'center' as const, padding: '3rem', color: '#A67C5B', fontSize: '15px' },
    badge: (s: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: s === 'new' ? '#FEF3C7' : s === 'read' ? '#DBEAFE' : '#DCFCE7', color: s === 'new' ? '#92400E' : s === 'read' ? '#1E40AF' : '#166534' }),
  }

  if (loading) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#6B4226', fontSize: '16px' }}>Loading...</div></div>

  const tabCounts: Record<Tab, number> = { saved: savedProps.length, chats: chats.length, inquiries: inquiries.length, visits: 0 }
  const tabLabels = [
    { key: 'saved' as Tab, label: '❤️ Saved Properties' },
    { key: 'chats' as Tab, label: '🤖 AI Conversations' },
    { key: 'inquiries' as Tab, label: '📩 My Inquiries' },
    { key: 'visits' as Tab, label: '📅 Visit Requests' },
  ]

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/ask" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>Ask AI</a>
          <button onClick={handleSignOut} style={{ background: 'transparent', border: '1px solid #6B4226', color: '#F7BF8A', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign Out</button>
        </div>
      </nav>

      <div style={S.wrap}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={S.avatar}>{user?.full_name?.[0]?.toUpperCase() || 'B'}</div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2C1A0E' }}>{user?.full_name || 'Buyer'}</div>
              <div style={{ fontSize: '13px', color: '#6B4226' }}>{user?.email}</div>
            </div>
          </div>
          <a href="/ask" style={{ background: '#F4860A', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            + Ask AI
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
          {[
            { label: 'Saved Properties', value: savedProps.length, icon: '❤️' },
            { label: 'AI Conversations', value: chats.length, icon: '🤖' },
            { label: 'Inquiries Sent', value: inquiries.length, icon: '📩' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2C1A0E' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#6B4226' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {tabLabels.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 18px', borderRadius: '20px', border: `1px solid ${tab === t.key ? 'transparent' : '#F5E8D8'}`, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: tab === t.key ? '#2C1A0E' : '#fff', color: tab === t.key ? '#F4860A' : '#6B4226' }}>
              {t.label} {tabCounts[t.key] > 0 && <span style={{ background: '#F4860A', color: '#fff', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', marginLeft: '4px' }}>{tabCounts[t.key]}</span>}
            </button>
          ))}
        </div>

        {/* SAVED PROPERTIES */}
        {tab === 'saved' && (
          <div>
            {savedProps.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❤️</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No saved properties yet</div>
                <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontWeight: 600 }}>Browse Properties →</a>
              </div>
            ) : savedProps.map(sp => (
              <div key={sp.id} style={S.card}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#2C1A0E', marginBottom: '4px' }}>{sp.property?.title || 'Property'}</div>
                  <div style={{ fontSize: '13px', color: '#6B4226' }}>📍 {sp.property?.location}, {sp.property?.city}</div>
                  <div style={{ fontSize: '13px', color: '#F4860A', fontWeight: 700, marginTop: '4px' }}>{sp.property?.price ? formatPrice(sp.property.price) : '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`/p/${sp.property_id}`} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>View</a>
                  <button onClick={() => removeSaved(sp.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI CONVERSATIONS */}
        {tab === 'chats' && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <a href="/ask" style={{ background: '#F4860A', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>+ New AI Conversation</a>
            </div>
            {chats.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No saved conversations</div>
                <a href="/ask" style={{ color: '#F4860A', textDecoration: 'none', fontWeight: 600 }}>Start asking AI →</a>
              </div>
            ) : chats.map(c => (
              <div key={c.id} style={S.card}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#2C1A0E', marginBottom: '4px' }}>{c.title}</div>
                  <div style={{ fontSize: '12px', color: '#A67C5B' }}>{c.messages?.length || 0} messages · {formatDate(c.updated_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={`/ask?conv=${c.id}`} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Open</a>
                  <button onClick={() => deleteChat(c.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INQUIRIES */}
        {tab === 'inquiries' && (
          <div>
            {inquiries.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📩</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No inquiries sent yet</div>
                <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontWeight: 600 }}>Browse Properties →</a>
              </div>
            ) : inquiries.map(inq => (
              <div key={inq.id} style={S.card}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#2C1A0E', marginBottom: '4px' }}>{inq.property?.title || 'Property'}</div>
                  <div style={{ fontSize: '13px', color: '#6B4226', marginBottom: '4px' }}>📍 {inq.property?.location}</div>
                  <div style={{ fontSize: '12px', color: '#A67C5B' }}>{inq.message?.slice(0, 80)}...</div>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <span style={S.badge(inq.status)}>{inq.status}</span>
                  <div style={{ fontSize: '11px', color: '#A67C5B', marginTop: '6px' }}>{formatDate(inq.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISIT REQUESTS */}
        {tab === 'visits' && (
          <div style={S.empty}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No visit requests yet</div>
            <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontWeight: 600 }}>Browse Properties →</a>
          </div>
        )}
      </div>
    </div>
  )
}