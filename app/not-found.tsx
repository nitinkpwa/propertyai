import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: '#F4860A', marginBottom: '0.5rem' }}>404</div>
        <h2 style={{ color: '#2C1A0E', marginBottom: '0.5rem' }}>Page not found</h2>
        <p style={{ color: '#6B4226', marginBottom: '1.5rem' }}>The page you are looking for doesn&apos;t exist.</p>
        <Link href="/" style={{ background: '#F4860A', color: '#fff', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>← Back to Home</Link>
      </div>
    </div>
  )
}