'use client';

import {CalendarDays, Clock, Inbox, Mail, MessageCircle, Plus, TrendingUp, Users} from 'lucide-react';
import {Badge} from './ui';
import DashboardWorkCards from './DashboardWorkCards';
import {label, type DashboardData, type Lead} from '@/lib/crm/domain';

type Props = {
  data: DashboardData;
  onView: (view: string) => void;
  onLead: (lead: Lead) => void;
  onAdd: () => void;
  onRefresh: () => void;
};

export default function ReferenceDashboard({data, onView, onLead, onAdd, onRefresh}: Props) {
  const count = (stage: string) => data.stats.stages[stage] || 0;
  const followUps = data.workflows.filter(w => w.kind === 'followup' && !['COMPLETED','CANCELLED'].includes(w.status));
  const cards = [
    {name:'Total Inquiries', value:data.total, tag:'All Time', icon:Mail, color:'green', onClick:() => onView('inquiries')},
    {name:'New / Unread', value:count('NEW'), tag:'Action Req.', icon:MessageCircle, color:'blue', onClick:() => onView('inquiries')},
    {name:'Replied', value:count('CONTACTED'), tag:'In Talk', icon:Inbox, color:'orange', onClick:() => onView('leads')},
    {name:'Converted', value:count('CONVERTED'), tag:'Success', icon:TrendingUp, color:'purple', onClick:() => onView('leads')},
    {name:'Follow Up', value:followUps.length, tag:'Scheduled', icon:CalendarDays, color:'pink', onClick:() => onView('followup')},
  ];
  const today = new Date();
  const week = Array.from({length:7}, (_,index) => {
    const day = new Date(today); day.setHours(0,0,0,0); day.setDate(day.getDate() - 6 + index);
    return day;
  });
  const trend = week.map(day => data.leads.filter(lead => new Date(lead.created_at).toDateString() === day.toDateString()).length);
  const peak = Math.max(1, ...trend);
  const chartPoints = trend.map((value,index) => `${20 + index * 74},${139 - value / peak * 112}`).join(' ');
  const sources = Object.entries(data.stats.sources).sort((a,b) => b[1] - a[1]);
  const colors = ['#0f7653','#3488ed','#f7b443','#8b51d9','#df5295'];
  let offset = 0;
  const gradient = sources.slice(0,5).map(([,value],index) => {
    const start = offset; offset += value / Math.max(data.total,1) * 100;
    return `${colors[index]} ${start}% ${offset}%`;
  }).join(',');

  return <div className="crm-approved-dashboard">
    <div className="crm-approved-welcome"><div><h2>Welcome Back, {data.user.name.split(' ')[0]}!</h2><p>Here&apos;s what&apos;s happening with your poultry business today.</p></div><span><CalendarDays size={16}/>{today.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>
    <div className="crm-approved-kpis">{cards.map(({name,value,tag,icon:Icon,color,onClick}) => <button key={name} className={`crm-approved-kpi ${color}`} onClick={onClick}><span className="crm-approved-kpi-top"><Icon size={18}/><small>{tag}</small></span><strong>{value}</strong><span>{name}</span></button>)}</div>
    <div className="crm-approved-charts">
      <section className="crm-approved-panel"><div className="crm-approved-heading"><h2>Inquiries Trend</h2><span>Last 7 Days</span></div><div className="crm-approved-line"><svg viewBox="0 0 484 155" preserveAspectRatio="none" role="img" aria-label="Website inquiries over seven days"><defs><linearGradient id="approvedTrend" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#a1ecd0" stopOpacity=".65"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient></defs><polygon points={`20,147 ${chartPoints} 464,147`} fill="url(#approvedTrend)"/><polyline points={chartPoints} fill="none" stroke="#096a49" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>{trend.map((value,index) => <circle key={index} cx={20 + index*74} cy={139 - value/peak*112} r="4" fill="#0d8b65" stroke="#fff" strokeWidth="2"/>)}</svg><div>{week.map((day,index) => <span key={index}>{day.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>)}</div></div></section>
      <section className="crm-approved-panel"><div className="crm-approved-heading"><h2>Lead Source</h2><span>Total: {data.total}</span></div><div className="crm-approved-source"><div className="crm-approved-donut" style={{background:gradient ? `conic-gradient(${gradient}, #eef2f0 ${offset}% 100%)` : '#eef2f0'}}><span><strong>{data.total}</strong><small>Inquiries</small></span></div><div className="crm-approved-legend">{sources.length ? sources.slice(0,5).map(([source,value],index) => <div key={source}><i style={{background:colors[index]}}/><span>{label(source)}</span><strong>{Math.round(value / Math.max(data.total,1)*100)}%</strong></div>) : <p>Lead sources appear after inquiries arrive.</p>}</div></div></section>
    </div>
    <div className="crm-approved-row"><section className="crm-approved-panel"><div className="crm-approved-heading"><h2>Recent Inquiries</h2><button onClick={() => onView('inquiries')}>View All ›</button></div><div className="crm-approved-table"><table><thead><tr><th>Name</th><th>Contact</th><th>Message</th><th>Source</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.leads.slice(0,6).map(lead => <tr key={lead.id}><td><button onClick={() => onLead(lead)}>{lead.name}</button></td><td>{lead.phone}</td><td title={lead.message || ''}>{lead.message || lead.project_type || 'Project inquiry'}</td><td>{label(lead.source)}</td><td>{new Date(lead.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td><td><Badge value={lead.stage}/></td><td><button aria-label={`Open ${lead.name}`} onClick={() => onLead(lead)}>⋮</button></td></tr>)}</tbody></table>{!data.leads.length && <p>No inquiries yet. New website submissions will appear here.</p>}</div></section>
      <section className="crm-approved-panel"><div className="crm-approved-heading"><h2>Quick Actions</h2></div><div className="crm-approved-actions"><button onClick={onAdd}><Plus size={16}/> Add New Inquiry</button><button onClick={() => onView('emailtemplates')}><Mail size={16}/> Send Email</button><button onClick={() => onView('whatsapp')}><MessageCircle size={16}/> Send WhatsApp</button><button onClick={() => onView('followup')}><Clock size={16}/> Schedule Follow Up</button><button onClick={() => onView('reports')}><TrendingUp size={16}/> View Reports</button><button onClick={() => onView('team')}><Users size={16}/> Manage Team</button></div></section></div>
    <DashboardWorkCards data={data} onRefresh={onRefresh} onOpenLead={onLead} onFollowUps={() => onView('followup')}/>
  </div>;
}
