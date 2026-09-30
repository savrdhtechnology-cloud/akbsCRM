import {useEffect,useRef,useState} from 'react';
import {secureRequest} from './secureRequest';
export type ReminderTarget={purpose:'payment'|'registration';leadId?:string;draftKind?:'customer';draftEmail?:string;draftRequestId?:string};
type ReminderState={retryAt?:string;lastSentAt?:string;state?:string};
export const reminderKey=(target:ReminderTarget)=>target.leadId?'lead:'+target.leadId+':'+target.purpose:'draft:customer:'+String(target.draftEmail||'').trim().toLowerCase()+':'+target.draftRequestId+':'+target.purpose;

export function useReminderCooldown(targets:ReminderTarget[]){
 const [states,setStates]=useState<Record<string,ReminderState>>({});
 const [sending,setSending]=useState<Set<string>>(new Set());
 const running=useRef(new Set<string>());
 const [now,setNow]=useState(Date.now());
 const signature=JSON.stringify(targets);
 useEffect(()=>{
  let cancelled=false;
  const refresh=async()=>{
   const list:ReminderTarget[]=JSON.parse(signature);
   const updates:Record<string,ReminderState>={};
   try{
    for(let i=0;i<list.length;i+=100){
     const out=await secureRequest('akbs-fee-reminder-email',{action:'status',targets:list.slice(i,i+100)});
     Object.assign(updates,out.states||{});
    }
    if(!cancelled){setStates(previous=>{
     const merged={...previous};
     for(const [key,value] of Object.entries(updates)){
      if(!previous[key]?.retryAt||Date.parse(value.retryAt||'')>=Date.parse(previous[key].retryAt||''))merged[key]=value;
     }
     return merged;
    });setNow(Date.now());}
   }catch{/* The send endpoint still enforces the waiting period if the status request fails. */}
  };
  void refresh();window.addEventListener('focus',refresh);
  const tick=window.setInterval(()=>setNow(Date.now()),1000);
  return()=>{cancelled=true;window.removeEventListener('focus',refresh);window.clearInterval(tick);};
 },[signature]);
 const remaining=(target:ReminderTarget)=>Math.max(0,Math.ceil((Date.parse(states[reminderKey(target)]?.retryAt||'')-now)/60000)||0);
 const disabled=(target:ReminderTarget)=>sending.has(reminderKey(target))||remaining(target)>0;
 const label=(target:ReminderTarget,initial:string)=>sending.has(reminderKey(target))?'Sending…':remaining(target)>0?'Resend in '+remaining(target)+' min':states[reminderKey(target)]?.lastSentAt?'Resend Reminder':initial;
 async function send(target:ReminderTarget,operation:()=>Promise<any>){
  const key=reminderKey(target);
  if(running.current.has(key))return null;
  if(remaining(target)>0)throw new Error('Reminder already sent. Wait until the 60-minute resend period ends.');
  running.current.add(key);setSending(new Set(running.current));
  try{
   const out=await operation();
   if(out){setStates(previous=>({...previous,[key]:{retryAt:out.retryAt||new Date(Date.now()+3600000).toISOString(),lastSentAt:out.lastSentAt||new Date().toISOString(),state:'SENT'}}));setNow(Date.now());}
   return out;
  }catch(error:any){
   if(error.retryAt){setStates(previous=>({...previous,[key]:{...previous[key],retryAt:error.retryAt}}));setNow(Date.now());}
   throw error;
  }finally{running.current.delete(key);setSending(new Set(running.current));}
 }
 return {send,disabled,label,remaining};
}
