import {applicationEligible} from '../../lib/feeCollections';
import type {DashboardData, Lead, User, Workflow} from './domain';

// Every number here is derived from the live CRM records returned by the gateway.
// Nothing is hard-coded from the design mockups.

export type LeadStatus = 'New' | 'In Process' | 'Converted' | 'Lost' | 'Draft';
export type LeadTab = 'All' | 'New' | 'In Process' | 'Incomplete' | 'Unassigned' | 'Converted';

const IN_PROCESS = ['CONTACTED','QUALIFIED','SITE_VISIT','DPR','PROPOSAL','LOAN_PROCESSING'];
const CLOSED = ['CONVERTED','LOST'];
const DAY = 86400000;

export function leadStatus(l: Lead): LeadStatus {
  if(l.draftOnly) return 'Draft';
  if (l.stage === 'NEW') return 'New';
  if (l.stage === 'CONVERTED') return 'Converted';
  if (l.stage === 'LOST') return 'Lost';
  return 'In Process';
}

/** Registration is complete once the customer registration form details were submitted. */
export function registrationComplete(l: Lead): boolean { return !l.draftOnly && applicationEligible(l); }

export const isOpen = (l: Lead) => !CLOSED.includes(l.stage);
export const isUnassigned = (l: Lead) => !l.draftOnly && isOpen(l) && !l.assigned_to;
export const isIncomplete = (l: Lead) => isOpen(l) && !registrationComplete(l);

export function matchesTab(l: Lead, tab: LeadTab): boolean {
  switch (tab) {
    case 'All': return true;
    case 'New': return !l.draftOnly && l.stage === 'NEW';
    case 'In Process': return !l.draftOnly && IN_PROCESS.includes(l.stage);
    case 'Incomplete': return isIncomplete(l);
    case 'Unassigned': return isUnassigned(l);
    case 'Converted': return l.stage === 'CONVERTED';
  }
}

export const LEAD_TABS: LeadTab[] = ['All','New','In Process','Incomplete','Unassigned','Converted'];

export function tabCounts(leads: Lead[]): Record<LeadTab, number> {
  const out = {} as Record<LeadTab, number>;
  for (const t of LEAD_TABS) out[t] = leads.filter(l => matchesTab(l, t)).length;
  return out;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

/** Daily created-lead counts for the last `days` days (oldest first). */
export function dailySeries(leads: Lead[], days: number, filter: (l: Lead) => boolean = () => true): {date: Date; value: number}[] {
  const today = startOfDay(new Date());
  const buckets = Array.from({length: days}, (_, i) => ({date: new Date(today.getTime() - (days - 1 - i) * DAY), value: 0}));
  const first = buckets[0].date.getTime();
  for (const l of leads) {
    if (!filter(l)) continue;
    const t = startOfDay(new Date(l.created_at)).getTime();
    const idx = Math.round((t - first) / DAY);
    if (idx >= 0 && idx < days) buckets[idx].value++;
  }
  return buckets;
}

/** Percentage change of leads created in the last 30 days vs the 30 days before. Null when there is no baseline. */
export function periodDelta(leads: Lead[], filter: (l: Lead) => boolean): number | null {
  const now = Date.now();
  let cur = 0, prev = 0;
  for (const l of leads) {
    if (!filter(l)) continue;
    const age = now - new Date(l.created_at).getTime();
    if (age < 30 * DAY) cur++; else if (age < 60 * DAY) prev++;
  }
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export function funnel(leads: Lead[]) {
  const order = ['NEW','CONTACTED','QUALIFIED','SITE_VISIT','DPR','PROPOSAL','LOAN_PROCESSING','CONVERTED'];
  const reached = (min: string) => leads.filter(l => l.stage !== 'LOST' && order.indexOf(l.stage) >= order.indexOf(min)).length;
  const total = leads.length;
  return [
    {key: 'Leads', value: total},
    {key: 'Qualified', value: reached('QUALIFIED')},
    {key: 'Proposal', value: reached('PROPOSAL')},
    {key: 'Converted', value: reached('CONVERTED')},
  ].map(s => ({...s, pct: total ? Math.round((s.value / total) * 100) : 0}));
}

export function statusDistribution(leads: Lead[]) {
  const rows = [
    {key: 'New', color: '#22c55e', value: leads.filter(l => l.stage === 'NEW').length},
    {key: 'In Process', color: '#f59e0b', value: leads.filter(l => IN_PROCESS.includes(l.stage)).length},
    {key: 'Converted', color: '#14b8a6', value: leads.filter(l => l.stage === 'CONVERTED').length},
    {key: 'Lost', color: '#64748b', value: leads.filter(l => l.stage === 'LOST').length},
  ];
  return rows.filter(r => r.value > 0 || r.key !== 'Lost');
}

export const ownerOf = (l: Lead, users: User[]) => users.find(u => u.id === l.assigned_to) || null;
export const initials = (name: string) => name.split(/\s+/).filter(w => w && !w.endsWith('.')).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '—';

const AVATAR = ['#f97316','#0d9488','#2563eb','#9333ea','#e11d48','#16a34a','#ca8a04','#0891b2'];
export const avatarColor = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

export const shortDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}) : '—';
export const shortTime = (s: string | null) => s ? new Date(s).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'}) : '';

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;
export const waHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0?(\d{10})$/, '91$1')}`;

export function lastActivity(l: Lead, data: DashboardData) {
  const a = data.activities.find(x => x.lead_id === l.id);
  return a ? {at: a.created_at, text: a.action} : {at: l.updated_at, text: 'Updated'};
}

export function workflowBuckets(items: Workflow[]) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY);
  const open = (w: Workflow) => !['COMPLETED','CANCELLED'].includes(w.status);
  return {
    all: items,
    today: items.filter(w => open(w) && w.due_at && new Date(w.due_at) >= today && new Date(w.due_at) < tomorrow),
    upcoming: items.filter(w => open(w) && (!w.due_at || new Date(w.due_at) >= tomorrow)),
    overdue: items.filter(w => open(w) && w.due_at && new Date(w.due_at) < today),
    completed: items.filter(w => w.status === 'COMPLETED'),
  };
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => { const raw = String(v ?? ''); const s=/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
