'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'saved' | 'chats' | 'inquiries' | 'visits'
type Message = { role: 'user' | 'assistant'; content: string }

// Format markdown-style text to HTML
function formatMessage(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

export default function BuyerDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('saved')
  const [user, setUser] = useState<any>(null)
  const [savedProps, setSavedProps] = useState<any[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [featuredProps, setFeaturedProps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [messages, setMessages] = useState<Message[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, aiLoading])

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
      const { data: props } = await supabase
        .from('properties')
        .select('title, type, sub_type, price, location, city, bedrooms, area_sqft, contact_phone, description')
        .eq('status', 'active')
        .limit(20)

      const propertyContext = props && props.length > 0
        ? `\n\nCURRENT LISTINGS IN OUR DATABASE (mention these when relevant):\n${props.map((p: any, i: number) =>
            `${i + 1}. ${p.title} | ${p.type} | ${p.sub_type} | Rs${p.price >= 10000000 ? (p.price / 10000000).toFixed(1) + 'Cr' : (p.price / 100000).toFixed(0) + 'L'} | ${p.location}, ${p.city} | ${p.bedrooms ? p.bedrooms + 'BHK' : ''} ${p.area_sqft ? p.area_sqft + 'sqft' : ''} | Contact: ${p.contact_phone || 'N/A'}`
          ).join('\n')}`
        : '\n\nNo active properties in database currently.'

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, extraContext: propertyContext }),
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
      if (!added) setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, could not get a response. Please try again.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
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
    const already = savedProps.some(sp => sp.property_id === propertyId)
    if (already) return
    await supabase.from('saved_properties').insert({ user_id: user.id, property_id: propertyId })
    const { data } = await supabase.from('saved_properties').select('*, property:properties(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setSavedProps(data || [])
  }

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const typeIcon: Record<string, string> = { flat: '🏠', plot: '🏗️', house: '🏡', builder_floor: '🏘️', sco: '🏪', office: '🏢', warehouse: '🏭', coworking: '☕' }

  const quickQuestions = [
    '30 lac me kya milega?',
    'Best investment under ₹60L?',
    'Compare Zirakpur vs Kharar',
    'Rental yield in IT City?',
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#FDF6EE', color: '#6B4226' }}>Loading...</div>
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
          <button onClick={() => setChatOpen(!chatOpen)} style={{ background: chatOpen ? '#F4860A' : 'rgba(244,134,10,0.15)', color: '#fff', border: '1px solid #F4860A', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🤖 Ask AI {messages.length > 0 && <span style={{ background: '#F4860A', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{messages.length}</span>}
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ background: 'transparent', border: '1px solid #6B4226', color: '#F7BF8A', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign Out</button>
        </div>
      </nav>

      {/* AI CHAT PANEL */}
      {chatOpen && (
        <div style={{ background: '#1A0E05', borderBottom: '2px solid #F4860A', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 1.5rem' }}>

            {/* Messages */}
            <div ref={chatRef} style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div style={{ color: '#F7BF8A', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>🤖 Hi {user?.full_name?.split(' ')[0]}!</div>
                  <div style={{ color: '#A67C5B', fontSize: '13px', marginBottom: '1rem' }}>Ask me anything — I know about properties in our database too</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                    {quickQuestions.map(q => (
                      <button key={q} onClick={() => sendAiMessage(q)} style={{ background: 'rgba(244,134,10,0.12)', color: '#F7BF8A', border: '1px solid rgba(244,134,10,0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user' ? '#F4860A' : 'rgba(255,255,255,0.09)',
                    color: '#fff',
                    fontSize: '13px',
                    lineHeight: 1.65,
                    border: msg.role === 'assistant' ? '1px solid rgba(244,134,10,0.2)' : 'none',
                  }}
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                  {msg.role === 'user' && (
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#4A2C1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F7BF8A', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {aiLoading && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                  <div style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(244,134,10,0.2)', padding: '10px 14px', borderRadius: '4px 16px 16px 16px', color: '#A67C5B', fontSize: '13px' }}>
                    <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAiMessage()}
                placeholder="30 lac me kya milega? or Ask in English..."
                disabled={aiLoading}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '30px', border: '1px solid rgba(244,134,10,0.35)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none' }}
              />
              <button
                onClick={() => sendAiMessage()}
                disabled={aiLoading || !aiInput.trim()}
                style={{ background: aiLoading || !aiInput.trim() ? '#4A2C1A' : '#F4860A', color: '#fff', border: 'none', width: '42px', height: '42px', borderRadius: '50%', fontSize: '18px', cursor: aiLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                ↑
              </button>
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
          {[{ label: 'Saved', value: savedProps.length, icon: '❤️' }, { label: 'AI Chats', value: messages.length > 0 ? 1 : 0, icon: '🤖' }, { label: 'Inquiries', value: inquiries.length, icon: '📩' }].map(s => (
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

        {/* SAVED + EXPLORE */}
        {tab === 'saved' && (
          <div>
            {savedProps.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '2rem', textAlign: 'center', color: '#A67C5B', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❤️</div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>No saved properties yet</div>
                <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Browse Properties →</a>
              </div>
            ) : savedProps.map(sp => (
              <div key={sp.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '60px', height: '50px', borderRadius: '8px', background: '#F5E8D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, overflow: 'hidden' }}>
                    {sp.property?.photos?.[0] ? <img src={sp.property.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : typeIcon[sp.property?.sub_type] || '🏠'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#2C1A0E', fontSize: '14px' }}>{sp.property?.title}</div>
                    <div style={{ fontSize: '12px', color: '#6B4226' }}>📍 {sp.property?.location}, {sp.property?.city}</div>
                    <div style={{ fontSize: '13px', color: '#F4860A', fontWeight: 700 }}>{sp.property?.price ? formatPrice(sp.property.price) : '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <a href={`/p/${sp.property_id}`} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>View</a>
                  <button onClick={() => removeSaved(sp.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Remove</button>
                </div>
              </div>
            ))}

            {/* EXPLORE SECTION */}
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#2C1A0E' }}>🏠 Explore Properties</div>
                <a href="/properties" style={{ color: '#F4860A', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
              </div>
              {featuredProps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
                  No properties listed yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
                  {featuredProps.map(prop => {
                    const isSaved = savedProps.some(sp => sp.property_id === prop.id)
                    return (
                      <div key={prop.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', overflow: 'hidden' }}>
                        <div style={{ height: '130px', background: '#F5E8D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', overflow: 'hidden', position: 'relative' }}>
                          {prop.photos && prop.photos[0]
                            ? <img src={prop.photos[0]} alt={prop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span>{typeIcon[prop.sub_type] || '🏠'}</span>}
                          <span style={{ position: 'absolute', top: '8px', right: '8px', background: prop.type === 'buy' ? '#EAF3DE' : prop.type === 'rent' ? '#E6F1FB' : '#FEF3C7', color: prop.type === 'buy' ? '#27500A' : prop.type === 'rent' ? '#0C447C' : '#92400E', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>
                            {prop.type === 'buy' ? 'Sale' : prop.type === 'rent' ? 'Rent' : 'Commercial'}
                          </span>
                        </div>
                        <div style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#2C1A0E', fontSize: '13px', marginBottom: '3px' }}>{prop.title}</div>
                          <div style={{ fontSize: '11px', color: '#6B4226', marginBottom: '6px' }}>📍 {prop.location}, {prop.city}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, color: '#F4860A', fontSize: '14px' }}>{formatPrice(prop.price)}</div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <a href={`/p/${prop.id}`} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>View</a>
                              <button onClick={() => saveProperty(prop.id)} style={{ background: isSaved ? '#DCFCE7' : '#F5E8D8', color: isSaved ? '#166534' : '#6B4226', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: isSaved ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                {isSaved ? '✓' : '❤️'}
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

        {/* INQUIRIES */}
        {tab === 'inquiries' && (
          <div>
            {inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📩</div>
                <div style={{ fontWeight: 600 }}>No inquiries sent yet</div>
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

        {/* AI CHATS tab */}
        {tab === 'chats' && (
          <div>
            <button onClick={() => { setChatOpen(true); window.scrollTo(0, 0) }} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '1rem' }}>+ Open AI Chat</button>
            {chats.length === 0 && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#A67C5B', background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
                <div style={{ fontWeight: 600 }}>No saved conversations</div>
                <p style={{ fontSize: '13px' }}>Click "Ask AI" button in the navbar to start</p>
              </div>
            ) : null}
          </div>
        )}

        {/* VISITS */}
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