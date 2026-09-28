import React, { useEffect, useMemo, useState } from 'react';
import { BadgeIndianRupee, CheckCircle2, Clock3, Percent, RefreshCw, ShieldCheck, XCircle, Building2, Star, Trash2, Plus } from 'lucide-react';
import { useCrm } from '../lib/crm';

const money=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value||0));

export const FeeManagementView: React.FC = () => {
  const crm=useCrm();
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [initialFee,setInitialFee]=useState('2999');
  const [discount,setDiscount]=useState('0');
  const [offerLabel,setOfferLabel]=useState('');
  const [offerActive,setOfferActive]=useState(false);
  const [accounts,setAccounts]=useState<any[]>([]);
  const [accountSaving,setAccountSaving]=useState(false);
  const [accountForm,setAccountForm]=useState({
    id:'',
    label:'AKBS Company Account',
    accountHolder:'AKBS Poultry Farming Pvt. Ltd.',
    bankName:'',
    accountNumber:'',
    ifsc:'',
    branch:'',
    upiId:'',
    qrImageUrl:'',
    active:true
  });

  const load=async()=>{
    setLoading(true); setError('');
    try{
      const [out,accountsOut]=await Promise.all([
        crm.fee('snapshot',{}),
        crm.paymentAccounts('snapshot',{})
      ]);
      setData(out);
      setAccounts(accountsOut?.accounts || []);
      setInitialFee(String(out?.config?.baseFee ?? 2999));
      setDiscount(String(out?.config?.discountPercent ?? 0));
      setOfferLabel(out?.config?.offerLabel || '');
      setOfferActive(Boolean(out?.config?.offerActive));
    }catch(e:any){setError(e.message||'Unable to load fee data.');}
    finally{setLoading(false);}
  };

  useEffect(()=>{void load();},[]);

  const payable=useMemo(()=>{
    const base=Number(initialFee||0), off=offerActive?Number(discount||0):0;
    return Math.max(0,Math.round(base*(1-off/100)));
  },[initialFee,discount,offerActive]);

  const saveConfig=async()=>{
    setSaving(true); setError('');
    try{
      await crm.fee('update_config',{
        initialFee:Number(initialFee||0),
        discountPercent:Number(discount||0),
        offerLabel:offerLabel.trim(),
        offerActive
      });
      await load();
    }catch(e:any){setError(e.message||'Unable to update fee settings.');}
    finally{setSaving(false);}
  };


  const resetAccountForm=()=>setAccountForm({
    id:'',
    label:'AKBS Company Account',
    accountHolder:'AKBS Poultry Farming Pvt. Ltd.',
    bankName:'',
    accountNumber:'',
    ifsc:'',
    branch:'',
    upiId:'',
    qrImageUrl:'',
    active:true
  });

  const saveAccount=async()=>{
    setAccountSaving(true); setError('');
    try{
      const out=await crm.paymentAccounts('save',accountForm);
      setAccounts(out?.accounts||[]);
      resetAccountForm();
    }catch(e:any){setError(e.message||'Unable to save company account.');}
    finally{setAccountSaving(false);}
  };

  const setDefaultAccount=async(id:string)=>{
    setAccountSaving(true); setError('');
    try{
      const out=await crm.paymentAccounts('set_default',{id});
      setAccounts(out?.accounts||[]);
    }catch(e:any){setError(e.message||'Unable to set default account.');}
    finally{setAccountSaving(false);}
  };

  const deactivateAccount=async(id:string)=>{
    setAccountSaving(true); setError('');
    try{
      const out=await crm.paymentAccounts('delete',{id});
      setAccounts(out?.accounts||[]);
      if(accountForm.id===id) resetAccountForm();
    }catch(e:any){setError(e.message||'Unable to remove account.');}
    finally{setAccountSaving(false);}
  };

  const editAccount=(a:any)=>setAccountForm({
    id:a.id||'',
    label:a.label||'AKBS Company Account',
    accountHolder:a.accountHolder||'AKBS Poultry Farming Pvt. Ltd.',
    bankName:a.bankName||'',
    accountNumber:a.accountNumber||'',
    ifsc:a.ifsc||'',
    branch:a.branch||'',
    upiId:a.upiId||'',
    qrImageUrl:a.qrImageUrl||'',
    active:a.active!==false
  });

  const verify=async(leadId:string,status:'VERIFIED'|'REJECTED')=>{
    setSaving(true); setError('');
    try{await crm.fee('verify',{leadId,status}); await load();}
    catch(e:any){setError(e.message||'Unable to update payment status.');}
    finally{setSaving(false);}
  };

  const s=data?.summary||{};
  const rows=data?.rows||[];

  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Fee Management</h1>
        <p className="mt-1 text-sm text-slate-500">Manage customer initial fee, offers, payment proof and lead-wise collection status.</p>
      </div>
      <button onClick={()=>void load()} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold flex items-center gap-2">
        <RefreshCw className="w-4 h-4"/> Refresh
      </button>
    </div>

    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</div>}

    <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
      {[
        ['Total Leads',s.totalLeads||0,'slate'],
        ['Expected',money(s.totalExpected||0),'blue'],
        ['Verified Collection',money(s.totalReceived||0),'emerald'],
        ['Payment Pending',s.pending||0,'amber'],
        ['Proof Submitted',s.proofSubmitted||0,'indigo'],
        ['Verified',s.verified||0,'emerald']
      ].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
        <div className="mt-2 text-xl font-black text-slate-950">{value}</div>
      </div>)}
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-700"/>
            <h2 className="font-black text-slate-950">Company Payment Accounts</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Add one or more official company bank/UPI accounts. Set one account as Default; customer payment screen will automatically use that account.</p>
        </div>
        <button type="button" onClick={resetAccountForm} className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5"/> New Account
        </button>
      </div>

      <div className="mt-5 grid xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="text-xs font-black text-slate-900">{accountForm.id?'Edit Company Account':'Add Company Account'}</div>
          <input value={accountForm.label} onChange={e=>setAccountForm(p=>({...p,label:e.target.value}))} placeholder="Account label" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs"/>
          <input value={accountForm.accountHolder} onChange={e=>setAccountForm(p=>({...p,accountHolder:e.target.value}))} placeholder="Account holder name" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs"/>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={accountForm.bankName} onChange={e=>setAccountForm(p=>({...p,bankName:e.target.value}))} placeholder="Bank name" className="h-10 rounded-xl border border-slate-300 px-3 text-xs"/>
            <input value={accountForm.accountNumber} onChange={e=>setAccountForm(p=>({...p,accountNumber:e.target.value}))} placeholder="Account number" className="h-10 rounded-xl border border-slate-300 px-3 text-xs"/>
            <input value={accountForm.ifsc} onChange={e=>setAccountForm(p=>({...p,ifsc:e.target.value.toUpperCase()}))} placeholder="IFSC" className="h-10 rounded-xl border border-slate-300 px-3 text-xs"/>
            <input value={accountForm.branch} onChange={e=>setAccountForm(p=>({...p,branch:e.target.value}))} placeholder="Branch" className="h-10 rounded-xl border border-slate-300 px-3 text-xs"/>
          </div>
          <input value={accountForm.upiId} onChange={e=>setAccountForm(p=>({...p,upiId:e.target.value}))} placeholder="UPI ID (optional)" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs"/>
          <input value={accountForm.qrImageUrl} onChange={e=>setAccountForm(p=>({...p,qrImageUrl:e.target.value}))} placeholder="QR / barcode image URL (optional)" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs"/>
          {accountForm.qrImageUrl && <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">QR / Barcode Preview</div>
            <img src={accountForm.qrImageUrl} alt="Payment QR preview" className="max-h-36 mx-auto object-contain rounded-lg"/>
          </div>}
          <button disabled={accountSaving} onClick={saveAccount} className="w-full h-10 rounded-xl bg-[#0b2818] text-white text-xs font-black disabled:opacity-50">
            {accountSaving?'Saving…':accountForm.id?'Update Account':'Save Account'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 content-start">
          {accounts.map((a:any)=><div key={a.id} className={`rounded-2xl border p-4 ${a.isDefault?'border-emerald-300 bg-emerald-50/60':'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-black text-slate-900">{a.label}</div>
                  {a.isDefault && <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[9px] font-black">DEFAULT</span>}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{a.accountHolder}</div>
              </div>
              <button onClick={()=>editAccount(a)} className="text-[10px] font-bold text-emerald-700">Edit</button>
            </div>
            <div className="mt-3 space-y-1.5 text-xs">
              {a.bankName && <div><span className="text-slate-400">Bank:</span> <b>{a.bankName}</b></div>}
              {a.accountNumber && <div><span className="text-slate-400">A/C:</span> <b className="font-mono">{a.accountNumber}</b></div>}
              {a.ifsc && <div><span className="text-slate-400">IFSC:</span> <b className="font-mono">{a.ifsc}</b></div>}
              {a.upiId && <div><span className="text-slate-400">UPI:</span> <b>{a.upiId}</b></div>}
            </div>
            {a.qrImageUrl && <img src={a.qrImageUrl} alt="Payment QR" className="mt-3 h-28 w-28 object-contain rounded-xl border border-slate-200 bg-white p-2"/>}
            <div className="mt-4 flex flex-wrap gap-2">
              {!a.isDefault && <button disabled={accountSaving} onClick={()=>void setDefaultAccount(a.id)} className="h-8 px-3 rounded-lg bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1">
                <Star className="w-3 h-3"/> Set Default
              </button>}
              <button disabled={accountSaving} onClick={()=>void deactivateAccount(a.id)} className="h-8 px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-black flex items-center gap-1">
                <Trash2 className="w-3 h-3"/> Remove
              </button>
            </div>
          </div>)}
          {!accounts.length && <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">No company payment account added yet.</div>}
        </div>
      </div>
    </section>

    <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 xl:sticky xl:top-5">
        <div className="flex items-center gap-2">
          <BadgeIndianRupee className="w-5 h-5 text-emerald-700"/>
          <h2 className="font-black text-slate-950">Fee & Offer Settings</h2>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Base Initial Fee</span>
            <input type="number" min="0" value={initialFee} onChange={e=>setInitialFee(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold"/>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Offer Discount %</span>
            <div className="relative mt-1.5">
              <Percent className="absolute left-3 top-3.5 w-4 h-4 text-slate-400"/>
              <input type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm font-bold"/>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Offer Name</span>
            <input value={offerLabel} onChange={e=>setOfferLabel(e.target.value)} placeholder="Example: Navratri Offer 20% OFF" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"/>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
            <div>
              <div className="text-xs font-black text-slate-900">Offer Active</div>
              <div className="text-[10px] text-slate-500">Customer payable fee auto-adjust hoga.</div>
            </div>
            <input type="checkbox" checked={offerActive} onChange={e=>setOfferActive(e.target.checked)} className="w-5 h-5 accent-emerald-700"/>
          </label>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Customer Payable Fee</div>
            <div className="mt-1 text-3xl font-black text-emerald-950">{money(payable)}</div>
            {offerActive && Number(discount)>0 && <div className="mt-1 text-xs text-emerald-700">Base {money(Number(initialFee||0))} · {discount}% discount</div>}
          </div>
          <button disabled={saving} onClick={saveConfig} className="w-full h-11 rounded-xl bg-[#0b2818] text-white text-sm font-black disabled:opacity-50">
            {saving?'Saving…':'Save Fee Settings'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">Lead-wise Fee Workflow</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Payment status is visible to staff and managed here by Admin.</p>
          </div>
          <div className="text-xs font-bold text-slate-500">{rows.length} leads</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left p-3">Application / Customer</th>
                <th className="text-left p-3">Assigned To</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Reference / Proof</th>
                <th className="text-right p-3">Admin Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row:any)=>{
                const status=row.status||'PENDING';
                const cls=status==='VERIFIED'?'bg-emerald-50 text-emerald-800 border-emerald-200':status==='PROOF_SUBMITTED'?'bg-blue-50 text-blue-800 border-blue-200':status==='REJECTED'?'bg-rose-50 text-rose-800 border-rose-200':'bg-amber-50 text-amber-800 border-amber-200';
                return <tr key={row.leadId} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-black text-slate-900">{row.customerName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{row.applicationId}</div>
                    <div className="text-[10px] text-slate-400">{row.phone}</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-700">{row.assignedTo||'Unassigned'}</td>
                  <td className="p-3 font-black text-slate-950">{money(row.amount||data?.config?.payableFee||0)}</td>
                  <td className="p-3"><span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full border font-bold '+cls}>
                    {status==='VERIFIED'?<CheckCircle2 className="w-3 h-3"/>:status==='REJECTED'?<XCircle className="w-3 h-3"/>:<Clock3 className="w-3 h-3"/>}
                    {status.replaceAll('_',' ')}
                  </span></td>
                  <td className="p-3">
                    <div className="font-mono text-[10px] text-slate-700">{row.reference||'No UTR yet'}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{row.proofPath?'Screenshot / proof uploaded':'No proof uploaded'}</div>
                  </td>
                  <td className="p-3 text-right">
                    {status==='PROOF_SUBMITTED' || status==='REJECTED' ? <div className="inline-flex gap-1">
                      <button disabled={saving} onClick={()=>void verify(row.leadId,'VERIFIED')} className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold">Verify</button>
                      <button disabled={saving} onClick={()=>void verify(row.leadId,'REJECTED')} className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-bold">Reject</button>
                    </div>:<span className="text-[10px] text-slate-400">No action</span>}
                  </td>
                </tr>;
              })}
              {!loading && rows.length===0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">No customer portal leads found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>;
};
