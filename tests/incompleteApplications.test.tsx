import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {IncompleteApplications} from '../src/components/IncompleteApplications';
import {secureRequest} from '../src/lib/secureRequest';
vi.mock('../src/lib/secureRequest',()=>({secureRequest:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
test('admin opens saved partner form, saves draft and submits for approval',async()=>{
 const row={requestId:'draft-1',email:'partner@example.invalid',name:'Saved Partner',mobile:'9999999999',form:{fullName:'Saved Partner',mobile:'9999999999',email:'partner@example.invalid',city:'Raisen',state:'MP',category:'Referral'},updatedAt:'2026-09-29T00:00:00Z',signupAt:'2026-09-28T00:00:00Z'};
 vi.mocked(secureRequest).mockImplementation(async(_s,b:any)=>b.p_action==='list'?{rows:[row]}:b.p_action==='get'?row:b.p_action==='save'?{ok:true,updatedAt:'2026-09-29T01:00:00Z'}:{completed:true,reference:'AKBS-TEST-1'});
 const done=vi.fn();render(<IncompleteApplications kind="partner" onBack={()=>{}} onCompleted={done}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Open & Complete'}));
 await screen.findByDisplayValue('Saved Partner');fireEvent.change(screen.getByLabelText('Full name *'),{target:{value:'Updated Partner'}});
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await screen.findAllByText('Draft saved.');
 expect(vi.mocked(secureRequest).mock.calls.some(([,b]:any)=>b.p_action==='save'&&b.p_data.form.fullName==='Updated Partner')).toBe(true);
 expect((screen.getByRole('button',{name:'Complete & Send for Approval'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Complete & Send for Approval'}));await waitFor(()=>expect(done).toHaveBeenCalledOnce());expect(screen.queryByRole('dialog')).toBeNull();
});
test('a draft already submitted elsewhere does not reopen or duplicate',async()=>{const row={requestId:'x',email:'x@example.invalid',form:{},updatedAt:'',signupAt:''};vi.mocked(secureRequest).mockImplementation(async(_s,b:any)=>b.p_action==='list'?{rows:[row]}:{completed:true,reference:'AKBS-EXISTING'});render(<IncompleteApplications kind="customer" onBack={()=>{}} onCompleted={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'Open & Complete'}));await screen.findByText('Already submitted: AKBS-EXISTING');expect(screen.queryByRole('dialog')).toBeNull();});
