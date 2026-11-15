import React from 'react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {FeeManagementView} from '../src/components/FeeManagementView';
const mocks=vi.hoisted(()=>({role:'ADMIN',rows:[] as any[],ledger:[] as any[],fee:vi.fn(),email:vi.fn(),proof:vi.fn(),refresh:vi.fn()}));
vi.mock('../src/lib/crm',()=>({useCrm:()=>({user:{role:mocks.role},leads:[],fee:mocks.fee,paymentAccounts:async()=>({accounts:[]}),feeEvents:async()=>({events:[]}),feeTransactions:async()=>({rows:mocks.ledger}),sendVerifiedPaymentReceipt:mocks.email,viewPaymentProof:mocks.proof,refresh:mocks.refresh})}));
const base={leadId:'a',transactionId:'transaction-a',customerName:'Workflow Customer',applicationId:'AKBS-2026-000901',email:'test@example.invalid',phone:'9999999999',baseAmount:2999,payable:2999,reference:'UTR123456',proofPath:'proof.png',submittedAt:'2026-09-30T12:00:00Z'};
beforeEach(()=>{
 mocks.role='ADMIN';mocks.rows=[{...base,status:'PENDING_VERIFICATION'}];mocks.ledger=[];
 mocks.fee.mockImplementation(async(action:string,data:any)=>{
  if(action==='verify')mocks.rows=mocks.rows.map(r=>r.leadId===data.leadId?{...r,status:data.status,verifiedAt:'2026-09-30T12:30:00Z'}:r);
  return {config:{baseFee:2999,payableFee:2999},rows:mocks.rows};
 });
 mocks.email.mockResolvedValue({email:base.email});mocks.refresh.mockResolvedValue(undefined);
 mocks.proof.mockResolvedValue({signedUrl:'https://example.invalid/proof.png',contentType:'image/png',applicationId:base.applicationId});
});
afterEach(()=>{cleanup();vi.resetAllMocks();vi.restoreAllMocks();});

test('submitted proof opens the exact transaction inside Collections',async()=>{
 render(<FeeManagementView initialTab="collections"/>);
 fireEvent.click(await screen.findByRole('button',{name:'View Proof'}));
 await screen.findByRole('dialog',{name:'Customer Payment Proof'});
 expect(mocks.proof).toHaveBeenCalledWith('a','transaction-a');
 expect(screen.getByAltText('Payment proof '+base.applicationId).getAttribute('src')).toBe('https://example.invalid/proof.png');
});

test('verify automatically emails a receipt and exposes both receipt actions in Collections',async()=>{
 render(<FeeManagementView initialTab="collections"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
 await screen.findByRole('button',{name:'View / Print Receipt'});
 expect(mocks.fee).toHaveBeenCalledWith('verify',{leadId:'a',status:'VERIFIED'});
 expect(mocks.email).toHaveBeenCalledWith('a');
 fireEvent.click(screen.getByRole('button',{name:'Email Receipt'}));
 await waitFor(()=>expect(mocks.email).toHaveBeenCalledTimes(2));
 expect(screen.queryByRole('button',{name:'Email Reminder'})).toBeNull();
});

test('receipt email failure remains visible after verification refresh',async()=>{
 mocks.email.mockRejectedValue(new Error('Provider unavailable'));
 render(<FeeManagementView initialTab="collections"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Verify'}));
 await screen.findByRole('button',{name:'Email Receipt'});
 expect(screen.getByText(/Payment verified, but receipt email failed: Provider unavailable/)).toBeTruthy();
});

test('reject updates payment without emailing or generating a receipt',async()=>{
 render(<FeeManagementView initialTab="verification"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Reject'}));
 await screen.findByText('No payment records found.');
 expect(mocks.fee).toHaveBeenCalledWith('verify',{leadId:'a',status:'REJECTED'});
 expect(mocks.email).not.toHaveBeenCalled();
});

test('Finance can verify while Employee cannot open proof or verify',async()=>{
 mocks.role='FINANCE';const view=render(<FeeManagementView initialTab="collections"/>);
 await screen.findByRole('button',{name:'Verify'});expect(screen.getByRole('button',{name:'View Proof'})).toBeTruthy();
 view.unmount();mocks.role='EMPLOYEE';render(<FeeManagementView initialTab="collections"/>);
 await screen.findByText(base.applicationId);
 expect(screen.queryByRole('button',{name:'Verify'})).toBeNull();
 expect(screen.queryByRole('button',{name:'View Proof'})).toBeNull();
});

test('verified receipt opens professional print HTML and reports blocked popups',async()=>{
 mocks.rows=[{...base,status:'VERIFIED'}];
 const write=vi.fn();const open=vi.spyOn(window,'open').mockReturnValue({document:{write,close:vi.fn()},focus:vi.fn()} as any);
 render(<FeeManagementView initialTab="collections"/>);
 fireEvent.click(await screen.findByRole('button',{name:'View / Print Receipt'}));
 expect(write.mock.calls[0][0]).toContain('Print / Save as PDF');expect(write.mock.calls[0][0]).toContain(base.applicationId);
 open.mockReturnValue(null);fireEvent.click(screen.getByRole('button',{name:'View / Print Receipt'}));
 await screen.findByText(/Allow pop-ups/);
});

test('inquiry rows are excluded and sidebar tab changes work without remount',async()=>{
 mocks.rows=[{...base,status:'PENDING',applicationEligible:false}];
 const view=render(<FeeManagementView initialTab="collections"/>);
 await screen.findByText('No payment records found.');expect(screen.queryByText(base.applicationId)).toBeNull();
 mocks.rows=[{...base,status:'PENDING'}];
 fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await screen.findByText(base.applicationId);
 view.rerender(<FeeManagementView initialTab="receipts"/>);
 await screen.findByText('No payment records found.');expect(screen.queryByText(base.applicationId)).toBeNull();
});
