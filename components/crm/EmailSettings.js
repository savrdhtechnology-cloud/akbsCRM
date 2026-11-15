'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Send, Eye, Code2, RefreshCw, Loader2, Mail, Settings, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

const DEFAULTS = {
  customer_sender_name:'AKBS Poultry Farming', customer_sender_email:'website@akbspoultry.com', customer_reply_to:'akbspoultryfarming@gmail.com',
  customer_subject:'We received your inquiry - AKBS Poultry Farming', customer_auto_reply_enabled:true,
  admin_sender_name:'AKBS Website Inquiry', admin_sender_email:'website@akbspoultry.com', admin_recipient_email:'akbspoultryfarming@gmail.com',
  admin_reply_to_mode:'customer', admin_reply_to_email:'akbspoultryfarming@gmail.com', admin_subject_pattern:'New AKBS Website Inquiry - {{name}}',
  admin_notification_enabled:true, test_recipient_email:'akbspoultryfarming@gmail.com'
};

function Field({label,value,onChange,type='text',help}){
  return <label className="block"><span className="block text-xs font-bold text-akbs-green mb-1.5">{label}</span><input type={type} value={value||''} onChange={e=>onChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-akbs-bg border border-transparent focus:bg-white focus:border-akbs-green outline-none text-sm"/>{help&&<span className="block mt-1 text-[11px] text-akbs-ink/50">{help}</span>}</label>;
}

export default function EmailSettingsPage(){
  const router=useRouter();
  const [settings,setSettings]=useState(DEFAULTS);
  const [templates,setTemplates]=useState({customer:'',admin:''});
  const [active,setActive]=useState('customer');
  const [view,setView]=useState('code');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState('');
  const [deleting,setDeleting]=useState(false);
  const [notice,setNotice]=useState(null);

  const headers={};
  const load=async()=>{setLoading(true);setNotice(null);try{const r=await fetch('/api/admin-email-settings');const d=await r.json();if(r.status===401){router.replace('/portal/login');return;}if(!r.ok)throw new Error(d.error||'Load failed');setSettings({...DEFAULTS,...(d.settings||{})});setTemplates({customer:d.templates?.customer||'',admin:d.templates?.admin||''});}catch(e){setNotice({type:'error',text:e.message});}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const set=(k,v)=>setSettings(s=>({...s,[k]:v}));

  const save=async()=>{setSaving(true);setNotice(null);try{const r=await fetch('/api/admin-email-settings',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({settings,templates})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Save failed');setSettings(s=>({...s,customer_auto_reply_enabled:!!templates.customer&&s.customer_auto_reply_enabled,admin_notification_enabled:!!templates.admin&&s.admin_notification_enabled}));setNotice({type:'success',text:'Saved as default. New inquiries will use these settings and templates.'});}catch(e){setNotice({type:'error',text:e.message});}finally{setSaving(false);}};
  const test=async(kind)=>{setTesting(kind);setNotice(null);try{const r=await fetch('/api/admin-email-settings',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({kind,to:settings.test_recipient_email})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Test failed');setNotice({type:'success',text:`${kind==='customer'?'Customer':'Admin'} test email queued to ${settings.test_recipient_email}.`});}catch(e){setNotice({type:'error',text:e.message});}finally{setTesting('');}};
  const deleteTemplate=async()=>{
    const label=active==='customer'?'Customer':'Admin';
    if(!templates[active]){setNotice({type:'error',text:`${label} template is already empty.`});return;}
    if(!window.confirm(`Delete the ${label} email template? This will also turn off its automatic email setting until you add and save a new template.`))return;
    setDeleting(true);setNotice(null);
    try{
      const r=await fetch('/api/admin-email-settings',{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({kind:active})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Delete failed');
      setTemplates(t=>({...t,[active]:''}));
      setSettings(s=>active==='customer'?{...s,customer_auto_reply_enabled:false}:{...s,admin_notification_enabled:false});
      setView('code');
      setNotice({type:'success',text:`${label} template deleted. Related automatic email has been turned off.`});
    }catch(e){setNotice({type:'error',text:e.message});}
    finally{setDeleting(false);}
  };

  const preview=templates[active]
    .replaceAll('{{name}}','Rohit Sharma').replaceAll('{{email}}','rohit@example.com').replaceAll('{{phone}}','9876543210')
    .replaceAll('{{message}}','I want details about contract farming and feed supply.').replaceAll('{{source}}','Website Contact Form')
    .replaceAll('{{datetime}}','13 Sep 2026, 02:30 PM').replaceAll('{{company_phone}}','+91 9893345906')
    .replaceAll('{{company_email}}','info@akbspoultry.com').replaceAll('{{website_url}}','https://www.akbspoultry.com').replaceAll('{{crm_url}}','https://www.akbspoultry.com/admin');

  if(loading)return <main className="min-h-screen bg-akbs-bg flex items-center justify-center"><div className="flex items-center gap-2 text-akbs-green"><Loader2 className="h-5 w-5 animate-spin"/><span className="font-semibold">Loading Email & Template Settings...</span></div></main>;

  return <main className="min-h-screen bg-akbs-bg">
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-black/5 shadow-sm"><div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button onClick={()=>router.push('/admin')} className="h-10 w-10 rounded-xl bg-akbs-bg flex items-center justify-center"><ArrowLeft className="h-5 w-5"/></button><div><div className="font-heading font-extrabold text-akbs-dark">Email & Template Settings</div><div className="text-[10px] uppercase tracking-widest font-bold text-akbs-green/70">AKBS Admin Module</div></div></div>
      <div className="flex gap-2"><button onClick={load} className="px-3 py-2 rounded-full bg-akbs-bg text-xs font-bold inline-flex items-center gap-2"><RefreshCw className="h-4 w-4"/>Reload</button><button onClick={save} disabled={saving} className="px-4 py-2 rounded-full btn-gradient-green text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save as Default</button></div>
    </div></header>

    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 grid xl:grid-cols-12 gap-5">
      <aside className="xl:col-span-4 space-y-5">
        {notice&&<div className={`p-3.5 rounded-xl border text-sm flex gap-2 ${notice.type==='success'?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-red-50 border-red-200 text-red-700'}`}>{notice.type==='success'?<CheckCircle2 className="h-4 w-4 mt-0.5"/>:<AlertCircle className="h-4 w-4 mt-0.5"/>}<span>{notice.text}</span></div>}

        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Mail className="h-5 w-5 text-akbs-green"/><h2 className="font-heading font-extrabold text-akbs-dark">Customer Auto Reply</h2></div><div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl bg-akbs-bg"><span className="text-sm font-semibold">Enable auto reply</span><input type="checkbox" checked={!!settings.customer_auto_reply_enabled} onChange={e=>set('customer_auto_reply_enabled',e.target.checked)}/></label>
          <Field label="Sender Name" value={settings.customer_sender_name} onChange={v=>set('customer_sender_name',v)}/><Field label="Sender Email" type="email" value={settings.customer_sender_email} onChange={v=>set('customer_sender_email',v)} help="Use an @akbspoultry.com sender address."/><Field label="Reply-To Email" type="email" value={settings.customer_reply_to} onChange={v=>set('customer_reply_to',v)}/><Field label="Subject" value={settings.customer_subject} onChange={v=>set('customer_subject',v)}/>
        </div></div>

        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Settings className="h-5 w-5 text-akbs-green"/><h2 className="font-heading font-extrabold text-akbs-dark">Lead Notification</h2></div><div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-xl bg-akbs-bg"><span className="text-sm font-semibold">Enable lead email</span><input type="checkbox" checked={!!settings.admin_notification_enabled} onChange={e=>set('admin_notification_enabled',e.target.checked)}/></label>
          <Field label="Sender Name" value={settings.admin_sender_name} onChange={v=>set('admin_sender_name',v)}/><Field label="Sender Email" type="email" value={settings.admin_sender_email} onChange={v=>set('admin_sender_email',v)} help="Use an @akbspoultry.com sender address."/><Field label="Lead Recipient Email" type="email" value={settings.admin_recipient_email} onChange={v=>set('admin_recipient_email',v)} help="All new lead notifications will arrive here."/><Field label="Subject Pattern" value={settings.admin_subject_pattern} onChange={v=>set('admin_subject_pattern',v)} help="Use {{name}} for customer name."/>
          <label className="block"><span className="block text-xs font-bold text-akbs-green mb-1.5">Reply-To Mode</span><select value={settings.admin_reply_to_mode} onChange={e=>set('admin_reply_to_mode',e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-akbs-bg text-sm outline-none"><option value="customer">Customer email automatically</option><option value="fixed">Fixed address</option></select></label>
          {settings.admin_reply_to_mode==='fixed'&&<Field label="Fixed Reply-To Email" type="email" value={settings.admin_reply_to_email} onChange={v=>set('admin_reply_to_email',v)}/>}
        </div></div>

        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm"><div className="flex items-center gap-2 mb-4"><Send className="h-5 w-5 text-akbs-green"/><h2 className="font-heading font-extrabold text-akbs-dark">Test Emails</h2></div><Field label="Test Recipient" type="email" value={settings.test_recipient_email} onChange={v=>set('test_recipient_email',v)}/><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>test('customer')} disabled={!!testing} className="px-3 py-2.5 rounded-xl bg-akbs-bg text-xs font-bold disabled:opacity-50">{testing==='customer'?'Sending...':'Test Customer'}</button><button onClick={()=>test('admin')} disabled={!!testing} className="px-3 py-2.5 rounded-xl btn-gradient-green text-white text-xs font-bold disabled:opacity-50">{testing==='admin'?'Sending...':'Test Admin'}</button></div></div>
      </aside>

      <section className="xl:col-span-8 bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden min-h-[760px] flex flex-col">
        <div className="p-4 border-b border-akbs-bg flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex gap-2"><button onClick={()=>setActive('customer')} className={`px-4 py-2 rounded-full text-xs font-bold ${active==='customer'?'btn-gradient-green text-white':'bg-akbs-bg'}`}>Customer Template</button><button onClick={()=>setActive('admin')} className={`px-4 py-2 rounded-full text-xs font-bold ${active==='admin'?'btn-gradient-green text-white':'bg-akbs-bg'}`}>Admin Template</button></div><div className="flex flex-wrap gap-2"><button onClick={()=>setView('code')} className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 ${view==='code'?'bg-akbs-dark text-white':'bg-akbs-bg'}`}><Code2 className="h-4 w-4"/>HTML Code</button><button onClick={()=>setView('preview')} className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 ${view==='preview'?'bg-akbs-dark text-white':'bg-akbs-bg'}`}><Eye className="h-4 w-4"/>Preview</button><button onClick={deleteTemplate} disabled={deleting||!templates[active]} className="px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed">{deleting?<Loader2 className="h-4 w-4 animate-spin"/>:<Trash2 className="h-4 w-4"/>}Delete Template</button></div></div>
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-900">Paste complete HTML. Placeholders: <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{phone}}'}</code>, <code>{'{{message}}'}</code>. Admin also supports <code>{'{{source}}'}</code>, <code>{'{{datetime}}'}</code>, <code>{'{{crm_url}}'}</code>. Deleting a template turns off its automatic email until a new template is saved.</div>
        {view==='code'?<textarea value={templates[active]} onChange={e=>setTemplates(t=>({...t,[active]:e.target.value}))} spellCheck={false} placeholder={active==='customer'?'Customer template is empty. Paste HTML here and Save as Default.':'Admin template is empty. Paste HTML here and Save as Default.'} className="flex-1 min-h-[680px] w-full p-5 font-mono text-[12px] leading-5 outline-none resize-none bg-[#0d1f17] text-[#d9efe2] placeholder:text-white/30"/>:<div className="flex-1 bg-akbs-bg p-4">{templates[active]?<iframe title="Template Preview" srcDoc={preview} className="w-full h-[700px] bg-white rounded-xl border border-black/5" sandbox="allow-popups allow-popups-to-escape-sandbox"/>:<div className="h-[700px] bg-white rounded-xl border border-dashed border-black/10 flex items-center justify-center text-center p-8"><div><Trash2 className="h-10 w-10 mx-auto mb-3 text-akbs-ink/20"/><div className="font-heading font-bold text-akbs-dark">No {active==='customer'?'Customer':'Admin'} Template</div><div className="text-sm text-akbs-ink/50 mt-1">Paste new HTML in the Code tab and save it as default.</div></div></div>}</div>}
      </section>
    </div>
  </main>;
}
