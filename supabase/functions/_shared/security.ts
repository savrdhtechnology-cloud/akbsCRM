const origins=new Set(['https://crm.akbspoultry.com','https://akbspoultry.com','https://www.akbspoultry.com','http://localhost:3000','http://127.0.0.1:3000']);
export function headers(req:Request){const origin=req.headers.get('origin');if(origin&&!origins.has(origin))throw new Error('Origin denied');return {'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}),'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};}
export async function readJson(req:Request,max=4200000){if(!req.headers.get('content-type')?.startsWith('application/json'))throw new Error('JSON required');const reader=req.body?.getReader();if(!reader)throw new Error('Body required');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('Request too large');}chunks.push(value);}const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid JSON');return data;}
export function validateFile(file:any,max:number,allowPdf=true){
 if(!file||typeof file.data!=='string'||file.data.length>Math.ceil(max*4/3)+200)throw new Error('Invalid file');
 const raw=file.data.includes(',')?file.data.split(',').pop():file.data;
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(raw)||raw.length%4!==0)throw new Error('Invalid file encoding');
 const bytes=Uint8Array.from(atob(raw),(c:string)=>c.charCodeAt(0));
 if(bytes.length<12||bytes.length>max)throw new Error('File size is invalid');
 const prefix=(hex:number[])=>hex.every((n,i)=>bytes[i]===n);
 const mime=prefix([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])?'image/png':prefix([0xff,0xd8,0xff])?'image/jpeg':new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'?'image/webp':allowPdf&&prefix([0x25,0x50,0x44,0x46,0x2d])?'application/pdf':'';
 if(!mime||mime!==file.type)throw new Error('File signature does not match its type');
 const ext=mime==='image/png'?'png':mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'pdf';
 if(typeof file.name!=='string'||!new RegExp('\\.'+(ext==='jpg'?'jpe?g':ext)+'$','i').test(file.name)||/[\\/]/.test(file.name))throw new Error('Invalid file extension');
 return {bytes,mime,ext};
}
