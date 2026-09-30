export const emailEscape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const pdfBase64=(bytes:Uint8Array)=>{
 let value='';for(let i=0;i<bytes.length;i+=0x8000)value+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
 return btoa(value);
};
export interface CollectionEmail {to:string;subject:string;html:string;attachments?:{filename:string;content:string;content_type:string}[];}
export async function sendCollectionEmail(secret:string,message:CollectionEmail,idempotencyKey:string){
 if(!secret)throw new Error('AKBS email service is not configured.');
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from:'AKBS Poultry Farming <noreply@akbspoultry.com>',reply_to:'support@akbspoultry.com',to:[message.to],subject:message.subject,html:message.html,...(message.attachments?{attachments:message.attachments}:{})}),signal:AbortSignal.timeout(10000)});
   const out=await response.json().catch(()=>({}));
   if(response.ok&&typeof out.id==='string')return out as {id:string};
   if(attempt===0&&(response.status===429||response.status>=500)){await new Promise(resolve=>setTimeout(resolve,500));continue;}
   throw Object.assign(new Error('The email service did not accept the message. Please try again or check AKBS email settings.'),{permanent:response.status<500&&response.status!==429});
  }catch(error:any){if(attempt===0&&!error.permanent){await new Promise(resolve=>setTimeout(resolve,500));continue;}throw error;}
 }
 throw new Error('Unable to send email.');
}
