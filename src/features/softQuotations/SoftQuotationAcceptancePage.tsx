import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, ShieldCheck } from 'lucide-react';
import { loadSoftQuotations, persistSoftQuotations } from './store';
import { SoftQuotation } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ldffgetuzoeupuhoaubn.supabase.co';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';

const rpc = async (name: string, body: Record<string, unknown>) => {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('This acceptance link is not available on this device yet.');
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Unable to process quotation request.');
  return res.json();
};

export const SoftQuotationAcceptancePage: React.FC = () => {
  const token = window.location.pathname.split('/').filter(Boolean)[2] || '';
  const [localQuote, setLocalQuote] = useState<SoftQuotation | null>(null);
  const [remote, setRemote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    const quotes = loadSoftQuotations();
    const quote = quotes.find(q => q.acceptanceToken === token) || null;
    if (quote) {
      setLocalQuote(quote);
      setName(quote.customer.customerName);
      setEmail(quote.customer.email);
      setMobile(quote.customer.mobile);
      setAccepted(quote.status === 'ACCEPTED');
      setLoading(false);
      return;
    }

    rpc('get_soft_quotation_for_acceptance', { p_token: token })
      .then(data => {
        if (data?.error) throw new Error(data.error);
        setRemote(data);
        setName(data?.customer?.customerName || data?.customer?.customer_name || '');
        setEmail(data?.customer?.email || '');
        setMobile(data?.customer?.mobile || '');
      })
      .catch(err => setError(err.message || 'Quotation link is invalid or unavailable.'))
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async () => {
    setError('');
    if (name.trim().length < 2 || signature.trim().length < 2) {
      setError('Customer name and typed signature are required.');
      return;
    }

    if (localQuote) {
      const quotes = loadSoftQuotations();
      const now = new Date().toISOString();
      const next = quotes.map(q => q.id === localQuote.id ? {
        ...q,
        status: 'ACCEPTED' as const,
        acceptedAt: now,
        acceptance: {
          customerName: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          typedSignature: signature.trim(),
          acceptedAt: now,
          acceptanceVersion: q.version
        }
      } : q);
      persistSoftQuotations(next);
      setAccepted(true);
      return;
    }

    try {
      const data = await rpc('accept_soft_quotation', {
        p_token: token,
        p_customer_name: name.trim(),
        p_customer_email: email.trim() || null,
        p_customer_mobile: mobile.trim() || null,
        p_typed_signature: signature.trim()
      });
      if (data?.error) throw new Error(data.error);
      setAccepted(true);
    } catch (err: any) {
      setError(err.message || 'Could not record acceptance.');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 grid place-items-center text-slate-500">Loading quotation…</div>;

  const quote = localQuote;
  const quotationNo = quote?.quotationNo || remote?.quotation_no || 'Soft Quotation';
  const projectName = quote?.projectName || remote?.project_name || '';
  const capacity = quote ? `${quote.projectCapacity.toLocaleString('en-IN')} ${quote.projectUnit}` : remote ? `${Number(remote.capacity || 0).toLocaleString('en-IN')} ${remote.project_unit || 'Birds'}` : '';
  const amount = quote?.grandTotal ?? remote?.grand_total ?? remote?.estimated_project_cost ?? 0;
  const version = quote?.version || remote?.version || 1;

  return (
    <div className="min-h-screen bg-[#f3f6f4] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#073323] text-white rounded-t-3xl p-6 sm:p-8">
          <div className="text-xs uppercase tracking-[.18em] text-emerald-200 font-black">AKBS Poultry Farming Private Limited</div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black">Soft Quotation Acceptance</h1>
          <div className="mt-2 font-mono text-sm text-emerald-100">{quotationNo} · Version {version}</div>
        </div>

        <div className="bg-white rounded-b-3xl border border-t-0 p-6 sm:p-8 shadow-xl">
          {error && <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm font-semibold text-rose-700">{error}</div>}

          {accepted ? (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600"/>
              <h2 className="mt-5 text-2xl font-black text-slate-900">Quotation Accepted</h2>
              <p className="mt-2 text-slate-500">Your acceptance has been recorded for Version {version}. AKBS will contact you for the next project/deal workflow.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 border p-4"><div className="text-xs text-slate-400">Project</div><div className="mt-1 font-black">{projectName}</div></div>
                <div className="rounded-xl bg-slate-50 border p-4"><div className="text-xs text-slate-400">Capacity</div><div className="mt-1 font-black">{capacity}</div></div>
                <div className="rounded-xl bg-slate-50 border p-4 sm:col-span-2"><div className="text-xs text-slate-400">Estimated Project Cost</div><div className="mt-1 text-xl font-black text-emerald-900">₹ {Number(amount).toLocaleString('en-IN')}</div><div className="mt-1 text-[10px] uppercase font-bold tracking-[.1em] text-amber-700">Preliminary estimate — not final price</div></div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-600">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0"/>
                <p>Acceptance applies only to the quotation number and version shown above. It does not overwrite any previous issued version and does not convert this preliminary estimate into a final commercial contract.</p>
              </div>

              <div className="mt-7 space-y-4">
                <Field label="Customer Name" value={name} onChange={setName}/>
                <Field label="Email" value={email} onChange={setEmail}/>
                <Field label="Mobile" value={mobile} onChange={setMobile}/>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600">Typed Signature / Full Name *</span>
                  <div className="mt-1 relative">
                    <FileSignature className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                    <input value={signature} onChange={e=>setSignature(e.target.value)} placeholder="Type your full name as signature" className="w-full h-12 pl-11 pr-3 border border-slate-300 rounded-xl font-display text-lg italic"/>
                  </div>
                </label>
                <button onClick={accept} className="w-full h-12 rounded-xl bg-[#073323] hover:bg-[#0b4b35] text-white font-black">Accept Quotation</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Field:React.FC<{label:string;value:string;onChange:(v:string)=>void}> = ({label,value,onChange}) => (
  <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><input value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full h-11 px-3 border border-slate-300 rounded-xl"/></label>
);
