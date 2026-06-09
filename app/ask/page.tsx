'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
  properties?: any[]
}

const suggestions = [
  'Best 3BHK under ₹1 Cr in Mohali',
  'Compare Aerocity vs New Chandigarh',
  'Rental yield in Zirakpur',
  '30 lac me kya milega?',
  'Office space in IT City',
]

function formatText(text: string) {
  return text
    .replace(/#{1,3} (.*?)(\n|$)/g, '<strong style="font-size:15px">$1</strong><br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

function PropertyCard({ prop }: { prop: any }) {
  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const typeIcon: Record<string, string> = { flat: '🏠', plot: '🏗️', house: '🏡', builder_floor: '🏘️', sco: '🏪', office: '🏢', warehouse: '🏭', coworking: '☕' }

  return (
    <div style={{ minWidth: '240px', maxWidth: '260px', flexShrink: 0, background: '#fff', borderRadius: '14px', border: '2px solid #F4860A', overflow: 'hidden', boxShadow: '0 4px 20px rgba(244,134,10,0.12)' }}>
      {/* Photo */}
      <div style={{ height: '140px', background: '#F5E8D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', overflow: 'hidden', position: 'relative' }}>
        {prop.photos && prop.photos[0]
          ? <img src={prop.photos[0]} alt={prop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{typeIcon[prop.sub_type] || '🏠'}</span>}
        <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#F4860A', color: '#fff', padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>IN OUR SYSTEM ✓</span>
        <span style={{ position: 'absolute', top: '8px', right: '8px', background: prop.type === 'buy' ? '#EAF3DE' : prop.type === 'rent' ? '#E6F1FB' : '#FEF3C7', color: prop.type === 'buy' ? '#27500A' : prop.type === 'rent' ? '#0C447C' : '#92400E', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>
          {prop.type === 'buy' ? 'Sale' : prop.type === 'rent' ? 'Rent' : 'Commercial'}
        </span>
      </div>

      {/* Details */}
      <div style={{ padding: '12px' }}>
        <div style={{ fontWeight: 700, color: '#2C1A0E', fontSize: '13px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prop.title}</div>
        <div style={{ fontSize: '11px', color: '#6B4226', marginBottom: '8px' }}>📍 {prop.location}, {prop.city}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontWeight: 800, color: '#F4860A', fontSize: '16px' }}>{formatPrice(prop.price)}</div>
          <div style={{ fontSize: '11px', color: '#A67C5B' }}>{prop.bedrooms ? `${prop.bedrooms}BHK` : ''}{prop.area_sqft ? ` · ${prop.area_sqft}sqft` : ''}</div>
        </div>

        {/* Buttons */}
        <a href={`/p/${prop.id}`} style={{ display: 'block', background: '#2C1A0E', color: '#F4860A', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', marginBottom: '6px', border: '1px solid #F4860A' }}>
          View Property →
        </a>
        <div style={{ display: 'flex', gap: '6px' }}>
          {prop.contact_phone && (
            <>
              <a href={`tel:${prop.contact_phone}`} style={{ flex: 1, background: '#25D366', color: '#fff', padding: '7px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>📞 Call</a>
              <a href={`https://wa.me/91${prop.contact_phone.replace(/\s/g, '')}?text=Hi, I saw this property on PropertyAI: ${encodeURIComponent(prop.title)}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: '#128C7E', color: '#fff', padding: '7px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>💬 WhatsApp</a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatUI() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [convTitle, setConvTitle] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const didAutoSend = useRef(false)

  useEffect(() => {
    // Check if logged in
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    const q = searchParams.get('q')
    if (q && !didAutoSend.current) {
      didAutoSend.current = true
      sendMessage(q)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Save conversation to Supabase
  const saveConversation = async (updatedMessages: Message[]) => {
    if (!userId) return
    const title = convTitle || updatedMessages.find(m => m.role === 'user')?.content?.slice(0, 60) || 'Conversation'
    if (!convTitle) setConvTitle(title)

    // Strip properties from messages before saving (only save text)
    const cleanMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }))

    if (convId) {
      await supabase.from('conversations').update({ messages: cleanMessages, updated_at: new Date().toISOString() }).eq('id', convId)
    } else {
      const { data } = await supabase.from('conversations').insert({ user_id: userId, title, messages: cleanMessages }).select('id').single()
      if (data) setConvId(data.id)
    }
  }

  const findMatchingProperties = async (query: string) => {
    const lowerQ = query.toLowerCase()
    const { data: allProps } = await supabase.from('properties').select('*').eq('status', 'active').limit(30)
    if (!allProps || allProps.length === 0) return []

    return allProps.filter(prop => {
      const propText = `${prop.title} ${prop.location} ${prop.city} ${prop.sub_type} ${prop.type} ${prop.description || ''}`.toLowerCase()

      const priceMatch = (() => {
        const pl = prop.price / 100000
        if (lowerQ.match(/30\s*lac|₹30|rs\.?\s*30/)) return pl <= 35
        if (lowerQ.match(/40\s*lac|₹40/)) return pl <= 45
        if (lowerQ.match(/50\s*lac|₹50/)) return pl <= 55
        if (lowerQ.match(/60\s*lac|₹60/)) return pl <= 65
        if (lowerQ.match(/1\s*cr|100\s*lac/)) return pl <= 110
        if (lowerQ.match(/under|budget|kum|lac me|milega/)) return true
        return true
      })()

      const locationMatch = ['chandigarh','mohali','panchkula','zirakpur','kharar','landran','aerocity','derabassi','pinjore','new chandigarh','it city','phase 8'].some(loc => lowerQ.includes(loc) && propText.includes(loc))

      const typeMatch = (() => {
        if (lowerQ.match(/2\s*bhk/) && prop.bedrooms === 2) return true
        if (lowerQ.match(/3\s*bhk/) && prop.bedrooms === 3) return true
        if (lowerQ.includes('office') && prop.sub_type === 'office') return true
        if (lowerQ.includes('plot') && prop.sub_type === 'plot') return true
        if (lowerQ.includes('warehouse') && prop.sub_type === 'warehouse') return true
        if (lowerQ.includes('sco') && prop.sub_type === 'sco') return true
        if (lowerQ.includes('rent') && prop.type === 'rent') return true
        if (lowerQ.includes('commercial') && prop.type === 'commercial') return true
        return false
      })()

      const broadMatch = lowerQ.match(/kya milega|show|available|list|property|properties|milegi|dikhao/)

      return priceMatch && (locationMatch || typeMatch || broadMatch)
    })
  }

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim()
    if (!messageText || loading) return

    const userMessage: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data: props } = await supabase.from('properties').select('id, title, type, sub_type, price, location, city, bedrooms, area_sqft, contact_phone, description').eq('status', 'active').limit(30)

      const propertyContext = props && props.length > 0
        ? `\n\nCURRENT LISTINGS IN OUR DATABASE:\n${props.map((p: any, i: number) =>
            `${i + 1}. ${p.title} | ${p.type} | ${p.sub_type} | Rs${p.price >= 10000000 ? (p.price / 10000000).toFixed(1) + 'Cr' : (p.price / 100000).toFixed(0) + 'L'} | ${p.location}, ${p.city} | ${p.bedrooms ? p.bedrooms + 'BHK' : ''} ${p.area_sqft ? p.area_sqft + 'sqft' : ''} | Contact: ${p.contact_phone || 'N/A'}`
          ).join('\n')}\n\nAlways mention matching listings from above when relevant.`
        : ''

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })), extraContext: propertyContext }),
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let aiText = ''
      let added = false

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const delta = JSON.parse(data).choices?.[0]?.delta?.content || ''
              if (delta) {
                aiText += delta
                if (!added) { setMessages(prev => [...prev, { role: 'assistant', content: aiText }]); added = true }
                else setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: aiText }; return u })
              }
            } catch {}
          }
        }
      }

      if (!added) setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, could not get a response. Please try again.' }])

      // Find matching properties and attach to last message
      const matched = await findMatchingProperties(messageText)
      const finalMessages = [...newMessages, { role: 'assistant' as const, content: aiText, properties: matched.length > 0 ? matched : undefined }]
      setMessages(finalMessages)

      // Save to Supabase
      await saveConversation(finalMessages)

    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', background: '#FDF6EE' }}>

      {/* NAVBAR */}
      <nav style={{ background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/properties" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>Properties</a>
          <a href="/buyer" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>My Chats</a>
          <a href="/seller" style={{ background: '#F4860A', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>List Free</a>
        </div>
      </nav>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          {/* Empty state */}
          {isEmpty && !loading && (
            <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#2C1A0E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '28px' }}>🤖</div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2C1A0E', margin: '0 0 0.5rem' }}>PropertyAI Assistant</h1>
              <p style={{ color: '#6B4226', fontSize: '15px', marginBottom: '2rem', lineHeight: 1.6 }}>
                Ask anything — I know about properties in our database, market trends and investment advice.<br />
                {!userId && <span style={{ fontSize: '13px', color: '#A67C5B' }}>💡 <a href="/login" style={{ color: '#F4860A' }}>Sign in</a> to save your conversations</span>}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{ background: '#fff', color: '#2C1A0E', border: '1px solid #F5E8D8', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#2C1A0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
                )}
                <div style={{
                  maxWidth: '80%',
                  background: msg.role === 'user' ? '#F4860A' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#2C1A0E',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  fontSize: '14px', lineHeight: 1.65,
                  border: msg.role === 'assistant' ? '1px solid #F5E8D8' : 'none',
                }}
                  dangerouslySetInnerHTML={{ __html: msg.role === 'assistant' ? formatText(msg.content) : msg.content }}
                />
                {msg.role === 'user' && (
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#4A2C1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#F7BF8A', flexShrink: 0, marginTop: '2px' }}>U</div>
                )}
              </div>

              {/* Property cards carousel */}
              {msg.role === 'assistant' && msg.properties && msg.properties.length > 0 && (
                <div style={{ marginTop: '12px', marginLeft: '44px' }}>
                  <div style={{ fontSize: '12px', color: '#A67C5B', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏠 {msg.properties.length} matching {msg.properties.length === 1 ? 'property' : 'properties'} in our system:
                  </div>
                  <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollSnapType: 'x mandatory' }}>
                    {msg.properties.map(prop => (
                      <div key={prop.id} style={{ scrollSnapAlign: 'start' }}>
                        <PropertyCard prop={prop} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#2C1A0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
              <div style={{ background: '#fff', border: '1px solid #F5E8D8', padding: '12px 16px', borderRadius: '4px 18px 18px 18px', fontSize: '14px', color: '#A67C5B' }}>Thinking...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT BAR */}
      <div style={{ background: '#fff', borderTop: '1px solid #F5E8D8', padding: '1rem 1.5rem', flexShrink: 0 }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about properties, investment, rental yield..."
            disabled={loading}
            style={{ flex: 1, padding: '13px 18px', fontSize: '14px', border: '1.5px solid #F5E8D8', borderRadius: '30px', outline: 'none', background: '#FDF6EE', color: '#2C1A0E', fontFamily: 'Inter, sans-serif' }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? '#C49A6C' : '#F4860A', color: '#fff', border: 'none', width: '48px', height: '48px', borderRadius: '50%', fontSize: '20px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#A67C5B', marginTop: '6px' }}>
          PropertyAI may make mistakes. Verify details before investing.
          {convId && <span style={{ color: '#16A34A', marginLeft: '8px' }}>✓ Chat saved</span>}
        </p>
      </div>
    </div>
  )
}

export default function AskPage() {
  return <Suspense><ChatUI /></Suspense>
}