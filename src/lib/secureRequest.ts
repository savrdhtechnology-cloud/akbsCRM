export async function secureRequest(service:string,body:Record<string,unknown>={}){
 const response=await fetch('/api/secure',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,...body}),signal:AbortSignal.timeout(30000),cache:'no-store'});
 const data=await response.json();
 if(!response.ok||data?.error)throw Object.assign(new Error(data.error||'Unable to process request.'),{status:data.status||response.status});
 return data;
}
