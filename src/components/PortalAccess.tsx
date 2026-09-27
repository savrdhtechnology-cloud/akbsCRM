import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Handshake, LockKeyhole, Mail, ShieldCheck, Sprout } from 'lucide-react';
import { AkbsLogo } from './AkbsLogo';
import farmImage from '../assets/images/poultry_farm_chickens_1790243201914.jpg';

const URL = import.meta.env.VITE_SUPABASE_URL || 'https://ldffgetuzoeupuhoaubn.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';

const SESSION_KEY = 'akbs.portal.auth.v2';
const OTP_PROOF_KEY = 'akbs.portal.email-otp.verified.v1';

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type Snapshot = {
  enrolled: boolean;
  profile: { name: string; email: string };
  applications: any[];
  submittedId?: string;
};

type PortalContextValue = Snapshot & {
  rpc: (action: string, data?: Record<string, unknown>) => Promise<Snapshot>;
  refresh: () => Promise<Snapshot>;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) throw new Error('Portal access is required.');
  return context;
}

async function request(path: string, body?: unknown, token?: string, method?: string) {
  const response = await fetch(`${URL}/${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers: {
      apikey: KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      result.msg ||
      result.message ||
      result.error_description ||
      result.error ||
      'Unable to connect. Please try again.'
    );
  }
  return result;
}

export function PortalAccess({
  kind,
  children
}: {
  kind: 'customer' | 'partner';
  children: React.ReactNode;
}) {
  const session = useRef<Session | null>(null);
  const refreshing = useRef<Promise<Session> | null>(null);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

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

  function saveSession(data: any) {
    const value: Session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Date.now() / 1000 + Number(data.expires_in || 3600)
    };
    session.current = value;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    setHasSession(true);
    return value;
  }

  function clearPortalAuth() {
    session.current = null;
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(OTP_PROOF_KEY);
    setHasSession(false);
    setOtpVerified(false);
    setSnapshot(null);
  }

  async function token() {
    if (!session.current) throw new Error('Please verify your email OTP before continuing.');

    if (session.current.expires_at < Date.now() / 1000 + 60) {
      if (!refreshing.current) {
        refreshing.current = request(
          'auth/v1/token?grant_type=refresh_token',
          { refresh_token: session.current.refresh_token }
        )
          .then(saveSession)
          .catch((e) => {
            clearPortalAuth();
            throw e;
          })
          .finally(() => {
            refreshing.current = null;
          });
      }
      await refreshing.current;
    }

    return session.current!.access_token;
  }

  async function rpc(action: string, data: Record<string, unknown> = {}) {
    if (!otpVerified) throw new Error('Email OTP verification is required.');
    const result: Snapshot = await request(
      'rest/v1/rpc/akbs_portal',
      { p_action: action, p_kind: kind, p_data: data },
      await token()
    );
    setSnapshot(result);
    return result;
  }

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        const proof = sessionStorage.getItem(OTP_PROOF_KEY);

        if (!saved || proof !== kind) {
          clearPortalAuth();
          return;
        }

        session.current = JSON.parse(saved);
        const user = await request('auth/v1/user', undefined, await token());

        if (!active || !user?.id || !user?.email) return;

        setEmail(user.email);
        setHasSession(true);
        setOtpVerified(true);

        const result: Snapshot = await request(
          'rest/v1/rpc/akbs_portal',
          { p_action: 'snapshot', p_kind: kind, p_data: {} },
          await token()
        );

        if (!active) return;
        setSnapshot(result);

        if (!result.enrolled) {
          setMode('enroll');
        }
      } catch (e: any) {
        if (active) setError(e.message);
        clearPortalAuth();
      } finally {
        if (active) setChecking(false);
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, [kind]);

  async function sendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const normalized = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalized)) {
        throw new Error('Please enter a valid email address.');
      }

      await request('auth/v1/otp', {
        email: normalized,
        create_user: mode === 'signup'
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
      const normalized = email.trim().toLowerCase();
      if (!/^\d{6}$/.test(otp.trim())) {
        throw new Error('Enter the 6-digit OTP sent to your email.');
      }

      const result = await request('auth/v1/verify', {
        type: 'email',
        email: normalized,
        token: otp.trim()
      });

      if (!result?.access_token || !result?.user?.id) {
        throw new Error('OTP verification failed. Please request a new code.');
      }

      saveSession(result);
      sessionStorage.setItem(OTP_PROOF_KEY, kind);
      setOtpVerified(true);
      setOtpSent(false);
      setOtp('');

      const current: Snapshot = await request(
        'rest/v1/rpc/akbs_portal',
        { p_action: 'snapshot', p_kind: kind, p_data: {} },
        result.access_token
      );
      setSnapshot(current);

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
      if (!otpVerified || !hasSession) {
        throw new Error('Please verify your email OTP first.');
      }
      if (!name.trim()) {
        throw new Error('Please enter your full name.');
      }
      if (!consent) {
        throw new Error('Please accept the consent to continue.');
      }

      const result = await rpc('enroll', {
        name: name.trim(),
        consent: true
      });
      setSnapshot(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      if (session.current) {
        await request('auth/v1/logout', {}, await token());
      }
    } catch {
      // Always clear local portal access, even if remote logout fails.
    } finally {
      clearPortalAuth();
      setMode('login');
      setEmail('');
      setOtp('');
      setOtpSent(false);
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f3f6f3] grid place-items-center">
        <div role="status" className="text-emerald-900 font-medium">
          Checking your secure account…
        </div>
      </div>
    );
  }

  if (hasSession && otpVerified && snapshot?.enrolled) {
    return (
      <PortalContext.Provider
        value={{
          ...snapshot,
          rpc,
          refresh: () => rpc('snapshot')
        }}
      >
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>{title} account · {snapshot.profile.email}</span>
          <div className="flex gap-4">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await rpc('snapshot');
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="font-semibold text-emerald-800"
            >
              {busy ? 'Refreshing…' : 'Refresh status'}
            </button>
            <a href="https://akbspoultry.com" className="text-emerald-800 font-semibold">
              Website
            </a>
            <button disabled={busy} onClick={signOut} className="font-semibold text-slate-700">
              Sign out
            </button>
          </div>
        </div>
        {error && <p role="alert" className="bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {children}
      </PortalContext.Provider>
    );
  }

  const enroll = mode === 'enroll' && otpVerified;

  return (
    <div className="min-h-screen bg-[#f6f8f5] text-slate-900 flex flex-col">
      <header className="px-5 sm:px-10 py-5 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white">
        <AkbsLogo theme="light" size="md" showTagline={false} />
        <a
          href="https://akbspoultry.com"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"
        >
          <ArrowLeft size={14} /> Back to website
        </a>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 max-w-7xl w-full mx-auto p-5 sm:p-10 gap-8 lg:gap-16 items-center">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b3824] text-white p-7 sm:p-10 min-h-[280px] lg:min-h-[600px] flex flex-col justify-between">
          <img
            src={farmImage}
            alt="AKBS poultry farming"
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#082e20] via-[#082e20]/60 to-[#082e20]/20" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-2 text-xs text-emerald-100">
              {partner ? <Handshake size={16} /> : <Sprout size={16} />}
              AKBS {title} Portal
            </div>
            <h1 className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              {partner ? (
                <>Build stronger<br />partnerships.</>
              ) : (
                <>Your poultry project.<br />A better beginning.</>
              )}
            </h1>
            <p className="mt-5 text-sm sm:text-base text-emerald-50/80 max-w-sm leading-relaxed">
              {partner
                ? 'Verify your email first, then manage your partnership application securely.'
                : 'Verify your email first, then apply online and track your poultry project securely.'}
            </p>
          </div>

          <div className="relative mt-9 space-y-3 text-sm text-emerald-50">
            {[
              'Email OTP verification required',
              'Applications sent directly to AKBS',
              'Secure access to your own records'
            ].map((x) => (
              <p className="flex gap-3 items-center" key={x}>
                <CheckCircle2 size={17} className="text-emerald-300" />
                {x}
              </p>
            ))}
          </div>
        </section>

        <section className="w-full max-w-md mx-auto py-3 sm:py-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 grid place-items-center text-emerald-800">
            {enroll ? <ShieldCheck size={22} /> : <LockKeyhole size={22} />}
          </div>

          <p className="mt-6 text-xs font-bold tracking-widest text-emerald-700 uppercase">
            {title} secure access
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            {enroll
              ? `Complete ${title.toLowerCase()} signup`
              : otpSent
                ? 'Verify your email'
                : mode === 'signup'
                  ? 'Create your account'
                  : 'Welcome back'}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {enroll
              ? 'Your email is verified. Complete your profile to enter the portal.'
              : otpSent
                ? `Enter the 6-digit OTP sent to ${email}.`
                : 'A valid email OTP is required before the application portal can open.'}
          </p>

          {!enroll && !otpSent && (
            <div className="flex bg-slate-100 p-1 rounded-xl mt-6">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode('login');
                  setError('');
                  setNotice('');
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode === 'login' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-500'}`}
              >
                Existing {title}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setNotice('');
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${mode === 'signup' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-500'}`}
              >
                New {title}
              </button>
            </div>
          )}

          {enroll ? (
            <form onSubmit={enrollPortal} className="space-y-4 mt-6">
              <label className="block text-sm font-medium">
                Verified email
                <input
                  readOnly
                  value={email}
                  className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
                />
              </label>

              <label className="block text-sm font-medium">
                Full name
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="Your full name"
                />
              </label>

              <label className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 accent-emerald-800"
                />
                I agree to create an AKBS {kind} account and allow AKBS to use my details to manage my applications.
              </label>

              {error && <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}

              <button
                disabled={busy}
                type="submit"
                className="w-full bg-[#0b3824] hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                {busy ? 'Please wait…' : 'Complete signup & continue'}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : !otpSent ? (
            <form onSubmit={sendOtp} className="space-y-4 mt-6">
              <label className="block text-sm font-medium">
                Email address
                <div className="relative mt-2">
                  <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="you@example.com"
                  />
                </div>
              </label>

              {error && <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
              {notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">{notice}</p>}

              <button
                disabled={busy}
                type="submit"
                className="w-full bg-[#0b3824] hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                {busy ? 'Sending OTP…' : 'Send email OTP'}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4 mt-6">
              <label className="block text-sm font-medium">
                6-digit OTP
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-xl tracking-[0.4em] font-mono outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="••••••"
                />
              </label>

              {error && <p role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm">{error}</p>}
              {notice && <p role="status" className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-sm">{notice}</p>}

              <button
                disabled={busy || otp.length !== 6}
                type="submit"
                className="w-full bg-[#0b3824] hover:bg-emerald-900 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
              >
                {busy ? 'Verifying…' : 'Verify OTP & continue'}
                <ArrowRight size={17} />
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setError('');
                    setNotice('');
                  }}
                  className="text-slate-600 font-medium"
                >
                  Change email
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sendOtp()}
                  className="text-emerald-800 font-semibold"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 pt-6 border-t border-slate-200 flex gap-2 justify-center text-xs text-slate-500">
            <ShieldCheck size={15} />
            Portal pages remain locked until email OTP verification succeeds.
          </p>

          <p className="mt-5 text-center text-xs text-slate-500">
            Looking for the {partner ? 'customer' : 'partner'} portal?{' '}
            <a
              className="font-semibold text-emerald-800"
              href={partner ? '/customer-registration' : '/partner-registration'}
            >
              Open portal
            </a>
          </p>
        </section>
      </main>

      <footer className="text-center text-xs text-slate-400 py-5">
        AKBS Poultry Farming · Secure verified access
      </footer>
    </div>
  );
}
