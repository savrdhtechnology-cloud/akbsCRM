import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applicationEligible,collectionRows,collectionActions,INITIAL_SERVICE} from '../src/lib/feeCollections.ts';
import {mapLead} from '../src/lib/leadAdapter.ts';
import {receiptHtml,receiptPdf,receiptNumber} from '../supabase/functions/_shared/paymentReceipt.ts';

test('a CRM reference on an inquiry does not enable registration fees',()=>{
 const inquiry={reference:'AKBS-2026-000033',source:'WEBSITE',applicationEligible:false,details:{}};
 assert.equal(applicationEligible(inquiry),false);
 assert.equal(applicationEligible({...inquiry,applicationEligible:true,reference:''}),false);
 const mapped=mapLead({...inquiry,id:'inquiry',name:'Inquiry Customer',stage:'NEW'},[]);
 assert.equal(mapped.applicationEligible,false);
 assert.equal(mapped.sourceDetail,'Website Inquiry Form');
 assert.equal(mapped.feeStatus,undefined);
 assert.equal(mapped.location,'');
 assert.equal(collectionRows({rows:[{applicationId:inquiry.reference,applicationEligible:false}]}).length,0);
 assert.equal(applicationEligible({...inquiry,applicationEligible:true}),true);
});

test('canonical payment absorbs duplicate ledger aliases and preserves historical amounts',()=>{
 const portal={leadId:'a',applicationId:'AKBS-2026-000901',transactionId:'tx-a',status:'VERIFIED',reference:'UTR-123456',baseAmount:3000,discount:300,payable:2700};
 const ledger={id:'tx-a',leadId:'a',applicationId:portal.applicationId,transactionRef:'utr 123456',serviceType:'Registration Fee',payable:2700};
 const other={id:'tx-b',leadId:'b',serviceType:'Consultation Fee',transactionRef:'C-123456',payable:1000};
 const rows=collectionRows({config:{baseFee:2999},rows:[portal]},[ledger,{...ledger,id:'legacy',serviceType:INITIAL_SERVICE},other,{...other,id:'copy',transactionRef:'c123456'}]);
 assert.equal(rows.length,2);
 assert.equal(rows.reduce((sum,r)=>sum+r.payable,0),3700);
 assert.equal(rows.find(r=>r.kind==='portal')?.amount,3000);
 assert.equal(rows.find(r=>r.kind==='portal')?.discount,300);
});

test('collection actions follow payment state and finance permissions',()=>{
 const base={kind:'portal',applicationId:'AKBS-2026-000901',status:'PENDING'};
 assert.equal(collectionActions(base,'ADMIN').reminder,true);
 for(const status of ['PENDING_VERIFICATION','UNDER_REVIEW','PROOF_SUBMITTED']){
  const row={...base,status,proofPath:'proof.png'};
  assert.equal(collectionActions(row,'FINANCE').verify,true);
  assert.equal(collectionActions(row,'FINANCE').proof,true);
  assert.equal(collectionActions(row,'EMPLOYEE').verify,false);
  assert.equal(collectionActions(row,'MANAGER').proof,false);
  assert.equal(collectionActions(row,'ADMIN').reminder,false);
 }
 const verified={...base,status:'VERIFIED'};
 assert.equal(collectionActions(verified,'FINANCE').emailReceipt,true);
 assert.equal(collectionActions(verified,'EMPLOYEE').emailReceipt,false);
 assert.equal(collectionActions(verified,'EMPLOYEE').receipt,true);
 assert.equal(collectionActions({...base,status:'REJECTED'},'ADMIN').receipt,false);
});

test('only verified receipts render, HTML is escaped, and PDF has valid byte offsets',()=>{
 const r={applicationId:'AKBS-2026-000901',customerName:'Customer <script>alert(1)</script>',phone:'9999999999',serviceType:INITIAL_SERVICE,payable:2999,transactionRef:'UTR123456',paymentMethod:'Bank Transfer',receiptDate:'2026-09-30T12:00:00Z',transactionId:'12345678-abcd',status:'VERIFIED'};
 assert.equal(receiptNumber(r),'AKBS-RCP-2026-000901-12345678');
 const html=receiptHtml(r);
 assert.ok(html.includes('Print / Save as PDF'));
 assert.ok(html.includes('Customer &lt;script&gt;'));
 assert.ok(!html.includes('<script>alert'));
 const pdf=Buffer.from(receiptPdf(r)).toString();
 assert.ok(pdf.startsWith('%PDF-1.4'));
 assert.ok(pdf.includes('INR 2,999.00'));
 assert.ok(pdf.includes('UTR123456'));
 const start=Number(pdf.match(/startxref\n(\d+)/)?.[1]);
 assert.equal(pdf.slice(start,start+4),'xref');
 assert.throws(()=>receiptHtml({...r,status:'PENDING'}),/verified/);
 assert.throws(()=>receiptPdf({...r,status:'REJECTED'}),/verified/);
 const ack=Buffer.from(receiptPdf({...r,status:'PENDING_VERIFICATION'},true)).toString();
 assert.ok(ack.includes('VERIFICATION PENDING'));
 assert.ok(!ack.includes('PAYMENT VERIFIED'));
});
