'use client';

import {useMemo, useState} from 'react';
import {
  Users, Star, RefreshCw, ClipboardX, CheckCircle2, UserPlus, TrendingUp, PieChart, Filter, CalendarClock,
  ListChecks, Activity, Landmark, ArrowRight, Phone, MapPin, FileText, ClipboardCheck, Plus,
} from 'lucide-react';
import {label, money, type DashboardData, type Lead} from './domain';
import {KpiCards, PremiumHero, ChartCard, TrendChart, Donut, Funnel, StatusPill, EmptyState, type Kpi} from './Blocks';
import LeadsTable, {type LeadActions} from './LeadsTable';
import {dailySeries, periodDelta, funnel, statusDistribution, matchesTab, tabCounts, workflowBuckets, shortTime, shortDate, type LeadTab} from './metrics';

type Props = LeadActions & {
  data: DashboardData;
  onView: (view: string) => void;
  canSeeFinance?: boolean;
};

const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'; };

export function leadKpis(data: DashboardData, tab: LeadTab, setTab: (t: LeadTab) => void): Kpi[] {
  const leads = data.leads;
  const c = tabCounts(leads);
  const spark = (t: LeadTab) => dailySeries(leads, 14, l => matchesTab(l, t)).map(d => d.value);
  const delta = (t: LeadTab) => periodDelta(leads, l => matchesTab(l, t));
  const mk = (t: LeadTab, lab: string, icon: Kpi['icon'], tone: string): Kpi => ({label: lab, value: t === 'All' ? Math.max(data.total, c.All) : c[t], icon, tone, delta: delta(t), series: spark(t), onClick: () => setTab(t), active: tab === t});
  return [
    mk('All', 'All Leads', Users, '#3b82f6'),
    mk('New', 'New Leads', Star, '#22c55e'),
    mk('In Process', 'In Process', RefreshCw, '#f59e0b'),
    mk('Incomplete', 'Incomplete', ClipboardX, '#ef4444'),
    mk('Converted', 'Converted', CheckCircle2, '#14b8a6'),
    mk('Unassigned', 'Unassigned', UserPlus, '#8b5cf6'),
  ];
}

export default function PremiumDashboard({data, onView, canSeeFinance, ...actions}: Props) {
  const [tab, setTab] = useState<LeadTab>('All');
  const leads = data.leads;
  const kpis = leadKpis(data, tab, t => { setTab(t); document.getElementById('pc-unified-leads')?.scrollIntoView({behavior: 'smooth', block: 'start'}); });

  const trend = useMemo(() => {
    const days = dailySeries(leads, 30);
    const conv = dailySeries(leads, 30, l => l.stage === 'CONVERTED');
    const pairs: {label: string; total: number; conv: number}[] = [];
    for (let i = 0; i < days.length; i += 2) pairs.push({
      label: days[i].date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}),
      total: days[i].value + (days[i + 1]?.value || 0),
      conv: conv[i].value + (conv[i + 1]?.value || 0),
    });
    return pairs;
  }, [leads]);
  const growth = periodDelta(leads, () => true);
  const dist = statusDistribution(leads);
  const steps = funnel(leads);

  const followups = workflowBuckets(data.workflows.filter(w => w.kind === 'followup' || w.kind === 'visit'));
  const tasks = data.workflows.filter(w => w.kind === 'task' && !['COMPLETED', 'CANCELLED'].includes(w.status));
  const financing = data.workflows.filter(w => w.kind === 'financing');
  const leadName = (id: string) => leads.find(l => l.id === id)?.name || 'Lead';
  const openById = (id: string) => { const l = leads.find(x => x.id === id); if (l) actions.onOpen(l); };
  const pipeline: [string, string, typeof Users][] = [['NEW', 'Inquiry', Users], ['QUALIFIED', 'Qualified', CheckCircle2], ['SITE_VISIT', 'Site Visit', MapPin], ['DPR', 'DPR', FileText], ['LOAN_PROCESSING', 'Loan', Landmark], ['CONVERTED', 'Execution', ClipboardCheck]];
  const today = followups.today.concat(followups.overdue).slice(0, 5);

  return <div className="pc-page">
    <PremiumHero crumb="CRM  Dashboard" title={`${greet()}, ${data.user.name.split(' ')[0]}`} subtitle="Manage registrations, leads, projects, financing and customer relationships in one place."
>
      <KpiCards items={kpis}/>
    </PremiumHero>

    <div className="pc-grid-3 charts">
      <ChartCard title={<>Lead Trend <small>(Last 30 Days)</small></>} icon={TrendingUp} badge={growth !== null ? <span className={`pc-chip ${growth < 0 ? 'red' : 'green'}`}>{growth > 0 ? '+' : ''}{growth}%</span> : undefined}>
        <div className="pc-legend-inline"><span><i className="gold"/>Total Leads</span><span><i className="violet"/>Converted</span></div>
        {leads.length ? <TrendChart series={trend.map(t => t.total)} compare={trend.map(t => t.conv)} labels={trend.map(t => t.label)}/> : <EmptyState title="No leads yet" text="The trend appears once leads are captured."/>}
      </ChartCard>
      <ChartCard title="Leads by Status" icon={PieChart}><Donut rows={dist} total={leads.length} caption="Total Leads"/></ChartCard>
      <ChartCard title="Conversion Funnel" icon={Filter}><Funnel steps={steps}/></ChartCard>
    </div>

    <div id="pc-unified-leads"><LeadsTable data={data} leads={leads} tab={tab} onTab={setTab} {...actions}/></div>

    <div className="pc-grid-3 even">
      <ChartCard title={`Today's Follow-ups (${today.length})`} icon={CalendarClock} action={<button className="pc-link" onClick={() => onView('followup')}>View All</button>}>
        {today.length ? <ul className="pc-agenda">{today.map(w => <li key={w.id} onClick={() => openById(w.lead_id)}>
          <span className={`pc-agenda-icon ${w.kind}`}>{w.kind === 'visit' ? <MapPin size={16}/> : <Phone size={16}/>}</span>
          <div><b>{w.title}</b><small>{leadName(w.lead_id)}</small></div>
          <span className="pc-agenda-time">{shortTime(w.due_at)}<StatusPill kind="neutral" value={followups.overdue.includes(w) ? 'Overdue' : 'Due'}/></span>
        </li>)}</ul> : <EmptyState title="All caught up" text="No follow-ups due today."/>}
      </ChartCard>
      <ChartCard title={`Pending Tasks (${tasks.length})`} icon={ListChecks} action={<button className="pc-link" onClick={() => onView('task')}>View All</button>}>
        {tasks.length ? <ul className="pc-agenda tasks">{tasks.slice(0, 5).map(w => <li key={w.id} onClick={() => openById(w.lead_id)}>
          <span className="pc-agenda-check"/><div><b>{w.title}</b><small>{leadName(w.lead_id)} · {w.due_at ? shortDate(w.due_at) : 'No due date'}</small></div><StatusPill kind="neutral" value={label(w.status)}/>
        </li>)}</ul> : <EmptyState title="No pending tasks" text="Create tasks from a lead to track team work."/>}
      </ChartCard>
      <ChartCard title="Recent Activities" icon={Activity}>
        {data.activities.length ? <ol className="pc-activity">{data.activities.slice(0, 5).map((a, i) => <li key={a.id} style={{animationDelay: `${i * 60}ms`}}>
          <i/><div><b>{label(a.action)}</b><p>{a.note}</p><small>{a.actor_name} · {shortDate(a.created_at)}, {shortTime(a.created_at)}</small></div>
        </li>)}</ol> : <EmptyState title="No activity yet" text="Activity appears as your team works on leads."/>}
      </ChartCard>
    </div>

    <div className="pc-grid-2">
      <ChartCard title="Poultry Project Pipeline" icon={TrendingUp} action={<button className="pc-link" onClick={() => onView('projects')}>Open projects</button>}>
        <div className="pc-pipeline">{pipeline.map(([stage, name, I], i) => <button key={stage} onClick={() => onView('leads')} style={{animationDelay: `${i * 80}ms`}}>
          <span><I size={20}/></span><small>{name}</small><b>{data.stats.stages[stage] || 0}</b>{i < pipeline.length - 1 && <ArrowRight className="pc-pipe-arrow" size={16}/>}
        </button>)}</div>
        <div className="pc-total"><span>Total project value in pipeline</span><strong>{money(data.stats.project_value)}</strong></div>
      </ChartCard>
      {canSeeFinance && <ChartCard title="Loan Applications" icon={Landmark} action={<button className="pc-link" onClick={() => onView('financing')}>View All</button>}>
        <div className="pc-mini-kpis">
          <div><small>Applications</small><b>{financing.length}</b></div>
          <div><small>Requested</small><b>{money(financing.reduce((s, w) => s + Number(w.amount || 0), 0))}</b></div>
          <div><small>Sanctioned</small><b>{financing.filter(w => ['SANCTIONED', 'DISBURSED'].includes(w.status)).length}</b></div>
          <div><small>In process</small><b>{financing.filter(w => ['DOCUMENTS_PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(w.status)).length}</b></div>
        </div>
        <div className="pc-loan-flow">{['Application', 'Documents', 'Bank Submission', 'Appraisal', 'Sanction', 'Disbursement'].map((s, i) => <span key={s} style={{animationDelay: `${i * 90}ms`}}>{s}</span>)}</div>
      </ChartCard>}
    </div>

  </div>;
}

export function LeadsWorkspace({data, title, subtitle, list, query, onAdd, ...actions}: LeadActions & {data: DashboardData; title: string; subtitle: string; list: Lead[]; query?: string; onAdd?:()=>void}) {
  const [tab, setTab] = useState<LeadTab>('All');
  const kpis = leadKpis({...data, leads: list, total: list.length}, tab, setTab);
  return <div className="pc-page">
    <PremiumHero crumb={`CRM  /  ${title}`} title={title} subtitle={subtitle} actions={onAdd&&<button type="button" className="pc-btn gold" onClick={onAdd}><Plus size={17}/>Add Lead</button>}>
      <KpiCards items={kpis}/>
    </PremiumHero>
    <LeadsTable data={data} leads={list} tab={tab} onTab={setTab} title={title} query={query} {...actions}/>
  </div>;
}
