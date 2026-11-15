import React, { useMemo, useState } from 'react';
import { ArrowRight, BadgeIndianRupee, CheckCircle2, Clock3, Copy, FileText, Handshake, LayoutDashboard, Link2, LogOut, Plus, RefreshCw, Users } from 'lucide-react';
import { AkbsLogo } from './AkbsLogo';
import { PortalAccess, usePortal } from './PortalAccess';

export const PartnerBusinessPortal: React.FC = () => (
  <PortalAccess kind="partner"><PartnerDashboard /></PortalAccess>
);

type Tab = 'dashboard' | 'referrals' | 'commission' | 'documents';

const PartnerDashboard: React.FC = () => {
  const portal = usePortal();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const application = portal.applications[0];
  const appId = application?.appId || 'AKBS-PARTNER';
  const approved = ['APPROVED','ACTIVE','ACTIVATED'].includes(String(application?.status || '').toUpperCase());
  const referralCode = useMemo(() => `AKBS-${appId.split('-').pop() || 'PARTNER'}`, [appId]);
  const referralUrl = `https://akbspoultry.com/apply?ref=${encodeURIComponent(referralCode)}`;

  const copyReferral = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };
  const refresh = async () => { setBusy(true); setNotice(''); try { await portal.refresh(); setNotice('Partner account refreshed.'); } catch(e:any) { setNotice(e.message || 'Unable to refresh.'); } finally { setBusy(false); } };

  if (!application) {
    return <div className="min-h-screen bg-[#eef3f0] flex items-center justify-center p-6"><div className="max-w-lg bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm"><Handshake className="w-12 h-12 mx-auto text-emerald-800"/><h1 className="mt-4 text-xl font-extrabold">Complete partner registration first</h1><p className="mt-2 text-sm text-slate-500">Your Partner Dashboard becomes available after a partnership application is submitted.</p><a href="/partner-registration" className="inline-flex mt-5 items-center gap-2 rounded-xl bg-[#0b3824] text-white px-5 py-3 text-sm font-bold">Open Registration <ArrowRight className="w-4 h-4"/></a></div></div>;
  }

  const cards = [
    { label:'Application', value: appId, note:String(application.status || 'UNDER REVIEW').replaceAll('_',' '), icon:FileText },
    { label:'My Referrals', value:'0', note:'CRM-linked referrals', icon:Users },
    { label:'Converted Customers', value:'0', note:'Approved conversions', icon:CheckCircle2 },
    { label:'Commission', value:'₹0', note:'Admin-approved earnings', icon:BadgeIndianRupee }
  ];

  return <div className="min-h-screen bg-[#eef3f0] text-slate-800">
    <header className="bg-[#082719] text-white border-b border-emerald-900 sticky top-0 z-20"><div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between"><div className="bg-white rounded-xl px-3 py-2"><AkbsLogo theme="light" size="md" showTagline={false}/></div><div className="flex items-center gap-3"><div className="hidden sm:block text-right"><div className="text-[10px] uppercase tracking-[.16em] text-emerald-300 font-bold">Partner Portal</div><div className="text-sm font-bold">{portal.profile.name || 'AKBS Partner'}</div></div><button onClick={()=>portal.signOut()} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15" title="Sign out"><LogOut className="w-4 h-4"/></button></div></div></header>
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[250px_minmax(0,1fr)] gap-5">
      <aside className="bg-white border border-slate-200 rounded-2xl p-3 h-fit lg:sticky lg:top-24"><div className="p-3 border-b border-slate-100 mb-2"><div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Partner ID</div><div className="text-sm font-extrabold mt-1">{appId}</div><span className={`inline-flex mt-2 rounded-full px-2 py-1 text-[10px] font-bold ${approved?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{approved?'ACTIVE':String(application.status || 'UNDER REVIEW').replaceAll('_',' ')}</span></div>{([['dashboard','Dashboard',LayoutDashboard],['referrals','My Referrals',Users],['commission','Commission & Payments',BadgeIndianRupee],['documents','Agreement & Documents',FileText]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold mb-1 ${tab===id?'bg-[#0b3824] text-white':'text-slate-600 hover:bg-slate-50'}`}><Icon className="w-4 h-4"/>{label}</button>)}</aside>
      <section className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="text-[10px] uppercase tracking-[.14em] text-emerald-700 font-bold">AKBS Partnership Network</div><h1 className="mt-1 text-2xl font-extrabold">Welcome, {portal.profile.name || 'Partner'}</h1><p className="mt-1 text-xs text-slate-500">Track referrals, conversions and admin-approved commission from one account.</p></div><button onClick={refresh} disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"><RefreshCw className={`w-4 h-4 ${busy?'animate-spin':''}`}/>Refresh</button></div>
        {notice && <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">{notice}</div>}
        {tab==='dashboard' && <><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(({label,value,note,icon:Icon})=><div key={label} className="bg-white border border-slate-200 rounded-2xl p-4"><div className="flex justify-between"><span className="text-xs text-slate-500">{label}</span><Icon className="w-4 h-4 text-emerald-700"/></div><div className="mt-2 text-xl font-extrabold break-all">{value}</div><div className="mt-1 text-[11px] text-slate-400">{note}</div></div>)}</div><div className="grid xl:grid-cols-[1.2fr_.8fr] gap-4"><div className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex items-center gap-2"><Link2 className="w-4 h-4 text-emerald-700"/><h2 className="text-sm font-extrabold">Your Referral Link</h2></div><p className="mt-1 text-xs text-slate-500">Share this link with prospective poultry customers. The referral code stays associated with your partner account.</p><div className="mt-4 flex gap-2"><input readOnly value={referralUrl} className="min-w-0 flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs"/><button onClick={copyReferral} className="px-4 py-2.5 rounded-xl bg-[#0b3824] text-white text-xs font-bold flex items-center gap-2"><Copy className="w-4 h-4"/>{copied?'Copied':'Copy'}</button></div><div className="mt-3 text-[11px] text-slate-500">Referral code: <b className="text-slate-800">{referralCode}</b></div></div><div className="bg-white border border-slate-200 rounded-2xl p-5"><h2 className="text-sm font-extrabold">Account Activation</h2><div className="mt-4 flex items-start gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center ${approved?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{approved?<CheckCircle2 className="w-5 h-5"/>:<Clock3 className="w-5 h-5"/>}</div><div><div className="text-xs font-bold">{approved?'Partner account active':'AKBS review in progress'}</div><p className="text-[11px] text-slate-500 mt-1">KYC, territory, agreement, banking and commission terms are controlled by AKBS Admin.</p></div></div></div></div></>}
        {tab==='referrals' && <Empty title="No referrals submitted yet" text="New referrals linked to your partner ID will appear here with lead status and conversion progress." action="Add Referral"/>}
        {tab==='commission' && <div className="bg-white border border-slate-200 rounded-2xl p-6"><h2 className="text-base font-extrabold">Commission & Payments</h2><p className="text-xs text-slate-500 mt-1">Only commission approved by AKBS Admin will be shown here. Partners cannot edit rates or payment status.</p><div className="grid sm:grid-cols-3 gap-3 mt-5">{[['Earned','₹0'],['Pending Approval','₹0'],['Paid','₹0']].map(([a,b])=><div key={a} className="rounded-xl bg-slate-50 border border-slate-100 p-4"><div className="text-[11px] text-slate-500">{a}</div><div className="text-xl font-extrabold mt-1">{b}</div></div>)}</div></div>}
        {tab==='documents' && <Empty title="Agreement & KYC Documents" text="Approved agreement, KYC verification and banking documents will appear here when AKBS completes onboarding." action="Awaiting Admin Review"/>}
      </section>
    </main>
  </div>;
};

const Empty = ({title,text,action}:{title:string;text:string;action:string}) => <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center"><div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><Plus className="w-5 h-5"/></div><h2 className="mt-4 text-base font-extrabold">{title}</h2><p className="mt-2 max-w-lg mx-auto text-xs text-slate-500">{text}</p><div className="inline-flex mt-4 rounded-xl bg-slate-100 text-slate-600 px-4 py-2 text-xs font-bold">{action}</div></div>;
