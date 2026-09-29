import React, { useMemo, useState } from 'react';
import { Search, Plus, Users, Handshake, Hourglass, PauseCircle, Coins, Eye, Pencil, MoreVertical, Download, Upload, Filter, X, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { Partner } from '../types';

interface PartnersViewProps { partners: Partner[]; onOpenAddPartner: () => void; }

const statusTone = (status: string) => status === 'Active' ? 'bg-emerald-100 text-emerald-700' : status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';

export const PartnersView: React.FC<PartnersViewProps> = ({ partners, onOpenAddPartner }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const filtered = useMemo(() => partners.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [p.name,p.contactPerson,p.location,p.phone,p.email].some(v => String(v || '').toLowerCase().includes(q));
    return matchesSearch && (category === 'All' || p.category === category) && (status === 'All' || p.status === status);
  }), [partners, search, category, status]);

  const active = partners.filter(p => p.status === 'Active').length;
  const pending = partners.filter(p => p.status === 'Pending Review').length;
  const inactive = Math.max(0, partners.length - active - pending);

  const exportCsv = () => {
    const rows = [['Partner Name','Contact Person','Category','Location','Phone','Email','Commission','Status'], ...filtered.map(p => [p.name,p.contactPerson,p.category,p.location,p.phone,p.email,p.commissionRate,p.status])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href=url; a.download='akbs-partners.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const cards = [
    {label:'Total Partners',value:partners.length,icon:Users,tone:'bg-emerald-50 text-emerald-700'},
    {label:'Active Partners',value:active,icon:Handshake,tone:'bg-blue-50 text-blue-700'},
    {label:'Pending Approval',value:pending,icon:Hourglass,tone:'bg-amber-50 text-amber-700'},
    {label:'Inactive Partners',value:inactive,icon:PauseCircle,tone:'bg-rose-50 text-rose-700'},
    {label:'Partner Records',value:partners.length,icon:Coins,tone:'bg-violet-50 text-violet-700'}
  ];

  return <div className="p-4 lg:p-6 space-y-4 max-w-[1700px] mx-auto bg-slate-50/40 min-h-full">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div><h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Strategic Business Partners</h1><p className="text-sm text-slate-500">Equipment manufacturers, feed mills, hatcheries, banks and processing off-takers</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2"><Download className="w-4 h-4"/>Export</button><button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold flex items-center gap-2"><Upload className="w-4 h-4"/>Import</button><button onClick={onOpenAddPartner} className="px-4 py-2 bg-[#063d28] text-white rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Add New Partner</button></div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">{cards.map(({label,value,icon:Icon,tone}) => <div key={label} className={`rounded-xl border border-slate-200 p-4 ${tone}`}><div className="flex items-center gap-3"><div className="bg-white/70 rounded-full p-2.5"><Icon className="w-5 h-5"/></div><div><div className="text-xs font-medium opacity-80">{label}</div><div className="text-2xl font-bold">{value}</div></div></div></div>)}</div>

    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col xl:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partner, contact person, city, phone..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-600"/></div><select value={category} onChange={e=>setCategory(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg"><option value="All">All Categories</option>{Array.from(new Set(partners.map(p=>p.category))).map(v=><option key={v}>{v}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg"><option value="All">All Status</option><option>Active</option><option>Pending Review</option><option>Under Agreement</option></select><button onClick={()=>{setSearch('');setCategory('All');setStatus('All')}} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><X className="w-4 h-4"/>Reset</button><button className="px-4 py-2 bg-[#063d28] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><Filter className="w-4 h-4"/>Filter</button></div>

    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-slate-50 text-slate-600 text-xs"><tr><th className="p-3 text-left">Partner Name</th><th className="p-3 text-left">Contact Person</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Location</th><th className="p-3 text-left">Referrals</th><th className="p-3 text-left">Converted</th><th className="p-3 text-left">Commission</th><th className="p-3 text-left">Status</th><th className="p-3 text-center">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(p=><tr key={p.id} className="hover:bg-slate-50/70"><td className="p-3 font-bold text-slate-900">{p.name}</td><td className="p-3"><div className="font-medium">{p.contactPerson}</div><div className="text-xs text-slate-400">{p.phone}</div></td><td className="p-3"><span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">{p.category}</span></td><td className="p-3 text-slate-600">{p.location}</td><td className="p-3">—</td><td className="p-3">—</td><td className="p-3 font-bold">{p.commissionRate || '—'}</td><td className="p-3"><span className={`px-2 py-1 rounded-md text-xs font-bold ${statusTone(p.status)}`}>{p.status}</span></td><td className="p-3"><div className="flex justify-center gap-1"><button onClick={()=>setSelectedPartner(p)} className="p-2 border rounded-lg" title="View"><Eye className="w-4 h-4"/></button><button onClick={()=>setSelectedPartner(p)} className="p-2 border rounded-lg" title="Manage"><Pencil className="w-4 h-4"/></button><button onClick={()=>setSelectedPartner(p)} className="p-2 border rounded-lg" title="More"><MoreVertical className="w-4 h-4"/></button></div></td></tr>)}{!filtered.length && <tr><td colSpan={9} className="p-10 text-center text-slate-400">No partners found.</td></tr>}</tbody></table></div><div className="px-4 py-3 border-t text-xs text-slate-500">Showing {filtered.length} of {partners.length} partners</div></div>

    {selectedPartner && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setSelectedPartner(null)}><div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl" onClick={e=>e.stopPropagation()}><div className="p-5 border-b flex justify-between"><div><div className="text-xs text-emerald-700 font-bold">PARTNER MANAGEMENT</div><h2 className="text-xl font-bold">{selectedPartner.name}</h2></div><button onClick={()=>setSelectedPartner(null)}><X/></button></div><div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-400">Contact Person</div><b>{selectedPartner.contactPerson}</b></div><div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-400">Status</div><b>{selectedPartner.status}</b></div><div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-400">Category</div><b>{selectedPartner.category}</b></div><div className="p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-400">Commission</div><b>{selectedPartner.commissionRate || 'Not configured'}</b></div><div className="p-3 bg-slate-50 rounded-xl flex gap-2 items-center"><Phone className="w-4 h-4"/>{selectedPartner.phone}</div><div className="p-3 bg-slate-50 rounded-xl flex gap-2 items-center"><Mail className="w-4 h-4"/><span className="break-all">{selectedPartner.email}</span></div><div className="p-3 bg-slate-50 rounded-xl sm:col-span-2 flex gap-2 items-center"><MapPin className="w-4 h-4"/>{selectedPartner.location}</div></div><div className="p-5 border-t flex flex-wrap justify-between gap-2"><div className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-600"/>Partner management record</div><div className="flex gap-2"><a href={`tel:${selectedPartner.phone}`} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold">Call</a><a href={`mailto:${selectedPartner.email}`} className="px-3 py-2 bg-[#063d28] text-white rounded-lg text-sm font-semibold">Email</a></div></div></div></div>}
  </div>;
};
