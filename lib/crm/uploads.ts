export const MAX_DOCUMENT_SIZE=2*1024*1024;
export function detectDocument(data:Buffer):string|null {
 if(data.subarray(0,5).toString()==='%PDF-')return 'application/pdf';
 if(data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))return 'image/png';
 if(data.subarray(0,3).equals(Buffer.from('ffd8ff','hex')))return 'image/jpeg';
 if(data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP')return 'image/webp';
 return null;
}
export function safeFilename(name:string){return name.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)||'document';}
