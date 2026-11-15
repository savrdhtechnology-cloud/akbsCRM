/** Public branding only. Does not expose CRM users, sessions, leads, or other settings. */
export default async function handler(req:any,res:any){
 res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({error:'Method not allowed'}));return;}
 try{const url=process.env.AKBS_SUPABASE_URL||process.env.VITE_SUPABASE_URL||'https://ldffgetuzoeupuhoaubn.supabase.co';const key=process.env.AKBS_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';
 const response=await fetch(url+'/rest/v1/rpc/akbs_website_public_profile',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Profile not configured');const data=await response.json();
 res.statusCode=200;res.end(JSON.stringify({profile:data&&typeof data==='object'?{brandName:data.brandName||'',officeAddress:data.officeAddress||'',phone:data.phone||'',email:data.email||''}:null}));
 }catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'Website profile publication is not configured'}));}
}
