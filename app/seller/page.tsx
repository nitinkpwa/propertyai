'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'listings' | 'add' | 'inquiries'

const CITIES = ['Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur', 'Kharar', 'New Chandigarh', 'Derabassi', 'Landran', 'Aerocity', 'Banur']
const TYPES = [{ value: 'buy', label: '🏠 For Sale' }, { value: 'rent', label: '🔑 For Rent' }, { value: 'commercial', label: '🏢 Commercial' }]
const SUB_TYPES = ['flat', 'plot', 'house', 'builder_floor', 'sco', 'office', 'warehouse', 'coworking']

export default function SellerDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('listings')
  const [user, setUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [form, setForm] = useState({
    title: '', description: '', type: 'buy', sub_type: 'flat',
    price: '', area_sqft: '', bedrooms: '', bathrooms: '',
    location: '', city: 'Mohali', sector: '',
    contact_name: '', contact_phone: '',
    amenities: '',
  })

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    setUser({ ...profile, id: authUser.id })
    await loadData(authUser.id)
    setLoading(false)
  }

  const loadData = async (userId: string) => {
    const [{ data: props }, { data: inqs }] = await Promise.all([
      supabase.from('properties').select('*').eq('seller_id', userId).order('created_at', { ascending: false }),
      supabase.from('inquiries').select('*, property:properties(title), buyer:profiles!inquiries_from_user_id_fkey(full_name,email)').eq('seller_id', userId).order('created_at', { ascending: false }),
    ])
    setListings(props || [])
    setInquiries(inqs || [])
  }

  const handleAddListing = async () => {
    if (!form.title || !form.price || !form.location) { setSaveMsg('Please fill title, price and location'); return }
    if (listings.length >= 10) { setSaveMsg('Free plan allows max 10 listings'); return }
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase.from('properties').insert({
      seller_id: user.id,
      title: form.title,
      description: form.description,
      type: form.type,
      sub_type: form.sub_type,
      price: parseFloat(form.price),
      area_sqft: parseFloat(form.area_sqft) || null,
      bedrooms: parseInt(form.bedrooms) || null,
      bathrooms: parseInt(form.bathrooms) || null,
      location: form.location,
      city: form.city,
      sector: form.sector,
      contact_name: form.contact_name || user.full_name,
      contact_phone: form.contact_phone,
      amenities: form.amenities ? form.amenities.split(',').map((a: string) => a.trim()) : [],
      photos: [],
      status: 'active',
    })
    if (error) { setSaveMsg('Error: ' + error.message) }
    else {
      setSaveMsg('✅ Listing added successfully!')
      setForm({ title: '', description: '', type: 'buy', sub_type: 'flat', price: '', area_sqft: '', bedrooms: '', bathrooms: '', location: '', city: 'Mohali', sector: '', contact_name: '', contact_phone: '', amenities: '' })
      await loadData(user.id)
      setTab('listings')
    }
    setSaving(false)
  }

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    await supabase.from('properties').update({ status: newStatus }).eq('id', id)
    setListings(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  const deleteListing = async (id: string) => {
    if (!confirm('Delete this listing?')) return
    await supabase.from('properties').delete().eq('id', id)
    setListings(prev => prev.filter(p => p.id !== id))
  }

  const markRead = async (id: string) => {
    await supabase.from('inquiries').update({ status: 'read' }).eq('id', id)
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: 'read' } : i))
  }

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #F5E8D8', fontSize: '14px', color: '#2C1A0E', background: '#FDF6EE', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const, outline: 'none' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C1A0E', marginBottom: '5px' }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#6B4226' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#FDF6EE', fontFamily: 'Inter, sans-serif' }}>
      {/* NAV */}
      <nav style={{ background: '#2C1A0E', padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>PropertyAI</span>
        </a>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#F7BF8A', fontSize: '13px' }}>{user?.full_name}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ background: 'transparent', border: '1px solid #6B4226', color: '#F7BF8A', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2C1A0E', margin: 0 }}>Seller Dashboard</h1>
            <p style={{ color: '#6B4226', fontSize: '13px', margin: '4px 0 0' }}>
              Free plan: {listings.length}/10 listings used
              <span style={{ display: 'inline-block', width: `${listings.length * 10}%`, height: '6px', background: '#F4860A', borderRadius: '3px', marginLeft: '8px', verticalAlign: 'middle' }} />
            </p>
          </div>
          <button onClick={() => setTab('add')} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            + Add Listing
          </button>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Listings', value: listings.length, icon: '🏠' },
            { label: 'Active', value: listings.filter(l => l.status === 'active').length, icon: '✅' },
            { label: 'New Inquiries', value: inquiries.filter(i => i.status === 'new').length, icon: '🔔' },
            { label: 'Total Inquiries', value: inquiries.length, icon: '📩' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #F5E8D8', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '2px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2C1A0E' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#6B4226' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          {[{ key: 'listings' as Tab, label: '🏠 My Listings' }, { key: 'add' as Tab, label: '+ Add Listing' }, { key: 'inquiries' as Tab, label: `📩 Inquiries ${inquiries.filter(i => i.status === 'new').length > 0 ? `(${inquiries.filter(i => i.status === 'new').length} new)` : ''}` }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 18px', borderRadius: '20px', border: `1px solid ${tab === t.key ? 'transparent' : '#F5E8D8'}`, cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: tab === t.key ? '#2C1A0E' : '#fff', color: tab === t.key ? '#F4860A' : '#6B4226' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* MY LISTINGS */}
        {tab === 'listings' && (
          <div>
            {listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#A67C5B' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏠</div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No listings yet</div>
                <button onClick={() => setTab('add')} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Add Your First Listing</button>
              </div>
            ) : listings.map(prop => (
              <div key={prop.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '1.25rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' as const }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 700, color: '#2C1A0E', marginBottom: '4px' }}>{prop.title}</div>
                  <div style={{ fontSize: '13px', color: '#6B4226' }}>📍 {prop.location}, {prop.city} · {prop.sub_type} · {prop.type}</div>
                  <div style={{ fontSize: '13px', color: '#F4860A', fontWeight: 700, marginTop: '4px' }}>{formatPrice(prop.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: prop.status === 'active' ? '#DCFCE7' : '#F3F4F6', color: prop.status === 'active' ? '#166534' : '#6B7280' }}>{prop.status}</span>
                  <span style={{ fontSize: '11px', color: '#A67C5B' }}>{formatDate(prop.created_at)}</span>
                  <button onClick={() => toggleStatus(prop.id, prop.status)} style={{ background: '#FFF4E8', color: '#B05A00', border: '1px solid #F4860A44', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {prop.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => deleteListing(prop.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD LISTING */}
        {tab === 'add' && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F5E8D8', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2C1A0E', marginTop: 0, marginBottom: '1.5rem' }}>Add New Listing</h2>

            {saveMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem', background: saveMsg.includes('✅') ? '#DCFCE7' : '#FEE2E2', color: saveMsg.includes('✅') ? '#166534' : '#DC2626' }}>{saveMsg}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Property Title *</label>
                <input style={inputStyle} placeholder="e.g. 3BHK Flat in Phase 8 Mohali" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Listing Type *</label>
                <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Property Sub-Type</label>
                <select style={inputStyle} value={form.sub_type} onChange={e => setForm({ ...form, sub_type: e.target.value })}>
                  {SUB_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Price (in ₹) *</label>
                <input style={inputStyle} type="number" placeholder="e.g. 6500000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Area (sq ft)</label>
                <input style={inputStyle} type="number" placeholder="e.g. 1200" value={form.area_sqft} onChange={e => setForm({ ...form, area_sqft: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Bedrooms</label>
                <input style={inputStyle} type="number" placeholder="e.g. 3" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Bathrooms</label>
                <input style={inputStyle} type="number" placeholder="e.g. 2" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>City *</label>
                <select style={inputStyle} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Sector / Area</label>
                <input style={inputStyle} placeholder="e.g. Phase 8, Sector 70" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Full Address / Location *</label>
                <input style={inputStyle} placeholder="e.g. Phase 8B, Near IT City, Mohali" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' as const }} placeholder="Describe the property — key features, floor, facing, parking, etc." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Amenities (comma separated)</label>
                <input style={inputStyle} placeholder="e.g. Lift, Parking, Power Backup, Club House, Security" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Contact Name</label>
                <input style={inputStyle} placeholder="Name to show buyers" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Contact Phone</label>
                <input style={inputStyle} placeholder="e.g. 98765 43210" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
              <button onClick={handleAddListing} disabled={saving}
                style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : '+ Publish Listing'}
              </button>
              <button onClick={() => setTab('listings')}
                style={{ background: '#FDF6EE', color: '#6B4226', border: '1px solid #F5E8D8', padding: '12px 20px', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* INQUIRIES */}
        {tab === 'inquiries' && (
          <div>
            {inquiries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#A67C5B' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📩</div>
                <div style={{ fontWeight: 600 }}>No inquiries yet</div>
                <p style={{ fontSize: '13px' }}>When buyers contact you, inquiries will appear here</p>
              </div>
            ) : inquiries.map(inq => (
              <div key={inq.id} style={{ background: '#fff', borderRadius: '14px', border: `1px solid ${inq.status === 'new' ? '#F4860A' : '#F5E8D8'}`, padding: '1.25rem', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#2C1A0E' }}>{inq.buyer?.full_name || 'Buyer'}</span>
                    <span style={{ fontSize: '12px', color: '#A67C5B', marginLeft: '8px' }}>{inq.buyer?.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: inq.status === 'new' ? '#FEF3C7' : '#DCFCE7', color: inq.status === 'new' ? '#92400E' : '#166534' }}>{inq.status}</span>
                    {inq.status === 'new' && <button onClick={() => markRead(inq.id)} style={{ background: '#FFF4E8', color: '#B05A00', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Mark Read</button>}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#F4860A', fontWeight: 600, marginBottom: '6px' }}>Re: {inq.property?.title}</div>
                <div style={{ fontSize: '13px', color: '#2C1A0E', background: '#FDF6EE', padding: '10px 14px', borderRadius: '8px' }}>{inq.message}</div>
                <div style={{ fontSize: '11px', color: '#A67C5B', marginTop: '8px' }}>{new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}