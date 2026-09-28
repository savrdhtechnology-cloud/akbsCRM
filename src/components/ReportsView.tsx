import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, UserRound, FileText, BadgeIndianRupee, Bird, Target, TrendingUp,
  Download, MapPin, Activity, Wallet, CheckCircle2, Clock3, ShieldCheck,
  BarChart3, PieChart, Building2, ClipboardList
} from 'lucide-react';
import { Lead, Customer } from '../types';
import { useCrm } from '../lib/crm';

interface ReportsViewProps {
  leads: Lead[];
  customers: Customer[];
}

type Tab='overview'|'leads'|'projects'|'revenue'|'geographic'|'team'|'downloads';

const money=(n:number)=>{
  const value=Number(n||0);
  if(value>=10000000) return `₹ ${(value/10000000).toFixed(value>=100000000?0:2)} Cr`;
  if(value>=100000) return `₹ ${(value/100000).toFixed(value>=1000000?1:2)} L`;
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
};
const num=(n:number)=>new Intl.NumberFormat('en-IN').format(Number(n||0));
const pct=(a:number,b:number)=>b?Math.round(a/b*100):0;
const monthKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

export const ReportsView: React.FC<ReportsViewProps> = ({ leads, customers }) => {
  const crm=useCrm();
  const [tab,setTab]=useState<Tab>('overview');
  const [feeData,setFeeData]=useState<any>(null);
  const [feeRows,setFeeRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const [fee,tx]=await Promise.all([
          crm.fee('snapshot',{}).catch(()=>null),
          crm.feeTransactions('snapshot',{}).catch(()=>({rows:[]}))
        ]);
        if(!active)return;
        setFeeData(fee);
        setFeeRows(tx?.rows||[]);
      } finally {
        if(active)setLoading(false);
      }
    })();
    return()=>{active=false};
  },[]);

  const convertedCount=leads.filter(l=>l.status==='Converted').length;
  const conversionRate=pct(convertedCount,leads.length);
  const totalCapacity=customers.reduce((a,c)=>a+Number(c.capacity||0),0);
  const liveCapacity=customers.reduce((a,c)=>a+Number(c.currentBatchBirds||c.capacity||0),0);
  const pipelineLeads=leads.filter(l=>!['Converted','Lost'].includes(l.status));
  const pipelineCapital=pipelineLeads.reduce((sum,l)=>{
    const raw=String(l.estimatedCost||l.budgetEstimate||'').replace(/,/g,'');
    const cr=raw.match(/([0-9.]+)\s*Cr/i);
    const lakh=raw.match(/([0-9.]+)\s*(Lakh|Lakhs|L)/i);
    if(cr)return sum+Number(cr[1])*10000000;
    if(lakh)return sum+Number(lakh[1])*100000;
    const numeric=Number(raw.replace(/[^0-9.]/g,''));
    return sum+(Number.isFinite(numeric)?numeric:0);
  },0);

  const portalFeeRows=(feeData?.rows||[]).map((r:any)=>({
    customerName:r.customerName,
    applicationId:r.applicationId,
    serviceType:'Initial Registration Fee',
    payable:Number(r.amount||feeData?.config?.payableFee||0),
    status:String(r.status||'PENDING').toUpperCase(),
    createdAt:r.submittedAt||r.createdAt,
    paymentMethod:r.reference?'Customer Submitted':'—',
    transactionRef:r.reference||''
  }));
  const allFeeRows=[...portalFeeRows,...feeRows];
  const verifiedFees=allFeeRows.filter((r:any)=>String(r.status).toUpperCase()==='VERIFIED');
  const pendingFees=allFeeRows.filter((r:any)=>['PENDING'].includes(String(r.status).toUpperCase()));
  const reviewFees=allFeeRows.filter((r:any)=>['UNDER_REVIEW','PROOF_SUBMITTED'].includes(String(r.status).toUpperCase()));
  const refundedFees=allFeeRows.filter((r:any)=>String(r.status).toUpperCase()==='REFUNDED');
  const totalRevenue=verifiedFees.reduce((a:number,r:any)=>a+Number(r.payable||r.amount||0),0);
  const pendingRevenue=[...pendingFees,...reviewFees].reduce((a:number,r:any)=>a+Number(r.payable||r.amount||0),0);
  const refundedRevenue=refundedFees.reduce((a:number,r:any)=>a+Number(r.payable||r.amount||0),0);

  const stateRows=useMemo(()=>{
    const map=new Map<string,{state:string,farms:number,birds:number}>();
    customers.forEach(c=>{
      const state=(c.state||'Unknown').trim()||'Unknown';
      const x=map.get(state)||{state,farms:0,birds:0};
      x.farms+=1;x.birds+=Number(c.capacity||0);map.set(state,x);
    });
    if(map.size===0){
      leads.forEach(l=>{
        const state=(l.state||'Unknown').trim()||'Unknown';
        const x=map.get(state)||{state,farms:0,birds:0};
        x.farms+=l.status==='Converted'?1:0;
        x.birds+=l.status==='Converted'?Number(l.birdCapacity||0):0;
        map.set(state,x);
      });
    }
    return [...map.values()].sort((a,b)=>b.birds-a.birds);
  },[customers,leads]);
  const maxState=Math.max(1,...stateRows.map(x=>x.birds));

  const teamRows=useMemo(()=>{
    const map=new Map<string,{name:string,total:number,converted:number,active:number,capacity:number}>();
    leads.forEach(l=>{
      const name=l.assignedTo||'Unassigned';
      const x=map.get(name)||{name,total:0,converted:0,active:0,capacity:0};
      x.total++;
      if(l.status==='Converted'){x.converted++;x.capacity+=Number(l.birdCapacity||0)}
      if(!['Converted','Lost'].includes(l.status))x.active++;
      map.set(name,x);
    });
    return [...map.values()].sort((a,b)=>b.converted-a.converted||b.total-a.total);
  },[leads]);

  const monthly=useMemo(()=>{
    const months=Array.from({length:6},(_,i)=>{
      const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-(5-i));
      return {key:monthKey(d),label:d.toLocaleDateString('en-IN',{month:'short',year:'numeric'}),leads:0,converted:0,revenue:0};
    });
    const byKey=new Map(months.map(x=>[x.key,x]));
    leads.forEach(l=>{
      const d=new Date(l.date||'');
      if(!Number.isNaN(d.getTime())){
        const m=byKey.get(monthKey(d)); if(m){m.leads++;if(l.status==='Converted')m.converted++;}
      }
    });
    verifiedFees.forEach((r:any)=>{
      const d=new Date(r.createdAt||'');
      if(!Number.isNaN(d.getTime())){const m=byKey.get(monthKey(d));if(m)m.revenue+=Number(r.payable||r.amount||0);}
    });
    return months;
  },[leads,verifiedFees.length,totalRevenue]);
  const maxMonthlyLeads=Math.max(1,...monthly.map(x=>x.leads));
  const maxMonthlyRevenue=Math.max(1,...monthly.map(x=>x.revenue));

  const recentActivities=useMemo(()=>{
    const fromCrm=(crm.activities||[]).slice(0,8).map((a:any)=>({
      date:a.created_at,
      type:a.action||'Activity',
      title:a.note||a.action||'CRM activity',
      related:a.actor_name||'System',
      status:'Recorded',
      createdBy:a.actor_name||'System'
    }));
    if(fromCrm.length)return fromCrm;
    return leads.slice(0,8).map(l=>({
      date:l.date,
      type:'Lead',
      title:`${l.name} · ${l.status}`,
      related:l.applicationId||l.phone,
      status:l.status,
      createdBy:l.assignedTo||'System'
    }));
  },[crm.activities,leads]);

  const exportCsv=(rows:any[],name:string)=>{
    if(!rows.length)return;
    const keys=Object.keys(rows[0]);
    const csv=[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
  };

  const exportReport=()=>exportCsv([
    {Metric:'Total Leads',Value:leads.length},
    {Metric:'Total Customers',Value:customers.length},
    {Metric:'Converted Leads',Value:convertedCount},
    {Metric:'Conversion Rate',Value:`${conversionRate}%`},
    {Metric:'Live Bird Capacity',Value:liveCapacity},
    {Metric:'Pipeline Capital',Value:pipelineCapital},
    {Metric:'Verified Revenue',Value:totalRevenue},
    {Metric:'Pending Revenue',Value:pendingRevenue}
  ],'AKBS-Business-Intelligence-Summary.csv');

  const tabs:Array<[Tab,string]>=[
    ['overview','Overview'],['leads','Leads & Conversions'],['projects','Projects & Capacity'],
    ['revenue','Revenue & Collections'],['geographic','Geographic Insights'],['team','Team Performance'],['downloads','Downloads']
  ];

  const KPI=[
    ['Total Leads',num(leads.length),Users,'bg-emerald-50 text-emerald-700'],
    ['Total Customers',num(customers.length),UserRound,'bg-green-50 text-green-700'],
    ['Projects in Pipeline',num(pipelineLeads.length),FileText,'bg-blue-50 text-blue-700'],
    ['Total Revenue',money(totalRevenue),BadgeIndianRupee,'bg-emerald-50 text-emerald-700'],
    ['Bird Capacity (Live)',liveCapacity>=10000000?`${(liveCapacity/10000000).toFixed(2)} Cr`:num(liveCapacity),Bird,'bg-amber-50 text-amber-700'],
    ['Conversion Rate',`${conversionRate}%`,Target,'bg-violet-50 text-violet-700']
  ] as const;

  return <div className="p-4 lg:p-5 space-y-4 max-w-[1800px] mx-auto">
    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
      <div>
        <div className="text-[10px] text-slate-400">Home &nbsp;›&nbsp; Reports</div>
        <h1 className="mt-2 text-2xl font-black text-slate-950 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-emerald-700"/>Reports & Business Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Complete CRM insights from leads and projects to fees, collections, geography and team performance.</p>
      </div>
      <button onClick={exportReport} className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-2 self-start"><Download className="w-4 h-4"/>Export Report</button>
    </div>

    <div className="border-b border-slate-200 overflow-x-auto">
      <div className="flex min-w-max gap-1">
        {tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${tab===id?'border-emerald-600 text-emerald-800':'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
      </div>
    </div>

    <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
      {KPI.map(([label,value,Icon,cls])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm min-h-[105px]">
        <div className="flex items-start gap-3"><div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${cls}`}><Icon className="w-5 h-5"/></div><div className="min-w-0"><div className="text-[10px] font-bold text-slate-600">{label}</div><div className="mt-1 text-xl font-black text-slate-950 whitespace-nowrap">{value}</div><div className="mt-1 text-[9px] text-emerald-600 font-bold">Live CRM data</div></div></div>
      </div>)}
    </div>

    {tab==='overview'&&<>
      <div className="grid xl:grid-cols-[1.35fr_1fr] gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Lead-to-Customer Conversion Trend</h2><p className="text-[10px] text-slate-400 mt-0.5">Last 6 months · derived from CRM leads</p></div><TrendingUp className="w-5 h-5 text-emerald-600"/></div>
          <div className="mt-5 h-64 border-l border-b border-slate-200 flex items-end gap-4 px-4 pb-3">
            {monthly.map((m,i)=><div key={m.key} className="flex-1 h-full flex items-end justify-center gap-1 relative">
              <div className="w-8 rounded-t bg-emerald-200" style={{height:`${Math.max(4,m.leads/maxMonthlyLeads*190)}px`}} title={`Leads: ${m.leads}`}/>
              <div className="w-8 rounded-t bg-emerald-700" style={{height:`${Math.max(4,m.converted/maxMonthlyLeads*190)}px`}} title={`Converted: ${m.converted}`}/>
              <span className="absolute -bottom-6 text-[9px] text-slate-400 whitespace-nowrap">{m.label.split(' ')[0]}</span>
            </div>)}
          </div>
          <div className="mt-7 flex items-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-200"/>Leads</span><span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-emerald-700"/>Converted</span></div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Geographic Distribution of Farms</h2><MapPin className="w-5 h-5 text-emerald-600"/></div>
          <div className="mt-4 space-y-4">{stateRows.slice(0,7).map((s,index)=><div key={s.state}>
            <div className="flex items-center justify-between gap-3 text-xs"><div className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"/><span className="font-semibold text-slate-800 truncate">{s.state}</span></div><span className="font-mono font-bold text-slate-600 whitespace-nowrap">{num(s.birds)} ({s.farms} units)</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{width:`${Math.max(4,s.birds/maxState*100)}%`}}/></div>
          </div>)}{!stateRows.length&&<div className="py-12 text-center text-xs text-slate-400">No geographic customer data available yet.</div>}</div>
        </section>
      </div>

      <div className="grid xl:grid-cols-[1.15fr_.9fr_.65fr] gap-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">Revenue Trend</h2>
          <div className="mt-5 h-48 border-l border-b border-slate-200 flex items-end gap-4 px-4 pb-3">
            {monthly.map(m=><div key={m.key} className="flex-1 h-full flex items-end justify-center relative"><div className="w-10 max-w-full rounded-t bg-gradient-to-t from-emerald-700 to-emerald-400" style={{height:`${Math.max(4,m.revenue/maxMonthlyRevenue*145)}px`}} title={money(m.revenue)}/><span className="absolute -bottom-6 text-[9px] text-slate-400">{m.label.split(' ')[0]}</span></div>)}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">Fee Collection Status</h2>
          <div className="mt-5 flex items-center gap-5">
            <div className="w-32 h-32 rounded-full grid place-items-center shrink-0" style={{background:`conic-gradient(#079669 0 ${totalRevenue+pendingRevenue?totalRevenue/(totalRevenue+pendingRevenue)*100:0}%, #facc15 ${totalRevenue+pendingRevenue?totalRevenue/(totalRevenue+pendingRevenue)*100:0}% 100%)`}}><div className="w-20 h-20 rounded-full bg-white grid place-items-center text-center"><div><div className="text-lg font-black">{money(totalRevenue+pendingRevenue)}</div><div className="text-[9px] text-slate-400">Total Fees</div></div></div></div>
            <div className="flex-1 space-y-2 text-[10px]"><div className="flex justify-between"><span>Collected</span><b>{money(totalRevenue)}</b></div><div className="flex justify-between"><span>Pending</span><b>{money(pendingRevenue)}</b></div><div className="flex justify-between"><span>Verification</span><b>{reviewFees.length}</b></div><div className="flex justify-between"><span>Refunded</span><b>{money(refundedRevenue)}</b></div></div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">Quick Reports</h2>
          <div className="mt-3 space-y-2">
            {[
              ['Lead Conversion Report','leads' as Tab,Users],
              ['Project Pipeline Report','projects' as Tab,FileText],
              ['Revenue & Collection Report','revenue' as Tab,BadgeIndianRupee],
              ['Geographic Distribution','geographic' as Tab,MapPin],
              ['Team Performance','team' as Tab,Activity],
              ['Download Custom Report','downloads' as Tab,Download]
            ].map(([label,id,Icon]:any)=><button key={label} onClick={()=>setTab(id)} className="w-full min-h-9 px-3 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-100 flex items-center gap-2 text-[10px] font-bold text-slate-700"><Icon className="w-4 h-4 text-emerald-600"/><span className="flex-1 text-left">{label}</span><span>›</span></button>)}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Recent Activities & Insights</h2><span className="text-[10px] text-slate-400">Live CRM activity</span></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="p-3 text-left">Date & Time</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Title / Description</th><th className="p-3 text-left">Related To</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Created By</th></tr></thead><tbody>{recentActivities.map((a:any,i)=><tr key={i} className="border-t"><td className="p-3 text-[10px]">{a.date?new Date(a.date).toLocaleString('en-IN'):'—'}</td><td className="p-3 font-bold">{a.type}</td><td className="p-3">{a.title}</td><td className="p-3">{a.related}</td><td className="p-3"><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold">{a.status}</span></td><td className="p-3">{a.createdBy}</td></tr>)}</tbody></table></div>
      </section>
    </>}

    {tab==='leads'&&<section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Leads & Conversions</h2><div className="mt-5 grid md:grid-cols-4 gap-3">{['New','Contacted','Qualified','Converted'].map(s=><div key={s} className="rounded-xl border p-4"><div className="text-[10px] text-slate-400 uppercase">{s}</div><div className="mt-1 text-2xl font-black">{leads.filter(l=>l.status===s).length}</div></div>)}</div><div className="mt-5 space-y-2">{leads.slice(0,20).map(l=><div key={l.id} className="rounded-lg border px-3 py-2 flex items-center justify-between gap-3 text-xs"><div><b>{l.name}</b><div className="text-[10px] text-slate-400">{l.location} · {l.source}</div></div><div className="text-right"><span className="px-2 py-1 rounded-full bg-slate-100 font-bold">{l.status}</span><div className="text-[10px] text-slate-400 mt-1">{l.assignedTo}</div></div></div>)}</div></section>}

    {tab==='projects'&&<section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Projects & Capacity</h2><div className="mt-5 grid md:grid-cols-3 gap-3"><div className="rounded-xl border p-4"><div className="text-[10px] text-slate-400">Operational Farms</div><div className="text-2xl font-black mt-1">{customers.length}</div></div><div className="rounded-xl border p-4"><div className="text-[10px] text-slate-400">Live Capacity</div><div className="text-2xl font-black mt-1">{num(liveCapacity)}</div></div><div className="rounded-xl border p-4"><div className="text-[10px] text-slate-400">Pipeline Leads</div><div className="text-2xl font-black mt-1">{pipelineLeads.length}</div></div></div><div className="mt-5 space-y-2">{customers.map(c=><div key={c.id} className="rounded-lg border px-3 py-2 grid sm:grid-cols-4 gap-2 text-xs"><b>{c.farmName||c.name}</b><span>{c.state}</span><span>{num(c.capacity)} birds</span><span className="font-bold text-emerald-700">{c.status}</span></div>)}</div></section>}

    {tab==='revenue'&&<section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Revenue & Collections</h2><div className="mt-5 grid md:grid-cols-4 gap-3">{[['Collected',totalRevenue],['Pending',pendingRevenue],['Under Verification',reviewFees.length],['Refunded',refundedRevenue]].map(([l,v])=><div key={String(l)} className="rounded-xl border p-4"><div className="text-[10px] text-slate-400">{l}</div><div className="text-2xl font-black mt-1">{l==='Under Verification'?v:money(Number(v))}</div></div>)}</div><div className="mt-5 overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Application</th><th className="p-3 text-left">Service</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{allFeeRows.slice(0,30).map((r:any,i)=><tr key={i} className="border-t"><td className="p-3 font-bold">{r.customerName||'—'}</td><td className="p-3">{r.applicationId||'—'}</td><td className="p-3">{r.serviceType||'Fee'}</td><td className="p-3 font-black">{money(Number(r.payable||r.amount||0))}</td><td className="p-3">{r.status}</td></tr>)}</tbody></table></div></section>}

    {tab==='geographic'&&<section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Geographic Insights</h2><div className="mt-5 space-y-4">{stateRows.map(s=><div key={s.state}><div className="flex justify-between text-xs"><b>{s.state}</b><span>{num(s.birds)} birds · {s.farms} farms</span></div><div className="mt-1.5 h-3 rounded-full bg-slate-100"><div className="h-full bg-emerald-600 rounded-full" style={{width:`${Math.max(4,s.birds/maxState*100)}%`}}/></div></div>)}</div></section>}

    {tab==='team'&&<section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Team Performance</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Team Member</th><th className="p-3 text-left">Total Leads</th><th className="p-3 text-left">Active</th><th className="p-3 text-left">Converted</th><th className="p-3 text-left">Conversion</th><th className="p-3 text-left">Converted Capacity</th></tr></thead><tbody>{teamRows.map(r=><tr key={r.name} className="border-t"><td className="p-3 font-bold">{r.name}</td><td className="p-3">{r.total}</td><td className="p-3">{r.active}</td><td className="p-3">{r.converted}</td><td className="p-3 font-bold text-emerald-700">{pct(r.converted,r.total)}%</td><td className="p-3">{num(r.capacity)}</td></tr>)}</tbody></table></div></section>}

    {tab==='downloads'&&<section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Downloads</h2><p className="mt-1 text-xs text-slate-500">Export analyzed CRM data for management review.</p><div className="mt-5 grid md:grid-cols-2 xl:grid-cols-3 gap-3">{[
      ['Business Intelligence Summary',exportReport],
      ['Leads Report',()=>exportCsv(leads as any[],'AKBS-Leads.csv')],
      ['Customers & Capacity',()=>exportCsv(customers as any[],'AKBS-Customers.csv')],
      ['Fee Transactions',()=>exportCsv(allFeeRows,'AKBS-Fee-Transactions.csv')],
      ['Geographic Report',()=>exportCsv(stateRows,'AKBS-Geographic-Report.csv')],
      ['Team Performance',()=>exportCsv(teamRows,'AKBS-Team-Performance.csv')]
    ].map(([label,fn]:any)=><button key={label} onClick={fn} className="rounded-xl border p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition"><Download className="w-5 h-5 text-emerald-600"/><div className="mt-2 text-sm font-black text-slate-900">{label}</div><div className="text-[10px] text-slate-400 mt-1">Download CSV</div></button>)}</div></section>}

    {loading&&<div className="fixed bottom-4 right-4 rounded-full bg-slate-900 text-white px-3 py-2 text-[10px] shadow-lg">Analyzing live CRM data…</div>}
  </div>;
};
