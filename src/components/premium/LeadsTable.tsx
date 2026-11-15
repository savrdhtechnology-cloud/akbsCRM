'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {
  Phone, MessageCircle, Mail, MapPin, MoreVertical, Search, List, LayoutGrid, Download, ChevronLeft, ChevronRight,
  Users, Star, RefreshCw, ClipboardX, UserPlus, CheckCircle2, Bell, CalendarPlus, Eye, Pencil, FileCheck2, X, ArrowUpDown,
} from 'lucide-react';
import {STAGES, label, money, type DashboardData, type Lead} from './domain';
import {
  LEAD_TABS, type LeadTab, matchesTab, tabCounts, leadStatus, registrationComplete, ownerOf, shortDate, shortTime,
  telHref, waHref, lastActivity, downloadCsv,
} from './metrics';
import {Avatar, StatusPill, EmptyState} from './Blocks';

const TAB_ICON = {All: Users, New: Star, 'In Process': RefreshCw, Incomplete: ClipboardX, Unassigned: UserPlus, Converted: CheckCircle2} as const;
const TAB_LABEL: Record<LeadTab, string> = {All: 'All Leads', New: 'New', 'In Process': 'In Process', Incomplete: 'Incomplete', Unassigned: 'Unassigned', Converted: 'Converted'};
const stateOf = (l: Lead) => (l.location || '').split(',').map(s => s.trim()).filter(Boolean).pop() || '';

export type LeadActions = {
  onOpen: (l: Lead) => void;
  onEdit?: (l: Lead) => void;
  onAssign?: (l: Lead) => void;
  onDraft?: (l: Lead) => void;
  onRegistrationReminder?: (l: Lead) => Promise<void>;
  onFollowup?: (l: Lead) => void;
  onLogCall?: (l: Lead) => void;
  onBulkAssign?: (ids: string[], userId: string | null) => Promise<void>;
};

type Props = LeadActions & {
  data: DashboardData;
  leads: Lead[];
  title?: string;
  subtitle?: string;
  tab: LeadTab;
  onTab: (t: LeadTab) => void;
  defaultSize?: number;
  query?: string;
};

function registrationLink() {
  return typeof window === 'undefined' ? '/customer-registration' : `${window.location.origin}/customer-registration`;
}

function reminderText(l: Lead) {
  return `Namaste ${l.name}, AKBS Poultry Farming se. Aapka poultry project registration abhi complete nahi hua hai. Kripya yahan registration complete karein: ${registrationLink()} — Sahayata ke liye call karein +91 9893345906.`;
}

export default function LeadsTable({data, leads, title = 'All Leads', subtitle = 'Complete and incomplete leads in one unified view', tab, onTab, defaultSize = 10, query = '', ...actions}: Props) {
  const [q, setQ] = useState(query);
  const [stage, setStage] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [state, setState] = useState('ALL');
  const [owner, setOwner] = useState('ALL');
  const [sort, setSort] = useState<'new' | 'old' | 'name' | 'value'>('new');
  const [view, setView] = useState<'list' | 'cards'>('list');
  const [size, setSize] = useState(defaultSize);
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{top: number; right: number}>({top: 0, right: 0});
  const [bulkOwner, setBulkOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(query); setPage(1); }, [query]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    const onScroll = () => setMenu(null);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc); window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', onScroll, true); };
  }, [menu]);

  const counts = useMemo(() => tabCounts(leads), [leads]);
  const sources = useMemo(() => [...new Set(leads.map(l => l.source).filter(Boolean))].sort(), [leads]);
  const states = useMemo(() => [...new Set(leads.map(stateOf).filter(Boolean))].sort(), [leads]);
  const staff = data.users.filter(u => u.active && ['EMPLOYEE', 'MANAGER'].includes(u.role));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = leads.filter(l =>
      matchesTab(l, tab) &&
      (stage === 'ALL' || l.stage === stage) &&
      (source === 'ALL' || l.source === source) &&
      (state === 'ALL' || stateOf(l) === state) &&
      (owner === 'ALL' || (owner === 'NONE' ? !l.assigned_to : l.assigned_to === owner)) &&
      (!needle || `${l.name} ${l.phone} ${l.email} ${l.location} ${l.reference} ${l.project_type}`.toLowerCase().includes(needle)));
    const by = {
      new: (a: Lead, b: Lead) => +new Date(b.created_at) - +new Date(a.created_at),
      old: (a: Lead, b: Lead) => +new Date(a.created_at) - +new Date(b.created_at),
      name: (a: Lead, b: Lead) => a.name.localeCompare(b.name),
      value: (a: Lead, b: Lead) => Number(b.project_cost || 0) - Number(a.project_cost || 0),
    }[sort];
    return rows.sort(by);
  }, [leads, tab, stage, source, state, owner, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * size, cur * size);
  const selectable = rows.filter(l=>!l.draftOnly);
  const allPicked = selectable.length > 0 && selectable.every(l => picked.has(l.id));
  const reset = () => setPage(1);

  const toggle = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setPicked(p => { const n = new Set(p); if (allPicked) selectable.forEach(l => n.delete(l.id)); else selectable.forEach(l => n.add(l.id)); return n; });

  const exportRows = (list: Lead[]) => downloadCsv(`akbs-leads-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Reference', 'Name', 'Phone', 'Email', 'Location', 'Project type', 'Bird capacity', 'Budget (INR)', 'Source', 'Lead status', 'Registration', 'Stage', 'Owner', 'Created'],
    list.map(l => [l.reference, l.name, l.phone, l.email, l.location, l.project_type, l.capacity || '', l.project_cost || '', label(l.source), leadStatus(l), registrationComplete(l) ? 'Complete' : 'Incomplete', label(l.stage), ownerOf(l, data.users)?.name || 'Unassigned', new Date(l.created_at).toLocaleString('en-IN')]));

  async function applyBulk() {
    if (!actions.onBulkAssign || !picked.size) return;
    setBusy(true);
    try { await actions.onBulkAssign([...picked].filter(id=>!id.startsWith('draft:')), bulkOwner || null); setPicked(new Set()); } finally { setBusy(false); }
  }

  const rowMenu = (l: Lead) => {
    const reg = registrationComplete(l);
    const items: [typeof Phone, string, () => void, boolean?][] = [
      ...(l.draft&&actions.onDraft ? [[FileCheck2,'Open & complete saved draft',()=>actions.onDraft!(l)]] as [typeof Phone,string,()=>void][] : []),
      [FileCheck2, reg ? 'Registration complete' : 'Complete Registration', () => window.open(`${waHref(l.phone)}?text=${encodeURIComponent(reminderText(l))}`, '_blank', 'noopener'), reg],
      ...(actions.onRegistrationReminder&&!l.draftOnly ? [[Bell,'Email registration reminder',()=>void actions.onRegistrationReminder!(l),reg]] as [typeof Phone,string,()=>void,boolean?][] : []),
      [Phone, 'Call Now', () => { window.location.href = telHref(l.phone); }],
      [MessageCircle, 'WhatsApp', () => window.open(waHref(l.phone), '_blank', 'noopener')],
      ...(l.email ? [[Mail, 'Send Email', () => { window.location.href = `mailto:${l.email}?subject=${encodeURIComponent('AKBS Poultry Farming – Your poultry project')}`; }]] as [typeof Phone, string, () => void][] : []),
      ...(actions.onAssign&&!l.draftOnly ? [[UserPlus, 'Assign Owner', () => actions.onAssign!(l)]] as [typeof Phone, string, () => void][] : []),
      ...(actions.onFollowup&&!l.draftOnly ? [[CalendarPlus, 'Schedule Follow-up', () => actions.onFollowup!(l)]] as [typeof Phone, string, () => void][] : []),
      [Eye, 'View Details', () => actions.onOpen(l)],
      ...(actions.onEdit&&!l.draftOnly ? [[Pencil, 'Edit Lead', () => actions.onEdit!(l)]] as [typeof Phone, string, () => void][] : []),
    ];
    const el = <div className="pc-menu" role="menu" ref={menuRef} style={{position: 'fixed', top: menuPos.top, right: menuPos.right}}>{items.map(([I, t, fn, disabled]) =>
      <button key={t} role="menuitem" disabled={disabled} onClick={() => { setMenu(null); fn(); }}><I size={16}/>{t}</button>)}</div>;
    const host = typeof document !== 'undefined' ? document.querySelector('.crm-portal') : null;
    return host ? createPortal(el, host) : el;
  };

  const ownerCell = (l: Lead) => {
    const o = ownerOf(l, data.users);
    return o ? <span className="pc-owner" title={o.name}><Avatar name={o.name} size={30}/><span>{o.name}</span></span> : <span className="pc-owner none"><span className="pc-avatar ghost">—</span><span>Unassigned</span></span>;
  };

  const actionsCell = (l: Lead) => l.draftOnly ? <button type="button" className="pc-btn gold" onClick={e=>{e.stopPropagation();actions.onOpen(l);}}>Open & Complete</button> : <div className="pc-row-actions" onClick={e => e.stopPropagation()}>
    {l.draft&&actions.onDraft&&<button className="pc-complete" onClick={()=>actions.onDraft!(l)} title="Continue saved registration"><FileCheck2 size={15}/><span>Saved<br/>Draft</span></button>}
    {!l.draft&&!registrationComplete(l) && !!l.phone && l.stage !== 'CONVERTED' && l.stage !== 'LOST' && <a className="pc-complete" href={`${waHref(l.phone)}?text=${encodeURIComponent(reminderText(l))}`} target="_blank" rel="noreferrer" title="Send registration link"><FileCheck2 size={15}/><span>Send<br/>Registration Link</span></a>}
    <a className="pc-icon-btn green" href={telHref(l.phone)} aria-label={`Call ${l.name}`}><Phone size={15}/></a>
    <a className="pc-icon-btn green" href={waHref(l.phone)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${l.name}`}><MessageCircle size={15}/></a>
    <span className="pc-menu-anchor"><button className={`pc-icon-btn ${menu === l.id ? 'gold' : ''}`} aria-haspopup="menu" aria-expanded={menu === l.id} aria-label="More actions" onMouseDown={e => e.stopPropagation()} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const below = window.innerHeight - r.bottom > 380; setMenuPos({top: below ? r.bottom + 6 : Math.max(8, r.top - 380), right: Math.max(8, window.innerWidth - r.right)}); setMenu(menu === l.id ? null : l.id); }}><MoreVertical size={16}/></button>{menu === l.id && rowMenu(l)}</span>
  </div>;

  return <section className="pc-card pc-leads">
    <header className="pc-leads-head">
      <div className="pc-leads-title"><Users size={28}/><div><h2>{title} <span>({filtered.length === leads.length ? leads.length : `${filtered.length} of ${leads.length}`})</span></h2><p>{subtitle}</p></div></div>
      <nav className="pc-tabs" aria-label="Lead status filters">
        {LEAD_TABS.map(t => { const I = TAB_ICON[t]; return <button key={t} className={tab === t ? 'active' : ''} aria-pressed={tab === t} onClick={() => { onTab(t); reset(); }}><I size={16}/>{TAB_LABEL[t]} ({counts[t]})<i className="pc-tab-glow"/></button>; })}
      </nav>
    </header>

    <div className="pc-toolbar">
      <label className="pc-search"><Search size={16}/><input value={q} onChange={e => { setQ(e.target.value); reset(); }} placeholder="Search by name, mobile, email, location, project…" aria-label="Search leads"/>{q && <button onClick={() => { setQ(''); reset(); }} aria-label="Clear search"><X size={14}/></button>}</label>
      <select className="pc-select" value={stage} onChange={e => { setStage(e.target.value); reset(); }} aria-label="Filter by stage"><option value="ALL">All Stages</option>{STAGES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
      <select className="pc-select" value={source} onChange={e => { setSource(e.target.value); reset(); }} aria-label="Filter by source"><option value="ALL">All Sources</option>{sources.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
      <select className="pc-select" value={state} onChange={e => { setState(e.target.value); reset(); }} aria-label="Filter by state"><option value="ALL">All States</option>{states.map(s => <option key={s} value={s}>{s}</option>)}</select>
      <select className="pc-select" value={owner} onChange={e => { setOwner(e.target.value); reset(); }} aria-label="Filter by owner"><option value="ALL">All Owners</option><option value="NONE">Unassigned</option>{staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <label className="pc-select pc-sort"><ArrowUpDown size={14}/><select value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label="Sort leads"><option value="new">Created (Newest)</option><option value="old">Created (Oldest)</option><option value="name">Name (A–Z)</option><option value="value">Budget (High–Low)</option></select></label>
      <div className="pc-tool-icons">
        <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="Table view" aria-pressed={view === 'list'}><List size={17}/></button>
        <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')} aria-label="Card view" aria-pressed={view === 'cards'}><LayoutGrid size={17}/></button>
        <button onClick={() => exportRows(filtered)} aria-label="Export filtered leads to CSV" title="Export CSV"><Download size={17}/></button>
      </div>
    </div>

    {picked.size > 0 && <div className="pc-bulk" role="region" aria-label="Bulk actions">
      <strong>{picked.size} selected</strong>
      {actions.onBulkAssign && <><select className="pc-select" value={bulkOwner} onChange={e => setBulkOwner(e.target.value)} aria-label="Assign selected leads to"><option value="">Unassigned</option>{data.users.filter(u => u.active && u.role === 'EMPLOYEE').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <button className="pc-btn gold" disabled={busy} onClick={applyBulk}>{busy ? 'Assigning…' : 'Assign owner'}</button></>}
      <button className="pc-btn" onClick={() => exportRows(leads.filter(l => picked.has(l.id)))}><Download size={15}/>Export selected</button>
      <button className="pc-btn ghost" onClick={() => setPicked(new Set())}>Clear</button>
    </div>}

    {!filtered.length ? <EmptyState title="No leads match these filters" text="Clear the search or choose another status tab to see more leads." action={<button className="pc-btn" onClick={() => { setQ(''); setStage('ALL'); setSource('ALL'); setState('ALL'); setOwner('ALL'); onTab('All'); }}>Reset filters</button>}/> :
    view === 'list' ? <><div className="pc-table-wrap"><table className="pc-table">
      <thead><tr>
        <th className="pc-check"><input type="checkbox" disabled={!selectable.length} checked={allPicked} onChange={toggleAll} aria-label="Select all leads on this page"/></th><th>#</th>
        <th>Lead Name</th><th>Contact</th><th>Location</th><th>Requirement / Budget</th><th>Source</th><th>Lead Status</th><th>Registration</th><th>Stage</th><th>Owner</th><th>Created</th><th className="pc-col-xl">Last Activity</th><th>Actions</th>
      </tr></thead>
      <tbody>{rows.map((l, i) => { const act = lastActivity(l, data); return <tr key={l.id} onClick={() => actions.onOpen(l)} className={picked.has(l.id) ? 'picked' : ''} style={{animationDelay: `${i * 35}ms`}}>
        <td className="pc-check" onClick={e => e.stopPropagation()}><input type="checkbox" disabled={l.draftOnly} checked={picked.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`}/></td>
        <td className="pc-num">{(cur - 1) * size + i + 1}</td>
        <td><span className="pc-lead"><Avatar name={l.name}/><span><b>{l.name}</b><small>{l.reference}</small></span></span></td>
        <td className="pc-contact"><span><Phone size={13}/>{l.phone || '—'}</span>{l.email && <span className="muted"><Mail size={13}/>{l.email}</span>}</td>
        <td><span className="pc-loc"><MapPin size={14}/>{l.location || 'To be confirmed'}</span></td>
        <td className="pc-req"><b>{l.capacity ? `${l.capacity.toLocaleString('en-IN')} Birds` : l.project_type || 'Requirement pending'}</b><small>{[l.capacity ? l.project_type : '', Number(l.project_cost) > 0 ? money(l.project_cost) : ''].filter(Boolean).join(' · ') || 'Budget not shared'}</small></td>
        <td><span className="pc-source">{label(l.source || 'direct')}</span></td>
        <td><StatusPill value={leadStatus(l)}/></td>
        <td><StatusPill kind="reg" value={registrationComplete(l) ? 'Complete' : 'Incomplete'}/></td>
        <td className="pc-stage">{label(l.stage)}</td>
        <td>{ownerCell(l)}</td>
        <td className="pc-date">{shortDate(l.created_at)}<small>{shortTime(l.created_at)}</small></td>
        <td className="pc-date pc-col-xl">{shortDate(act.at)}<small>{label(act.text)}</small></td>
        <td>{actionsCell(l)}</td>
      </tr>; })}</tbody>
    </table></div><div className="pc-lead-cards mobile-only">{rows.map((l, i) => <article key={l.id} className={`pc-lead-card ${picked.has(l.id) ? 'picked' : ''}`} style={{animationDelay: `${i * 40}ms`}} onClick={() => actions.onOpen(l)}>
      <header><input type="checkbox" checked={picked.has(l.id)} onClick={e => e.stopPropagation()} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`}/><Avatar name={l.name} size={42}/><div><b>{l.name}</b><small>{l.reference}</small></div><StatusPill value={leadStatus(l)}/></header>
      <dl><dt>Contact</dt><dd>{l.phone}</dd><dt>Location</dt><dd>{l.location || '—'}</dd><dt>Requirement</dt><dd>{l.capacity ? `${l.capacity.toLocaleString('en-IN')} birds` : l.project_type || '—'}</dd><dt>Registration</dt><dd><StatusPill kind="reg" value={registrationComplete(l) ? 'Complete' : 'Incomplete'}/></dd><dt>Owner</dt><dd>{ownerOf(l, data.users)?.name || 'Unassigned'}</dd><dt>Stage</dt><dd>{label(l.stage)}</dd></dl>
      <footer>{actionsCell(l)}</footer>
    </article>)}</div></> :
    <div className="pc-lead-cards">{rows.map((l, i) => <article key={l.id} className={`pc-lead-card ${picked.has(l.id) ? 'picked' : ''}`} style={{animationDelay: `${i * 40}ms`}} onClick={() => actions.onOpen(l)}>
      <header><input type="checkbox" checked={picked.has(l.id)} onClick={e => e.stopPropagation()} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`}/><Avatar name={l.name} size={42}/><div><b>{l.name}</b><small>{l.reference}</small></div><StatusPill value={leadStatus(l)}/></header>
      <dl><dt>Contact</dt><dd>{l.phone}</dd><dt>Location</dt><dd>{l.location || '—'}</dd><dt>Requirement</dt><dd>{l.capacity ? `${l.capacity.toLocaleString('en-IN')} birds` : l.project_type || '—'}</dd><dt>Registration</dt><dd><StatusPill kind="reg" value={registrationComplete(l) ? 'Complete' : 'Incomplete'}/></dd><dt>Owner</dt><dd>{ownerOf(l, data.users)?.name || 'Unassigned'}</dd><dt>Stage</dt><dd>{label(l.stage)}</dd></dl>
      <footer>{actionsCell(l)}</footer>
    </article>)}</div>}

    {filtered.length > 0 && <footer className="pc-pager">
      <span>Showing {(cur - 1) * size + 1} – {Math.min(cur * size, filtered.length)} of {filtered.length} leads</span>
      <div>
        <label>Rows per page <select className="pc-select small" value={size} onChange={e => { setSize(Number(e.target.value)); reset(); }}>{[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}</select></label>
        <button className="pc-pg" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button>
        {Array.from({length: pages}, (_, i) => i + 1).filter(n => n === 1 || n === pages || Math.abs(n - cur) <= 1).map((n, i, arr) => <span key={n}>{i > 0 && n - arr[i - 1] > 1 && <em>…</em>}<button className={`pc-pg ${n === cur ? 'on' : ''}`} onClick={() => setPage(n)} aria-current={n === cur ? 'page' : undefined}>{n}</button></span>)}
        <button className="pc-pg" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronRight size={16}/></button>
      </div>
    </footer>}
  </section>;
}
