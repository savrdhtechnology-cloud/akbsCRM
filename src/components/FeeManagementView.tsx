import React, { useEffect, useMemo, useState } from 'react';
import { BadgeIndianRupee, CheckCircle2, Clock3, Percent, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
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

  const load=async()=>{
    setLoading(true); setError('');
    try{
      const out=await crm.fee('snapshot',{});
      setData(out);
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
