'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'saved' | 'chats' | 'inquiries' | 'visits'
type Message = { role: 'user' | 'assistant'; content: string }

export default function BuyerDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('saved')
  const [user, setUser] = useState<any>(null)
  const [savedProps, setSavedProps] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [featuredProps, setFeaturedProps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // AI chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUser(profile)
    await loadData(authUser.id)
    setLoading(false)
  }

  const loadData = async (userId: string) => {
    const [{ data: saved }, { data: convos }, { data: inqs }, { data: featured }] = await Promise.all([
      supabase.from('saved_properties').select('*, property:properties(*)').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('inquiries').select('*, property:properties(title,location)').eq('from_user_id', userId).order('created_at', { ascending: false }),
      supabase.from('properties').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(6),
    ])
    setSavedProps(saved || [])
    setChats(convos || [])
    setInquiries(inqs || [])
    setFeaturedProps(featured || [])
  }

  const sendAiMessage = async (text?: string) => {
    const messageText = (text || aiInput).trim()
    if (!messageText || aiLoading) return
    const userMsg: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setAiInput('')
    setAiLoading(true)

    try {
      // Fetch relevant properties from DB to give AI real context
      const { data: props } = await supabase
        .from('properties')
        .select('title, type, sub_type, price, location, city, bedrooms, area_sqft, contact_phone, description')
        .eq('status', 'active')
        .limit(20)

      const propertyContext = props && props.length > 0
        ? `\n\nCURRENT LISTINGS IN OUR DATABASE:\n${props.map((p: any, i: number) =>
            `${i + 1}. ${p.title} | ${p.type} | ${p.sub_type} | ₹${p.price >= 10000000 ? (p.price / 10000000).toFixed(1) + 'Cr' : (p.price / 100000).toFixed(0) + 'L'} | ${p.location}, ${p.city} | ${p.bedrooms ? p.bedrooms + 'BHK' : ''} ${p.area_sqft ? p.area_sqft + 'sqft' : ''} | Contact: ${p.contact_phone || 'N/A'}`
          ).join('\n')}\n\nWhen user asks for property suggestions, ALWAYS check and mention matching listings from the above database first before giving general advice.`
        : '\n\nNo properties currently in database.'

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          extraContext: propertyContext
        }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let aiText = ''
      let added = false

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content || ''
              if (delta) {
                aiText += delta
                if (!added) { setMessages(prev => [...prev, { role: 'assistant', content: aiText }]); added = true }
                else setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: aiText }; return u })
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  const removeSaved = async (id: string) => {
    await supabase.from('saved_properties').delete().eq('id', id)
    setSavedProps(prev => prev.filter(p => p.id !== id))
  }

  const saveProperty = async (propertyId: string) => {
    if (!user) return
    await supabase.from('saved_properties').insert({ user_id: user.id, property_id: propertyId })
    const { data } = await supabase.from('saved_properties').select('*, property:properties(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setSavedProps(data || [])
  }

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const typeIcon: Record<string, string> = { flat: '🏠', plot: '🏗️', house: '🏡', builder_floor: '🏘️', sco: '🏪', office: '🏢', warehouse: '🏭', coworking: '☕' }

  const quickQuestions = [
    'Best investment under ₹60L in Mohali?',
    'Compare Zirakpur vs Kharar',
    'Show 2BHK for rent in Phase 8',
    'Rental yield in IT City?',
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#FDF6EE' }}>
      <div style={{ color: '#6B4226' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6EE', fontFamily: 'Inter, sans-serif' }}>

      {/* NAV */}
      <nav style={{ background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setChatOpen(!chatOpen)} style={{ background: chatOpen ? '#F4860A' : 'rgba(244,134,10,0.2)', color: '#fff', border: '1px solid #F4860A', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            🤖 Ask AI
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: 'transparent', border: '1px solid #6B4226', color: '#F7BF8A', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign Out</button>
        </div>
      </nav>

      {/* AI CHAT PANEL — slides down from top */}
      {chatOpen && (
        <div style={{ background: '#2C1A0E', borderBottom: '2px solid #F4860A' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 1.5rem' }}>
            {/* Chat messages */}
            <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ color: '#F7BF8A', fontSize: '14px', marginBottom: '0.75rem' }}>🤖 Hi {user?.full_name?.split(' ')[0]}! Ask me about properties, investments or the Tricity market.</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                    {quickQuestions.map(q => (
                      <button key={q} onClick={() => sendAiMessage(q)} style={{ background: 'rgba(244,134,10,0.15)', color: '#F7BF8A', border: '1px solid rgba(244,134,10,0.3)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-start' }}>
                  {msg.role === 'assistant' && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>}
                  <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', background: msg.role === 'user' ? '#F4860A' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                  <div style={{ color: '#F7BF8A', fontSize: '13px' }}>Thinking...</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {/* Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
                placeholder="Ask about properties, investment, rental yield..."
                disabled={aiLoading}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '30px', border: '1px solid rgba(244,134,10,0.4)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }}
              />
              <button onClick={() => sendAiMessage()} disabled={aiLoading || !aiInput.trim()}
                style={{ background: '#F4860A', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>

        {/* PROFILE HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px' }}>
              {user?.full_name?.[0]?.toUpperCase() || 'B'}
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2C1A0E' }}>{user?.full_name || 'Buyer'}</div>
              <div style={{ fontSize: '12px', color: '#A67C5B' }}>{user?.email}</div>
            </div>
          </div>
          <a href="/properties" style={{ background: '#2C1A0E', color: '#F4860A', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', border: '1px solid #F4860A' }}>Browse All Properties →</a>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
          {[{ label: 'Saved', value: savedProps.length, icon: '❤️' }, { label: 'AI Chats', value: chats.length, icon: '🤖' }, { label: 'Inquiries', value: inquiries.length, icon: '📩' }].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2C1A0E' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#6B4226' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[{ key: 'saved' as Tab, label: '❤️ Saved' }, { key: 'chats' as Tab, label: '🤖 AI Chats' }, { key: 'inquiries' as Tab, label: '📩 Inquiries' }, { key: 'visits' as Tab, label: '📅 Visits' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '7px 16px', borderRadius: '20px', border: `1px solid ${tab === t.key ? 'transparent' : '#F5E8D8'}`, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: tab === t.key ? '#2C1A0E' : '#fff', color: tab === t.key ? '#F4860A' : '#6B4226' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* SAVED PROPERTIES TAB */}
        {tab === 'saved' && (
          <div>
            {savedProps.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '2rem', textAlign: 'center', color: '#A67C5B', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❤️</div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>No saved properties yet</div>
                <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Browse Properties →</a>
              </div>
            ) : savedProps.map(sp => (
              <div key={sp.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#2C1A0E', marginBottom: '3px' }}>{sp.property?.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B4226' }}>📍 {sp.property?.location}, {sp.property?.city}</div>
                  <div style={{ fontSize: '13px', color: '#F4860A', fontWeight: 700, marginTop: '3px' }}>{sp.property?.price ? formatPrice(sp.property.price) : '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={`/p/${sp.property_id}`} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>View</a>
                  <button onClick={() => removeSaved(sp.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Remove</button>
                </div>
              </div>
            ))}

            {/* EXPLORE PROPERTIES SECTION */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#2C1A0E' }}>🏠 Explore Properties</div>
                <a href="/properties" style={{ color: '#F4860A', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
              </div>
              {featuredProps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
                  No properties listed yet. <a href="/properties" style={{ color: '#F4860A' }}>Check back soon</a>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                  {featuredProps.map(prop => {
                    const isSaved = savedProps.some(sp => sp.property_id === prop.id)
                    return (
                      <div key={prop.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', overflow: 'hidden' }}>
                        <div style={{ height: '120px', background: '#F5E8D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                          {typeIcon[prop.sub_type] || '🏠'}
                        </div>
                        <div style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#2C1A0E', fontSize: '13px', marginBottom: '3px' }}>{prop.title}</div>
                          <div style={{ fontSize: '11px', color: '#6B4226', marginBottom: '6px' }}>📍 {prop.location}, {prop.city}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, color: '#F4860A', fontSize: '14px' }}>{formatPrice(prop.price)}</div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <a href={`/p/${prop.id}`} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>View</a>
                              <button onClick={() => isSaved ? null : saveProperty(prop.id)} style={{ background: isSaved ? '#DCFCE7' : '#F5E8D8', color: isSaved ? '#166534' : '#6B4226', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: isSaved ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                {isSaved ? '✓ Saved' : '❤️ Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI CONVERSATIONS TAB */}
        {tab === 'chats' && (
          <div>
            <button onClick={() => { setChatOpen(true); setMessages([]) }} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '1rem' }}>+ New Conversation</button>
            {chats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
                <div style={{ fontWeight: 600 }}>No saved conversations yet</div>
                <p style={{ fontSize: '13px' }}>Click "Ask AI" in the navbar to start chatting</p>
              </div>
            ) : chats.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#2C1A0E', marginBottom: '3px' }}>{c.title}</div>
                  <div style={{ fontSize: '12px', color: '#A67C5B' }}>{c.messages?.length || 0} messages · {formatDate(c.updated_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INQUIRIES TAB */}
        {tab === 'inquiries' && (
          <div>
            {inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📩</div>
                <div style={{ fontWeight: 600 }}>No inquiries yet</div>
                <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Browse Properties →</a>
              </div>
            ) : inquiries.map(inq => (
              <div key={inq.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, color: '#2C1A0E', marginBottom: '3px' }}>{inq.property?.title}</div>
                <div style={{ fontSize: '12px', color: '#6B4226', marginBottom: '6px' }}>📍 {inq.property?.location}</div>
                <div style={{ fontSize: '13px', color: '#2C1A0E', background: '#FDF6EE', padding: '8px 12px', borderRadius: '8px' }}>{inq.message}</div>
                <div style={{ fontSize: '11px', color: '#A67C5B', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{formatDate(inq.created_at)}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '20px', background: inq.status === 'new' ? '#FEF3C7' : '#DCFCE7', color: inq.status === 'new' ? '#92400E' : '#166534', fontWeight: 600 }}>{inq.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISITS TAB */}
        {tab === 'visits' && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
            <div style={{ fontWeight: 600 }}>No visit requests yet</div>
            <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Browse Properties →</a>
          </div>
        )}
      </div>
    </div>
  )
}