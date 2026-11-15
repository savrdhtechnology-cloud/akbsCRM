import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,RefreshCw,AlertCircle,X} from 'lucide-react';
import {useCrm} from '../../lib/crm';
import {secureRequest} from '../../lib/secureRequest';
import type {Lead as UiLead,NavigationSection} from '../../types';
import type {Dashboard} from '../Dashboard';
import {LeadsView} from '../LeadsView';
import {IncompleteApplications} from '../IncompleteApplications';
import PremiumDashboard,{LeadsWorkspace} from './PremiumDashboard';
import type {LeadActions} from './LeadsTable';
import type {DraftRow,Lead} from './domain';
import {premiumData,unifiedRows} from './adapter';

type Crm=ReturnType<typeof useCrm>;
type ActionProps={leads:UiLead[];onSelectLead:(l:UiLead)=>void;onOpenQuickAction?:(key:string,l?:UiLead)=>void};
function useActions(crm:Crm,props:ActionProps,onDraft?:(l:Lead)=>void){
 const [notice,setNotice]=useState('');
 const pick=(l:Lead)=>props.leads.find(x=>x.id===l.id);
 const act=(key:string,l:Lead)=>{const x=pick(l);if(x)props.onOpenQuickAction?.(key,x);};
 const actions:LeadActions={
  onOpen:l=>{if(l.draftOnly){onDraft?.(l);return;}const x=pick(l);if(x)props.onSelectLead(x);},
  onDraft,
  onEdit:l=>act('edit',l),
  onAssign:['ADMIN','MANAGER'].includes(crm.user.role)?l=>act('assign',l):undefined,
  onFollowup:l=>act('followup',l),
  onLogCall:l=>act('call',l),
  onRegistrationReminder:async l=>{try{const out=await secureRequest('akbs-fee-reminder-email',{leadId:l.id,purpose:'registration',requestId:crypto.randomUUID()});setNotice('Registration reminder sent to '+(out.email||l.email)+'.');}catch(e){setNotice((e as Error).message);}},
  onBulkAssign:['ADMIN','MANAGER'].includes(crm.user.role)?async(ids,owner)=>{let saved=0;const errors:string[]=[];for(const id of ids){const row=crm.leads.find(l=>l.id===id);if(!row)continue;try{await crm.command('lead_update',{lead_id:id,version:row.version,assigned_to:owner});saved++;}catch(e){errors.push((e as Error).message);}}setNotice(saved+' lead(s) updated.'+(errors.length?' '+errors.join('; '):''));}:undefined,
 };
 return {actions,notice};
}
export function PremiumDashboardView(props:React.ComponentProps<typeof Dashboard>){
 const crm=useCrm();const data=premiumData(crm,props.leads);const {actions,notice}=useActions(crm,props);
 const views:Record<string,NavigationSection>={followup:'followups',task:'tasks',projects:'proposals',financing:'loans',leads:'leads'};
 return <>{notice&&<p role="status" className="pc-notice">{notice}</p>}<PremiumDashboard data={data} onView={v=>props.onSelectSection(views[v]||'leads')} canSeeFinance={['ADMIN','FINANCE','MANAGER'].includes(crm.user.role)} {...actions}/></>;
}
function useDraftRows(role:string,revision:number){
 const [drafts,setDrafts]=useState<DraftRow[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{if(role!=='ADMIN'){setDrafts([]);return;}let stopped=false;setLoading(true);setError('');(async()=>{try{const all:DraftRow[]=[];for(let offset=0;;offset+=50){const out=await secureRequest('akbs_incomplete_applications',{p_action:'list',p_kind:'customer',p_data:{offset,search:''}});const rows=Array.isArray(out.rows)?out.rows:[];all.push(...rows);if(rows.length<50)break;if(offset>=9950)throw new Error('Draft list exceeds the safe fetch limit; contact support.');}if(!stopped)setDrafts(all);}catch(e){if(!stopped)setError((e as Error).message);}finally{if(!stopped)setLoading(false);}})();return()=>{stopped=true;};},[role,revision]);
 return {drafts,error,loading};
}
export function PremiumLeadsView(props:React.ComponentProps<typeof LeadsView>&{onClearSelection:()=>void}){
 const crm=useCrm();const [revision,setRevision]=useState(0);const [draft,setDraft]=useState<DraftRow|null>(null);
 const {drafts,error,loading}=useDraftRows(crm.user.role,revision);
 const data=premiumData(crm,props.leads);
 const rows=useMemo(()=>unifiedRows(data.leads,drafts),[data.leads,drafts]);
 const {actions,notice}=useActions(crm,props,l=>{if(l.draft)setDraft(l.draft);});
 if(draft)return <div className="pc-legacy-content"><button type="button" className="pc-btn gold" onClick={()=>setDraft(null)}><ArrowLeft size={16}/>Back to all leads</button><IncompleteApplications kind="customer" embedded initialDraft={draft} onBack={()=>setDraft(null)} onCompleted={()=>{setDraft(null);setRevision(x=>x+1);void crm.refresh();}}/></div>;
 return <>{notice&&<p role="status" className="pc-notice">{notice}</p>}{crm.user.role==='ADMIN'&&<div className="pc-draft-status"><span>{loading?'Loading saved registrations…':drafts.length+' saved registration drafts included in the unified workspace. Drafts are not payment-eligible.'}</span><button type="button" className="pc-btn" onClick={()=>setRevision(x=>x+1)} disabled={loading}><RefreshCw size={16}/>Refresh</button></div>}{error&&<p role="alert" className="pc-notice"><AlertCircle size={16}/>Saved drafts could not load: {error}</p>}<LeadsWorkspace data={data} list={rows} title="All Leads" subtitle="One workspace for inquiries, submitted applications and saved registration drafts. Registration status is separate from lead stage." onAdd={props.onOpenAddLead} {...actions}/></>;
}

export function PremiumLeadPopup({onClose,...props}:React.ComponentProps<typeof LeadsView>&{onClose:()=>void}){
 const ref=React.useRef<HTMLDivElement>(null);
 React.useEffect(()=>{const prior=document.activeElement as HTMLElement|null;const previous=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'&&ref.current){const nodes=Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')).filter(el=>el.getClientRects().length>0);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',key);prior?.focus();};},[]);
 return <div className="pc-detail-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Lead details" className="pc-detail-dialog"><header className="pc-detail-top"><div><span>AKBS CRM / Lead 360°</span><h2>Lead Details</h2></div><button type="button" aria-label="Close lead details" className="pc-icon-btn" onClick={onClose}><X size={20}/></button></header><div className="pc-detail-scroll pc-legacy-content"><LeadsView {...props}/></div></div></div>;
}
