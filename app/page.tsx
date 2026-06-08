'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LOCATIONS = ['Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur', 'Kharar', 'New Chandigarh', 'Aerocity', 'IT City', 'Landran', 'Derabassi']
const BUDGETS = ['Under ₹30L', '₹30L–₹60L', '₹60L–₹1Cr', '₹1Cr–₹2Cr', 'Above ₹2Cr']
const PROPERTY_TYPES = ['Buy', 'Rent', 'Commercial']

const AREA_GUIDES = [
  { city: 'Mohali', tag: 'IT Hub', desc: 'Fastest growing, best rental yields', bg: '#FFF8F0', tagBg: '#F4860A', tagColor: '#fff' },
  { city: 'Aerocity', tag: 'Commercial', desc: 'Airport zone, SCO boom area', bg: '#F0F4FF', tagBg: '#2563EB', tagColor: '#fff' },
  { city: 'New Chandigarh', tag: '5-Year Play', desc: 'Master-planned, huge upside potential', bg: '#F0FDF4', tagBg: '#16A34A', tagColor: '#fff' },
  { city: 'Zirakpur', tag: 'Affordable', desc: 'High volume, good connectivity', bg: '#FFF7ED', tagBg: '#EA580C', tagColor: '#fff' },
  { city: 'Chandigarh', tag: 'Premium', desc: 'Limited supply, stable capital value', bg: '#FDF4FF', tagBg: '#9333EA', tagColor: '#fff' },
  { city: 'Panchkula', tag: 'Family Living', desc: 'Premium, peaceful, low risk market', bg: '#F0FDFA', tagBg: '#0D9488', tagColor: '#fff' },
]

const POPULAR_SEARCHES = [
  { label: 'Flats for sale in Mohali', href: '/properties?type=buy&city=Mohali' },
  { label: 'Flats for sale in Chandigarh', href: '/properties?type=buy&city=Chandigarh' },
  { label: 'Plots in New Chandigarh', href: '/properties?type=buy&city=New+Chandigarh' },
  { label: 'Flats for rent in Mohali', href: '/properties?type=rent&city=Mohali' },
  { label: 'SCO for sale in Aerocity', href: '/properties?type=commercial&city=Aerocity' },
  { label: 'Office space in IT City', href: '/properties?type=commercial&city=IT+City' },
  { label: '2BHK in Zirakpur', href: '/properties?type=buy&city=Zirakpur' },
  { label: 'Warehouse in Derabassi', href: '/properties?type=commercial&city=Derabassi' },
  { label: 'Builder floor in Kharar', href: '/properties?type=buy&city=Kharar' },
  { label: 'Investment in Panchkula', href: '/properties?type=buy&city=Panchkula' },
  { label: 'Rental yield areas Tricity', href: '/ask?q=Best rental yield areas in Tricity 2025' },
  { label: 'Plots under ₹40L Tricity', href: '/properties?type=buy' },
]

const WHY_US = [
  { icon: '🤖', title: 'AI-Powered Search', desc: 'Ask in plain language — Hindi or English. Get personalized recommendations, investment analysis and rental yields instantly.' },
  { icon: '✅', title: 'Verified Listings', desc: 'Every property is verified. No fake listings, no ghost properties, no wasted calls.' },
  { icon: '📊', title: 'Market Intelligence', desc: 'Track infrastructure impact, price trends, and growth corridors — not just listings.' },
  { icon: '🏆', title: 'Trusted by Investors', desc: 'From first-home buyers to NRI investors — we help make the right decision every time.' },
]

const NAV_LINKS = [
  { label: 'Buy', href: '/properties?type=buy' },
  { label: 'Rent', href: '/properties?type=rent' },
  { label: 'Commercial', href: '/properties?type=commercial' },
  { label: 'AI Assistant', href: '/ask' },
  { label: 'Market Insights', href: '/ask?q=Latest market trends in Tricity 2025' },
]

export default function HomePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('Buy')
  const [aiQuery, setAiQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')
  const [searchMode, setSearchMode] = useState<'ai' | 'filter'>('ai')
  const [hoveredArea, setHoveredArea] = useState<string | null>(null)
  const [hoveredWhy, setHoveredWhy] = useState<string | null>(null)
  const [hoveredSearch, setHoveredSearch] = useState<string | null>(null)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  const handleAiSearch = () => {
    if (!aiQuery.trim()) return
    router.push(`/ask?q=${encodeURIComponent(aiQuery)}`)
  }

  const handleFilterSearch = () => {
    const params = new URLSearchParams()
    if (activeTab === 'Buy') params.set('type', 'buy')
    else if (activeTab === 'Rent') params.set('type', 'rent')
    else if (activeTab === 'Commercial') params.set('type', 'commercial')
    if (selectedCity) params.set('city', selectedCity)
    router.push(`/properties?${params.toString()}`)
  }

  return (
    <div style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', background: '#fff', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EFEFEF', height: '64px',
        display: 'flex', alignItems: 'center', padding: '0 2rem', gap: '2rem',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #F4860A, #D4700A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '18px' }}>P</div>
          <span style={{ fontWeight: 800, fontSize: '20px', color: '#111', letterSpacing: '-0.5px' }}>
            Property<span style={{ color: '#F4860A' }}>AI</span>
          </span>
        </a>

        <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
          {NAV_LINKS.map(link => (
            <a key={link.label} href={link.href}
              onMouseEnter={() => setHoveredNav(link.label)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                padding: '8px 16px', fontSize: '14px', fontWeight: 500,
                color: hoveredNav === link.label ? '#F4860A' : '#555',
                textDecoration: 'none', whiteSpace: 'nowrap',
                borderBottom: `2px solid ${hoveredNav === link.label ? '#F4860A' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          <a href="/seller" style={{ fontSize: '14px', color: '#555', textDecoration: 'none', fontWeight: 500, padding: '8px 12px' }}>List Property</a>
          <a href="/login" style={{ background: '#F4860A', color: '#fff', padding: '9px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Sign In</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        paddingTop: '64px', minHeight: '94vh', position: 'relative',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0C1220 0%, #1B2540 45%, #2C1A0E 100%)' }} />
        <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,134,10,0.12) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,130,255,0.08) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '5rem 2rem 4rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(244,134,10,0.12)', border: '1px solid rgba(244,134,10,0.25)', borderRadius: '30px', padding: '6px 16px', marginBottom: '2rem' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F4860A' }} />
            <span style={{ color: '#F4860A', fontSize: '13px', fontWeight: 600 }}>India&apos;s First AI Real Estate Platform — Tricity</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.08, letterSpacing: '-2px', margin: '0 0 1.5rem', maxWidth: '680px' }}>
            Find Your Perfect<br />Property.<br />
            <span style={{ color: '#F4860A' }}>Just Ask AI.</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', maxWidth: '500px', lineHeight: 1.75, margin: '0 0 2.5rem' }}>
            No more browsing hundreds of listings. Ask in plain language — Hindi or English — and get personalized recommendations, investment insights and verified properties.
          </p>

          {/* Search box */}
          <div style={{ background: '#fff', borderRadius: '18px', padding: '8px', maxWidth: '780px', boxShadow: '0 32px 100px rgba(0,0,0,0.5)' }}>
            {/* Toggle tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', marginBottom: '8px', padding: '0 4px' }}>
              {(['ai', 'filter'] as const).map(m => (
                <button key={m} onClick={() => setSearchMode(m)}
                  style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: searchMode === m ? '#F4860A' : '#999', borderBottom: `2px solid ${searchMode === m ? '#F4860A' : 'transparent'}`, marginBottom: '-1px', transition: 'all 0.15s' }}>
                  {m === 'ai' ? '✦ Ask AI' : '🔍 Search with Filters'}
                </button>
              ))}
            </div>

            {searchMode === 'ai' ? (
              <div style={{ display: 'flex', gap: '8px', padding: '4px' }}>
                <input
                  type="text" value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                  placeholder="Try: '3BHK under ₹1Cr in Mohali' or '30 lac me kya milega?'"
                  style={{ flex: 1, padding: '14px 18px', fontSize: '15px', border: 'none', outline: 'none', color: '#111', fontFamily: 'Inter, sans-serif', borderRadius: '10px', background: '#F8F8F8' }}
                />
                <button onClick={handleAiSearch}
                  style={{ background: 'linear-gradient(135deg, #F4860A, #D4700A)', color: '#fff', border: 'none', padding: '0 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                  Ask AI →
                </button>
              </div>
            ) : (
              <div style={{ padding: '4px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {PROPERTY_TYPES.map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: activeTab === t ? '#F4860A' : '#F4F4F4', color: activeTab === t ? '#fff' : '#666', transition: 'all 0.15s' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                    style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #EBEBEB', fontSize: '14px', color: '#333', fontFamily: 'Inter, sans-serif', outline: 'none', background: '#FAFAFA' }}>
                    <option value="">📍 Select Location</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select value={selectedBudget} onChange={e => setSelectedBudget(e.target.value)}
                    style={{ flex: 1, padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #EBEBEB', fontSize: '14px', color: '#333', fontFamily: 'Inter, sans-serif', outline: 'none', background: '#FAFAFA' }}>
                    <option value="">💰 Budget Range</option>
                    {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <button onClick={handleFilterSearch}
                    style={{ background: 'linear-gradient(135deg, #F4860A, #D4700A)', color: '#fff', border: 'none', padding: '0 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Search
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Try:</span>
            {['Best investment under ₹60L Mohali', 'Compare Aerocity vs New Chandigarh', '2BHK rent Phase 8'].map(ex => (
              <button key={ex} onClick={() => { setSearchMode('ai'); setAiQuery(ex) }}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', padding: '6px 14px', borderRadius: '30px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}>
                {ex}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '3rem', marginTop: '3.5rem', paddingTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {[{ num: '5,000+', label: 'Verified Properties' }, { num: '50+', label: 'Builder Partners' }, { num: '#1', label: 'AI Platform Tricity' }].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F4860A', letterSpacing: '-1px' }}>{s.num}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AREA GUIDES ── */}
      <section style={{ padding: '88px 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F4860A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Tricity Market Guide</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.5px' }}>Explore Top Areas</h2>
            </div>
            <a href="/ask?q=Which area in Tricity is best for investment in 2025?" style={{ color: '#F4860A', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>AI Area Analysis →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {AREA_GUIDES.map(area => (
              <a key={area.city} href={`/properties?city=${encodeURIComponent(area.city)}`}
                onMouseEnter={() => setHoveredArea(area.city)}
                onMouseLeave={() => setHoveredArea(null)}
                style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{
                  background: area.bg, borderRadius: '14px', padding: '1.5rem',
                  border: '1.5px solid transparent',
                  boxShadow: hoveredArea === area.city ? '0 12px 40px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
                  transform: hoveredArea === area.city ? 'translateY(-4px)' : 'translateY(0)',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ display: 'inline-block', background: area.tagBg, color: area.tagColor, fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '30px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{area.tag}</div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#111', marginBottom: '6px' }}>{area.city}</div>
                  <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.55 }}>{area.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI DEMO ── */}
      <section style={{ padding: '88px 2rem', background: '#FAFAFA' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F4860A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>AI That Actually Helps</div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#111', letterSpacing: '-0.5px', margin: '0 0 1rem', lineHeight: 1.2 }}>Real estate advice in your language</h2>
            <p style={{ color: '#666', fontSize: '1rem', lineHeight: 1.75, margin: '0 0 2rem' }}>
              Our AI understands Hindi, English and Hinglish. Ask about budget, location, goals — get expert-level advice with real market data, not generic answers.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '2.5rem' }}>
              {[
                'Investment analysis & rental yield calculation',
                'Area comparison with pros, cons & risks',
                'Infrastructure impact on property prices',
                'Budget-wise picks from real verified listings',
              ].map(f => (
                <div key={f} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#FFF4E6', border: '2px solid #F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', color: '#F4860A', fontWeight: 700 }}>✓</div>
                  <span style={{ fontSize: '14px', color: '#444', paddingTop: '2px' }}>{f}</span>
                </div>
              ))}
            </div>
            <a href="/ask" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #F4860A, #D4700A)', color: '#fff', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
              Try AI Assistant →
            </a>
          </div>

          {/* Chat preview */}
          <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #EBEBEB', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.08)' }}>
            <div style={{ background: '#111', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#FF5F57', '#FFBD2E', '#28CA42'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
              </div>
              <span style={{ color: '#666', fontSize: '13px' }}>PropertyAI Assistant</span>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#F4860A', color: '#fff', padding: '10px 16px', borderRadius: '18px 18px 4px 18px', maxWidth: '82%', fontSize: '14px', lineHeight: 1.55 }}>
                  Mere paas ₹60 lakh hai. Investment ke liye best area?
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}>🤖</div>
                <div style={{ background: '#F6F6F6', padding: '12px 16px', borderRadius: '4px 18px 18px 18px', fontSize: '13px', lineHeight: 1.75, color: '#111' }}>
                  ₹60L ke liye <strong>3 best options</strong> hain:<br /><br />
                  🏠 <strong>Phase 8B Mohali</strong> — 2BHK ₹55-62L<br />
                  Rental yield 4.5-5% · IT sector demand<br /><br />
                  📈 <strong>New Chandigarh plot</strong> — ₹45-55L<br />
                  5yr appreciation 20-30% expected<br /><br />
                  🏪 <strong>SCO Kharar bypass</strong> — ₹58L<br />
                  Commercial yield 6-7%
                </div>
              </div>
              <div style={{ background: '#FFF8F0', border: '1px solid #F4860A33', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#B05A00' }}>
                💡 We have <strong>1 matching property</strong> in our system — check it now
              </div>
            </div>
            <div style={{ padding: '1rem', borderTop: '1px solid #F0F0F0' }}>
              <a href="/ask" style={{ display: 'block', background: '#111', color: '#F4860A', padding: '12px', borderRadius: '10px', fontSize: '14px', textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}>Start your conversation →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY PROPERTYAI ── */}
      <section style={{ padding: '88px 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F4860A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Why PropertyAI</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.5px' }}>The smarter way to find property</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {WHY_US.map(w => (
              <div key={w.title}
                onMouseEnter={() => setHoveredWhy(w.title)}
                onMouseLeave={() => setHoveredWhy(null)}
                style={{
                  padding: '2rem', borderRadius: '16px',
                  border: `1.5px solid ${hoveredWhy === w.title ? '#F4860A' : '#F0F0F0'}`,
                  boxShadow: hoveredWhy === w.title ? '0 8px 32px rgba(244,134,10,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>{w.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>{w.title}</div>
                <div style={{ fontSize: '14px', color: '#777', lineHeight: 1.7 }}>{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POPULAR SEARCHES ── */}
      <section style={{ padding: '88px 2rem', background: '#FAFAFA' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111', letterSpacing: '-0.5px', marginBottom: '2rem' }}>Popular Searches in Tricity</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {POPULAR_SEARCHES.map(s => (
              <a key={s.label} href={s.href}
                onMouseEnter={() => setHoveredSearch(s.label)}
                onMouseLeave={() => setHoveredSearch(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '13px 16px', background: '#fff', borderRadius: '10px',
                  border: `1.5px solid ${hoveredSearch === s.label ? '#F4860A' : '#E8E8E8'}`,
                  textDecoration: 'none', fontSize: '14px',
                  color: hoveredSearch === s.label ? '#F4860A' : '#444',
                  fontWeight: 500, transition: 'all 0.15s',
                }}>
                <span style={{ color: '#F4860A', flexShrink: 0, fontWeight: 700 }}>→</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── SELL CTA ── */}
      <section style={{ padding: '0 2rem 88px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', background: 'linear-gradient(135deg, #111827 0%, #1E2A3A 50%, #2C1A0E 100%)', borderRadius: '24px', padding: '60px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Sell or Rent Your Property<br />with Confidence
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', margin: 0, lineHeight: 1.7 }}>
              List for free. Reach verified buyers. Get inquiries directly on WhatsApp.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
            <a href="/seller" style={{ background: '#F4860A', color: '#fff', padding: '14px 36px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>List Property Free →</a>
            <a href="/ask?q=How to get best price for my property?" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '14px 36px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>Get Price Estimate</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#111', padding: '64px 2rem 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '16px' }}>P</div>
                <span style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>Property<span style={{ color: '#F4860A' }}>AI</span></span>
              </div>
              <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.75, margin: '0 0 1rem', maxWidth: '260px' }}>
                India&apos;s first AI-powered real estate platform for the Tricity region.
              </p>
              <div style={{ fontSize: '13px', color: '#555' }}>hello@propertyai.in</div>
            </div>
            {[
              { title: 'Properties', links: ['Buy in Mohali', 'Rent in Chandigarh', 'Commercial Panchkula', 'Plots & Land', 'New Projects'] },
              { title: 'Tools', links: ['AI Assistant', 'Rental Calculator', 'Area Comparison', 'Price Estimate', 'Market Reports'] },
              { title: 'Company', links: ['About Us', 'List Property', 'For Builders', 'Contact', 'Privacy Policy'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>{col.title}</div>
                {col.links.map(link => (
                  <a key={link} href="#" style={{ display: 'block', color: '#555', fontSize: '14px', marginBottom: '10px', textDecoration: 'none' }}>{link}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#444' }}>© 2025 PropertyAI. India&apos;s AI Real Estate Platform.</div>
            <div style={{ fontSize: '13px', color: '#444' }}>Chandigarh · Mohali · Panchkula · Tricity</div>
          </div>
        </div>
      </footer>

    </div>
  )
}