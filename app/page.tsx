'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const examples = [
  'Best 3 BHK under ₹1 Cr in Mohali',
  'Office space in IT City Mohali',
  'Best investment area near Chandigarh',
  'Commercial property with rental income',
  'Compare Aerocity vs New Chandigarh',
  'Warehouse for lease in Derabassi',
]

const stats = [
  { num: '5,000+', label: 'Verified Properties' },
  { num: '50+', label: 'Builder Partners' },
  { num: 'Tricity', label: 'Market Coverage' },
  { num: 'AI', label: 'Powered Search' },
]

export default function HomePage() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleAsk = () => {
    if (!query.trim()) return
    router.push(`/ask?q=${encodeURIComponent(query)}`)
  }

  const handleExample = (text: string) => {
    setQuery(text)
  }

  return (
    <main style={{ fontFamily: 'Inter, sans-serif', background: '#FDF6EE', minHeight: '100vh' }}>

      {/* NAVBAR */}
      <nav style={{
        background: '#2C1A0E',
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: '#F4860A', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '16px'
          }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>PropertyAI</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="/properties" style={{ color: '#F7BF8A', fontSize: '14px', textDecoration: 'none' }}>Properties</a>
          <a href="/ask" style={{ color: '#F7BF8A', fontSize: '14px', textDecoration: 'none' }}>AI Assistant</a>
          <a href="/seller" style={{ color: '#F7BF8A', fontSize: '14px', textDecoration: 'none' }}>List Property</a>
          <a href="/login" style={{
            background: '#F4860A', color: '#fff', padding: '8px 18px',
            borderRadius: '20px', fontSize: '13px', fontWeight: 600,
            textDecoration: 'none'
          }}>Sign In</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: '#2C1A0E',
        padding: '80px 2rem 100px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: '#4A2C1A', opacity: 0.6,
        }} />
        <div style={{
          position: 'absolute', top: '-20px', right: '-20px',
          width: '260px', height: '260px', borderRadius: '50%',
          background: '#F4860A', opacity: 0.15,
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: '#4A2C1A', opacity: 0.4,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Pill tag */}
          <div style={{ display: 'inline-block', marginBottom: '1.5rem' }}>
            <span style={{
              background: 'rgba(244,134,10,0.2)', color: '#F7A633',
              border: '1px solid rgba(244,134,10,0.4)',
              padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
            }}>India&apos;s First AI Real Estate Platform — Tricity</span>
          </div>

          <h1 style={{
            color: '#FFFFFF', fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem',
            maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Find Your Perfect Property<br />
            <span style={{ color: '#F4860A' }}>Just Ask AI</span>
          </h1>

          <p style={{
            color: '#F7BF8A', fontSize: '1.1rem', maxWidth: '520px',
            margin: '0 auto 2.5rem', lineHeight: 1.6,
          }}>
            No more browsing hundreds of listings. Ask in plain language — 
            get personalized recommendations, investment insights & verified properties.
          </p>

          {/* SEARCH BAR */}
          <div style={{
            maxWidth: '680px', margin: '0 auto 1.5rem',
            display: 'flex', gap: '0',
            background: '#fff', borderRadius: '50px',
            border: '2px solid #F4860A',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(244,134,10,0.25)',
          }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask anything about real estate in Tricity..."
              style={{
                flex: 1, padding: '18px 24px', fontSize: '15px',
                border: 'none', outline: 'none', background: 'transparent',
                color: '#2C1A0E',
              }}
            />
            <button
              onClick={handleAsk}
              style={{
                background: '#F4860A', color: '#fff',
                border: 'none', padding: '0 28px',
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                borderRadius: '0 48px 48px 0',
                whiteSpace: 'nowrap',
              }}
            >
              Ask AI →
            </button>
          </div>

          {/* EXAMPLE PROMPTS */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            justifyContent: 'center', maxWidth: '680px', margin: '0 auto',
          }}>
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => handleExample(ex)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#F7BF8A', border: '1px solid rgba(247,191,138,0.3)',
                  padding: '7px 14px', borderRadius: '20px',
                  fontSize: '12px', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(244,134,10,0.2)'
                  ;(e.target as HTMLButtonElement).style.borderColor = '#F4860A'
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                  ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(247,191,138,0.3)'
                }}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* CTA BUTTONS */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2rem' }}>
            <a href="/ask" style={{
              background: '#F4860A', color: '#fff',
              padding: '14px 32px', borderRadius: '30px',
              fontSize: '15px', fontWeight: 700, textDecoration: 'none',
            }}>Try AI Assistant</a>
            <a href="/seller" style={{
              background: 'transparent', color: '#F7BF8A',
              padding: '14px 32px', borderRadius: '30px',
              fontSize: '15px', fontWeight: 600, textDecoration: 'none',
              border: '2px solid rgba(247,191,138,0.4)',
            }}>List Property Free</a>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{
        background: '#4A2C1A',
        padding: '1.5rem 2rem',
        display: 'flex', justifyContent: 'center', gap: '4rem',
        flexWrap: 'wrap',
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ color: '#F4860A', fontSize: '1.6rem', fontWeight: 800 }}>{s.num}</div>
            <div style={{ color: '#F7BF8A', fontSize: '13px' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{
            background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A55',
            padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
          }}>How it works</span>
          <h2 style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800,
            color: '#2C1A0E', marginTop: '1rem', marginBottom: '0.5rem',
          }}>Real estate search, reimagined</h2>
          <p style={{ color: '#6B4226', fontSize: '1rem' }}>
            No filters, no browsing — just ask in plain Hindi or English
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
        }}>
          {[
            { step: '01', icon: '💬', title: 'Ask in plain language', desc: 'Type your requirement just like you\'d tell a friend. Budget, location, purpose — all in one sentence.' },
            { step: '02', icon: '🤖', title: 'AI understands & searches', desc: 'Our AI reads your intent, searches verified listings, and pulls market data in real time.' },
            { step: '03', icon: '🏠', title: 'Get smart recommendations', desc: 'Receive ranked property options with price analysis, rental yield, and investment potential.' },
            { step: '04', icon: '📞', title: 'Connect directly', desc: 'Contact verified owners, builders and brokers directly — no middlemen, no spam calls.' },
          ].map((item) => (
            <div key={item.step} style={{
              background: '#fff', borderRadius: '16px',
              border: '1px solid #F5E8D8', padding: '1.5rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '12px', right: '16px',
                fontSize: '3rem', fontWeight: 900, color: '#F5E8D8',
                lineHeight: 1,
              }}>{item.step}</div>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2C1A0E', marginBottom: '0.5rem' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#6B4226', lineHeight: 1.6, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PROPERTY TYPES */}
      <section style={{ background: '#2C1A0E', padding: '80px 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.5rem' }}>
              All property types in one place
            </h2>
            <p style={{ color: '#F7BF8A', fontSize: '1rem' }}>
              Residential, commercial, investment — we cover it all
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { icon: '🏠', label: 'Flats & Apartments' },
              { icon: '🏗️', label: 'Plots & Land' },
              { icon: '🏢', label: 'Office Spaces' },
              { icon: '🏪', label: 'SCO / Retail' },
              { icon: '🏭', label: 'Warehouse' },
              { icon: '☕', label: 'Coworking' },
            ].map((type) => (
              <a
                key={type.label}
                href={`/properties?type=${encodeURIComponent(type.label)}`}
                style={{
                  background: '#4A2C1A', borderRadius: '12px',
                  padding: '1.25rem 1rem', textAlign: 'center',
                  cursor: 'pointer', textDecoration: 'none',
                  border: '1px solid rgba(244,134,10,0.2)',
                  transition: 'all 0.2s',
                  display: 'block',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#F4860A')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(244,134,10,0.2)')}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{type.icon}</div>
                <div style={{ color: '#F7BF8A', fontSize: '13px', fontWeight: 500 }}>{type.label}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* AI CHAT PREVIEW */}
      <section style={{ padding: '80px 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: '#2C1A0E', marginBottom: '0.5rem' }}>
            See AI in action
          </h2>
          <p style={{ color: '#6B4226' }}>A real conversation with PropertyAI</p>
        </div>

        <div style={{
          background: '#fff', borderRadius: '20px',
          border: '1px solid #F5E8D8', overflow: 'hidden',
        }}>
          <div style={{
            background: '#2C1A0E', padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
            <span style={{ color: '#F7BF8A', fontSize: '13px', marginLeft: '8px' }}>PropertyAI Assistant</span>
          </div>

          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* User message */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                background: '#F4860A', color: '#fff',
                padding: '10px 16px', borderRadius: '18px 18px 4px 18px',
                maxWidth: '75%', fontSize: '14px', lineHeight: 1.5,
              }}>
                I have ₹90 lakh. Looking for investment near Mohali.
              </div>
            </div>

            {/* AI response */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#2C1A0E', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '16px', flexShrink: 0,
              }}>🤖</div>
              <div style={{
                background: '#FDF6EE', border: '1px solid #F5E8D8',
                padding: '10px 16px', borderRadius: '4px 18px 18px 18px',
                maxWidth: '80%', fontSize: '14px', lineHeight: 1.6, color: '#2C1A0E',
              }}>
                Great budget! Here are <strong>3 top investment picks</strong> near Mohali for ₹90L:<br /><br />
                🏠 <strong>2BHK in Aerocity</strong> — ₹82L — Rental yield 4.2% — High appreciation zone<br />
                🏪 <strong>SCO Plot in Kharar</strong> — ₹88L — Commercial boom area<br />
                🏗️ <strong>Plot in New Chandigarh</strong> — ₹75L — Master plan area, 5yr growth pick<br /><br />
                Want me to compare these in detail or show similar options?
              </div>
            </div>
          </div>

          <div style={{
            padding: '1rem 1.5rem', borderTop: '1px solid #F5E8D8',
            display: 'flex', gap: '8px',
          }}>
            <a href="/ask" style={{
              flex: 1, background: '#2C1A0E', color: '#F7BF8A',
              border: 'none', padding: '12px', borderRadius: '10px',
              fontSize: '14px', cursor: 'pointer', textAlign: 'center',
              textDecoration: 'none', fontWeight: 500,
            }}>
              Start your own conversation →
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#2C1A0E', padding: '2rem',
        textAlign: 'center', borderTop: '1px solid #4A2C1A',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: '#F4860A', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '12px',
          }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </div>
        <p style={{ color: '#6B4226', fontSize: '13px', margin: '0' }}>
          India&apos;s AI-powered real estate platform · Tricity · © 2025
        </p>
      </footer>

    </main>
  )
}