export type PortalKind = 'customer' | 'partner';
export type Field = {key:string;label:string;required?:boolean;options?:string[];type?:'array'|'number'|'textarea'};
export type Group={title:string;fields:Field[]};
const field=(key:string,label:string,required=false,options?:string[]):Field=>({key,label,required,options});
export const customerGroups:Group[]=[
 {title:'Basic Details',fields:[field('fullName','Full name',true),field('mobileNumber','Mobile number',true),field('whatsAppNumber','WhatsApp number'),field('email','Verified email',true),field('preferredLanguage','Preferred language',true,['Hindi','English'])]},
 {title:'Project Details',fields:[field('projectObjective','Project objective',true,['New Poultry Farm','Existing Farm Expansion','Farm Renovation','Capacity Expansion']),field('poultryType','Poultry type',true,['Broiler (Meat)','Layer (Egg)','EC / Environment Controlled','Other']),field('shedType','Shed type',true,['EC (Environment Controlled)','Conventional / Normal']),field('proposedCapacity','Bird capacity',true)]},
 {title:'Land & Location',fields:[field('hasLand','Land available',true,['Yes','No']),field('landOwnership','Land ownership',true,['Own Land','Leased Land','Family Land','Buying New Land']),field('landAreaAcres','Land area (acres)',true),field('state','State',true),field('district','District',true),field('villageOrCity','Village / city',true),field('googleMapsLink','Google Maps HTTPS link')]},
 {title:'Financial Details',fields:[field('approxProjectCost','Approximate project cost',true),field('needsLoan','Loan required',true,['Yes','No','Need guidance']),field('ownContribution','Own contribution',true),field('approxLoanAmount','Approximate loan amount'),field('discussedWithBank','Discussed with bank',true,['Yes','No'])]},
 {title:'Experience & Support',fields:[field('experience','Experience',true),{key:'supportNeeded',label:'Support required (comma-separated)',required:true,type:'array'},field('startTimeline','Start timeline',true,['Immediately','Within 1 month','Within 3 months','In 3-6 months','Planning stage'])]}
];
export const partnerGroups:Group[]=[
 {title:'Contact Details',fields:[field('fullName','Full name',true),field('mobile','Mobile number',true),field('email','Verified email',true)]},
 {title:'Business Details',fields:[field('businessName','Business / firm name'),field('category','Partner category',true),field('profession','Profession'),field('experience','Experience')]},
 {title:'Location',fields:[field('city','City',true),field('state','State',true),{key:'message',label:'Message / interests',type:'textarea'}]}
];
export const groupsFor=(kind:PortalKind)=>kind==='customer'?customerGroups:partnerGroups;
const filled=(v:unknown)=>Array.isArray(v)?v.length>0:v!==undefined&&v!==null&&String(v).trim()!=='';
export function draftProgress(kind:PortalKind,form:Record<string,any>){
 const groups=groupsFor(kind).map(g=>({...g,fields:g.fields.filter(f=>f.required||f.key==='approxLoanAmount'&&form.needsLoan==='Yes')}));
 const fields=groups.flatMap(g=>g.fields);const completed=fields.filter(f=>filled(form[f.key])).length;
 let lastCompleted='OTP verified';for(const group of groups){if(group.fields.every(f=>filled(form[f.key])))lastCompleted=group.title;else break;}
 return {percent:Math.min(99,Math.round(completed/(fields.length+1)*100)),lastCompleted,completed,required:fields.length};
}
