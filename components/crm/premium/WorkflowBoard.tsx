'use client';

import {useMemo, useState} from 'react';
import {CalendarDays, Clock, CalendarRange, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Phone, MessageCircle, Plus, Search, List, Pencil, X} from 'lucide-react';
import {label, money, type DashboardData, type Lead, type Workflow, type WorkflowKind} from '@/lib/crm/domain';
import {KpiCards, PremiumHero, StatusPill, EmptyState, Avatar, type Kpi} from './Blocks';
import {workflowBuckets, shortDate, shortTime, telHref, waHref} from './metrics';

type Bucket = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
const TITLES: Record<WorkflowKind, [string, string]> = {
  followup: ['Follow-ups & Tasks', 'Manage all follow-ups, calls, visits and reminders for leads and customers.'],
  task: ['Tasks & Activities', 'Team tasks, assignments and progress tracking.'],
  visit: ['Site Visits', 'Plan and track farm land and infrastructure visits.'],
  proposal: ['DPR & Proposals', 'Detailed project reports and proposals across their review stages.'],
  financing: ['Loan & Financing', 'Track loan applications from documents to disbursement.'],
};

const KIND_LABEL: Record<WorkflowKind, string> = {followup: 'Follow-up', task: 'Task', visit: 'Site Visit', proposal: 'Proposal', financing: 'Loan Application'};
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function WorkflowBoard({data, kind, canCreate, onCreate, onReview}: {data: DashboardData; kind: WorkflowKind; canCreate: boolean; onCreate: () => void; onReview: (w: Workflow, l: Lead) => void}) {
  const items = useMemo(() => data.workflows.filter(w => w.kind === kind), [data.workflows, kind]);
  const b = workflowBuckets(items);
  const [bucket, setBucket] = useState<Bucket>('all');
  const [q, setQ] = useState('');
  const [assignee, setAssignee] = useState('ALL');
  const [day, setDay] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const leadOf = (w: Workflow) => data.leads.find(l => l.id === w.lead_id);
  const userName = (id: string | null) => data.users.find(u => u.id === id)?.name || '';
  const [title, sub] = TITLES[kind];
  const money_ = kind === 'financing' || kind === 'proposal';

  const kpis: Kpi[] = [
    {label: kind === 'followup' ? 'Total Follow-ups' : 'Total', value: b.all.length, icon: CalendarDays, tone: '#3b82f6', onClick: () => setBucket('all'), active: bucket === 'all'},
    {label: 'Due Today', value: b.today.length, icon: Clock, tone: '#f59e0b', onClick: () => setBucket('today'), active: bucket === 'today'},
    {label: 'Upcoming', value: b.upcoming.length, icon: CalendarRange, tone: '#8b5cf6', onClick: () => setBucket('upcoming'), active: bucket === 'upcoming'},
    {label: 'Overdue', value: b.overdue.length, icon: AlertTriangle, tone: '#ef4444', onClick: () => setBucket('overdue'), active: bucket === 'overdue'},
    {label: 'Completed', value: b.completed.length, icon: CheckCircle2, tone: '#22c55e', onClick: () => setBucket('completed'), active: bucket === 'completed'},
  ];

  const rows = b[bucket].filter(w => {
    const l = leadOf(w);
    return (assignee === 'ALL' || w.assignee_id === assignee) &&
      (!day || (w.due_at && sameDay(new Date(w.due_at), day))) &&
      (!q || `${w.title} ${w.notes} ${l?.name || ''} ${w.bank}`.toLowerCase().includes(q.toLowerCase()));
  }).sort((x, y) => +new Date(x.due_at || x.created_at) - +new Date(y.due_at || y.created_at));

  const statusOf = (w: Workflow) => b.overdue.includes(w) ? 'Overdue' : b.today.includes(w) ? 'Due Today' : label(w.status);

  // Calendar grid
  const first = new Date(month); const start = new Date(first); start.setDate(1 - first.getDay());
  const cells = Array.from({length: 42}, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const dots = (d: Date) => items.filter(w => w.due_at && sameDay(new Date(w.due_at), d));
  const todayAgenda = b.today.concat(b.overdue).slice(0, 6);

  return <div className="pc-page">
    <PremiumHero crumb={`CRM  /  ${title}`} title={title} subtitle={sub}>
      <KpiCards items={kpis} compact/>
    </PremiumHero>

    <div className="pc-split">
      <section className="pc-card pc-leads">
        <header className="pc-leads-head">
          <nav className="pc-tabs" aria-label="Due date filters">{([['all', 'All', b.all], ['today', 'Due Today', b.today], ['upcoming', 'Upcoming', b.upcoming], ['overdue', 'Overdue', b.overdue], ['completed', 'Completed', b.completed]] as const).map(([k, t, list]) =>
            <button key={k} className={bucket === k ? 'active' : ''} onClick={() => setBucket(k)} aria-pressed={bucket === k}>{t} ({list.length})<i className="pc-tab-glow"/></button>)}</nav>
          <div className="pc-tool-icons"><button className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')} aria-label="List view"><List size={17}/></button><button className={mode === 'calendar' ? 'on' : ''} onClick={() => setMode('calendar')} aria-label="Calendar view"><CalendarDays size={17}/></button></div>
        </header>
        <div className="pc-toolbar">
          <label className="pc-search"><Search size={16}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by lead, task, note…" aria-label="Search"/></label>
          <select className="pc-select" value={assignee} onChange={e => setAssignee(e.target.value)} aria-label="Assigned to"><option value="ALL">Assigned To: All</option>{data.users.filter(u => u.active && ['EMPLOYEE', 'MANAGER', 'FINANCE'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          {day && <button className="pc-btn ghost" onClick={() => setDay(null)}><X size={14}/>{shortDate(day.toISOString())}</button>}
        </div>
        {mode === 'calendar' ? <div className="pc-bigcal">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <b key={d}>{d}</b>)}{cells.map(d => { const list = dots(d); return <button key={d.toISOString()} className={`${d.getMonth() !== month.getMonth() ? 'dim' : ''} ${sameDay(d, new Date()) ? 'today' : ''}`} onClick={() => { setDay(d); setMode('list'); setBucket('all'); }}>
          <span>{d.getDate()}</span>{list.slice(0, 2).map(w => <em key={w.id}>{shortTime(w.due_at)} {w.title}</em>)}{list.length > 2 && <small>+{list.length - 2} more</small>}</button>; })}</div> :
        rows.length ? <div className="pc-table-wrap"><table className="pc-table">
          <thead><tr><th>#</th><th>Lead / Customer</th><th>{KIND_LABEL[kind]}</th><th>Due Date & Time</th>{money_ && <th>Amount</th>}<th>Assigned To</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>{rows.map((w, i) => { const l = leadOf(w); return <tr key={w.id} style={{animationDelay: `${i * 35}ms`}} onClick={() => l && onReview(w, l)}>
            <td className="pc-num">{i + 1}</td>
            <td><span className="pc-lead"><Avatar name={l?.name || '?'}/><span><b>{l?.name || 'Lead'}</b><small>{l?.reference}</small></span></span></td>
            <td className="pc-req"><b>{w.title}</b><small>{w.location || KIND_LABEL[kind]}</small></td>
            <td className="pc-date">{w.due_at ? shortDate(w.due_at) : '—'}<small>{shortTime(w.due_at)}</small></td>
            {money_ && <td className="pc-req"><b>{w.amount ? money(w.amount) : '—'}</b><small>{w.bank}</small></td>}
            <td>{w.assignee_id ? <span className="pc-owner"><Avatar name={userName(w.assignee_id)} size={28}/><span>{userName(w.assignee_id)}</span></span> : <span className="pc-owner none">—</span>}</td>
            <td><StatusPill kind="neutral" value={statusOf(w)}/></td>
            <td className="pc-notes">{w.notes || '—'}</td>
            <td><div className="pc-row-actions" onClick={e => e.stopPropagation()}>{l?.phone && <><a className="pc-icon-btn green" href={telHref(l.phone)} aria-label="Call"><Phone size={15}/></a><a className="pc-icon-btn green" href={waHref(l.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={15}/></a></>}{l && <button className="pc-icon-btn" onClick={() => onReview(w, l)} aria-label="Review / update"><Pencil size={15}/></button>}</div></td>
          </tr>; })}</tbody></table></div>
        : <EmptyState title={`No ${KIND_LABEL[kind].toLowerCase()} records here`} text="Open a lead to schedule one, or switch the filter above."/>}
      </section>

      <aside className="pc-side">
        <section className="pc-card pc-cal">
          <header className="pc-card-head"><h3><CalendarDays size={18}/>{KIND_LABEL[kind]} Calendar</h3></header>
          <div className="pc-cal-nav"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16}/></button><b>{month.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}</b><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16}/></button></div>
          <div className="pc-cal-grid">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <b key={d}>{d}</b>)}{cells.map(d => { const n = dots(d).length; return <button key={d.toISOString()} onClick={() => setDay(d)} className={`${d.getMonth() !== month.getMonth() ? 'dim' : ''} ${sameDay(d, new Date()) ? 'today' : ''} ${day && sameDay(d, day) ? 'sel' : ''}`} aria-label={`${d.toDateString()}${n ? `, ${n} items` : ''}`}>{d.getDate()}{n > 0 && <i/>}</button>; })}</div>
        </section>
        <section className="pc-card">
          <header className="pc-card-head"><h3><Clock size={18}/>Today&apos;s Agenda ({todayAgenda.length})</h3></header>
          {todayAgenda.length ? <ul className="pc-agenda">{todayAgenda.map(w => { const l = leadOf(w); return <li key={w.id} onClick={() => l && onReview(w, l)}><span className={`pc-agenda-icon ${w.kind}`}><Phone size={16}/></span><div><b>{w.title}{l ? ` – ${l.name}` : ''}</b><small>{shortTime(w.due_at)} · {b.overdue.includes(w) ? 'Overdue' : 'Today'}</small></div></li>; })}</ul> : <EmptyState title="Nothing due today" text="Enjoy the calm — or plan the next follow-up."/>}
        </section>
        {canCreate && <button className="pc-btn gold block" onClick={onCreate}><Plus size={18}/>Create {KIND_LABEL[kind]}</button>}
      </aside>
    </div>
  </div>;
}
