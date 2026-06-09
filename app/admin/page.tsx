'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = 'propertyai2025'

const CITIES = ['Chandigarh', 'Mohali', 'Panchkula', 'Zirakpur', 'Kharar', 'New Chandigarh', 'Aerocity', 'IT City', 'Landran', 'Derabassi', 'Banur', 'Pinjore']
const SUB_TYPES = ['flat', 'plot', 'house', 'builder_floor', 'sco', 'office', 'warehouse', 'coworking']
const TYPES = [{ value: 'buy', label: 'For Sale' }, { value: 'rent', label: 'For Rent' }, { value: 'commercial', label: 'Commercial' }]

const BULK_TEMPLATE = `title,type,sub_type,price,area_sqft,bedrooms,city,location,contact_name,contact_phone,description
3BHK Flat Phase 8 Mohali,buy,flat,6500000,1450,3,Mohali,Phase 8B Near IT City Mohali,Nitin Sharma,9817876600,Premium 3BHK with parking and lift
SCO Aerocity Mohali,commercial,sco,8500000,800,,Mohali,Aerocity Main Road Near Airport,Raj Kumar,9876543210,Ground floor SCO prime location`

type AdminTab = 'dashboard' | 'listings' | 'add' | 'bulk' | 'leads' | 'chats'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const [passErr, setPassErr] = useState('')
  const [tab, setTab] = useState<AdminTab>('dashboard')

  // Data
  const [properties, setProperties] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [adminUserId, setAdminUserId] = useState<string | null>(null)

  // Single listing form
  const emptyForm = { title: '', type: 'buy', sub_type: 'flat', price: '', area_sqft: '', bedrooms: '', bathrooms: '', city: 'Mohali', location: '', sector: '', contact_name: '', contact_phone: '', description: '', amenities: '' }
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Bulk
  const [bulkCsv, setBulkCsv] = useState('')
  const [bulkResult, setBulkResult] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)

  // Filters
  const [leadFilter, setLeadFilter] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [selectedChat, setSelectedChat] = useState<any>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_auth')
    if (saved === 'true') setAuthed(true)
  }, [])

  useEffect(() => {
    if (authed) loadAll()
  }, [authed])

  const login = () => {
    if (pass === ADMIN_PASSWORD) {
      setAuthed(true)
      sessionStorage.setItem('admin_auth', 'true')
    } else {
      setPassErr('Wrong password')
    }
  }

  const loadAll = async () => {
    setLoading(true)
    // Get or create admin user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setAdminUserId(user.id)

    const [{ data: props }, { data: inqs }, { data: convos }, { data: profs }] = await Promise.all([
      supabase.from('properties').select('*, seller:profiles!properties_seller_id_fkey(full_name,email,phone)').order('created_at', { ascending: false }),
      supabase.from('inquiries').select('*, property:properties(title,city), buyer:profiles!inquiries_from_user_id_fkey(full_name,email,phone), seller:profiles!inquiries_seller_id_fkey(full_name)').order('created_at', { ascending: false }),
      supabase.from('conversations').select('*, user:profiles(full_name,email,phone)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ])
    setProperties(props || [])
    setLeads(inqs || [])
    setConversations(convos || [])
    setProfiles(profs || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.title || !form.price || !form.location) { setSaveMsg('Fill title, price and location'); return }
    if (!adminUserId) { setSaveMsg('Please sign in first to add listings'); return }
    setSaving(true)
    setSaveMsg('')
    const payload = {
      title: form.title, type: form.type, sub_type: form.sub_type,
      price: parseFloat(form.price),
      area_sqft: parseFloat(form.area_sqft) || null,
      bedrooms: parseInt(form.bedrooms) || null,
      bathrooms: parseInt(form.bathrooms) || null,
      city: form.city, location: form.location, sector: form.sector,
      contact_name: form.contact_name, contact_phone: form.contact_phone,
      description: form.description,
      amenities: form.amenities ? form.amenities.split(',').map((a: string) => a.trim()).filter(Boolean) : [],
      photos: [], status: 'active', seller_id: adminUserId,
    }
    let error
    if (editId) {
      const r = await supabase.from('properties').update(payload).eq('id', editId); error = r.error
    } else {
      const r = await supabase.from('properties').insert(payload); error = r.error
    }
    if (error) { setSaveMsg('Error: ' + error.message) }
    else {
      setSaveMsg(editId ? '✅ Updated!' : '✅ Published!')
      setForm({ ...emptyForm }); setEditId(null)
      await loadAll(); setTab('listings')
    }
    setSaving(false)
  }

  const startEdit = (p: any) => {
    setEditId(p.id)
    setForm({ title: p.title || '', type: p.type || 'buy', sub_type: p.sub_type || 'flat', price: p.price?.toString() || '', area_sqft: p.area_sqft?.toString() || '', bedrooms: p.bedrooms?.toString() || '', bathrooms: p.bathrooms?.toString() || '', city: p.city || 'Mohali', location: p.location || '', sector: p.sector || '', contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', description: p.description || '', amenities: (p.amenities || []).join(', ') })
    setTab('add')
  }

  const deleteProp = async (id: string) => {
    if (!confirm('Delete this property?')) return
    await supabase.from('properties').delete().eq('id', id)
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  const toggleStatus = async (id: string, status: string) => {
    const ns = status === 'active' ? 'paused' : 'active'
    await supabase.from('properties').update({ status: ns }).eq('id', id)
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: ns } : p))
  }

  const handleBulkImport = async () => {
    if (!bulkCsv.trim()) return
    if (!adminUserId) { setBulkResult(['Please sign in first']); return }
    setBulkLoading(true)
    setBulkResult([])
    const lines = bulkCsv.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const results: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim())
      const row: any = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
      if (!row.title || !row.price || !row.city) { results.push(`Row ${i}: SKIP — missing title/price/city`); continue }
      const { error } = await supabase.from('properties').insert({
        seller_id: adminUserId,
        title: row.title, type: row.type || 'buy', sub_type: row.sub_type || 'flat',
        price: parseFloat(row.price) || 0,
        area_sqft: parseFloat(row.area_sqft) || null,
        bedrooms: parseInt(row.bedrooms) || null,
        bathrooms: parseInt(row.bathrooms) || null,
        city: row.city, location: row.location || row.city,
        contact_name: row.contact_name || '', contact_phone: row.contact_phone || '',
        description: row.description || '',
        photos: [], amenities: [], status: 'active',
      })
      results.push(error ? `Row ${i} (${row.title}): ERROR — ${error.message}` : `Row ${i} (${row.title}): ✅ Added`)
    }
    setBulkResult(results)
    setBulkLoading(false)
    await loadAll()
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBulkCsv(ev.target?.result as string)
    reader.readAsText(file)
  }

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : `₹${(p / 100000).toFixed(0)}L`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtTime = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  // AI chat summary
  const getChatSummary = (msgs: any[]) => {
    if (!msgs || msgs.length === 0) return 'No messages'
    const userMsgs = msgs.filter((m: any) => m.role === 'user')
    if (userMsgs.length === 0) return 'No user messages'
    return userMsgs.map((m: any) => m.content).join(' | ').slice(0, 150) + '...'
  }

  const getInterest = (msgs: any[]) => {
    if (!msgs) return 'Unknown'
    const text = msgs.filter((m: any) => m.role === 'user').map((m: any) => m.content).join(' ').toLowerCase()
    if (text.includes('buy') || text.includes('purchase') || text.includes('khareedna')) return '🏠 Buyer'
    if (text.includes('rent') || text.includes('lease') || text.includes('kiraya')) return '🔑 Renter'
    if (text.includes('invest') || text.includes('return') || text.includes('yield')) return '📈 Investor'
    if (text.includes('sell') || text.includes('bech')) return '🏷️ Seller'
    if (text.includes('office') || text.includes('commercial') || text.includes('sco')) return '🏢 Commercial'
    return '👤 General'
  }

  const inp = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #E8E8E8', fontSize: '14px', color: '#111', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const, outline: 'none', background: '#FAFAFA' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }

  // FILTERED LEADS
  const filteredLeads = leads.filter(l => {
    if (searchQ) {
      const q = searchQ.toLowerCase()
      return l.buyer?.full_name?.toLowerCase().includes(q) || l.buyer?.email?.toLowerCase().includes(q) || l.property?.title?.toLowerCase().includes(q) || l.buyer?.phone?.toLowerCase().includes(q)
    }
    return true
  })

  const filteredConvos = conversations.filter(c => {
    if (searchQ) {
      const q = searchQ.toLowerCase()
      return c.user?.full_name?.toLowerCase().includes(q) || c.user?.email?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)
    }
    return true
  })

  // TABS CONFIG
  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'listings', label: '🏠 All Listings', count: properties.length },
    { key: 'add', label: editId ? '✏️ Edit' : '+ Add Property' },
    { key: 'bulk', label: '📋 Bulk Import' },
    { key: 'leads', label: '👥 Leads', count: leads.length },
    { key: 'chats', label: '🤖 AI Chats', count: conversations.length },
  ]

  // ── LOGIN SCREEN ──
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E8E8E8', padding: '2.5rem', width: '100%', maxWidth: '380px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '18px' }}>P</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#111' }}>PropertyAI Admin</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Private access only</div>
          </div>
        </div>
        <label style={lbl}>Admin Password</label>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Enter password" style={{ ...inp, marginBottom: '8px' }} />
        {passErr && <div style={{ color: '#DC2626', fontSize: '13px', marginBottom: '8px' }}>{passErr}</div>}
        <button onClick={login} style={{ width: '100%', padding: '12px', background: '#F4860A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Access Admin →</button>
        <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: '#999', fontSize: '13px', textDecoration: 'none' }}>← Back to website</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: 'Inter, sans-serif' }}>

      {/* TOP BAR */}
      <div style={{ background: '#111', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#F4860A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '15px' }}>P</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>PropertyAI <span style={{ color: '#F4860A' }}>Admin</span></span>
          <span style={{ background: '#F4860A22', color: '#F4860A', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>PRIVATE</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>View Website ↗</a>
          <button onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>

        {/* SIDEBAR */}
        <div style={{ width: '220px', background: '#fff', borderRight: '1px solid #E8E8E8', padding: '1.25rem 0', flexShrink: 0, position: 'sticky', top: '56px', height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSaveMsg(''); if (t.key !== 'add') { setEditId(null); setForm({ ...emptyForm }) } }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 20px', background: tab === t.key ? '#FFF8F0' : 'transparent', color: tab === t.key ? '#F4860A' : '#555', border: 'none', borderLeft: `3px solid ${tab === t.key ? '#F4860A' : 'transparent'}`, cursor: 'pointer', fontSize: '13px', fontWeight: tab === t.key ? 600 : 400, fontFamily: 'Inter, sans-serif', textAlign: 'left' }}>
              <span>{t.label}</span>
              {t.count !== undefined && <span style={{ background: tab === t.key ? '#F4860A' : '#E8E8E8', color: tab === t.key ? '#fff' : '#777', fontSize: '11px', padding: '1px 7px', borderRadius: '20px', fontWeight: 600 }}>{t.count}</span>}
            </button>
          ))}
          <div style={{ margin: '1rem 0', borderTop: '1px solid #F0F0F0' }} />
          <button onClick={() => setTab('add')} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 20px', background: '#F4860A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif', textAlign: 'left' }}>
            + Quick Add Property
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>

          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && (
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: '0 0 1.5rem' }}>Dashboard Overview</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Properties', value: properties.length, icon: '🏠', color: '#F4860A' },
                  { label: 'Active Listings', value: properties.filter(p => p.status === 'active').length, icon: '✅', color: '#16A34A' },
                  { label: 'Total Leads', value: leads.length, icon: '👥', color: '#2563EB' },
                  { label: 'New Inquiries', value: leads.filter(l => l.status === 'new').length, icon: '🔔', color: '#DC2626' },
                  { label: 'AI Conversations', value: conversations.length, icon: '🤖', color: '#7C3AED' },
                  { label: 'Registered Users', value: profiles.length, icon: '👤', color: '#0D9488' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '1.25rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{s.icon}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent leads preview */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#111', fontSize: '14px', marginBottom: '1rem' }}>🔥 Latest Leads</div>
                {leads.slice(0, 5).map(l => (
                  <div key={l.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#F4860A', fontSize: '14px', flexShrink: 0 }}>{l.buyer?.full_name?.[0]?.toUpperCase() || '?'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#111', fontSize: '13px' }}>{l.buyer?.full_name || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{l.buyer?.email} · Re: {l.property?.title}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>{fmtTime(l.created_at)}</div>
                    <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: l.status === 'new' ? '#FEF3C7' : '#DCFCE7', color: l.status === 'new' ? '#92400E' : '#166534' }}>{l.status}</span>
                  </div>
                ))}
                {leads.length === 0 && <div style={{ color: '#aaa', fontSize: '13px' }}>No leads yet</div>}
                <button onClick={() => setTab('leads')} style={{ marginTop: '12px', color: '#F4860A', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>View all leads →</button>
              </div>

              {/* Recent AI chats */}
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, color: '#111', fontSize: '14px', marginBottom: '1rem' }}>🤖 Recent AI Conversations</div>
                {conversations.slice(0, 5).map(c => (
                  <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #F5F5F5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, color: '#111', fontSize: '13px' }}>{c.user?.full_name || c.user?.email || 'Anonymous'}</span>
                      <span style={{ fontSize: '11px', color: '#aaa' }}>{fmtTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{getInterest(c.messages)} · {getChatSummary(c.messages)}</div>
                  </div>
                ))}
                {conversations.length === 0 && <div style={{ color: '#aaa', fontSize: '13px' }}>No conversations yet</div>}
                <button onClick={() => setTab('chats')} style={{ marginTop: '12px', color: '#F4860A', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>View all chats →</button>
              </div>
            </div>
          )}

          {/* ── ALL LISTINGS ── */}
          {tab === 'listings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: 0 }}>All Properties ({properties.length})</h1>
                <button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setTab('add') }} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Add Property</button>
              </div>
              <input placeholder="Search properties..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ ...inp, marginBottom: '1rem', maxWidth: '400px' }} />
              {loading ? <div style={{ color: '#888', textAlign: 'center', padding: '3rem' }}>Loading...</div> : (
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E8E8E8' }}>
                        {['Property', 'Type', 'Price', 'City', 'Contact', 'Status', 'Date', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {properties.filter(p => !searchQ || p.title?.toLowerCase().includes(searchQ.toLowerCase()) || p.city?.toLowerCase().includes(searchQ.toLowerCase())).map((prop, i) => (
                        <tr key={prop.id} style={{ borderBottom: '1px solid #F5F5F5', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '10px 14px', maxWidth: '200px' }}>
                            <div style={{ fontWeight: 600, color: '#111', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prop.title}</div>
                            <div style={{ fontSize: '11px', color: '#aaa' }}>{prop.sub_type} · {prop.bedrooms ? prop.bedrooms + 'BHK' : ''}</div>
                          </td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: prop.type === 'buy' ? '#EAF3DE' : prop.type === 'rent' ? '#E6F1FB' : '#FEF3C7', color: prop.type === 'buy' ? '#27500A' : prop.type === 'rent' ? '#0C447C' : '#92400E', fontSize: '11px', fontWeight: 600 }}>{prop.type}</span></td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#F4860A', whiteSpace: 'nowrap' }}>{formatPrice(prop.price)}</td>
                          <td style={{ padding: '10px 14px', color: '#555' }}>{prop.city}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ color: '#111', fontSize: '12px' }}>{prop.contact_name}</div>
                            <div style={{ color: '#F4860A', fontSize: '12px', fontWeight: 600 }}>{prop.contact_phone}</div>
                          </td>
                          <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: prop.status === 'active' ? '#DCFCE7' : '#F3F4F6', color: prop.status === 'active' ? '#166534' : '#6B7280', fontSize: '11px', fontWeight: 600 }}>{prop.status}</span></td>
                          <td style={{ padding: '10px 14px', color: '#aaa', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(prop.created_at)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => startEdit(prop)} style={{ background: '#EEF2FF', color: '#3730A3', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Edit</button>
                              <button onClick={() => toggleStatus(prop.id, prop.status)} style={{ background: '#F0FDF4', color: '#166534', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{prop.status === 'active' ? 'Pause' : 'Activate'}</button>
                              <button onClick={() => deleteProp(prop.id)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {properties.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>No properties yet. Add your first one!</div>}
                </div>
              )}
            </div>
          )}

          {/* ── ADD / EDIT LISTING ── */}
          {tab === 'add' && (
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: '0 0 1.5rem' }}>{editId ? '✏️ Edit Property' : '+ Add New Property'}</h1>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '1.5rem', maxWidth: '800px' }}>
                {saveMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem', background: saveMsg.includes('✅') ? '#DCFCE7' : '#FEE2E2', color: saveMsg.includes('✅') ? '#166534' : '#DC2626' }}>{saveMsg}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Property Title *</label>
                    <input style={inp} placeholder="e.g. 3BHK Flat Phase 8B Mohali" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Listing Type *</label>
                    <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Sub Type</label>
                    <select style={inp} value={form.sub_type} onChange={e => setForm({ ...form, sub_type: e.target.value })}>
                      {SUB_TYPES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Price (₹) *</label>
                    <input style={inp} type="number" placeholder="e.g. 6500000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Area (sqft)</label>
                    <input style={inp} type="number" placeholder="e.g. 1200" value={form.area_sqft} onChange={e => setForm({ ...form, area_sqft: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Bedrooms</label>
                    <input style={inp} type="number" placeholder="e.g. 3" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Bathrooms</label>
                    <input style={inp} type="number" placeholder="e.g. 2" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>City *</label>
                    <select style={inp} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}>
                      {CITIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Sector / Area</label>
                    <input style={inp} placeholder="e.g. Phase 8, Sector 70" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Full Location / Address *</label>
                    <input style={inp} placeholder="e.g. Phase 8B, Near IT City, Mohali" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Description</label>
                    <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} placeholder="Key features, floor, facing, parking, nearby landmarks..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Contact Name</label>
                    <input style={inp} placeholder="Name shown to buyers" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>Contact Phone *</label>
                    <input style={inp} placeholder="e.g. 9817876600" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Amenities (comma separated)</label>
                    <input style={inp} placeholder="Lift, Parking, Power Backup, Security, Club House" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                  <button onClick={handleSave} disabled={saving} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : editId ? '💾 Save Changes' : '+ Publish Property'}
                  </button>
                  <button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setTab('listings') }} style={{ background: '#F5F5F5', color: '#555', border: 'none', padding: '11px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* ── BULK IMPORT ── */}
          {tab === 'bulk' && (
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: '0 0 0.5rem' }}>📋 Bulk Property Import</h1>
              <p style={{ color: '#888', fontSize: '14px', margin: '0 0 1.5rem' }}>Import multiple properties at once using CSV format. Maximum 100 rows per import.</p>

              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '1.5rem', marginBottom: '1rem', maxWidth: '900px' }}>
                <div style={{ fontWeight: 700, color: '#111', fontSize: '14px', marginBottom: '12px' }}>CSV Format</div>
                <div style={{ background: '#F8F8F8', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '12px', color: '#555', marginBottom: '1rem', overflowX: 'auto', whiteSpace: 'pre' }}>{`title,type,sub_type,price,area_sqft,bedrooms,city,location,contact_name,contact_phone,description`}</div>
                <div style={{ fontWeight: 600, color: '#555', fontSize: '13px', marginBottom: '8px' }}>Required: title, price, city, location | Optional: all others</div>
                <div style={{ fontWeight: 600, color: '#555', fontSize: '13px', marginBottom: '4px' }}>type values: <code style={{ background: '#F0F0F0', padding: '1px 4px', borderRadius: '3px' }}>buy</code> <code style={{ background: '#F0F0F0', padding: '1px 4px', borderRadius: '3px' }}>rent</code> <code style={{ background: '#F0F0F0', padding: '1px 4px', borderRadius: '3px' }}>commercial</code></div>
                <div style={{ fontWeight: 600, color: '#555', fontSize: '13px' }}>sub_type values: <code style={{ background: '#F0F0F0', padding: '1px 4px', borderRadius: '3px' }}>flat plot house builder_floor sco office warehouse coworking</code></div>
              </div>

              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', padding: '1.5rem', maxWidth: '900px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
                  <button onClick={() => fileRef.current?.click()} style={{ background: '#F5F5F5', color: '#555', border: '1px solid #E8E8E8', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>📂 Upload CSV File</button>
                  <span style={{ color: '#aaa', fontSize: '13px' }}>or paste CSV data below</span>
                  <button onClick={() => setBulkCsv(BULK_TEMPLATE)} style={{ background: '#FFF8F0', color: '#F4860A', border: '1px solid #F4860A33', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>Load Example</button>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCsvUpload} />
                <textarea
                  value={bulkCsv} onChange={e => setBulkCsv(e.target.value)}
                  placeholder="Paste CSV data here..."
                  style={{ width: '100%', height: '200px', padding: '12px', borderRadius: '8px', border: '1.5px solid #E8E8E8', fontSize: '13px', fontFamily: 'monospace', color: '#111', boxSizing: 'border-box', outline: 'none', resize: 'vertical', background: '#FAFAFA' }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                  <button onClick={handleBulkImport} disabled={bulkLoading || !bulkCsv.trim()} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '11px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: bulkLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: bulkLoading ? 0.7 : 1 }}>
                    {bulkLoading ? 'Importing...' : '⬆ Import Properties'}
                  </button>
                  <button onClick={() => { setBulkCsv(''); setBulkResult([]) }} style={{ background: '#F5F5F5', color: '#555', border: 'none', padding: '11px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Clear</button>
                </div>

                {bulkResult.length > 0 && (
                  <div style={{ marginTop: '1rem', background: '#F8F8F8', borderRadius: '8px', padding: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                    <div style={{ fontWeight: 700, color: '#111', fontSize: '13px', marginBottom: '8px' }}>Import Results:</div>
                    {bulkResult.map((r, i) => (
                      <div key={i} style={{ fontSize: '13px', color: r.includes('✅') ? '#166534' : r.includes('SKIP') ? '#92400E' : '#DC2626', padding: '3px 0', fontFamily: 'monospace' }}>{r}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LEADS ── */}
          {tab === 'leads' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: 0 }}>👥 All Leads ({leads.length})</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input placeholder="Search by name, email, phone..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ ...inp, width: '260px' }} />
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[{ label: 'Total', val: leads.length, color: '#111' }, { label: 'New', val: leads.filter(l => l.status === 'new').length, color: '#DC2626' }, { label: 'Read', val: leads.filter(l => l.status === 'read').length, color: '#2563EB' }, { label: 'Replied', val: leads.filter(l => l.status === 'replied').length, color: '#16A34A' }].map(s => (
                  <div key={s.label} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '10px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E8E8E8' }}>
                      {['Name', 'Phone', 'Email', 'Interested In', 'Message', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, i) => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #F5F5F5', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#111' }}>{lead.buyer?.full_name || 'Unknown'}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>Buyer</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <a href={`tel:${lead.buyer?.phone}`} style={{ color: '#F4860A', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}>{lead.buyer?.phone || lead.phone || '—'}</a>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#555', fontSize: '12px' }}>{lead.buyer?.email || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 500, color: '#111', fontSize: '12px' }}>{lead.property?.title || '—'}</div>
                          <div style={{ fontSize: '11px', color: '#aaa' }}>{lead.property?.city}</div>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: '200px' }}>
                          <div style={{ color: '#555', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.message}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: lead.status === 'new' ? '#FEF3C7' : lead.status === 'read' ? '#DBEAFE' : '#DCFCE7', color: lead.status === 'new' ? '#92400E' : lead.status === 'read' ? '#1E40AF' : '#166534' }}>{lead.status}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#aaa', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmtTime(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredLeads.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>No leads found</div>}
              </div>

              {/* Registered users */}
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#111', margin: '2rem 0 1rem' }}>👤 Registered Users ({profiles.length})</h2>
              <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #E8E8E8' }}>
                      {['Name', 'Email', 'Phone', 'Role', 'Joined'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: '12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F5F5F5', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111' }}>{p.full_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{p.email}</td>
                        <td style={{ padding: '10px 14px' }}><a href={`tel:${p.phone}`} style={{ color: '#F4860A', textDecoration: 'none', fontWeight: 600 }}>{p.phone || '—'}</a></td>
                        <td style={{ padding: '10px 14px' }}><span style={{ padding: '2px 8px', borderRadius: '4px', background: '#F0F0F0', color: '#555', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>{p.role}</span></td>
                        <td style={{ padding: '10px 14px', color: '#aaa', fontSize: '12px' }}>{formatDate(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {profiles.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa' }}>No registered users yet</div>}
              </div>
            </div>
          )}

          {/* ── AI CHATS ── */}
          {tab === 'chats' && (
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111', margin: '0 0 1.5rem' }}>🤖 AI Chat Summaries ({conversations.length})</h1>
              <input placeholder="Search by name or email..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ ...inp, marginBottom: '1rem', maxWidth: '360px' }} />

              <div style={{ display: 'grid', gridTemplateColumns: selectedChat ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                {/* Chat list */}
                <div>
                  {filteredConvos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa', background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8' }}>No AI conversations yet</div>}
                  {filteredConvos.map(c => (
                    <div key={c.id} onClick={() => setSelectedChat(selectedChat?.id === c.id ? null : c)}
                      style={{ background: '#fff', borderRadius: '12px', border: `1.5px solid ${selectedChat?.id === c.id ? '#F4860A' : '#E8E8E8'}`, padding: '1rem', marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#FFF8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#F4860A', fontSize: '14px', flexShrink: 0 }}>{c.user?.full_name?.[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111', fontSize: '13px' }}>{c.user?.full_name || c.user?.email || 'Anonymous'}</div>
                            <div style={{ fontSize: '12px', color: '#aaa' }}>{c.user?.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{ background: '#F0F0F0', color: '#555', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{getInterest(c.messages)}</span>
                          <span style={{ fontSize: '11px', color: '#aaa' }}>{fmtTime(c.created_at)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#777', background: '#F8F8F8', padding: '8px 10px', borderRadius: '6px', lineHeight: 1.5 }}>
                        <strong>Summary:</strong> {getChatSummary(c.messages)}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{c.messages?.length || 0} messages</span>
                        <span style={{ fontSize: '11px', color: '#F4860A', fontWeight: 600 }}>Click to view full chat →</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Full chat view */}
                {selectedChat && (
                  <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E8E8', position: 'sticky', top: '72px', maxHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111', fontSize: '14px' }}>{selectedChat.user?.full_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>{selectedChat.user?.email} · {getInterest(selectedChat.messages)}</div>
                      </div>
                      <button onClick={() => setSelectedChat(null)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer' }}>×</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(selectedChat.messages || []).map((msg: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-start' }}>
                          {msg.role === 'assistant' && <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🤖</div>}
                          <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px', background: msg.role === 'user' ? '#F4860A' : '#F5F5F5', color: msg.role === 'user' ? '#fff' : '#111', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}