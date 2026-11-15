import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapLead,leadPayload,stageValue} from '../src/lib/leadAdapter.ts';
test('website registration fields and server reference map into CRM without invented contacts',()=>{
 const row={id:'lead-id',reference:'AKBS-2026-000123',name:'Integration fixture',phone:'',source:'CUSTOMER',stage:'NEW',capacity:20000,project_cost:12000000,created_at:'2026-09-26T12:00:00Z',details:{whatsapp:'test',shed_type:'EC',land_available:false,loan_required:true,poultry_type:'Broiler'},assigned_to:'employee'};
 const lead=mapLead(row,[{id:'employee',name:'Assigned staff'}]);
 assert.equal(lead.applicationId,row.reference);assert.equal(lead.source,'Website');assert.equal(lead.birdCapacity,20000);assert.equal(lead.phone,'');assert.equal(lead.email,'');assert.equal(lead.assignedTo,'Assigned staff');assert.equal(lead.landAvailable,'No');assert.equal(lead.loanRequired,'Yes');
});
test('partial updates only send edited fields, preserving registration details',()=>{
 assert.deepEqual(leadPayload({phone:'9000000000',birdCapacity:15000}),{phone:'9000000000',capacity:15000});
 assert.deepEqual(leadPayload({landArea:'2 acres'}),{details:{landArea:'2 acres'}});
 assert.equal(stageValue('Proposal Sent'),'PROPOSAL');assert.equal(stageValue('Follow Up'),undefined);
});
