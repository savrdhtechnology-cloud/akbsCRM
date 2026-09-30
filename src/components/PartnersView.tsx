import { IncompleteApplications } from './IncompleteApplications';
import { secureRequest } from '../lib/secureRequest';
import { csvCell } from '../lib/escapeHtml';
import React, { useMemo, useState } from 'react';
import { Search, Plus, Users, Handshake, Hourglass, PauseCircle, Coins, Eye, Pencil, MoreVertical, Download, Upload, Filter, X, Phone, Mail, MapPin, CheckCircle2, ShieldCheck, KeyRound, UserCheck, UserX, Trash2 } from 'lucide-react';
import { Partner } from '../types';
import { useCrm } from '../lib/crm';

interface PartnersViewProps { partners: Partner[]; onOpenAddPartner: () => void; }

const databaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ldffgetuzoeupuhoaubn.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';
const normalizedStatus = (status: string) => status === 'Pending' ? 'Pending Review' : status;
const statusTone = (status: string) => normalizedStatus(status) === 'Active' ? 'bg-emerald-100 text-emerald-700' : normalizedStatus(status) === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';

export const PartnersView: React.FC<PartnersViewProps> = ({ partners, onOpenAddPartner }) => {
  const crm = useCrm();
  const [removeTarget,setRemoveTarget]=useState<Partner|null>(null);
  const [removeError,setRemoveError]=useState('');
  const [removeNotice,setRemoveNotice]=useState('');
  const [removedIds,setRemovedIds]=useState<string[]>([]);
  partners=partners.filter(p=>!removedIds.includes(p.id));
  const [incomplete,setIncomplete]=useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [loginId, setLoginId] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const filtered = useMemo(() => partners.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [p.name,p.contactPerson,p.location,p.phone,p.email].some(v => String(v || '').toLowerCase().includes(q));
    return matchesSearch && (category === 'All' || p.category === category) && (status === 'All' || normalizedStatus(p.status) === status);
  }), [partners, search, category, status]);

  const active = partners.filter(p => normalizedStatus(p.status) === 'Active').length;
  const pending = partners.filter(p => normalizedStatus(p.status) === 'Pending Review').length;
  const inactive = Math.max(0, partners.length - active - pending);

  const openPartner = (p: Partner) => {
    setSelectedPartner(p);
    setLoginId(String((p as any).loginId || p.email || '').toLowerCase());
    setTemporaryPassword('');
    setCommissionRate(String(p.commissionRate ?? ''));
    setMessage('');
  };

  const exportCsv = () => {
    const rows = [['Partner Name','Contact Person','Category','Location','Phone','Email','Commission','Status'], ...filtered.map(p => [p.name,p.contactPerson,p.category,p.location,p.phone,p.email,p.commissionRate,normalizedStatus(p.status)])];
    const csv = rows.map(r => r.map(v => csvCell(v)).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href=url; a.download='akbs-partners.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const partnerAccess = async (nextStatus: 'ACTIVE'|'INACTIVE'|'REJECTED') => {
    if (!selectedPartner) return;
    const portalUserId = String((selectedPartner as any).portalUserId || '');
    if (!portalUserId) { setMessage('This partner does not have a linked portal account.'); return; }
    if (nextStatus === 'ACTIVE' && (!loginId.trim() || temporaryPassword.length < 12)) {
      setMessage('Enter a Login ID and temporary password of at least 12 characters.'); return;
    }
    setBusy(true); setMessage('');
    try {
      const payload: Record<string, any> = { id: portalUserId, status: nextStatus, login: loginId.trim().toLowerCase() };
      if (temporaryPassword) payload.password = temporaryPassword;
      await secureRequest('akbs_crm_partner_access',{p_action:'update_access',p_data:payload});
      const record = crm.records.find(r => r.id === selectedPartner.id);
      if (!record) throw new Error('Partner CRM record was not found.');
      const crmStatus = nextStatus === 'ACTIVE' ? 'Active' : nextStatus === 'REJECTED' ? 'Rejected' : 'Inactive';
      await crm.command('record_save', { id:record.id, version:record.version, kind:'partner', data:{ ...record.data, status:crmStatus, commissionRate:Number(commissionRate || 0), loginId:loginId.trim().toLowerCase(), portalUserId } });
      setMessage(nextStatus === 'ACTIVE' ? 'Partner approved. Login access is active and a password change will be required on first login.' : `Partner status changed to ${crmStatus}.`);
      setTemporaryPassword('');
      await crm.refresh();
    } catch (e:any) { setMessage(e.message || 'Unable to update partner.'); }
    finally { setBusy(false); }
  };

  const savePartnerSettings = async () => {
    if (!selectedPartner) return;
    const record = crm.records.find(r => r.id === selectedPartner.id);
    if (!record) { setMessage('Partner CRM record was not found.'); return; }
    setBusy(true); setMessage('');
    try {
      await crm.command('record_save', { id:record.id, version:record.version, kind:'partner', data:{ ...record.data, commissionRate:Number(commissionRate || 0), loginId:loginId.trim().toLowerCase() } });
      setMessage('Partner settings saved.'); await crm.refresh();
    } catch(e:any) { setMessage(e.message || 'Unable to save partner settings.'); }
    finally { setBusy(false); }
  };

  const removePartner=async()=>{
    if(!removeTarget)return;
    const record=crm.records.find(r=>r.id===removeTarget.id);
    if(!record){setRemoveError('Partner record not found. Refresh and try again.');return;}
    setBusy(true);setRemoveError('');
    try{
      await secureRequest('akbs_crm_partner_remove',{p_id:record.id,p_version:record.version});
      setRemovedIds(ids=>[...ids,record.id]);setSelectedPartner(null);setRemoveTarget(null);
      setRemoveNotice('Partner removed. Historical records are retained.');
      await crm.refresh();
    }catch(e:any){setRemoveError(e.message||'Unable to remove partner.');}finally{setBusy(false);}
  };

  const cards = [
    {label:'Total Partners',value:partners.length,icon:Users,tone:'bg-emerald-50 text-emerald-700'},
    {label:'Active Partners',value:active,icon:Handshake,tone:'bg-blue-50 text-blue-700'},
    {label:'Pending Approval',value:pending,icon:Hourglass,tone:'bg-amber-50 text-amber-700'},
    {label:'Inactive Partners',value:inactive,icon:PauseCircle,tone:'bg-rose-50 text-rose-700'},
    {label:'Partner Records',value:partners.length,icon:Coins,tone:'bg-violet-50 text-violet-700'}
  ];

  if(incomplete && crm.user.role==='ADMIN') return <IncompleteApplications kind="partner" onBack={()=>setIncomplete(false)} onCompleted={()=>void crm.refresh()}/>;
  return <div className="p-4 lg:p-6 space-y-4 max-w-[1700px] mx-auto bg-slate-50/40 min-h-full">
      {crm.user.role==='ADMIN'&&<button onClick={()=>setIncomplete(true)} className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900">Incomplete Registrations →</button>}

    {removeNotice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{removeNotice}</p>}
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div><h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Strategic Business Partners</h1><p className="text-sm text-slate-500">Approve partner applications, configure margins and manage secure partner access.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2"><Download className="w-4 h-4"/>Export</button><button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2"><Upload className="w-4 h-4"/>Import</button><button onClick={onOpenAddPartner} className="px-4 py-2 bg-[#063d28] text-white rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Add New Partner</button></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{cards.map(({label,value,icon:Icon,tone}) => <div key={label} className={`rounded-xl border border-slate-200 p-4 ${tone}`}><div className="flex items-center gap-3"><div className="bg-white/70 rounded-full p-2.5"><Icon className="w-5 h-5"/></div><div><div className="text-xs font-medium opacity-80">{label}</div><div className="text-2xl font-bold">{value}</div></div></div></div>)}</div>
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col xl:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partner, contact person, city, phone..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"/></div><select value={category} onChange={e=>setCategory(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg"><option value="All">All Categories</option>{Array.from(new Set(partners.map(p=>p.category))).map(v=><option key={v}>{v}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg"><option value="All">All Status</option><option>Active</option><option>Pending Review</option><option>Inactive</option><option>Rejected</option></select><button onClick={()=>{setSearch('');setCategory('All');setStatus('All')}} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><X className="w-4 h-4"/>Reset</button><button className="px-4 py-2 bg-[#063d28] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><Filter className="w-4 h-4"/>Filter</button></div>
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50 text-slate-600 text-xs"><tr><th className="p-3 text-left">Partner Name</th><th className="p-3 text-left">Contact Person</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Location</th><th className="p-3 text-left">Referrals</th><th className="p-3 text-left">Converted</th><th className="p-3 text-left">Commission</th><th className="p-3 text-left">Status</th><th className="p-3 text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(p=><tr key={p.id} className="hover:bg-slate-50/70"><td className="p-3 font-bold text-slate-900">{p.name}</td><td className="p-3"><div className="font-medium">{p.contactPerson}</div><div className="text-xs text-slate-400">{p.phone}</div></td><td className="p-3"><span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">{p.category}</span></td><td className="p-3 text-slate-600">{p.location}</td><td className="p-3">—</td><td className="p-3">—</td><td className="p-3 font-bold">{p.commissionRate || '—'}</td><td className="p-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${statusTone(p.status)}`}>{normalizedStatus(p.status)}</span></td><td className="p-3"><div className="flex justify-center gap-1"><button onClick={()=>openPartner(p)} className="p-2 border rounded-lg" title="View"><Eye className="w-4 h-4"/></button><button onClick={()=>openPartner(p)} className="p-2 border rounded-lg" title="Manage"><Pencil className="w-4 h-4"/></button><button onClick={()=>openPartner(p)} className="p-2 border rounded-lg" title="More"><MoreVertical className="w-4 h-4"/></button>{crm.user.role==='ADMIN'&&<button onClick={()=>{setRemoveError('');setRemoveTarget(p);}} disabled={busy} className="p-2 border border-rose-200 text-rose-700 rounded-lg inline-flex items-center gap-1" title="Delete / Remove partner"><Trash2 className="w-4 h-4"/>Remove</button>}</div></td></tr>)}</tbody></table></div><div className="px-4 py-3 border-t text-xs text-slate-500">Showing {filtered.length} of {partners.length} partners</div></div>
    {removeTarget&&<div role="dialog" aria-modal="true" aria-label="Remove partner" className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"><div className="bg-white text-slate-900 rounded-2xl p-6 max-w-md space-y-4"><h2 className="text-xl font-bold">Delete / Remove partner?</h2><p><b>{removeTarget.name}</b><br/>{removeTarget.contactPerson} · {removeTarget.phone}</p><p className="text-sm text-slate-600">This partner will be removed from the list. Historical leads, payments and commissions will be retained. Linked portal access will be disabled unless another partner record uses the same account.</p>{removeError&&<p role="alert" className="text-rose-700">{removeError}</p>}<div className="flex justify-end gap-3"><button disabled={busy} onClick={()=>setRemoveTarget(null)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={busy} onClick={()=>void removePartner()} className="rounded-lg bg-rose-700 text-white px-4 py-2">{busy?'Removing…':'Confirm Remove'}</button></div></div></div>}
    {selectedPartner && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setSelectedPartner(null)}><div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}><div className="p-5 border-b flex justify-between"><div><div className="text-xs text-emerald-700 font-bold">PARTNER APPROVAL & ACCESS</div><h2 className="text-xl font-bold">{selectedPartner.name}</h2></div><button onClick={()=>setSelectedPartner(null)}><X/></button></div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-400">Contact Person</div><b>{selectedPartner.contactPerson}</b></div><div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-400">Current Status</div><b>{normalizedStatus(selectedPartner.status)}</b></div><div className="p-3 bg-slate-50 rounded-xl flex gap-2 items-center"><Phone className="w-4 h-4"/>{selectedPartner.phone}</div><div className="p-3 bg-slate-50 rounded-xl flex gap-2 items-center"><Mail className="w-4 h-4"/><span className="break-all">{selectedPartner.email}</span></div><div className="p-3 bg-slate-50 rounded-xl sm:col-span-2 flex gap-2 items-center"><MapPin className="w-4 h-4"/>{selectedPartner.location}</div></div>
      <div className="px-5 pb-5"><div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4"><div className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="w-5 h-5 text-emerald-700"/>Approval, Margin & Login Access</div><div className="grid sm:grid-cols-2 gap-3 mt-4"><label className="text-xs font-semibold text-slate-600">Login ID / Email<input value={loginId} onChange={e=>setLoginId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="partner@example.com"/></label><label className="text-xs font-semibold text-slate-600">Commission / Margin %<input type="number" min="0" max="100" step="0.01" value={commissionRate} onChange={e=>setCommissionRate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="e.g. 5"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Temporary Password<input type="password" value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Minimum 12 characters"/><span className="mt-1 block font-normal text-slate-400">Password is stored only as a secure hash. Partner must change it after first login.</span></label></div>{message && <div className="mt-3 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700">{message}</div>}<div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={savePartnerSettings} className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4"/>Save Settings</button><button disabled={busy} onClick={()=>partnerAccess('ACTIVE')} className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold flex items-center gap-2"><UserCheck className="w-4 h-4"/>{busy?'Saving...':'Approve & Activate'}</button><button disabled={busy} onClick={()=>partnerAccess('INACTIVE')} className="px-4 py-2 rounded-lg bg-slate-700 text-white font-semibold">Deactivate</button><button disabled={busy} onClick={()=>partnerAccess('REJECTED')} className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-2"><UserX className="w-4 h-4"/>Reject</button></div></div></div>
      <div className="p-5 border-t flex flex-wrap justify-between gap-2"><div className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600"/>All approval changes are saved to the shared CRM database.</div><div className="flex gap-2"><a href={`tel:${selectedPartner.phone}`} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold">Call</a><a href={`mailto:${selectedPartner.email}`} className="px-3 py-2 bg-[#063d28] text-white rounded-lg text-sm font-semibold">Email</a></div></div></div></div>}
  </div>;
};
