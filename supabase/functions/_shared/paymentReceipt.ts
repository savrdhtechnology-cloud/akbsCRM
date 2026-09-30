export interface ReceiptData {
  applicationId: string; customerName: string; phone?: string; serviceType: string;
  payable: number; transactionRef: string; paymentMethod?: string; receiptDate: string;
  transactionId?: string; status: string;
}
const htmlEscape = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const receiptNumber = (r: ReceiptData) => 'AKBS-RCP-' + (r.applicationId||'GENERAL').replace(/^AKBS-/, '') + (r.transactionId ? '-' + r.transactionId.slice(0, 8).toUpperCase() : '');
const date = (v: string) => v && !Number.isNaN(Date.parse(v)) ? new Date(v).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}) : 'Not recorded';
const amount = (v: number) => 'INR ' + Number(v).toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2});
function assertVerified(r: ReceiptData) { if (r.status !== 'VERIFIED') throw new Error('Receipt is available only for verified payments.'); }

export function receiptHtml(r: ReceiptData) {
  assertVerified(r);
  const row = (label: string, value: unknown) => '<div class="row"><span>' + htmlEscape(label) + '</span><b>' + htmlEscape(value || '—') + '</b></div>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>AKBS Payment Receipt</title><style>' +
    '@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;padding:24px;background:#edf4ef;color:#18382d;font-family:Arial,Helvetica,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{max-width:760px;margin:auto;background:white;border:1px solid #dce8e1}.head{background:#073b29;color:white;padding:30px}.head h1{font-size:23px;margin:0 0 12px}.head h2{font-size:15px;letter-spacing:1px;margin:0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 28px}.box{padding:14px;border:1px solid #dce8e1;border-radius:10px;overflow-wrap:anywhere}.label{color:#6c8279;font-size:10px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}.value{font-size:13px;font-weight:bold}.amount{margin:20px 28px;background:#edf8f2;border:1px solid #cce8da;padding:20px;border-radius:10px;display:flex;justify-content:space-between;align-items:center}.amount strong{font-size:30px;color:#087849}.paid{color:#087849;font-size:12px;font-weight:bold}.section{margin:20px 28px;border:1px solid #dce8e1;border-radius:10px;overflow:hidden}.section h3{font-size:12px;margin:0;background:#f3f8f5;padding:13px 16px}.row{padding:12px 16px;border-top:1px solid #edf2ef;display:grid;grid-template-columns:35% 65%;font-size:12px;gap:6px}.row span{color:#70857c}.row b{text-align:right;overflow-wrap:anywhere;padding-right:6px}.note{margin:22px 28px;padding:14px;border-left:4px solid #087849;background:#f7faf8;font-size:11px;line-height:1.6}.footer{margin:24px 28px;padding:18px 0;border-top:1px solid #dce8e1;font-size:11px;line-height:1.7;color:#6c8279}.footer a{color:#087849}.toolbar{max-width:760px;margin:0 auto 15px;text-align:right}.toolbar button{border:0;border-radius:8px;padding:12px 18px;background:#075c3e;color:white;cursor:pointer}@media print{body{padding:0;background:white}.page{border:0}.toolbar{display:none}}' +
    '</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><article class="page"><header class="head"><h1>AKBS Poultry Farming Pvt. Ltd.</h1><h2>PAYMENT RECEIPT</h2></header>' +
    '<div class="meta"><div class="box"><div class="label">Receipt Number</div><div class="value">' + htmlEscape(receiptNumber(r)) + '</div></div><div class="box"><div class="label">Receipt Date (IST)</div><div class="value">' + htmlEscape(date(r.receiptDate)) + '</div></div></div>' +
    '<div class="amount"><div><div class="label">Amount Received</div><strong>' + htmlEscape(amount(r.payable)) + '</strong></div><span class="paid">PAYMENT VERIFIED</span></div>' +
    '<section class="section"><h3>CUSTOMER & APPLICATION</h3>' + row('Customer Name', r.customerName) + row('Mobile', r.phone) + row('Application ID', r.applicationId) + row('Service / Fee Type', r.serviceType) + '</section>' +
    '<section class="section"><h3>PAYMENT DETAILS</h3>' + row('UTR / Transaction ID', r.transactionRef) + row('Payment Method', r.paymentMethod) + row('Payment Status', r.status) + row('Received By', 'AKBS Poultry Farming Pvt. Ltd.') + '</section>' +
    '<div class="note">This receipt acknowledges the verified payment shown above. Please retain it for your records. Payments are accepted through official AKBS company payment channels.</div>' +
    '<footer class="footer"><b>AKBS Poultry Farming Pvt. Ltd.</b><br><a href="https://www.akbspoultry.com">www.akbspoultry.com</a> · support@akbspoultry.com<br>System-generated receipt. No physical signature required.</footer></article></body></html>';
}

// A self-contained vector PDF keeps the receipt identical across the Edge runtime
// and local verification without loading a browser, font service or PDF dependency.
export function receiptPdf(r: ReceiptData, provisional = false): Uint8Array {
  if(!provisional)assertVerified(r);
  const verified=r.status==='VERIFIED';
  const encode = new TextEncoder();
  const commands: string[] = [];
  const safe = (v: unknown) => String(v ?? '').replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const box = (x:number,y:number,w:number,h:number,color:string) => commands.push(color + ' rg ' + x + ' ' + y + ' ' + w + ' ' + h + ' re f');
  const text = (value:unknown,x:number,y:number,size=10,bold=false,color='0.09 0.22 0.17') => commands.push('BT '+color+' rg /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+safe(value)+') Tj ET');
  const wrap = (value:string,max=57) => {
    const result:string[]=[];let line='';
    for (const word of String(value||'-').split(/\s+/)) {
      if (line && (line+' '+word).length>max) {result.push(line);line='';}
      for (let i=0;i<word.length;i+=max) {const part=word.slice(i,i+max);if(i){result.push(line);line='';}line+=(line?' ':'')+part;}
    }
    if(line)result.push(line);return result;
  };
  box(0,730,595,112,'0.027 0.23 0.16');
  text('AKBS Poultry Farming Pvt. Ltd.',36,796,22,true,'1 1 1');
  text(verified?'PAYMENT RECEIPT':'PAYMENT ACKNOWLEDGEMENT',36,763,13,true,'1 1 1');
  text('Official company payment acknowledgement',36,746,9,false,'0.8 0.9 0.85');
  text('RECEIPT NUMBER',36,701,8,false,'0.4 0.5 0.45');
  text(receiptNumber(r),36,682,10,true);
  text('RECEIPT DATE (IST)',340,701,8,false,'0.4 0.5 0.45');
  text(date(r.receiptDate),340,682,10,true);
  box(36,601,523,60,'0.92 0.97 0.94');
  text(verified?'AMOUNT RECEIVED':'AMOUNT SUBMITTED',50,639,8,false,'0.3 0.5 0.4');
  text(amount(r.payable),50,615,25,true,'0.03 0.47 0.28');
  text(verified?'PAYMENT VERIFIED':'VERIFICATION PENDING',402,625,9,true,'0.03 0.47 0.28');
  let y=572;
  const section = (title:string) => {box(36,y-8,523,25,'0.95 0.97 0.96');text(title,50,y,10,true);y-=35;};
  const row = (label:string,value:unknown) => {
    text(label,50,y,9,false,'0.4 0.5 0.45');
    const lines=wrap(String(value||'-'));
    lines.forEach((line,i)=>text(line,219,y-i*13,10,true));
    y-=Math.max(27,lines.length*13+12);
  };
  section('CUSTOMER & APPLICATION');
  row('Customer Name',r.customerName);row('Mobile',r.phone);
  row('Application ID',r.applicationId);row('Service / Fee Type',r.serviceType);
  y-=7;section('PAYMENT DETAILS');
  row('UTR / Transaction ID',r.transactionRef);row('Payment Method',r.paymentMethod);
  row('Payment Status',r.status);row('Received By','AKBS Poultry Farming Pvt. Ltd.');
  text('Please retain this receipt for your records.',50,174,10);
  text(verified?'This receipt acknowledges the verified payment shown above.':'Payment details received. This acknowledgement does not confirm verification.',50,157,9,false,'0.4 0.5 0.45');
  box(36,112,523,1,'0.85 0.9 0.87');
  text('AKBS Poultry Farming Pvt. Ltd.',36,92,10,true);
  text('www.akbspoultry.com | support@akbspoultry.com',36,75,9,false,'0.03 0.47 0.28');
  text('System-generated receipt. No physical signature required.',36,55,8,false,'0.4 0.5 0.45');
  const stream=commands.join('\n');
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    '<< /Length '+encode.encode(stream).length+' >>\nstream\n'+stream+'\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  let pdf='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,i)=>{offsets.push(encode.encode(pdf).length);pdf+=(i+1)+' 0 obj\n'+object+'\nendobj\n';});
  const start=encode.encode(pdf).length;
  pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset=>pdf+=String(offset).padStart(10,'0')+' 00000 n \n');
  pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
  return encode.encode(pdf);
}
