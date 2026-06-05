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
  'Office space in IT City',
  '30 lac me kya milega?',
]

function formatText(text: string) {
  return text
    .replace(/#{1,3} (.*?)(\n|$)/g, '<strong style="font-size:15px;color:#2C1A0E">$1</strong><br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
}

function PropertyCard({ prop }: { prop: any }) {
  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const typeIcon: Record<string, string> = { flat: '🏠', plot: '🏗️', house: '🏡', builder_floor: '🏘️', sco: '🏪', office: '🏢', warehouse: '🏭', coworking: '☕' }

  return (
    <a href={`/p/${prop.id}`} style={{ textDecoration: 'none', display: 'block', minWidth: '220px', maxWidth: '240px', flexShrink: 0 }}>
      <div style={{ background: '#fff', borderRadius: '12px', border: '2px solid #F4860A', overflow: 'hidden', boxShadow: '0 2px 12px rgba(244,134,10,0.15)' }}>
        <div style={{ height: '130px', background: '#F5E8D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', overflow: 'hidden', position: 'relative' }}>
          {prop.photos && prop.photos[0]
            ? <img src={prop.photos[0]} alt={prop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{typeIcon[prop.sub_type] || '🏠'}</span>}
          <span style={{ position: 'absolute', top: '8px', left: '8px', background: '#F4860A', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>
            IN OUR SYSTEM ✓
          </span>
          <span style={{ position: 'absolute', top: '8px', right: '8px', background: prop.type === 'buy' ? '#EAF3DE' : prop.type === 'rent' ? '#E6F1FB' : '#FEF3C7', color: prop.type === 'buy' ? '#27500A' : prop.type === 'rent' ? '#0C447C' : '#92400E', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>
            {prop.type === 'buy' ? 'Sale' : prop.type === 'rent' ? 'Rent' : 'Commercial'}
          </span>
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontWeight: 700, color: '#2C1A0E', fontSize: '13px', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prop.title}</div>
          <div style={{ fontSize: '11px', color: '#6B4226', marginBottom: '6px' }}>📍 {prop.location}, {prop.city}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, color: '#F4860A', fontSize: '15px' }}>{formatPrice(prop.price)}</div>
            <div style={{ fontSize: '11px', color: '#A67C5B' }}>{prop.bedrooms ? `${prop.bedrooms}BHK` : ''} {prop.area_sqft ? `· ${prop.area_sqft}sqft` : ''}</div>
          </div>
          {prop.contact_phone && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F5E8D8', display: 'flex', gap: '6px' }}>
              <a href={`tel:${prop.contact_phone}`} onClick={e => e.stopPropagation()} style={{ flex: 1, background: '#25D366', color: '#fff', padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>📞 Call</a>
              <a href={`https://wa.me/91${prop.contact_phone.replace(/\s/g, '')}?text=Hi, interested in ${encodeURIComponent(prop.title)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ flex: 1, background: '#2C1A0E', color: '#F4860A', padding: '5px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textAlign: 'center', textDecoration: 'none', border: '1px solid #F4860A' }}>💬 WA</a>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

function ChatUI() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const didAutoSend = useRef(false)

  useEffect(() => {
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

  const findMatchingProperties = async (query: string) => {
    const lowerQ = query.toLowerCase()
    const { data: allProps } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'active')
      .limit(30)

    if (!allProps || allProps.length === 0) return []

    // Smart matching based on query keywords
    return allProps.filter(prop => {
      const propText = `${prop.title} ${prop.location} ${prop.city} ${prop.sub_type} ${prop.type} ${prop.description || ''}`.toLowerCase()
      const priceMatch = (() => {
        const priceInLac = prop.price / 100000
        if (lowerQ.includes('30 lac') || lowerQ.includes('30lac') || lowerQ.includes('₹30') || lowerQ.includes('rs30')) return priceInLac <= 35
        if (lowerQ.includes('50 lac') || lowerQ.includes('50lac') || lowerQ.includes('₹50')) return priceInLac <= 55
        if (lowerQ.includes('1 cr') || lowerQ.includes('1cr') || lowerQ.includes('100 lac')) return priceInLac <= 110
        if (lowerQ.includes('under') || lowerQ.includes('budget') || lowerQ.includes('kum') || lowerQ.includes('lac me')) return true
        return true
      })()

      const locationMatch = (() => {
        const cities = ['chandigarh', 'mohali', 'panchkula', 'zirakpur', 'kharar', 'landran', 'aerocity', 'derabassi', 'pinjore', 'new chandigarh']
        for (const city of cities) {
          if (lowerQ.includes(city) && propText.includes(city)) return true
        }
        return false
      })()

      const typeMatch = (() => {
        if ((lowerQ.includes('2bhk') || lowerQ.includes('2 bhk')) && prop.bedrooms === 2) return true
        if ((lowerQ.includes('3bhk') || lowerQ.includes('3 bhk')) && prop.bedrooms === 3) return true
        if (lowerQ.includes('office') && prop.sub_type === 'office') return true
        if (lowerQ.includes('plot') && prop.sub_type === 'plot') return true
        if (lowerQ.includes('warehouse') && prop.sub_type === 'warehouse') return true
        if (lowerQ.includes('sco') && prop.sub_type === 'sco') return true
        if (lowerQ.includes('rent') && prop.type === 'rent') return true
        if (lowerQ.includes('commercial') && prop.type === 'commercial') return true
        return false
      })()

      return priceMatch && (locationMatch || typeMatch || lowerQ.includes('kya milega') || lowerQ.includes('show') || lowerQ.includes('available') || lowerQ.includes('list'))
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
      // Fetch all active properties for AI context
      const { data: props } = await supabase
        .from('properties')
        .select('id, title, type, sub_type, price, location, city, bedrooms, area_sqft, contact_phone, description')
        .eq('status', 'active')
        .limit(30)

      const propertyContext = props && props.length > 0
        ? `\n\nCURRENT LISTINGS IN OUR DATABASE:\n${props.map((p: any, i: number) =>
            `${i + 1}. ${p.title} | ${p.type} | ${p.sub_type} | Rs${p.price >= 10000000 ? (p.price / 10000000).toFixed(1) + 'Cr' : (p.price / 100000).toFixed(0) + 'L'} | ${p.location}, ${p.city} | ${p.bedrooms ? p.bedrooms + 'BHK' : ''} ${p.area_sqft ? p.area_sqft + 'sqft' : ''} | Contact: ${p.contact_phone || 'N/A'}`
          ).join('\n')}\n\nWhen user asks for property, mention matching listings from above.`
        : ''

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, extraContext: propertyContext }),
      })

      if (!res.ok) throw new Error('API error')

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
                if (!added) {
                  setMessages(prev => [...prev, { role: 'assistant', content: aiText }])
                  added = true
                } else {
                  setMessages(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], content: aiText }; return u })
                }
              }
            } catch {}
          }
        }
      }

      // After AI responds, find and attach matching properties
      const matchingProps = await findMatchingProperties(messageText)
      if (matchingProps.length > 0) {
        setMessages(prev => {
          const u = [...prev]
          u[u.length - 1] = { ...u[u.length - 1], properties: matchingProps }
          return u
        })
      }

      if (!added) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, could not get a response. Please try again.' }])
      }

    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', background: '#FDF6EE' }}>

      {/* NAVBAR */}
      <nav style={{ background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/properties" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>Properties</a>
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
              <p style={{ color: '#6B4226', fontSize: '15px', marginBottom: '2rem' }}>Ask anything — I know about properties in our database, market trends, investment advice and more</p>
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
                  <div style={{ fontSize: '12px', color: '#A67C5B', marginBottom: '8px', fontWeight: 600 }}>
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

          {/* Loading */}
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
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#A67C5B', marginTop: '6px' }}>PropertyAI may make mistakes. Verify important details before investing.</p>
      </div>
    </div>
  )
}

export default function AskPage() {
  return <Suspense><ChatUI /></Suspense>
}