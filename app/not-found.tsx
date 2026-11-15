import Link from 'next/link';
export default function NotFound() {
  return <main style={{minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#071526', color: '#e9eefb', textAlign: 'center', padding: 24}}>
    <div><p style={{color: '#f5c451', fontWeight: 700, letterSpacing: '.2em'}}>AKBS CRM</p><h1 style={{fontSize: 32, margin: '8px 0'}}>Page not found</h1>
      <p style={{color: '#94a3b8'}}>This page does not exist or has moved.</p>
      <Link href="/portal/login" style={{display: 'inline-block', marginTop: 16, padding: '12px 20px', borderRadius: 12, background: 'linear-gradient(180deg,#ffe49b,#f5c451 45%,#c78b25)', color: '#241602', fontWeight: 700}}>Go to CRM login</Link></div>
  </main>;
}
