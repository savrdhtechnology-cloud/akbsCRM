import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {IncompleteApplications} from '../src/components/IncompleteApplications';
import {secureRequest} from '../src/lib/secureRequest';
import {reminderKey} from '../src/lib/reminderCooldown';
vi.mock('../src/lib/secureRequest',()=>({secureRequest:vi.fn()}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks();});
const rows=[{requestId:'11111111-1111-4111-8111-111111111111',email:'first@example.invalid',name:'First Customer',mobile:'9999999991',form:{},signupAt:'',updatedAt:''},{requestId:'22222222-2222-4222-8222-222222222222',email:'second@example.invalid',name:'Second Customer',mobile:'9999999992',form:{},signupAt:'',updatedAt:''}];

test('one draft click sends once to that customer; only its button waits 60 minutes across refresh',async()=>{
 const states:Record<string,any>={};let release:(value:any)=>void=()=>{};
 const pending=new Promise(resolve=>{release=resolve;});
 const sends:any[]=[];
 vi.mocked(secureRequest).mockImplementation(async(service,body:any)=>{
  if(service==='akbs_incomplete_applications')return {rows};
  if(body.action==='status')return {states};
  sends.push(body);
  const retryAt=new Date(Date.now()+3600000).toISOString();
  states[reminderKey(body)]={retryAt,lastSentAt:new Date().toISOString(),state:'SENT'};
  await pending;
  return {ok:true,email:body.draftEmail,retryAt};
 });
 const view=render(<IncompleteApplications kind="customer" onBack={()=>{}} onCompleted={()=>{}}/>);
 await screen.findByText('First Customer');
 const buttons=screen.getAllByRole('button',{name:'Email Completion Reminder'});
 fireEvent.click(buttons[0]);fireEvent.click(buttons[0]);
 await screen.findByRole('button',{name:'Sending…'});
 expect(sends).toHaveLength(1);expect(sends[0].draftEmail).toBe(rows[0].email);expect(sends[0].draftRequestId).toBe(rows[0].requestId);
 expect((screen.getByRole('button',{name:'Email Completion Reminder'}) as HTMLButtonElement).disabled).toBe(false);
 await act(async()=>{release({});});
 const waiting=await screen.findByRole('button',{name:'Resend in 60 min'});
 expect((waiting as HTMLButtonElement).disabled).toBe(true);
 expect(sends.some(s=>s.draftEmail===rows[1].email)).toBe(false);
 view.unmount();vi.useFakeTimers();
 await act(async()=>{render(<IncompleteApplications kind="customer" onBack={()=>{}} onCompleted={()=>{}}/>);});
 expect(screen.getByRole('button',{name:'Resend in 60 min'})).toBeTruthy();
 vi.setSystemTime(Date.now()+3600001);
 await act(async()=>{vi.advanceTimersByTime(1000);});
 expect((screen.getByRole('button',{name:'Resend Reminder'}) as HTMLButtonElement).disabled).toBe(false);
});

test('one website inquiry click sends only its lead ID and leaves other inquiries available',async()=>{
 const inquiries=rows.map((r,i)=>({id:'inquiry-'+i,name:r.name,email:r.email,phone:r.mobile} as any));
 vi.mocked(secureRequest).mockImplementation(async(service,body:any)=>service==='akbs_incomplete_applications'?{rows:[]}:body.action==='status'?{states:{}}:{ok:true,email:rows[0].email,retryAt:new Date(Date.now()+3600000).toISOString()});
 render(<IncompleteApplications kind="customer" inquiries={inquiries} onBack={()=>{}} onCompleted={()=>{}}/>);
 const buttons=await screen.findAllByRole('button',{name:'Email Registration Reminder'});
 fireEvent.click(buttons[0]);
 await screen.findByRole('button',{name:'Resend in 60 min'});
 const sends=vi.mocked(secureRequest).mock.calls.filter(([service,body])=>service==='akbs-fee-reminder-email'&&body?.action!=='status');
 const sent=sends[0]?.[1]||{};
 expect(sends).toHaveLength(1);expect(sent.leadId).toBe('inquiry-0');expect(sent.purpose).toBe('registration');
 expect(sent.targets).toBeUndefined();
 expect((screen.getByRole('button',{name:'Email Registration Reminder'}) as HTMLButtonElement).disabled).toBe(false);
});

test('a server waiting-period response disables only the attempted customer button',async()=>{
 vi.mocked(secureRequest).mockImplementation(async(service,body:any)=>{
  if(service==='akbs_incomplete_applications')return {rows};
  if(body.action==='status')return {states:{}};
  throw Object.assign(new Error('Reminder already sent'),{status:429,retryAt:new Date(Date.now()+3600000).toISOString()});
 });
 render(<IncompleteApplications kind="customer" onBack={()=>{}} onCompleted={()=>{}}/>);
 fireEvent.click((await screen.findAllByRole('button',{name:'Email Completion Reminder'}))[0]);
 await screen.findByRole('alert');
 await waitFor(()=>expect((screen.getByRole('button',{name:'Resend in 60 min'}) as HTMLButtonElement).disabled).toBe(true));
 expect((screen.getByRole('button',{name:'Email Completion Reminder'}) as HTMLButtonElement).disabled).toBe(false);
});
