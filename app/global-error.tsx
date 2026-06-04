'use client'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: 'Inter, sans-serif', background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#2C1A0E', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#6B4226', marginBottom: '1.5rem' }}>Please try refreshing the page</p>
          <button onClick={reset} style={{ background: '#F4860A', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
          <br /><a href="/" style={{ color: '#F4860A', fontSize: '13px', marginTop: '1rem', display: 'inline-block' }}>← Back to Home</a>
        </div>
      </body>
    </html>
  )
}