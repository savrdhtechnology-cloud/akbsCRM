import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sprout, Handshake, ArrowLeft } from 'lucide-react';
import { AkbsLogo } from './AkbsLogo';
import farmImage from '../assets/images/poultry_farm_chickens_1790243201914.jpg';

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://ldffgetuzoeupuhoaubn.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';
const SESSION_KEY = 'akbs.portal.auth.v1';
type Session = { access_token: string; refresh_token: string; expires_at: number };
type Snapshot = { enrolled: boolean; profile: { name: string; email: string }; applications: any[]; submittedId?: string };
type PortalContextValue = Snapshot & { rpc: (action: string, data?: Record<string, unknown>) => Promise<Snapshot>; refresh: () => Promise<Snapshot> };
const PortalContext = createContext<PortalContextValue | null>(null);
export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error('Portal access is required.');
  return context;
}
async function request(path: string, body?: unknown, token?: string, method?: string) {
  const response = await fetch(`${URL}/${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.msg || result.message || result.error_description || 'Unable to connect. Please try again.');
  return result;
}
export function PortalAccess({ kind, children }: { kind: 'customer' | 'partner'; children: React.ReactNode }) {
  const session = useRef<Session | null>(null);
  const callback = useRef(new URLSearchParams(window.location.hash.slice(1)));
  const refreshing = useRef<Promise<Session> | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'recover' | 'password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const partner = kind === 'partner';
  const title = partner ? 'Partner' : 'Customer';
  function saveSession(data: any) {
    const value: Session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at || Date.now() / 1000 + Number(data.expires_in || 3600) };
    session.current = value;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    setHasSession(true);
    return value;
  }
  async function token() {
    if (!session.current) throw new Error('Please sign in before continuing.');
    if (session.current.expires_at < Date.now() / 1000 + 60) {
      if (!refreshing.current) refreshing.current = request('auth/v1/token?grant_type=refresh_token', { refresh_token: session.current.refresh_token }).then(saveSession).catch(e => {
        session.current = null; sessionStorage.removeItem(SESSION_KEY); setHasSession(false); setSnapshot(null); throw e;
      }).finally(() => { refreshing.current = null; });
      await refreshing.current;
    }
    return session.current!.access_token;
  }
  async function rpc(action: string, data: Record<string, unknown> = {}) {
    const result: Snapshot = await request('rest/v1/rpc/akbs_portal', { p_action: action, p_kind: kind, p_data: data }, await token());
    setSnapshot(result);
    return result;
  }
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const hash = callback.current;
        const recovery = hash.get('type') === 'recovery';
        if (hash.get('access_token') && hash.get('refresh_token')) {
          saveSession(Object.fromEntries(hash));
          history.replaceState(null, '', window.location.pathname);
        } else {
          const saved = sessionStorage.getItem(SESSION_KEY);
          if (saved) session.current = JSON.parse(saved);
        }
        if (!session.current) return;
        const user = await request('auth/v1/user', undefined, await token());
        if (!active) return;
        setHasSession(true); setEmail(user.email || '');
        if (recovery) { setMode('password'); return; }
        await rpc('snapshot');
      } catch (e: any) {
        if (active) { setError(e.message); setSnapshot(null); setHasSession(false); }
        session.current = null; sessionStorage.removeItem(SESSION_KEY);
      } finally { if (active) setChecking(false); }
    }
    void restore();
    return () => { active = false; };
  }, [kind]);
  async function signOut() {
    setBusy(true); setError('');
    try { if (session.current) await request('auth/v1/logout', {}, await token()); }
    catch (e: any) { setError(e.message); }
    finally { session.current = null; sessionStorage.removeItem(SESSION_KEY); setSnapshot(null); setHasSession(false); setMode('login'); setPassword(''); setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (hasSession && mode !== 'password') {
        await rpc('enroll', { name, consent });
      } else if (mode === 'recover') {
        await request(`auth/v1/recover?redirect_to=${encodeURIComponent(window.location.origin + window.location.pathname)}`, { email: email.trim() });
        setNotice('If an account exists, a password reset link has been sent. Check your inbox and spam folder.');
      } else if (mode === 'password') {
        await request('auth/v1/user', { password }, await token(), 'PUT');
        setPassword(''); setMode('login'); await rpc('snapshot');
      } else {
        const signup = mode === 'signup';
        const result = await request(signup ? `auth/v1/signup?redirect_to=${encodeURIComponent(window.location.origin + window.location.pathname)}` : 'auth/v1/token?grant_type=password', { email: email.trim(), password });
        if (!result.access_token) { setNotice('Check your email to confirm your account, then sign in here.'); setMode('login'); return; }
        saveSession(result); setPassword('');
        const current = await rpc('snapshot');
        if (signup && !current.enrolled) await rpc('enroll', { name, consent });
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (checking) return <div className="min-h-screen bg-[#f3f6f3] grid place-items-center"><div role="status" className="text-emerald-900 font-medium">Checking your secure account…</div></div>;
  if (hasSession && snapshot?.enrolled && mode !== 'password') return <PortalContext.Provider value={{ ...snapshot, rpc, refresh: () => rpc('snapshot') }}>
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"><span>{title} account · {snapshot.profile.email}</span><div className="flex gap-4"><button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await rpc('snapshot');}catch(e:any){setError(e.message);}finally{setBusy(false);}}} className="font-semibold text-emerald-800">{busy ? 'Refreshing…' : 'Refresh status'}</button><a href="https://akbspoultry.com" className="text-emerald-800 font-semibold">Website</a><button disabled={busy} onClick={signOut} className="font-semibold text-slate-700">Sign out</button></div></div>
    {error && <p role="alert" className="bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {children}
  </PortalContext.Provider>;
  const enroll = hasSession && mode !== 'password';
  const signup = mode === 'signup' || enroll;
  const heading = mode === 'password' ? 'Set a new password' : mode === 'recover' ? 'Reset your password' : enroll ? `Complete ${kind} signup` : signup ? 'Start your journey' : 'Welcome back';
  return <div className="min-h-screen bg-[#f6f8f5] text-slate-900 flex flex-col">
    <header className="px-5 sm:px-10 py-5 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white"><AkbsLogo theme="light" size="md" showTagline={false}/><a href="https://akbspoultry.com" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><ArrowLeft size={14}/> Back to website</a></header>
    <main className="flex-1 grid lg:grid-cols-2 max-w-7xl w-full mx-auto p-5 sm:p-10 gap-8 lg:gap-16 items-center">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0b3824] text-white p-7 sm:p-10 min-h-[280px] lg:min-h-[600px] flex flex-col justify-between">
        <img src={farmImage} alt="AKBS poultry farming" className="absolute inset-0 w-full h-full object-cover opacity-25"/><div className="absolute inset-0 bg-gradient-to-t from-[#082e20] via-[#082e20]/60 to-[#082e20]/20"/>
        <div className="relative"><div className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs text-emerald-100">{partner ? <Handshake size={16}/> : <Sprout size={16}/>} AKBS {title} Portal</div><h1 className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">{partner ? <>Build stronger<br/>partnerships.</> : <>Your poultry project.<br/>A better beginning.</>}</h1><p className="mt-5 text-sm sm:text-base text-emerald-50/80 max-w-sm leading-relaxed">{partner ? 'Connect your business with AKBS. Register your profile and follow your partnership application in one place.' : 'Plan your project with AKBS. Apply online, keep your details secure and track your application from your account.'}</p></div>
        <div className="relative mt-9 space-y-3 text-sm text-emerald-50">{['Your personal, secure account', 'Applications sent directly to AKBS', 'One place to follow your progress'].map(x=><p className="flex gap-3 items-center" key={x}><CheckCircle2 size={17} className="text-emerald-300"/>{x}</p>)}</div>
      </section>
      <section className="w-full max-w-md mx-auto py-3 sm:py-6">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 grid place-items-center text-emerald-800"><LockKeyhole size={22}/></div><p className="mt-6 text-xs font-bold tracking-widest text-emerald-700 uppercase">{title} access</p><h2 className="mt-2 text-3xl font-bold tracking-tight">{heading}</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">{enroll ? 'Register for this portal to access your application form.' : mode === 'recover' ? 'Enter your account email to receive a reset link.' : 'Sign up or sign in with your email before opening an application. पहले अपना account बनाएं या login करें।'}</p>
        {!enroll && !['recover','password'].includes(mode) && <div className="flex bg-slate-100 p-1 rounded-xl mt-6">{(['login','signup'] as const).map(m=><button type="button" key={m} disabled={busy} onClick={()=>{setMode(m);setError('');setNotice('');}} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode===m?'bg-white shadow-sm text-emerald-900':'text-slate-500'}`}>{m==='login'?'Sign in':'Create account'}</button>)}</div>}
        <form onSubmit={submit} className="space-y-4 mt-6">
          {signup && <label className="block text-sm font-medium">Full name<input required minLength={2} maxLength={200} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder="Your full name"/></label>}
          {mode !== 'password' && <label className="block text-sm font-medium">Email address<input type="email" required readOnly={enroll} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder="you@example.com"/></label>}
          {!enroll && mode !== 'recover' && <label className="block text-sm font-medium">Password<input type="password" required minLength={mode==='login'?1:8} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder={mode==='login'?'Enter your password':'At least 8 characters'}/></label>}
          {signup && <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 accent-emerald-800"/>I agree to create an AKBS {kind} account and allow AKBS to use my details to manage my applications.</label>}
          {error && <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}{notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">{notice}</p>}
          <button disabled={busy} type="submit" className="w-full bg-[#0b3824] hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">{busy?'Please wait…':mode==='recover'?'Send reset link':mode==='password'?'Save new password':signup?'Create account & continue':'Sign in securely'}<ArrowRight size={17}/></button>
        </form>
        <div className="mt-4 text-center">{!hasSession && <button type="button" disabled={busy} onClick={()=>{setMode(mode==='recover'?'login':'recover');setError('');setNotice('');}} className="text-sm text-emerald-800 font-medium">{mode==='recover'?'Back to sign in':'Forgot your password?'}</button>}{enroll && <button onClick={signOut} className="text-sm text-slate-500">Use a different account</button>}</div>
        <p className="mt-8 pt-6 border-t border-slate-200 flex gap-2 justify-center text-xs text-slate-500"><ShieldCheck size={15}/> Your application is accessible only after sign in.</p><p className="mt-5 text-center text-xs text-slate-500">Looking for the {partner?'customer':'partner'} portal? <a className="font-semibold text-emerald-800" href={partner?'/customer-registration':'/partner-registration'}>Open portal</a></p>
      </section>
    </main><footer className="text-center text-xs text-slate-400 py-5">AKBS Poultry Farming · Grow with confidence</footer>
  </div>;
}
