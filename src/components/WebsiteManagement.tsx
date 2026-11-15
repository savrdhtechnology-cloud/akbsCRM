import React,{useEffect,useState} from 'react';
import {ExternalLink,Globe,Save,RotateCcw,CheckCircle2,Mail,Users,RefreshCw} from 'lucide-react';
import {useCrm} from '../lib/crm';
import type {Lead as UiLead} from '../types';
import {premiumData} from './premium/adapter';
import {PremiumHero,ChartCard,KpiCards,StatusPill} from './premium/Blocks';
import LeadsTable from './premium/LeadsTable';
import type {LeadTab} from './premium/metrics';
import type {Lead} from './premium/domain';

type Profile={brandName:string;officeAddress:string;phone:string;email:string};
const DEFAULT:Profile={brandName:'AKBS Poultry Farming',officeAddress:'01 Sage Milstone Mall, Bhopal, M.P.',phone:'+91 9893345906',email:'info@akbspoultry.com'};
const KEY='akbs-website-profile';
const normalize=(value:unknown):Profile=>({...DEFAULT,...(value&&typeof value==='object'?value:{})});
export default function WebsiteManagement({leads,onOpenLead,onEditLead}:{leads:UiLead[];onOpenLead:(l:UiLead)=>void;onEditLead:(l:UiLead)=>void}){
 const crm=useCrm();const data=premiumData(crm,leads);const list=data.leads.filter(l=>/website|inquiry/i.test(l.source));
 const record=crm.records.find(r=>r.kind==='settings'&&r.data?.key===KEY);
 const [profile,setProfile]=useState<Profile>(()=>normalize(record?.data?.draft||record?.data?.published));
 const [loadedId,setLoadedId]=useState(record?.id||'');const [tab,setTab]=useState<LeadTab>('All');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [publicReady,setPublicReady]=useState<boolean|null>(null);
 useEffect(()=>{if(record&&record.id!==loadedId){setProfile(normalize(record.data?.draft||record.data?.published));setLoadedId(record.id);}},[record?.id,loadedId]);
 useEffect(()=>{let active=true;fetch('/api/website-profile',{cache:'no-store'}).then(r=>{if(active)setPublicReady(r.ok);}).catch(()=>{if(active)setPublicReady(false);});return()=>{active=false;};},[]);
 const update=(key:keyof Profile,value:string)=>setProfile(p=>({...p,[key]:value}));
 const open=(l:Lead)=>{const x=leads.find(y=>y.id===l.id);if(x)onOpenLead(x);};
 async function save(publish=false,restore=false){if(crm.user.role!=='ADMIN')return;setBusy(true);setNotice('');try{
  if(publish&&!publicReady)throw new Error('Public profile endpoint is not yet available. Save a draft until database publication is configured.');
  const p=restore?normalize(record?.data?.original||DEFAULT):profile;
  if(!p.brandName.trim()||!p.officeAddress.trim()||!/^\+?[\d ()-]{10,20}$/.test(p.phone)||!p.email.includes('@'))throw new Error('Enter valid public company, office, phone and email details.');
  const current=crm.records.find(r=>r.kind==='settings'&&r.data?.key===KEY);
  const payload={...(current?{id:current.id,version:current.version}:{}),kind:'settings',data:{key:KEY,original:normalize(current?.data?.original||DEFAULT),draft:p,published:publish?p:current?.data?.published||null}};
  await crm.command('record_save',payload);setProfile(p);setNotice(publish?'Public website profile published.':'Website profile draft saved to the existing AKBS database.');
 }catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 if(crm.user.role!=='ADMIN')return null;
 return <div className="pc-page"><PremiumHero crumb="CRM / Website Management" title="Website Management" subtitle="One central workspace for the AKBS public website, website inquiries and public branding.">
 <KpiCards compact items={[{label:'Website inquiries',value:list.length,icon:Globe,tone:'#3b82f6',onClick:()=>setTab('All')},{label:'New inquiries',value:list.filter(l=>l.stage==='NEW').length,icon:Users,tone:'#22c55e',onClick:()=>setTab('New')},{label:'Converted',value:list.filter(l=>l.stage==='CONVERTED').length,icon:CheckCircle2,tone:'#14b8a6',onClick:()=>setTab('Converted')}]}/>
 </PremiumHero>
 {notice&&<p className="pc-notice" role="status">{notice}</p>}
 <div className="pc-grid-2"><ChartCard title="Public website" icon={Globe}><div className="pc-website-preview"><img src="/images/akbs/dashboard-hero.webp" alt="AKBS poultry farming" /><h3>{profile.brandName}</h3><p>{profile.officeAddress}</p><p>{profile.phone} · {profile.email}</p><div className="pc-website-actions"><a className="pc-btn gold" href="https://www.akbspoultry.com" target="_blank" rel="noreferrer">Open website <ExternalLink size={15}/></a><a className="pc-btn" href="https://www.akbspoultry.com/about" target="_blank" rel="noreferrer">About page <ExternalLink size={15}/></a><a className="pc-btn" href="/customer-registration" target="_blank" rel="noreferrer">Registration <ExternalLink size={15}/></a></div></div></ChartCard>
 <ChartCard title="Public profile settings" icon={Save} badge={<StatusPill kind="neutral" value={publicReady===null?'Checking':publicReady?'Publishing available':'Draft mode'}/>}><form className="pc-website-form" onSubmit={e=>{e.preventDefault();void save(false);}}><label>Website display name<input value={profile.brandName} onChange={e=>update('brandName',e.target.value)} maxLength={120} required/></label><label>Public office address<textarea value={profile.officeAddress} onChange={e=>update('officeAddress',e.target.value)} maxLength={300} required/></label><label>Contact number<input value={profile.phone} onChange={e=>update('phone',e.target.value)} maxLength={30} required/></label><label>Public email<input type="email" value={profile.email} onChange={e=>update('email',e.target.value)} maxLength={150} required/></label><p className="pc-muted">Public display changes do not alter the registered company name, contracts, tax records or customer data.</p><div className="pc-website-actions"><button className="pc-btn" disabled={busy} type="submit"><Save size={15}/>Save draft</button><button className="pc-btn gold" disabled={busy||!publicReady} type="button" onClick={()=>void save(true)}>Publish to website</button><button className="pc-btn" type="button" disabled={busy} onClick={()=>void save(!!publicReady,true)}><RotateCcw size={15}/>Restore original</button></div>{publicReady===false&&<p className="pc-muted">Draft changes are saved in the CRM. The public profile database endpoint must be enabled before publication.</p>}</form></ChartCard></div>
 <LeadsTable data={data} leads={list} tab={tab} onTab={setTab} title="Website Lead Inbox" subtitle="Live website inquiries from the shared AKBS database." onOpen={open} onEdit={l=>{const x=leads.find(y=>y.id===l.id);if(x)onEditLead(x);}}/>
 </div>;
}
