'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LockKeyhole, Mail, ArrowRight, Phone, ShieldCheck} from 'lucide-react';
import {Field,Alert,api,dataFromForm} from './ui';
import {AkbsMark} from './premium/Blocks';
import './premium/premium.css';
import {type User,portalPath} from '@/lib/crm/domain';

export default function Login(){
 const[error,setError]=useState('');const[busy,setBusy]=useState(false);const router=useRouter();
 return <main className="crm crm-login-page">
  <header className="crm-login-header">
   <a href="https://www.akbspoultry.com" className="crm-login-logo"><AkbsMark size={50}/><div><strong>AKBS</strong><small>POULTRY FARMING PRIVATE LIMITED</small></div></a>
   <a href="https://www.akbspoultry.com" className="crm-login-back">Back to website <ArrowRight size={15}/></a>
  </header>
  <section className="crm-login-shell">
   <div className="crm-login-copy">
    <span className="crm-login-kicker">AKBS BUSINESS PORTAL</span>
    <h1>Manage every lead.<br/><em>Grow every opportunity.</em></h1>
    <p>Secure access for the AKBS team to manage website inquiries, follow-ups, customers, proposals and project workflows.</p>
    <div className="crm-login-points"><span><ShieldCheck/> Secure role-based access</span><span><ShieldCheck/> Website leads in one CRM</span><span><ShieldCheck/> Follow-ups & pipeline tracking</span></div>
   </div>
   <div className="crm-login-panel">
    <div className="crm-login-card">
     <div className="crm-login-lock"><LockKeyhole size={22}/></div>
     <span className="crm-login-kicker">WELCOME BACK</span>
     <h2>Sign in to AKBS CRM</h2>
     <p className="crm-muted">Use your authorized staff login to continue.</p>
     <form onSubmit={async e=>{const d=dataFromForm(e);setBusy(true);setError('');try{const r=await api<{user:User}>('login','POST',d);router.push(portalPath(r.user.role));router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
      <Field label="Email / Login ID" name="login" autoComplete="username" required placeholder="Enter your login ID"/>
      <Field label="Password" name="password" type="password" autoComplete="current-password" required maxLength={72} placeholder="Enter your password"/>
      <Alert message={error}/>
      <button className="crm-button full crm-login-submit" disabled={busy}>{busy?'Signing in…':<>Sign in securely <ArrowRight size={16}/></>}</button>
     </form>
     <div className="crm-login-support"><Phone size={15}/><span>Access issue? Contact AKBS administrator at <a href="tel:+919893345906">+91 9893345906</a></span></div>
    </div>
    <div className="crm-login-register"><span>New to AKBS?</span><Link href="/customer/register">Customer registration</Link><Link href="/partner/register">Partner registration</Link></div>
   </div>
  </section>
  <footer className="crm-login-footer"><span>© 2026 AKBS Poultry Farming Private Limited</span><span><Mail size={13}/> info@akbspoultry.com</span></footer>
 </main>;
}
