import React from 'react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {PortalAccess,usePortal} from '../src/components/PortalAccess';
let authenticated=false,enrolled=true,failEnrollment=false;let calls:any[]=[];
const snap=()=>({enrolled,profile:{name:'Test Farmer',email:'test@example.invalid'},applications:[]});
beforeEach(()=>{sessionStorage.clear();localStorage.clear();authenticated=false;enrolled=true;failEnrollment=false;calls=[];vi.stubGlobal('fetch',vi.fn(async(_url,o)=>{const b=JSON.parse(o.body);calls.push(b);let data:any={},status=200;
 if(b.service==='akbs_portal_otp_send')data={ok:true};
 else if(b.service==='akbs_portal_otp_verify'){authenticated=true;data={authenticated:true};}
 else if(!authenticated){status=401;data={error:'Sign in',status};}
 else if(b.p_action==='logout'){authenticated=false;data={ok:true};}
 else if(b.p_action==='enroll'){if(failEnrollment){status=400;data={error:'Enrollment unavailable'};}else{enrolled=true;data=snap();}}
 else data=snap();return new Response(JSON.stringify(data),{status});}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function Private(){const p=usePortal();return <><p>PRIVATE APPLICATION</p><button onClick={()=>p.signOut()}>Sign out</button></>}
async function otp(){fireEvent.change(await screen.findByLabelText('Email address'),{target:{value:'test@example.invalid'}});fireEvent.click(screen.getByRole('button',{name:'Send email OTP'}));fireEvent.change(await screen.findByLabelText('6-digit OTP'),{target:{value:'123456'}});fireEvent.click(screen.getByRole('button',{name:'Verify OTP & continue'}));}
test.each(['customer','partner'] as const)('%s stays locked without a server session',async kind=>{sessionStorage.setItem('akbs.portal.custom.emailotp.v1',JSON.stringify({token:'forged',kind}));render(<PortalAccess kind={kind}><Private/></PortalAccess>);await screen.findByRole('heading',{name:'Welcome back'});expect(screen.queryByText('PRIVATE APPLICATION')).toBeNull();});
test('OTP login restores cookie session and logout locks portal',async()=>{const v=render(<PortalAccess kind="customer"><Private/></PortalAccess>);await otp();await screen.findByText('PRIVATE APPLICATION');expect(sessionStorage.length).toBe(0);v.unmount();render(<PortalAccess kind="customer"><Private/></PortalAccess>);await screen.findByText('PRIVATE APPLICATION');fireEvent.click(screen.getByText('Sign out'));await screen.findByRole('heading',{name:'Welcome back'});expect(authenticated).toBe(false);});
test('verified email cannot open form until signup succeeds',async()=>{enrolled=false;failEnrollment=true;render(<PortalAccess kind="partner"><Private/></PortalAccess>);await otp();fireEvent.change(await screen.findByLabelText('Full name'),{target:{value:'Test Farmer'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Complete signup & continue'}));await screen.findByText('Enrollment unavailable');expect(screen.queryByText('PRIVATE APPLICATION')).toBeNull();failEnrollment=false;fireEvent.click(screen.getByRole('button',{name:'Complete signup & continue'}));await screen.findByText('PRIVATE APPLICATION');});
