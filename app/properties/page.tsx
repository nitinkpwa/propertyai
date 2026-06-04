'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TYPES = ['All', 'buy', 'rent', 'commercial']
const CITIES = ['All Cities', 'Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur', 'Kharar', 'New Chandigarh', 'Derabassi', 'Landran', 'Aerocity']
const SUB_TYPES = ['All Types', 'flat', 'plot', 'house', 'builder_floor', 'sco', 'office', 'warehouse', 'coworking']
const BUDGETS = [
  { label: 'Any Budget', min: 0, max: Infinity },
  { label: 'Under ₹30L', min: 0, max: 3000000 },
  { label: '₹30L – ₹60L', min: 3000000, max: 6000000 },
  { label: '₹60L – ₹1Cr', min: 6000000, max: 10000000 },
  { label: '₹1Cr – ₹2Cr', min: 10000000, max: 20000000 },
  { label: 'Above ₹2Cr', min: 20000000, max: Infinity },
]

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('All')
  const [city, setCity] = useState('All Cities')
  const [subType, setSubType] = useState('All Types')
  const [budget, setBudget] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchProperties() }, [type, city, subType, budget])

  const fetchProperties = async () => {
    setLoading(true)
    let query = supabase.from('properties').select('*').eq('status', 'active').order('created_at', { ascending: false })
    if (type !== 'All') query = query.eq('type', type)
    if (city !== 'All Cities') query = query.eq('city', city)
    if (subType !== 'All Types') query = query.eq('sub_type', subType)
    if (budget > 0) {
      const b = BUDGETS[budget]
      if (b.min > 0) query = query.gte('price', b.min)
      if (b.max !== Infinity) query = query.lte('price', b.max)
    }
    const { data } = await query.limit(50)
    setProperties(data || [])
    setLoading(false)
  }

  const filtered = search.trim()
    ? properties.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase()))
    : properties

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`

  const typeIcon: Record<string, string> = { flat: '🏠', plot: '🏗️', house: '🏡', builder_floor: '🏘️', sco: '🏪', office: '🏢', warehouse: '🏭', coworking: '☕' }

  const selStyle = { padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #F5E8D8', fontSize: '13px', color: '#2C1A0E', background: '#fff', fontFamily: 'Inter, sans-serif', outline: 'none', cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6EE', fontFamily: 'Inter, sans-serif' }}>
      {/* NAV */}
      <nav style={{ background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/ask" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>AI Assistant</a>
          <a href="/seller" style={{ background: '#F4860A', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>List Free</a>
        </div>
      </nav>

      {/* HEADER */}
      <div style={{ background: '#2C1A0E', padding: '2rem 1.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1rem' }}>Properties in Tricity</h1>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or location..."
            style={{ width: '100%', maxWidth: '500px', padding: '11px 16px', borderRadius: '30px', border: 'none', fontSize: '14px', color: '#2C1A0E', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
        {/* FILTERS */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                style={{ padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: type === t ? '#2C1A0E' : '#FDF6EE', color: type === t ? '#F4860A' : '#6B4226', transition: 'all 0.2s' }}>
                {t === 'All' ? 'All' : t === 'buy' ? '🏠 Buy' : t === 'rent' ? '🔑 Rent' : '🏢 Commercial'}
              </button>
            ))}
          </div>
          <select style={selStyle} value={city} onChange={e => setCity(e.target.value)}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select style={selStyle} value={subType} onChange={e => setSubType(e.target.value)}>
            {SUB_TYPES.map(s => <option key={s} value={s}>{s === 'All Types' ? s : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
          </select>
          <select style={selStyle} value={budget} onChange={e => setBudget(Number(e.target.value))}>
            {BUDGETS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
          </select>
          <button onClick={() => { setType('All'); setCity('All Cities'); setSubType('All Types'); setBudget(0); setSearch('') }}
            style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #F5E8D8', background: 'transparent', color: '#A67C5B', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Reset
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#A67C5B' }}>{filtered.length} properties found</span>
        </div>

        {/* AI BANNER */}
        <div style={{ background: '#2C1A0E', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '10px' }}>
          <div>
            <span style={{ color: '#F4860A', fontWeight: 700, fontSize: '14px' }}>🤖 Can't find what you need?</span>
            <span style={{ color: '#F7BF8A', fontSize: '13px', marginLeft: '8px' }}>Ask our AI to find the perfect match for your budget and goals</span>
          </div>
          <a href="/ask" style={{ background: '#F4860A', color: '#fff', padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>Ask AI →</a>
        </div>

        {/* LISTINGS GRID */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#A67C5B' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            Loading properties...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#A67C5B' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
            <div style={{ fontWeight: 700, color: '#2C1A0E', marginBottom: '0.5rem' }}>No properties found</div>
            <p style={{ fontSize: '14px', marginBottom: '1.5rem' }}>Try adjusting your filters or ask our AI</p>
            <a href="/ask" style={{ background: '#F4860A', color: '#fff', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Ask AI Instead</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map(prop => (
              <a key={prop.id} href={`/p/${prop.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', overflow: 'hidden', transition: 'border-color 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#F4860A')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#F5E8D8')}>
                  {/* Photo placeholder */}
                  <div style={{ height: '160px', background: '#F5E8D8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                    {typeIcon[prop.sub_type] || '🏠'}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#2C1A0E', flex: 1, marginRight: '8px' }}>{prop.title}</div>
                      <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: prop.type === 'buy' ? '#EAF3DE' : prop.type === 'rent' ? '#E6F1FB' : '#FEF3C7', color: prop.type === 'buy' ? '#27500A' : prop.type === 'rent' ? '#0C447C' : '#92400E', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                        {prop.type === 'buy' ? 'For Sale' : prop.type === 'rent' ? 'For Rent' : 'Commercial'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B4226', marginBottom: '8px' }}>📍 {prop.location}, {prop.city}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: '#F4860A' }}>{formatPrice(prop.price)}</div>
                      <div style={{ fontSize: '12px', color: '#A67C5B' }}>
                        {prop.bedrooms ? `${prop.bedrooms}BHK · ` : ''}{prop.area_sqft ? `${prop.area_sqft} sqft` : prop.sub_type}
                      </div>
                    </div>
                    {prop.contact_phone && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F5E8D8', fontSize: '13px', color: '#6B4226' }}>
                        📞 {prop.contact_phone}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Add listing CTA at bottom */}
        {!loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0 1rem' }}>
            <p style={{ color: '#A67C5B', fontSize: '14px', marginBottom: '1rem' }}>Are you a seller, broker or builder?</p>
            <a href="/seller" style={{ background: '#2C1A0E', color: '#F4860A', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', border: '2px solid #F4860A' }}>
              List Your Property Free →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}