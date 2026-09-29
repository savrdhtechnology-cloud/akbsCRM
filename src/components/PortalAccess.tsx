import React, { createContext, useContext, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Handshake, LockKeyhole, Mail, ShieldCheck, Sprout } from 'lucide-react';
import { AkbsLogo } from './AkbsLogo';
import farmImage from '../assets/images/poultry_farm_chickens_1790243201914.jpg';

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://ldffgetuzoeupuhoaubn.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';
const SESSION_KEY = 'akbs.portal.custom.emailotp.v1';

type Snapshot = {
  enrolled: boolean;
  profile: { name: string; email: string };
  applications: any[];
  submittedId?: string;
};

type PortalContextValue = Snapshot & {
  rpc: (action: string, data?: Record<string, unknown>) => Promise<Snapshot>;
  refresh: () => Promise<Snapshot>;
  timeline: (leadId: string) => Promise<any>;
  loadDraft: () => Promise<any>;
  saveDraft: (requestId: string, form: Record<string, unknown>, currentStage: number) => Promise<any>;
  deleteDraft: (requestId: string) => Promise<any>;
  sendPaymentReceipt: (applicationId: string) => Promise<any>;
  submitPaymentProof: (applicationId: string, reference: string, file?: { name: string; type: string; data: string } | null) => Promise<any>;
  getFeeConfig: () => Promise<any>;
  signOut: () => Promise<void>;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error('Portal access is required.');
  return context;
}

async function rpcCall(fn: string, body: Record<string, unknown>) {
  const response = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || 'Unable to connect. Please try again.');
  }
  return result;
}

export function PortalAccess({ kind, children }: { kind: 'customer' | 'partner'; children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionToken, setSessionToken] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'enroll'>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const partner = kind === 'partner';
  const title = partner ? 'Partner' : 'Customer';

  async function loadDraft() {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    return rpcCall('akbs_portal_draft_load', {
      p_kind: kind,
      p_session_token: sessionToken
    });
  }

  async function saveDraft(requestId: string, form: Record<string, unknown>, currentStage: number) {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    return rpcCall('akbs_portal_draft_save', {
      p_kind: kind,
      p_session_token: sessionToken,
      p_request_id: requestId,
      p_form: form,
      p_current_stage: currentStage
    });
  }

  async function deleteDraft(requestId: string) {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    return rpcCall('akbs_portal_draft_delete', {
      p_kind: kind,
      p_session_token: sessionToken,
      p_request_id: requestId
    });
  }

  async function sendPaymentReceipt(applicationId: string) {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    const response = await fetch(`${URL}/functions/v1/akbs-customer-payment-receipt`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionToken, applicationId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || result?.message || 'Receipt email could not be sent.');
    return result;
  }

  async function submitPaymentProof(applicationId: string, reference: string, file?: { name: string; type: string; data: string } | null) {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    const response = await fetch(`${URL}/functions/v1/akbs-customer-payment-proof`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionToken, applicationId, reference, file: file || null })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = String(result?.code || 'PAYMENT_SUBMISSION_FAILED');
      const correlationId = String(result?.correlationId || '').trim();
      const message = String(
        result?.message ||
        'Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.'
      );
      const suffix = correlationId ? ` Reference: ${correlationId}` : '';
      throw Object.assign(new Error(`${message}${suffix}`), { code, correlationId });
    }
    return result;
  }
  async function getFeeConfig() {
    return rpcCall('akbs_fee_public_config', {});
  }


  async function timeline(leadId: string) {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    return rpcCall('akbs_portal_timeline', {
      p_kind: kind,
      p_session_token: sessionToken,
      p_lead_id: leadId
    });
  }

  async function portalRpc(action: string, data: Record<string, unknown> = {}) {
    if (!sessionToken) throw new Error('Verify your email OTP first.');
    const result: Snapshot = await rpcCall('akbs_portal_custom', {
      p_action: action,
      p_kind: kind,
      p_session_token: sessionToken,
      p_data: data
    });
    setSnapshot(result);
    return result;
  }

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (parsed?.kind !== kind || !parsed?.token) return;
        setSessionToken(parsed.token);
        setEmail(parsed.email || '');
        const result: Snapshot = await rpcCall('akbs_portal_custom', {
          p_action: 'snapshot',
          p_kind: kind,
          p_session_token: parsed.token,
          p_data: {}
        });
        if (!active) return;
        setSnapshot(result);
        if (!result.enrolled) setMode('enroll');
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        if (active) {
          setSessionToken('');
          setSnapshot(null);
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, [kind]);

  useEffect(() => {
    if (!sessionToken || !snapshot?.enrolled) return;

    let stopped = false;
    let inFlight = false;

    const sync = async () => {
      if (stopped || inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const current: Snapshot = await rpcCall('akbs_portal_custom', {
          p_action: 'snapshot',
          p_kind: kind,
          p_session_token: sessionToken,
          p_data: {}
        });
        if (!stopped) setSnapshot(current);
      } catch {
        // Keep the last good portal state during transient network errors.
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(() => void sync(), 2000);
    const onFocus = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionToken, snapshot?.enrolled, kind]);

  async function sendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const normalized = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('Please enter a valid email address.');

      await rpcCall('akbs_portal_otp_send', {
        p_kind: kind,
        p_intent: mode === 'signup' ? 'signup' : 'login',
        p_email: normalized
      });

      setOtp('');
      setOtpSent(true);
      setNotice('A 6-digit OTP has been sent to your email. Enter it below to continue.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!/^\d{6}$/.test(otp.trim())) throw new Error('Enter the 6-digit OTP.');

      const result = await rpcCall('akbs_portal_otp_verify', {
        p_kind: kind,
        p_intent: mode === 'signup' ? 'signup' : 'login',
        p_email: email.trim().toLowerCase(),
        p_code: otp.trim()
      });

      if (!result?.sessionToken) throw new Error('Unable to create verified session.');

      const token = result.sessionToken;
      setSessionToken(token);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ kind, token, email: result.email }));

      const current: Snapshot = await rpcCall('akbs_portal_custom', {
        p_action: 'snapshot',
        p_kind: kind,
        p_session_token: token,
        p_data: {}
      });
      setSnapshot(current);
      setOtpSent(false);
      setOtp('');

      if (!current.enrolled) {
        setMode('enroll');
        setName(current.profile?.name || '');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function enrollPortal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!sessionToken) throw new Error('Verify your email OTP first.');
      if (!name.trim()) throw new Error('Please enter your full name.');
      if (!consent) throw new Error('Please accept the consent to continue.');

      const result = await portalRpc('enroll', { name: name.trim(), consent: true });
      setSnapshot(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      if (sessionToken) {
        await rpcCall('akbs_portal_custom', {
          p_action: 'logout',
          p_kind: kind,
          p_session_token: sessionToken,
          p_data: {}
        });
      }
    } catch {
    } finally {
      sessionStorage.removeItem(SESSION_KEY);
      setSessionToken('');
      setSnapshot(null);
      setMode('login');
      setEmail('');
      setOtp('');
      setOtpSent(false);
      setBusy(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen bg-[#f3f6f3] grid place-items-center"><div className="text-emerald-900 font-medium">Checking your secure account…</div></div>;
  }

  if (sessionToken && snapshot?.enrolled) {
    return (
      <PortalContext.Provider value={{ ...snapshot, rpc: portalRpc, refresh: () => portalRpc('snapshot'), timeline, loadDraft, saveDraft, deleteDraft, sendPaymentReceipt, submitPaymentProof, getFeeConfig, signOut }}>
        {error && <p role="alert" className="bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {children}
      </PortalContext.Provider>
    );
  }

  const enroll = mode === 'enroll' && !!sessionToken;

  return (
    <div className="min-h-screen bg-[#f6f8f5] text-slate-900 flex flex-col">
      <header className="px-5 sm:px-10 py-5 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white">
        <AkbsLogo theme="light" size="md" showTagline={false} />
        <a href="https://akbspoultry.com" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><ArrowLeft size={14}/> Back to website</a>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 max-w-7xl w-full mx-auto p-5 sm:p-10 gap-8 lg:gap-16 items-center">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b3824] text-white p-7 sm:p-10 min-h-[280px] lg:min-h-[600px] flex flex-col justify-between">
          <img src={farmImage} alt="AKBS poultry farming" className="absolute inset-0 w-full h-full object-cover opacity-25"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#082e20] via-[#082e20]/60 to-[#082e20]/20"/>
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs text-emerald-100">{partner ? <Handshake size={16}/> : <Sprout size={16}/>} AKBS {title} Portal</div>
            <h1 className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">{partner ? <>Build stronger<br/>partnerships.</> : <>Your poultry project.<br/>A better beginning.</>}</h1>
            <p className="mt-5 text-sm sm:text-base text-emerald-50/80 max-w-sm leading-relaxed">{partner ? 'Verify your email first, then manage your partnership application securely.' : 'Verify your email first, then apply online and track your poultry project securely.'}</p>
          </div>
          <div className="relative mt-9 space-y-3 text-sm text-emerald-50">
            {['Separate AKBS email OTP verification','Applications sent directly to AKBS','FieldSure SMTP remains untouched'].map(x => <p className="flex gap-3 items-center" key={x}><CheckCircle2 size={17} className="text-emerald-300"/>{x}</p>)}
          </div>
        </section>

        <section className="w-full max-w-md mx-auto py-3 sm:py-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 grid place-items-center text-emerald-800">{enroll ? <ShieldCheck size={22}/> : <LockKeyhole size={22}/>}</div>
          <p className="mt-6 text-xs font-bold tracking-widest text-emerald-700 uppercase">{title} secure access</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{enroll ? `Complete ${title.toLowerCase()} signup` : otpSent ? 'Verify your email' : mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">{enroll ? 'Your email is verified. Complete your profile to enter the portal.' : otpSent ? `Enter the 6-digit OTP sent to ${email}.` : 'A valid AKBS email OTP is required before the portal can open.'}</p>

          {!enroll && !otpSent && (
            <div className="flex bg-slate-100 p-1 rounded-xl mt-6">
              <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode==='login'?'bg-white shadow-sm text-emerald-900':'text-slate-500'}`}>Existing {title}</button>
              <button type="button" onClick={() => { setMode('signup'); setError(''); setNotice(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode==='signup'?'bg-white shadow-sm text-emerald-900':'text-slate-500'}`}>New {title}</button>
            </div>
          )}

          {enroll ? (
            <form onSubmit={enrollPortal} className="space-y-4 mt-6">
              <label className="block text-sm font-medium">Verified email<input readOnly value={email} className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"/></label>
              <label className="block text-sm font-medium">Full name<input required minLength={2} maxLength={200} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder="Your full name"/></label>
              <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 accent-emerald-800"/>I agree to create an AKBS {kind} account and allow AKBS to manage my applications.</label>
              {error && <p className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
              <button disabled={busy} className="w-full bg-[#0b3824] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">{busy?'Please wait…':'Complete signup & continue'}<ArrowRight size={17}/></button>
            </form>
          ) : !otpSent ? (
            <form onSubmit={sendOtp} className="space-y-4 mt-6">
              <label className="block text-sm font-medium">Email address<div className="relative mt-2"><Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600" placeholder="you@example.com"/></div></label>
              {error && <p className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
              {notice && <p className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">{notice}</p>}
              <button disabled={busy} className="w-full bg-[#0b3824] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">{busy?'Sending OTP…':'Send email OTP'}<ArrowRight size={17}/></button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4 mt-6">
              <label className="block text-sm font-medium">6-digit OTP<input inputMode="numeric" required maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-xl tracking-[0.4em] font-mono outline-none focus:ring-2 focus:ring-emerald-600" placeholder="••••••"/></label>
              {error && <p className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
              {notice && <p className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">{notice}</p>}
              <button disabled={busy || otp.length!==6} className="w-full bg-[#0b3824] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">{busy?'Verifying…':'Verify OTP & continue'}<ArrowRight size={17}/></button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); setNotice(''); }} className="text-slate-600 font-medium">Change email</button>
                <button type="button" disabled={busy} onClick={() => void sendOtp()} className="text-emerald-800 font-semibold">Resend OTP</button>
              </div>
            </form>
          )}

          <p className="mt-8 pt-6 border-t border-slate-200 flex gap-2 justify-center text-xs text-slate-500"><ShieldCheck size={15}/> Portal pages remain locked until AKBS email OTP verification succeeds.</p>
        </section>
      </main>
    </div>
  );
}
