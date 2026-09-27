import React, { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PortalAccess } from '../src/components/PortalAccess';
import { CustomerRegistrationPortal } from '../src/components/CustomerRegistrationPortal';
import { PartnerRegistrationPortal } from '../src/components/PartnerRegistrationPortal';
const saved = { access_token: 'test-token', refresh_token: 'test-refresh', expires_at: Date.now()/1000+3600 };
let enrolled: boolean;
let submissions: any[];
let failSubmit: boolean;
let failEnroll: boolean;
let calls: any[];
const snapshot = () => ({ enrolled, profile: { name: 'Test Farmer', email: 'test@example.invalid' }, applications: submissions });
beforeEach(()=>{
  sessionStorage.clear(); history.replaceState(null, '', '/customer-registration');
  enrolled=true; submissions=[]; failSubmit=false; failEnroll=false; calls=[];
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('fetch', vi.fn(async(url: string, options: any={})=>{
    const body=JSON.parse(options.body || '{}'); calls.push({url, body});
    let data: any = {};
    let status=200;
    if(url.includes('/auth/v1/user')) data={id:'auth-user',email:'test@example.invalid'};
    else if(url.includes('/auth/v1/signup') || url.includes('/auth/v1/token')) data=saved;
    else if(url.includes('/rpc/akbs_portal')) {
      if(body.p_action==='enroll') { if(failEnroll) {status=500;data={message:'Enrollment unavailable'};} else {enrolled=true;data=snapshot();} }
      else if(body.p_action==='submit') {
        if(failSubmit) {status=500;data={message:'Database unavailable'};}
        else {submissions=[{appId:'AKBS-2026-000123',status:'NEW',formData:body.p_data.form,submittedAt:new Date().toISOString()}];data={...snapshot(),submittedId:'AKBS-2026-000123'};}
      } else data=snapshot();
    }
    return new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json'}});
  }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function signInSession(){sessionStorage.setItem('akbs.portal.auth.v1',JSON.stringify(saved));}
test.each(['customer','partner'] as const)('%s application stays unmounted without signup/login', async kind=>{
  render(<PortalAccess kind={kind}><p>PRIVATE APPLICATION</p></PortalAccess>);
  await screen.findByRole('heading',{name:'Welcome back'});
  expect(screen.queryByText('PRIVATE APPLICATION')).toBeNull();
  expect(calls).toHaveLength(0);
});
test('local customer flags cannot bypass the server account gate',async()=>{
  sessionStorage.setItem('akbs.customer.signup.session','{"name":"fake"}');
  sessionStorage.setItem('akbs.customer.auth.token','forged');
  render(<CustomerRegistrationPortal/>);
  await screen.findByRole('heading',{name:'Welcome back'});
  expect(screen.queryByText('Review & Submit')).toBeNull();
});
test('signup opens the form only after server enrollment succeeds', async()=>{
  enrolled=false; failEnroll=true;
  render(<PortalAccess kind="customer"><p>PRIVATE APPLICATION</p></PortalAccess>);
  fireEvent.click(await screen.findByRole('button',{name:'Create account'}));
  fireEvent.change(screen.getByLabelText('Full name'),{target:{value:'Test Farmer'}});
  fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'test@example.invalid'}});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-password-only'}});
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Create account & continue'}));
  await screen.findByText('Enrollment unavailable');
  expect(screen.queryByText('PRIVATE APPLICATION')).toBeNull();
  failEnroll=false;
  fireEvent.click(screen.getByRole('button',{name:'Create account & continue'}));
  await screen.findByText('PRIVATE APPLICATION');
});
test('existing account signs in, restores on reload and signs out',async()=>{
  const view=render(<PortalAccess kind="partner"><p>PRIVATE APPLICATION</p></PortalAccess>);
  fireEvent.change(await screen.findByLabelText('Email address'),{target:{value:'test@example.invalid'}});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-password-only'}});
  fireEvent.click(screen.getByRole('button',{name:'Sign in securely'}));
  await screen.findByText('PRIVATE APPLICATION');
  view.unmount(); render(<PortalAccess kind="partner"><p>PRIVATE APPLICATION</p></PortalAccess>);
  await screen.findByText('PRIVATE APPLICATION');
  fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
  await screen.findByRole('heading',{name:'Welcome back'});
  expect(sessionStorage.getItem('akbs.portal.auth.v1')).toBeNull();
});
test('expired sessions refresh before checking the account',async()=>{
  sessionStorage.setItem('akbs.portal.auth.v1',JSON.stringify({...saved,expires_at:1}));
  render(<PortalAccess kind="customer"><p>PRIVATE APPLICATION</p></PortalAccess>);
  await screen.findByText('PRIVATE APPLICATION');
  expect(calls.some(x=>x.url.includes('grant_type=refresh_token'))).toBe(true);
});
test('a rejected session cannot render applications',async()=>{
  signInSession(); vi.mocked(fetch).mockResolvedValue(new Response('{"message":"Invalid session"}',{status:401}));
  render(<PortalAccess kind="customer"><p>PRIVATE APPLICATION</p></PortalAccess>);
  await screen.findByText('Invalid session');
  expect(screen.queryByText('PRIVATE APPLICATION')).toBeNull();
});
test('recovery callback stays in password update mode under StrictMode',async()=>{
  history.replaceState(null,'','/customer-registration#access_token=test-token&refresh_token=test-refresh&type=recovery&expires_in=3600');
  render(<StrictMode><PortalAccess kind="customer"><p>PRIVATE APPLICATION</p></PortalAccess></StrictMode>);
  await screen.findByRole('heading',{name:'Set a new password'});
  expect(screen.queryByText('PRIVATE APPLICATION')).toBeNull();
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'replacement-test-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Save new password'}));
  await screen.findByText('PRIVATE APPLICATION');
});
test('partner submit reports failure and retry saves one CRM reference',async()=>{
  signInSession(); failSubmit=true;
  render(<PartnerRegistrationPortal/>);
  await screen.findByRole('heading',{name:'Partner Registration Form'});
  fireEvent.change(screen.getByPlaceholderText('+91 98765 43210'),{target:{value:'9999999999'}});
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:/Submit Partner Registration/}));
  await screen.findByText('Database unavailable');
  expect(screen.queryByText('Partner application received')).toBeNull();
  failSubmit=false;
  fireEvent.click(screen.getByRole('button',{name:/Submit Partner Registration/}));
  await screen.findByText('Partner application received');
  expect(screen.getByText('AKBS-2026-000123')).toBeTruthy();
  const writes=calls.filter(x=>x.body.p_action==='submit');
  expect(writes).toHaveLength(2);
  expect(writes[0].body.p_data.request_id).toBe(writes[1].body.p_data.request_id);
});
test('customer wizard opens after account validation with saved profile',async()=>{
  signInSession(); render(<CustomerRegistrationPortal/>);
  await screen.findByRole('heading',{name:'Customer Registration Portal'});
  expect(screen.getAllByDisplayValue('Test Farmer').length).toBeGreaterThan(0);
  expect(calls.some(x=>x.body.p_action==='snapshot')).toBe(true);
});
