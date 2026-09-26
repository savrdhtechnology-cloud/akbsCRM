import type { Lead, LeadStatus } from '../types';
export const STAGES: Record<string, LeadStatus> = {NEW:'New',CONTACTED:'Contacted',QUALIFIED:'Qualified',SITE_VISIT:'Site Visit',DPR:'DPR',PROPOSAL:'Proposal Sent',LOAN_PROCESSING:'Loan Processing',CONVERTED:'Converted',LOST:'Lost'};
export const stageValue = (status: LeadStatus) => Object.keys(STAGES).find(key => STAGES[key] === status);
export const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';
export function mapLead(row: any, users: any[] = []): Lead {
 const d=row.details||{};
 return {id:row.id, applicationId:row.reference, name:row.name,phone:row.phone,email:row.email||'',
 source:row.source==='WEBSITE'||row.source==='CUSTOMER'?'Website':row.source==='PARTNER'?'Others':'Direct Call',
 status:STAGES[row.stage]||'New',date:dateLabel(row.created_at),time:new Date(row.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
 location:row.location||d.location||'', birdCapacity:Number(row.capacity)||0,projectType:d.poultry_type||row.project_type||'Other',
 budgetEstimate:d.budgetEstimate||(row.project_cost?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(row.project_cost):''),
 notes:row.message||'',assignedTo:users.find(u=>u.id===row.assigned_to)?.name||'Unassigned',priority:row.priority==='HIGH'?'High':row.priority==='LOW'?'Low':'Medium',isHot:row.priority==='HIGH',
 whatsApp:d.whatsApp||d.whatsapp||'',language:d.language||'',shedType:d.shedType||d.shed_type||'',landAvailable:d.landAvailable??(d.land_available===undefined?'':d.land_available?'Yes':'No'),
 landOwnership:d.landOwnership||'',landArea:String(d.landArea??d.land_area??''),loanRequired:d.loanRequired??(d.loan_required===undefined?'':d.loan_required?'Yes':'No'),
 timeline:d.timeline||'',experience:d.experience||'',supportNeeded:d.supportNeeded||[],state:d.state||'',district:d.district||'',village:d.village||'',googleMapsLink:d.googleMapsLink||''};
}
export function leadPayload(lead: Partial<Lead>) {
 const data:Record<string,any>={};
 for(const [ui,db] of Object.entries({name:'name',phone:'phone',email:'email',location:'location',notes:'message',birdCapacity:'capacity',projectType:'project_type'}))if(ui in lead)data[db]=(lead as any)[ui];
 if(lead.priority)data.priority=lead.priority==='High'?'HIGH':lead.priority==='Low'?'LOW':'NORMAL';
 const details:Record<string,any>={};
 for(const key of ['budgetEstimate','whatsApp','language','shedType','landAvailable','landOwnership','landArea','loanRequired','timeline','experience','supportNeeded','state','district','village','googleMapsLink'])if(key in lead)details[key]=(lead as any)[key];
 if(Object.keys(details).length)data.details=details;
 return data;
}
