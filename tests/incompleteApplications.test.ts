import {test} from 'node:test';
import assert from 'node:assert/strict';
import {draftProgress,groupsFor} from '../src/lib/incompleteApplications.ts';
test('OTP-only signup shows no completed form step',()=>{const p=draftProgress('customer',{email:'a@example.invalid'});assert.equal(p.lastCompleted,'OTP verified');assert.ok(p.percent<10);});
test('completion counts actual required fields and reserves final submission',()=>{const form:any={};for(const g of groupsFor('customer'))for(const f of g.fields)form[f.key]=f.type==='array'?['DPR']:'Provided';form.needsLoan='Yes';const full=draftProgress('customer',form);assert.equal(full.lastCompleted,'Experience & Support');assert.ok(full.percent<100);form.mobileNumber='';assert.equal(draftProgress('customer',form).lastCompleted,'OTP verified');assert.ok(draftProgress('customer',form).percent<full.percent);});
test('loan amount only counts when financing requested; partner fields stay separate',()=>{const f={needsLoan:'No'};assert.equal(draftProgress('customer',{...f,needsLoan:'Yes'}).required,draftProgress('customer',f).required+1);assert.ok(groupsFor('partner').flatMap(x=>x.fields).every(f=>f.key!=='proposedCapacity'));});
