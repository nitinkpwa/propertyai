'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { isPropertySaved, toggleSavedProperty } from '@/lib/buyer/queries'
import { sendCrmInquiry } from '@/lib/crm/queries'
import { useParams } from 'next/navigation'

export default function PropertyDetailPage() {
  const params = useParams()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [inquiryMsg, setInquiryMsg] = useState('')
  const [inquirySent, setInquirySent] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    fetchProperty()
    checkAuth()
  }, [params.id])

  const fetchProperty = async () => {
    // Only the seller/partner display name is rendered here; private contact
    // details (email/phone) are intentionally NOT fetched. Buyers receive
    // owner contact only through the gated site-visit contact flow.
    const { data } = await supabase
      .from('properties')
      .select('*, seller:profiles!properties_seller_id_fkey(full_name), connect_partner:connect_partners!properties_connect_partner_id_fkey(id, company_name, manager_name)')
      .eq('id', params.id)
      .single()
    setProperty(data)
    setLoading(false)
  }

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    setUser(authUser)
    const saved = await isPropertySaved(authUser.id, params.id as string)
    setSaved(saved)
  }

  const toggleSave = async () => {
    if (!user) { window.location.href = '/login'; return }
    const next = !saved
    setSaved(next)
    const ok = await toggleSavedProperty(user.id, params.id as string, next)
    if (!ok) setSaved(!next)
  }

  const sendInquiry = async () => {
    if (!user) { window.location.href = '/login'; return }
    if (!inquiryMsg.trim()) return
    const result = await sendCrmInquiry({
      propertyId: params.id as string,
      message: inquiryMsg,
    })
    if ('error' in result) return
    setInquirySent(true)
    setInquiryMsg('')
  }

  const formatPrice = (p: number) => p >= 10000000 ? `₹${(p / 10000000).toFixed(2)}Cr` : `₹${(p / 100000).toFixed(0)}L`

  const typeIcon: Record<string, string> = { flat: '🏠', plot: '🏗️', house: '🏡', builder_floor: '🏘️', sco: '🏪', office: '🏢', warehouse: '🏭', coworking: '☕' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ color: '#6B4226' }}>Loading property...</div>
    </div>
  )

  if (!property) return (
    <div style={{ minHeight: '100vh', background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem' }}>🏠</div>
      <div style={{ fontWeight: 700, color: '#2C1A0E', fontSize: '1.2rem' }}>Property not found</div>
      <a href="/properties" style={{ color: '#F4860A', textDecoration: 'none', fontWeight: 600 }}>← Back to Properties</a>
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/properties" style={{ color: '#F7BF8A', fontSize: '13px', textDecoration: 'none' }}>← Properties</a>
          <a href="/ask" style={{ background: '#F4860A', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Ask AI</a>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>

          {/* LEFT COLUMN */}
          <div>
            {/* Photo gallery */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '1.25rem', background: '#F5E8D8', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {property.photos && property.photos.length > 0 ? (
                <>
                  <img src={property.photos[activePhoto]} alt="property" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {property.photos.length > 1 && (
                    <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                      {property.photos.map((_: any, i: number) => (
                        <div key={i} onClick={() => setActivePhoto(i)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === activePhoto ? '#F4860A' : 'rgba(255,255,255,0.7)', cursor: 'pointer' }} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '5rem' }}>{typeIcon[property.sub_type] || '🏠'}</div>
              )}
            </div>

            {/* Thumbnail row */}
            {property.photos && property.photos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', overflowX: 'auto' }}>
                {property.photos.map((ph: string, i: number) => (
                  <img key={i} src={ph} onClick={() => setActivePhoto(i)} alt="" style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: `2px solid ${i === activePhoto ? '#F4860A' : 'transparent'}`, flexShrink: 0 }} />
                ))}
              </div>
            )}

            {/* Title & badges */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2C1A0E', margin: 0 }}>{property.title}</h1>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: property.type === 'buy' ? '#EAF3DE' : property.type === 'rent' ? '#E6F1FB' : '#FEF3C7', color: property.type === 'buy' ? '#27500A' : property.type === 'rent' ? '#0C447C' : '#92400E' }}>
                  {property.type === 'buy' ? 'For Sale' : property.type === 'rent' ? 'For Rent' : 'Commercial'}
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#6B4226', marginBottom: '0.75rem' }}>📍 {property.location}, {property.city}{property.sector ? ` · ${property.sector}` : ''}</div>
              {property.connect_partner?.company_name ? (
                <div style={{ fontSize: '13px', color: '#27500A', background: '#EAF3DE', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', marginBottom: '0.75rem', fontWeight: 600 }}>
                  🤝 Connect Partner: {property.connect_partner.company_name}
                </div>
              ) : null}
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F4860A', marginBottom: '1rem' }}>{formatPrice(property.price)}</div>

              {/* Key specs */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {property.bedrooms && <div style={{ background: '#FDF6EE', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#2C1A0E' }}>🛏 {property.bedrooms} BHK</div>}
                {property.bathrooms && <div style={{ background: '#FDF6EE', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#2C1A0E' }}>🚿 {property.bathrooms} Bath</div>}
                {property.area_sqft && <div style={{ background: '#FDF6EE', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#2C1A0E' }}>📐 {property.area_sqft} sqft</div>}
                <div style={{ background: '#FDF6EE', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#2C1A0E', textTransform: 'capitalize' }}>🏠 {property.sub_type?.replace('_', ' ')}</div>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#2C1A0E', marginBottom: '0.5rem' }}>About this property</div>
                <div style={{ fontSize: '14px', color: '#6B4226', lineHeight: 1.7 }}>{property.description}</div>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#2C1A0E', marginBottom: '0.75rem' }}>Amenities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {property.amenities.map((a: string) => (
                    <span key={a} style={{ background: '#FDF6EE', border: '1px solid #F5E8D8', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', color: '#6B4226' }}>✓ {a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Ask AI about this property */}
            <a href={`/ask?q=Tell me about this property: ${encodeURIComponent(property.title + ' in ' + property.location + ' ' + property.city + ' priced at ' + formatPrice(property.price))}`}
              style={{ display: 'block', background: '#2C1A0E', borderRadius: '14px', padding: '1rem 1.25rem', textDecoration: 'none', marginBottom: '1rem' }}>
              <div style={{ color: '#F4860A', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>🤖 Ask AI about this property</div>
              <div style={{ color: '#F7BF8A', fontSize: '13px' }}>Get investment analysis, rental yield estimate, area comparison and more</div>
            </a>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Price card */}
            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F5E8D8', padding: '1.25rem', marginBottom: '1rem', position: 'sticky', top: '72px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F4860A', marginBottom: '4px' }}>{formatPrice(property.price)}</div>
              {property.area_sqft && <div style={{ fontSize: '12px', color: '#A67C5B', marginBottom: '1rem' }}>₹{Math.round(property.price / property.area_sqft).toLocaleString('en-IN')}/sqft</div>}

              {/* Save button */}
              <button onClick={toggleSave} style={{ width: '100%', padding: '11px', borderRadius: '10px', border: `2px solid ${saved ? '#F4860A' : '#F5E8D8'}`, background: saved ? '#FFF4E8' : '#fff', color: saved ? '#B05A00' : '#6B4226', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '10px' }}>
                {saved ? '❤️ Saved' : '🤍 Save Property'}
              </button>

              {/* Book site visit — contact hidden until approved */}
              <a href={`/property/${params.id}`} style={{ display: 'block', width: '100%', padding: '11px', borderRadius: '10px', background: '#F4860A', color: '#fff', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', marginBottom: '10px' }}>
                📅 Book Site Visit
              </a>
              <p style={{ fontSize: '11px', color: '#A67C5B', marginBottom: '10px', lineHeight: 1.4 }}>
                Seller contact is shared only after your visit request is approved.
              </p>

              {/* Send inquiry */}
              <div style={{ borderTop: '1px solid #F5E8D8', paddingTop: '1rem' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2C1A0E', marginBottom: '8px' }}>Send a message</div>
                {inquirySent ? (
                  <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>✅ Message sent! Seller will contact you.</div>
                ) : (
                  <>
                    <textarea
                      value={inquiryMsg}
                      onChange={e => setInquiryMsg(e.target.value)}
                      placeholder="Hi, I'm interested in this property. Please share more details."
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #F5E8D8', fontSize: '13px', color: '#2C1A0E', background: '#FDF6EE', fontFamily: 'Inter, sans-serif', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', outline: 'none', marginBottom: '8px' }}
                    />
                    <button onClick={sendInquiry} style={{ width: '100%', padding: '10px', background: '#F4860A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Send Message →
                    </button>
                  </>
                )}
              </div>

              {/* Seller info */}
              {property.seller && (
                <div style={{ borderTop: '1px solid #F5E8D8', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div style={{ fontSize: '12px', color: '#A67C5B', marginBottom: '4px' }}>Listed by</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2C1A0E' }}>{property.contact_name || property.seller.full_name}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}