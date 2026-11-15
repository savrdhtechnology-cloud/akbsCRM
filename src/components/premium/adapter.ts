import type {Lead as UiLead} from '../../types';
import type {useCrm} from '../../lib/crm';
import {mapLead} from '../../lib/leadAdapter';
import {applicationEligible} from '../../lib/feeCollections';
import type {DashboardData,Lead,DraftRow,Stage,Workflow} from './domain';

type Crm=ReturnType<typeof useCrm>;
const asText=(v:unknown)=>String(v??'');
const asNumber=(v:unknown)=>Number.isFinite(Number(v))?Number(v):0;
export function premiumData(crm:Crm,visible:UiLead[]):DashboardData {
 const ids=new Set(visible.map(l=>l.id));
 const leads:Lead[]=crm.leads.filter(l=>ids.has(l.id)).map(row=>{
  const ui=mapLead(row,crm.users);
  const raw=row as typeof row&{updated_at?:string};
  return {...row,name:ui.name,phone:ui.phone,email:ui.email,location:ui.location,stage:row.stage as Stage,
   capacity:ui.birdCapacity,project_type:ui.projectType,project_cost:asNumber(row.project_cost),
   reference:asText(row.reference),details:row.details||{},applicationEligible:applicationEligible(row),
   updated_at:raw.updated_at||row.created_at};
 });
 const stages:Record<string,number>={},sources:Record<string,number>={};
 for(const l of leads){stages[l.stage]=(stages[l.stage]||0)+1;sources[l.source]=(sources[l.source]||0)+1;}
 return {user:crm.user,users:crm.users,leads,activities:crm.activities,workflows:crm.workflows.filter(w=>ids.has(w.lead_id)).map(w=>({...w,created_at:w.created_at||w.due_at||'',kind:w.kind as Workflow['kind']})),total:leads.length,stats:{stages,sources,project_value:leads.reduce((s,l)=>s+asNumber(l.project_cost),0)}};
}
const emailKey=(s:string)=>s.trim().toLowerCase();
const phoneKey=(s:string)=>s.replace(/\D/g,'').replace(/^91(\d{10})$/,'$1').replace(/^0(\d{10})$/,'$1');
/** A saved draft is not an application or a payment-eligible lead. Link only a unique exact email + mobile match. */
export function unifiedRows(leads:Lead[],drafts:DraftRow[]):Lead[]{
 const out=leads.map(l=>({...l}));
 for(const d of drafts){
  if(!d.requestId||!d.email)continue;
  const phone=asText(d.mobile||d.form?.mobileNumber||d.form?.mobile);
  const matched=out.filter(l=>!l.draftOnly&&!l.draft&&!l.applicationEligible&&emailKey(l.email||'')===emailKey(d.email)&&phoneKey(phone).length>=10&&phoneKey(l.phone||'')===phoneKey(phone));
  const matchingDrafts=drafts.filter(x=>emailKey(x.email||'')===emailKey(d.email)&&phoneKey(asText(x.mobile||x.form?.mobileNumber||x.form?.mobile))===phoneKey(phone));
  if(matched.length===1&&matchingDrafts.length===1){matched[0].draft=d;continue;}
  const form=d.form||{};
  out.push({id:'draft:'+d.requestId,reference:'Saved draft',name:d.name||asText(form.fullName)||'Name pending',phone,email:d.email,location:[form.villageOrCity||form.city,form.district,form.state].filter(Boolean).join(', '),source:'SAVED_DRAFT',stage:'NEW',priority:'NORMAL',project_type:asText(form.poultryType),capacity:asNumber(form.proposedCapacity),project_cost:0,assigned_to:null,details:form,version:0,created_at:d.signupAt||d.updatedAt,updated_at:d.updatedAt||d.signupAt,applicationEligible:false,draft:d,draftOnly:true});
 }
 return out;
}
