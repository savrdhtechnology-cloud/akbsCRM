import type { VercelRequest, VercelResponse } from '@vercel/node';

const emailRe=/^[^\s,;<>@]+@[^\s,;<>@]+\.[^\s,;<>@]+$/;
const uuidRe=/^[0-9a-f-]{36}$/i;
const out=(res:VercelResponse,status:number,data:any)=>res.status(status).json(data);
const t=(v:any,n=500)=>String(v??'').trim().slice(0,n);

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=='POST') return out(res,405,{error:'Method not allowed'});
  const provided=t(req.headers['x-workforce-action-token'],256);
  const expected=t(process.env.AKBS_WORKFORCE_ACTION_TOKEN,256);
  if(!expected||provided!==expected) return out(res,401,{error:'Unauthorized'});

  const b=req.body||{};
  const requestId=t(b.request_id,64);
  const to=t(b.to,320).toLowerCase();
  const customer=t(b.customer_name,180)||'Customer';
  const application=t(b.application_id,80);
  const amount=Number(b.fee_amount||0);
  const action=t(b.action,64);

  if(!uuidRe.test(requestId)||!emailRe.test(to)||!['fee_reminder','application_update'].includes(action)){
    return out(res,422,{error:'Invalid action request'});
  }

  const subject=action==='fee_reminder'
    ? 'AKBS Fee Payment Reminder'+(application?' - '+application:'')
    : 'AKBS Application Update'+(application?' - '+application:'');

  const message=action==='fee_reminder'
    ? [
        'Namaste '+customer+' ji,',
        '',
        application?'Aapki AKBS application '+application+' ki registration/application fee abhi pending hai.':'Aapki AKBS application ki registration/application fee abhi pending hai.',
        amount>0?'Pending fee: ₹'+amount.toLocaleString('en-IN'):'',
        '',
        'Kripya payment complete karke UTR / transaction reference aur payment proof Customer Portal me submit karein.',
        'Payment verify hone ke baad next Credit / Document / Finance processing automatically continue hogi.',
        '',
        'Customer Portal: https://crm.akbspoultry.com/customer-registration',
        '',
        'Regards,',
        'AKBS Poultry Farming Private Limited'
      ].filter(Boolean).join('\n')
    : [
        'Namaste '+customer+' ji,',
        '',
        application?'Aapki AKBS application '+application+' hamare system me record hai.':'Aapki AKBS application/enquiry hamare system me record hai.',
        'Aage ki process aur required updates ke liye AKBS team aapse sampark karegi.',
        '',
        'Regards,',
        'AKBS Poultry Farming Private Limited'
      ].join('\n');

  const key=t(process.env.RESEND_API_KEY,512);
  if(!key) return out(res,503,{error:'AKBS email provider is not configured'});

  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'akbs-workforce-'+requestId},
    body:JSON.stringify({from:'AKBS Poultry Farming Private Limited <updates@akbspoultry.com>',to:[to],subject,text:message})
  });
  const sent=await response.json().catch(()=>({}));
  if(!response.ok||!sent?.id) return out(res,response.status>=400?response.status:502,{error:String(sent?.message||'Email provider rejected the message')});
  return out(res,200,{ok:true,provider_message_id:sent.id,subject});
}
