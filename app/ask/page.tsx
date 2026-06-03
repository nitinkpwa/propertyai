'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'Best 3BHK under ₹1 Cr in Mohali',
  'Compare Aerocity vs New Chandigarh',
  'Rental yield in Zirakpur',
  'Office space in IT City',
  'Investment under ₹50 lakh',
]

function ChatUI() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setInput(q)
      sendMessage(q)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const messageText = text || input
    if (!messageText.trim() || loading) return

    const userMessage: Message = { role: 'user', content: messageText }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let aiText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content || ''
              aiText += delta
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: aiText }
                return updated
              })
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', background: '#FDF6EE' }}>

      {/* NAVBAR */}
      <nav style={{
        background: '#2C1A0E', padding: '0 1.5rem', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px',
            background: '#F4860A', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px',
          }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/properties" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>Properties</a>
          <a href="/seller" style={{
            background: '#F4860A', color: '#fff', padding: '6px 16px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          }}>List Free</a>
        </div>
      </nav>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          {/* Empty state */}
          {isEmpty && (
            <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: '#2C1A0E', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem', fontSize: '28px',
              }}>🤖</div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2C1A0E', margin: '0 0 0.5rem' }}>
                PropertyAI Assistant
              </h1>
              <p style={{ color: '#6B4226', fontSize: '15px', marginBottom: '2rem' }}>
                Ask me anything about properties, investments, or the Tricity real estate market
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      background: '#fff', color: '#2C1A0E',
                      border: '1px solid #F5E8D8', padding: '8px 16px',
                      borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '1rem',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: '#2C1A0E', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0, marginTop: '2px',
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: '75%',
                background: msg.role === 'user' ? '#F4860A' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#2C1A0E',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                fontSize: '14px', lineHeight: 1.65,
                border: msg.role === 'assistant' ? '1px solid #F5E8D8' : 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content || (loading && i === messages.length - 1 ? (
                  <span style={{ opacity: 0.5 }}>Thinking...</span>
                ) : '')}
              </div>
              {msg.role === 'user' && (
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: '#4A2C1A', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '14px', fontWeight: 700,
                  color: '#F7BF8A', flexShrink: 0, marginTop: '2px',
                }}>U</div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT BAR */}
      <div style={{
        background: '#fff', borderTop: '1px solid #F5E8D8',
        padding: '1rem 1.5rem', flexShrink: 0,
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about properties, investment, rental yield..."
            disabled={loading}
            style={{
              flex: 1, padding: '13px 18px', fontSize: '14px',
              border: '1.5px solid #F5E8D8', borderRadius: '30px',
              outline: 'none', background: '#FDF6EE', color: '#2C1A0E',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              background: loading ? '#C49A6C' : '#F4860A',
              color: '#fff', border: 'none',
              width: '48px', height: '48px', borderRadius: '50%',
              fontSize: '20px', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {loading ? '⏳' : '↑'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#A67C5B', marginTop: '6px' }}>
          PropertyAI may make mistakes. Verify important details before investing.
        </p>
      </div>
    </div>
  )
}

export default function AskPage() {
  return (
    <Suspense>
      <ChatUI />
    </Suspense>
  )
}