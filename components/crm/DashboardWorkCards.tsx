'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {CalendarDays, Check, Clock, Mail, MessageCircle, Phone, Send} from 'lucide-react';
import {api} from './ui';
import {STAGES, label, type DashboardData, type Lead, type User, type Workflow} from '@/lib/crm/domain';

type Props = {
  data: DashboardData;
  onRefresh: () => void;
  onOpenLead: (lead: Lead) => void;
  onFollowUps: () => void;
};

const phoneLink = (value: string) => value.replace(/[^+\d]/g, '');
const whatsAppLink = (value: string) => value.replace(/\D/g, '').replace(/^(\d{10})$/, '91$1');
const isPending = (item: Workflow) => item.kind === 'followup' && !['COMPLETED', 'CANCELLED'].includes(item.status);
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', {dateStyle: 'medium', timeStyle: 'short'}) : 'Date pending';

export default function DashboardWorkCards({data, onRefresh, onOpenLead, onFollowUps}: Props) {
  const [leadId, setLeadId] = useState(data.leads[0]?.id || '');
  const lead = data.leads.find(item => item.id === leadId) || data.leads[0];
  const [stage, setStage] = useState<string>(lead?.stage || 'NEW');
  const [assignee, setAssignee] = useState(lead?.assigned_to || '');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [emailSettings, setEmailSettings] = useState<{settings?: {customer_subject?: string; admin_subject_pattern?: string}; templates?: {customer?: string; admin?: string}} | null>(null);
  const [templateKind, setTemplateKind] = useState<'customer' | 'admin'>('customer');

  useEffect(() => {
    setStage(lead?.stage || 'NEW');
    setAssignee(lead?.assigned_to || '');
  }, [lead?.id, lead?.stage, lead?.assigned_to]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin-email-settings', {cache: 'no-store', signal: controller.signal})
      .then(response => response.ok ? response.json() : null)
      .then(result => {if (!controller.signal.aborted) setEmailSettings(result);})
      .catch(() => {if (!controller.signal.aborted) setEmailSettings(null);});
    return () => controller.abort();
  }, []);

  const staff = data.users.filter((member: User) => member.active && member.role === 'EMPLOYEE');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  const followUps = data.workflows.filter(isPending).filter(item => {
    if (filter === 'all') return true;
    if (!item.due_at) return false;
    const due = new Date(item.due_at);
    if (filter === 'today') return due >= today && due < new Date(today.getTime() + 86400000);
    if (filter === 'week') return due >= today && due < nextWeek;
    return due < now;
  }).sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime());

  async function saveChanges() {
    if (!lead || busy) return;
    setError(''); setFeedback(''); setBusy(true);
    try {
      if (stage !== lead.stage || assignee !== (lead.assigned_to || '')) {
        await api(`leads/${lead.id}`, 'PATCH', {
          stage, assigned_to: assignee || null, version: lead.version,
        });
      }
      if (note.trim()) {
        await api('notes', 'POST', {lead_id: lead.id, note: note.trim(), shared: false, kind: 'NOTE'});
        setNote('');
      }
      setFeedback('Changes saved');
      onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save changes');
    } finally {
      setBusy(false);
    }
  }

  const emailSubject = emailSettings?.settings?.customer_subject || 'AKBS Poultry Farming inquiry';
  const templateHtml = emailSettings?.templates?.[templateKind] || '';
  const emailBody = templateHtml && lead ? templateHtml
    .replaceAll('{{name}}', lead.name).replaceAll('{{email}}', lead.email)
    .replaceAll('{{phone}}', lead.phone).replaceAll('{{message}}', lead.message || '')
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim() : '';

  return <div className="crm-live-workcards">
    <section className="crm-live-workcard" aria-label="Inquiry details">
      <div className="crm-live-card-heading"><h2>Inquiry Details</h2>{lead && <button onClick={() => onOpenLead(lead)} aria-label="Open inquiry">View record ↗</button>}</div>
      {lead ? <>
        <div className="crm-live-contact"><span className="crm-live-avatar">{lead.name.charAt(0).toUpperCase()}</span><div><strong>{lead.name}</strong><span className="crm-live-stage">{label(lead.stage)}</span><small>{lead.phone}{lead.email && ` · ${lead.email}`}</small><small>{dateLabel(lead.created_at)}</small></div></div>
        <p className="crm-live-message">{lead.message || lead.project_type || 'No message provided with this inquiry.'}</p>
        <div className="crm-live-action-row"><a href={`tel:${phoneLink(lead.phone)}`}><Phone size={14}/> Call</a><a href={`https://wa.me/${whatsAppLink(lead.phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={14}/> WhatsApp</a>{lead.email && <a href={`mailto:${lead.email}`}><Mail size={14}/> Reply</a>}</div>
        <div className="crm-live-fields"><label>Update status<select value={stage} onChange={event => setStage(event.target.value)}>{STAGES.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label><label>Assign to<select value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Unassigned</option>{staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
        <label className="crm-live-note">Add internal note<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Write a note about this inquiry…" rows={2}/></label>
        <div className="crm-live-save"><span role="status">{error || feedback}</span><button disabled={busy || (!note.trim() && stage === lead.stage && assignee === (lead.assigned_to || ''))} onClick={saveChanges}>{busy ? 'Saving…' : <><Check size={14}/> Save</>}</button></div>
      </> : <p className="crm-muted">Website inquiries will appear here when submitted.</p>}
    </section>

    <section className="crm-live-workcard" aria-label="Email templates">
      <div className="crm-live-card-heading"><h2>Email Templates</h2><Link href="/admin/email-settings">Manage All</Link></div>
      <div className="crm-live-template-layout"><div className="crm-live-template-tabs"><button className={templateKind === 'customer' ? 'active' : ''} onClick={() => setTemplateKind('customer')}>✉ Customer Reply</button><button className={templateKind === 'admin' ? 'active' : ''} onClick={() => setTemplateKind('admin')}>▤ Admin Alert</button></div><div className="crm-live-template-preview"><label>Subject<input readOnly value={templateKind === 'customer' ? emailSubject : (emailSettings?.settings?.admin_subject_pattern || 'Admin inquiry notification').replaceAll('{{name}}', lead?.name || 'Customer')}/></label><label>Message<textarea readOnly rows={6} value={emailBody || 'No saved template. Open Manage All to add one.'}/></label><div><Link href="/admin/email-settings">Edit templates</Link>{templateKind === 'customer' && lead?.email && emailBody && <a className="crm-live-send" href={`mailto:${lead.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}><Send size={14}/> Compose email</a>}</div></div></div>
    </section>

    <section className="crm-live-workcard" aria-label="Follow up management">
      <div className="crm-live-card-heading"><h2>Follow Up Management</h2><button onClick={onFollowUps}>View All</button></div>
      <div className="crm-live-filters">{(['all','today','week','overdue'] as const).map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'week' ? 'This Week' : item[0].toUpperCase() + item.slice(1)}</button>)}</div>
      {followUps.length ? <div className="crm-live-followups">{followUps.slice(0,5).map(item => <button key={item.id} onClick={onFollowUps}><strong>{data.leads.find(lead => lead.id === item.lead_id)?.name || 'Inquiry'}</strong><small>{item.title}</small><span><Clock size={12}/>{dateLabel(item.due_at)}</span></button>)}</div> : <p className="crm-muted"><CalendarDays size={16}/> No follow-ups in this view.</p>}
    </section>
  </div>;
}
