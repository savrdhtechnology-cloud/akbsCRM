import React from 'react';
import {afterEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {FeeManagementView} from '../src/components/FeeManagementView';
const mocks=vi.hoisted(()=>({send:vi.fn().mockResolvedValue({email:'test@example.invalid'})}));
vi.mock('../src/lib/crm',()=>({useCrm:()=>({user:{role:'ADMIN'},leads:[{id:'a',name:'Selected Customer'}],fee:async()=>({config:{baseFee:2999,payableFee:2999},rows:[{leadId:'a',customerName:'Selected Customer',applicationId:'AKBS-2026-000901',email:'test@example.invalid',status:'PENDING'},{leadId:'b',customerName:'Other Customer',applicationId:'AKBS-2026-000902',email:'other@example.invalid',status:'VERIFIED'}]}),paymentAccounts:async()=>({accounts:[]}),feeEvents:async()=>({events:[]}),feeTransactions:async()=>({rows:[]}),sendFeeReminderEmail:mocks.send})}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
test('fee navigation filters by exact lead and reminder targets that lead only',async()=>{
 const clear=vi.fn();render(<FeeManagementView leadId="a" onClearLead={clear}/>);
 await screen.findByText('AKBS-2026-000901');expect(screen.queryByText('AKBS-2026-000902')).toBeNull();expect(mocks.send).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Email Reminder'}));await waitFor(()=>expect(mocks.send).toHaveBeenCalledWith('a'));
 fireEvent.click(screen.getByRole('button',{name:'Show all customers'}));expect(clear).toHaveBeenCalledOnce();
});
test('verified payment has no reminder action',async()=>{render(<FeeManagementView leadId="b"/>);await screen.findByText('AKBS-2026-000902');expect(screen.queryByRole('button',{name:'Email Reminder'})).toBeNull();});
