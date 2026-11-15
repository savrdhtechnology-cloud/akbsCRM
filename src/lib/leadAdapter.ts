import type { Lead, LeadStatus } from '../types';
import { applicationEligible } from './feeCollections';

export const STAGES: Record<string, LeadStatus> = {
  NEW:'New', CONTACTED:'Contacted', QUALIFIED:'Qualified', SITE_VISIT:'Site Visit',
  DPR:'DPR', PROPOSAL:'Proposal Sent', LOAN_PROCESSING:'Loan Processing',
  CONVERTED:'Converted', LOST:'Lost'
};

export const stageValue = (status: LeadStatus) =>
  Object.keys(STAGES).find(key => STAGES[key] === status);

export const dateLabel = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '';

const pick = (...values:any[]) =>
  values.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

const normalizeProjectType = (value:any): Lead['projectType'] => {
  const v=String(value||'').toLowerCase();
  if(v.includes('broiler')) return 'Broiler';
  if(v.includes('layer')) return 'Layer';
  if(v.includes('breeder')) return 'Breeder';
  if(v.includes('desi')||v.includes('country')) return 'Country Chicken / Desi';
  if(v.includes('environment')||v.includes('ec')) return 'EC / Environment Controlled';
  return 'Other';
};

export function mapLead(row: any, users: any[] = []): Lead {
  const root=row.details||{};
  const portal=root.portal_form||root.formData||{};
  // Portal-submitted form is authoritative; legacy CRM detail keys remain fallback.
  const d={...root,...portal};

  const state=String(pick(d.state,''));
  const district=String(pick(d.district,''));
  const village=String(pick(d.villageOrCity,d.village,d.city,''));
  const location=String(pick(row.location,d.location,[village,district,state].filter(Boolean).join(', '),''));

  const capacity=Number(String(pick(row.capacity,d.proposedCapacity,d.capacity,0)).replace(/[^0-9]/g,''))||0;
  const projectTypeRaw=pick(d.poultryType,d.poultry_type,row.project_type,'Other');
  const fee=d._initialPayment||root._initialPayment||null;
  const feeVerification=String(fee?.verificationStatus||'').toUpperCase();
  const eligible = applicationEligible(row);
  const feeStatus: Lead['feeStatus'] = !eligible ? undefined : !fee
    ? 'Pending'
    : feeVerification==='VERIFIED'
      ? 'Verified'
      : feeVerification==='REJECTED'
        ? 'Rejected'
        : 'Proof Submitted';

  return {
    id:row.id,
    applicationId:row.reference,
    applicationEligible:eligible,
    sourceDetail:row.source==='WEBSITE' ? 'Website Inquiry Form' : ['CUSTOMER_PORTAL','CUSTOMER'].includes(row.source) ? 'Customer Self Registration' : ['PARTNER','PARTNER_PORTAL'].includes(row.source) ? 'Partner Referral' : 'Staff / Direct Lead',
    name:pick(row.name,d.fullName,''),
    phone:pick(row.phone,d.mobileNumber,'') || '',
    email:pick(row.email,d.email,'') || '',
    source:row.source==='WEBSITE'||row.source==='CUSTOMER'||row.source==='CUSTOMER_PORTAL'
      ? 'Website'
      : row.source==='PARTNER'||row.source==='PARTNER_PORTAL'
        ? 'Others'
        : 'Direct Call',
    status:STAGES[row.stage]||'New',
    date:dateLabel(row.created_at),
    time:row.created_at ? new Date(row.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '',
    location,
    birdCapacity:capacity,
    projectType:normalizeProjectType(projectTypeRaw),
    projectObjective:pick(d.projectObjective,d.project_objective,''),
    budgetEstimate:pick(d.approxProjectCost,d.budgetEstimate,d.project_cost,row.project_cost ? new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(row.project_cost):''),
    estimatedCost:pick(d.approxProjectCost,d.estimatedCost,''),
    notes:row.message||'',
    assignedTo:users.find(u=>u.id===row.assigned_to)?.name||'Unassigned',
    priority:row.priority==='HIGH'?'High':row.priority==='LOW'?'Low':'Medium',
    isHot:row.priority==='HIGH',

    whatsApp:pick(d.whatsAppNumber,d.whatsApp,d.whatsapp,''),
    language:pick(d.preferredLanguage,d.language,''),
    shedType:pick(d.shedType,d.shed_type,''),
    landAvailable:pick(d.hasLand,d.landAvailable,d.land_available===undefined?'':d.land_available?'Yes':'No',''),
    landOwnership:pick(d.landOwnership,''),
    landArea:String(pick(d.landAreaAcres,d.landArea,d.land_area,'')),
    loanRequired:pick(d.needsLoan,d.loanRequired,d.loan_required===undefined?'':d.loan_required?'Yes':'No',''),
    ownContribution:pick(d.ownContribution,''),
    approxLoanAmount:pick(d.approxLoanAmount,''),
    discussedWithBank:pick(d.discussedWithBank,''),
    timeline:pick(d.startTimeline,d.timeline,''),
    experience:pick(d.experience,''),
    supportNeeded:Array.isArray(d.supportNeeded)
      ? d.supportNeeded
      : String(d.supportNeeded||'').split(',').map((x:string)=>x.trim()).filter(Boolean),
    state,
    district,
    village,
    googleMapsLink:pick(d.googleMapsLink,''),
    feeStatus,
    feeAmount:eligible ? Number(fee?.amount ?? 2999) : 0,
    feeReference:String(fee?.reference||''),
    feeProofSubmitted:Boolean(fee?.proofPath),
    feeSubmittedAt:String(fee?.submittedAt||'')
  } as Lead;
}

export function leadPayload(lead: Partial<Lead>) {
  const data:Record<string,any>={};
  for(const [ui,db] of Object.entries({
    name:'name', phone:'phone', email:'email', location:'location',
    notes:'message', birdCapacity:'capacity', projectType:'project_type'
  })) if(ui in lead) data[db]=(lead as any)[ui];

  if(lead.priority) data.priority=lead.priority==='High'?'HIGH':lead.priority==='Low'?'LOW':'NORMAL';

  const details:Record<string,any>={};
  for(const key of [
    'projectObjective','budgetEstimate','estimatedCost','whatsApp','language','shedType',
    'landAvailable','landOwnership','landArea','loanRequired','ownContribution',
    'approxLoanAmount','discussedWithBank','timeline','experience','supportNeeded',
    'state','district','village','googleMapsLink'
  ]) if(key in lead) details[key]=(lead as any)[key];

  if(Object.keys(details).length) data.details=details;
  return data;
}
