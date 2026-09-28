import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeIndianRupee, CheckCircle2, Clock3, Percent, RefreshCw, XCircle, Building2, Star, Trash2,
  Plus, Wallet, ReceiptText, RotateCcw, FileBarChart2, History, Search, Filter, Download,
  CreditCard, Landmark, Smartphone, MoreHorizontal, ShieldCheck, Settings2, ArrowUpRight
} from 'lucide-react';
import { useCrm } from '../lib/crm';

const money=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value||0));
const dt=(value:any)=>value?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
const statusLabel=(s:string)=>String(s||'PENDING').replaceAll('_',' ');
const badgeClass=(s:string)=>{
  const v=String(s||'PENDING').toUpperCase();
  if(v==='VERIFIED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if(v==='UNDER_REVIEW'||v==='PROOF_SUBMITTED') return 'bg-blue-50 text-blue-700 border-blue-200';
  if(v==='REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
  if(v==='REFUNDED') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

type Tab='dashboard'|'settings'|'collections'|'verification'|'accounts'|'receipts'|'refunds'|'reports'|'audit';

export const FeeManagementView: React.FC = () => {
  const crm=useCrm();
  const [tab,setTab]=useState<Tab>('dashboard');
  const [data,setData]=useState<any>(null);
  const [accounts,setAccounts]=useState<any[]>([]);
  const [events,setEvents]=useState<any[]>([]);
  const [manualRows,setManualRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [statusFilter,setStatusFilter]=useState('ALL');
  const [initialFee,setInitialFee]=useState('2999');
  const [discount,setDiscount]=useState('0');
  const [offerLabel,setOfferLabel]=useState('');
  const [offerActive,setOfferActive]=useState(false);
  const [accountSaving,setAccountSaving]=useState(false);
  const [qrUploading,setQrUploading]=useState(false);
  const [createOpen,setCreateOpen]=useState(false);
  const [refundRow,setRefundRow]=useState<any>(null);
  const [refundAmount,setRefundAmount]=useState('');
  const [refundNote,setRefundNote]=useState('');
  const [manualForm,setManualForm]=useState({
    leadId:'',serviceType:'Registration Fee',amount:'2999',discount:'0',
    paymentMethod:'UPI / QR Code',transactionRef:'',note:''
  });
  const [accountForm,setAccountForm]=useState({
    id:'',label:'AKBS Company Account',accountHolder:'AKBS Poultry Farming Pvt. Ltd.',
    bankName:'',accountNumber:'',ifsc:'',branch:'',upiId:'',qrImageUrl:'',active:true
  });

  const load=async()=>{
    setLoading(true); setError('');
    try{
      const [fees,accountData,eventData,transactionData]=await Promise.all([
        crm.fee('snapshot',{}),
        crm.paymentAccounts('snapshot',{}),
        crm.feeEvents('snapshot',{}),
        crm.feeTransactions('snapshot',{})
      ]);
      setData(fees);
      setAccounts(accountData?.accounts||[]);
      setEvents(eventData?.events||[]);
      setManualRows(transactionData?.rows||[]);
      setInitialFee(String(fees?.config?.baseFee??2999));
      setDiscount(String(fees?.config?.discountPercent??0));
      setOfferLabel(fees?.config?.offerLabel||'');
      setOfferActive(Boolean(fees?.config?.offerActive));
    }catch(e:any){setError(e.message||'Unable to load fee data.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as Tab | undefined;
      if (detail && ['dashboard','settings','collections','verification','accounts','receipts','refunds','reports','audit'].includes(detail)) {
        setTab(detail);
      }
    };
    window.addEventListener('akbs-fee-tab', handler as EventListener);
    return () => window.removeEventListener('akbs-fee-tab', handler as EventListener);
  }, []);

  const payable=useMemo(()=>{
    const base=Number(initialFee||0),off=offerActive?Number(discount||0):0;
    return Math.max(0,Math.round(base*(1-off/100)));
  },[initialFee,discount,offerActive]);

  const portalRows=(data?.rows||[]).map((r:any)=>({
    id:'portal-'+r.leadId,kind:'portal',leadId:r.leadId,applicationId:r.applicationId,customerName:r.customerName,
    phone:r.phone,email:r.email,serviceType:'Initial Registration Fee',amount:Number(r.amount||data?.config?.payableFee||0),
    discount:Math.max(0,Number(data?.config?.baseFee||0)-Number(r.amount||data?.config?.payableFee||0)),
    payable:Number(r.amount||data?.config?.payableFee||0),paymentMethod:r.reference?'Customer Submitted':'—',
    transactionRef:r.reference||'',status:r.status,createdAt:r.submittedAt||r.createdAt,
    assignedTo:r.assignedTo,proofPath:r.proofPath
  }));
  const rows=[...portalRows,...manualRows.map((r:any)=>({...r,id:'manual-'+r.id,kind:'manual'}))]
    .sort((a:any,b:any)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime());

  const q=query.trim().toLowerCase();
  const filteredRows=rows.filter((r:any)=>{
    const matches=!q||[r.customerName,r.applicationId,r.phone,r.transactionRef,r.serviceType].some(v=>String(v||'').toLowerCase().includes(q));
    const status=statusLabel(r.status).toUpperCase().replaceAll(' ','_');
    return matches&&(statusFilter==='ALL'||status===statusFilter);
  });

  const verifiedRows=rows.filter((r:any)=>String(r.status).toUpperCase()==='VERIFIED');
  const pendingRows=rows.filter((r:any)=>['PENDING'].includes(String(r.status).toUpperCase()));
  const verificationRows=rows.filter((r:any)=>['UNDER_REVIEW','PROOF_SUBMITTED'].includes(String(r.status).toUpperCase()));
  const refundedPortal=events.filter((e:any)=>e.eventType==='REFUND').reduce((a:number,e:any)=>a+Number(e.amount||0),0);
  const refundedManual=rows.filter((r:any)=>String(r.status).toUpperCase()==='REFUNDED').reduce((a:number,r:any)=>a+Number(r.payable||0),0);
  const refundedTotal=refundedPortal+refundedManual;
  const totalExpected=rows.reduce((a:number,r:any)=>a+Number(r.payable||0),0);
  const totalCollected=verifiedRows.reduce((a:number,r:any)=>a+Number(r.payable||0),0);
  const pendingAmount=rows.filter((r:any)=>!['VERIFIED','REFUNDED','REJECTED'].includes(String(r.status).toUpperCase())).reduce((a:number,r:any)=>a+Number(r.payable||0),0);
  const thisMonth=verifiedRows.filter((r:any)=>{
    const d=new Date(r.createdAt||0),n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();
  }).reduce((a:number,r:any)=>a+Number(r.payable||0),0);

  const serviceSummary=useMemo(()=>{
    const m=new Map<string,{amount:number,count:number}>();
    rows.forEach((r:any)=>{const k=r.serviceType||'Other Fee';const x=m.get(k)||{amount:0,count:0};x.amount+=Number(r.payable||0);x.count++;m.set(k,x);});
    return [...m.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.amount-a.amount);
  },[rows.length,totalExpected]);

  const methodSummary=useMemo(()=>{
    const m=new Map<string,{amount:number,count:number}>();
    verifiedRows.forEach((r:any)=>{const k=r.paymentMethod||'Other';const x=m.get(k)||{amount:0,count:0};x.amount+=Number(r.payable||0);x.count++;m.set(k,x);});
    return [...m.entries()].map(([name,v])=>({name,...v})).sort((a,b)=>b.amount-a.amount);
  },[verifiedRows.length,totalCollected]);

  const collectionSeries=useMemo(()=>{
    const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(13-i));return d;});
    return days.map(d=>{const next=new Date(d);next.setDate(next.getDate()+1);
      const amount=verifiedRows.filter((r:any)=>{const x=new Date(r.createdAt||0);return x>=d&&x<next;}).reduce((a:number,r:any)=>a+Number(r.payable||0),0);
      return {label:d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}),amount};
    });
  },[verifiedRows.length,totalCollected]);
  const maxDay=Math.max(1,...collectionSeries.map(x=>x.amount));

  const saveConfig=async()=>{
    setSaving(true);setError('');
    try{await crm.fee('update_config',{initialFee:Number(initialFee||0),discountPercent:Number(discount||0),offerLabel:offerLabel.trim(),offerActive});await load();}
    catch(e:any){setError(e.message||'Unable to update fee settings.');}finally{setSaving(false);}
  };

  const verifyPortal=async(leadId:string,status:'VERIFIED'|'REJECTED')=>{
    setSaving(true);setError('');
    try{await crm.fee('verify',{leadId,status});await load();}catch(e:any){setError(e.message||'Unable to update payment.');}finally{setSaving(false);}
  };
  const verifyManual=async(id:string,status:string)=>{
    setSaving(true);setError('');
    try{await crm.feeTransactions('status',{id,status});await load();}catch(e:any){setError(e.message||'Unable to update payment.');}finally{setSaving(false);}
  };

  const createManual=async()=>{
    setSaving(true);setError('');
    try{
      await crm.feeTransactions('create',{
        leadId:manualForm.leadId,serviceType:manualForm.serviceType,amount:Number(manualForm.amount||0),
        discount:Number(manualForm.discount||0),paymentMethod:manualForm.paymentMethod,
        transactionRef:manualForm.transactionRef,note:manualForm.note
      });
      setCreateOpen(false);setManualForm({leadId:'',serviceType:'Registration Fee',amount:'2999',discount:'0',paymentMethod:'UPI / QR Code',transactionRef:'',note:''});await load();
    }catch(e:any){setError(e.message||'Unable to create fee transaction.');}finally{setSaving(false);}
  };

  const submitRefund=async()=>{
    if(!refundRow)return;
    setSaving(true);setError('');
    try{
      if(refundRow.kind==='portal') await crm.feeEvents('refund',{leadId:refundRow.leadId,amount:Number(refundAmount||0),note:refundNote});
      else await crm.feeTransactions('status',{id:String(refundRow.id).replace('manual-',''),status:'REFUNDED'});
      setRefundRow(null);setRefundAmount('');setRefundNote('');await load();
    }catch(e:any){setError(e.message||'Unable to record refund.');}finally{setSaving(false);}
  };

  const resetAccountForm=()=>setAccountForm({id:'',label:'AKBS Company Account',accountHolder:'AKBS Poultry Farming Pvt. Ltd.',bankName:'',accountNumber:'',ifsc:'',branch:'',upiId:'',qrImageUrl:'',active:true});
  const fileToDataUrl=(file:File)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('File could not be read.'));r.readAsDataURL(file);});
  const uploadQr=async(file:File)=>{setQrUploading(true);try{const out=await crm.uploadPaymentQr({name:file.name,type:file.type,data:await fileToDataUrl(file)});setAccountForm(p=>({...p,qrImageUrl:out.url||''}));}catch(e:any){setError(e.message);}finally{setQrUploading(false);}};
  const saveAccount=async()=>{setAccountSaving(true);try{const out=await crm.paymentAccounts('save',accountForm);setAccounts(out?.accounts||[]);resetAccountForm();}catch(e:any){setError(e.message);}finally{setAccountSaving(false);}};
  const setDefaultAccount=async(id:string)=>{setAccountSaving(true);try{const out=await crm.paymentAccounts('set_default',{id});setAccounts(out?.accounts||[]);}catch(e:any){setError(e.message);}finally{setAccountSaving(false);}};
  const deactivateAccount=async(id:string)=>{setAccountSaving(true);try{const out=await crm.paymentAccounts('delete',{id});setAccounts(out?.accounts||[]);}catch(e:any){setError(e.message);}finally{setAccountSaving(false);}};
  const editAccount=(a:any)=>setAccountForm({id:a.id||'',label:a.label||'',accountHolder:a.accountHolder||'',bankName:a.bankName||'',accountNumber:a.accountNumber||'',ifsc:a.ifsc||'',branch:a.branch||'',upiId:a.upiId||'',qrImageUrl:a.qrImageUrl||'',active:a.active!==false});

  const exportCsv=()=>{
    const header=['Date','Customer','Application ID','Service','Amount','Discount','Payable','Payment Method','Transaction Ref','Status'];
    const csv=[header,...filteredRows.map((r:any)=>[dt(r.createdAt),r.customerName,r.applicationId||'',r.serviceType,r.amount||0,r.discount||0,r.payable||0,r.paymentMethod||'',r.transactionRef||'',statusLabel(r.status)])]
      .map(row=>row.map((v:any)=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='AKBS-Fee-Report.csv';a.click();URL.revokeObjectURL(url);
  };

  const printReceipt=(r:any)=>{
    const w=window.open('','_blank','width=760,height=850'); if(!w)return;
    w.document.write(`<html><head><title>AKBS Receipt</title><style>body{font-family:Arial;padding:40px;color:#173b2c}.head{background:#073323;color:#fff;padding:24px;border-radius:14px}.card{border:1px solid #dfe8e3;border-radius:14px;padding:22px;margin-top:20px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.amt{font-size:30px;font-weight:800;color:#087849}</style></head><body><div class="head"><h2>AKBS Poultry Farming Pvt. Ltd.</h2><div>Payment Receipt</div></div><div class="card"><div class="row"><b>Customer</b><span>${r.customerName||''}</span></div><div class="row"><b>Application</b><span>${r.applicationId||'—'}</span></div><div class="row"><b>Service</b><span>${r.serviceType||''}</span></div><div class="row"><b>Transaction Ref</b><span>${r.transactionRef||'—'}</span></div><div class="row"><b>Status</b><span>${statusLabel(r.status)}</span></div><p class="amt">${money(r.payable||0)}</p><small>Generated from AKBS CRM Fee Management.</small></div><script>window.onload=()=>window.print()</script></body></html>`);w.document.close();
  };

  const tabs=[
    ['dashboard','Fee Dashboard',Wallet],['settings','Fee & Offer Settings',Settings2],['collections','Customer Collections',CreditCard],
    ['verification','Payment Verification',ShieldCheck],['accounts','Company Payment Accounts',Building2],['receipts','Receipts',ReceiptText],
    ['refunds','Refunds & Adjustments',RotateCcw],['reports','Fee Reports',FileBarChart2],['audit','Payment Audit Log',History]
  ] as const;

  const summaryCards=[
    ['Total Fees Expected',money(totalExpected),Wallet,'bg-emerald-50 text-emerald-700'],
    ['Total Collected',money(totalCollected),CheckCircle2,'bg-green-50 text-green-700'],
    ['Pending Amount',money(pendingAmount),Clock3,'bg-amber-50 text-amber-700'],
    ['Under Verification',String(verificationRows.length)+' Payments',ShieldCheck,'bg-blue-50 text-blue-700'],
    ['Refunded Amount',money(refundedTotal),RotateCcw,'bg-rose-50 text-rose-700'],
    ['This Month Revenue',money(thisMonth),ArrowUpRight,'bg-teal-50 text-teal-700']
  ] as const;

  return <div data-fee-layout="content-only" className="min-h-full bg-[#f5f8f6]">
    <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] text-slate-400">Home &nbsp;›&nbsp; Fee Management &nbsp;›&nbsp; {tabs.find(x=>x[0]===tab)?.[1]}</div>
          <h1 className="mt-2 text-2xl font-black text-slate-950 flex items-center gap-2"><BadgeIndianRupee className="w-6 h-6 text-emerald-700"/>Fee Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer fees, collections, payment verification and revenue tracking in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setCreateOpen(true)} className="h-10 px-4 rounded-xl bg-[#075c3e] text-white text-xs font-black flex items-center gap-2"><Plus className="w-4 h-4"/>Create Fee / Add Transaction</button>
          <button onClick={exportCsv} className="h-10 px-4 rounded-xl bg-[#087849] text-white text-xs font-black flex items-center gap-2"><Download className="w-4 h-4"/>Export Report</button>
        </div>
      </div>
    </div>

    <main className="p-4 sm:p-5 space-y-4 min-w-0">
        {error&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
        <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
          {summaryCards.map(([label,value,Icon,cls])=><div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl grid place-items-center ${cls}`}><Icon className="w-5 h-5"/></div><div><div className="text-[10px] font-bold text-slate-600">{label}</div><div className="mt-1 text-lg font-black text-slate-950">{value}</div></div></div>
          </div>)}
        </div>

        {tab==='dashboard'&&<>
          <div className="grid xl:grid-cols-[1.5fr_.9fr_.7fr] gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-black text-slate-900 text-sm">Collection Overview</h2>
              <div className="mt-5 h-52 flex items-end gap-1.5 border-b border-l border-slate-200 px-2 pb-2">
                {collectionSeries.map((x,i)=><div key={x.label} className="flex-1 min-w-0 flex flex-col justify-end items-center gap-1">
                  <div title={money(x.amount)} className="w-full max-w-8 rounded-t bg-emerald-600/75" style={{height:`${Math.max(3,(x.amount/maxDay)*165)}px`}}/>
                  {i%3===0&&<div className="text-[8px] text-slate-400 whitespace-nowrap">{x.label}</div>}
                </div>)}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-black text-slate-900 text-sm">Fee Collection Status</h2>
              <div className="mt-5 flex items-center gap-5">
                <div className="w-32 h-32 rounded-full grid place-items-center" style={{background:`conic-gradient(#07865c 0 ${totalExpected?totalCollected/totalExpected*100:0}%, #f4b63e ${totalExpected?totalCollected/totalExpected*100:0}% 100%)`}}>
                  <div className="w-20 h-20 rounded-full bg-white grid place-items-center text-center"><div><div className="text-lg font-black">{money(totalExpected)}</div><div className="text-[9px] text-slate-400">Total Fees</div></div></div>
                </div>
                <div className="space-y-2 text-[10px] flex-1">
                  <div className="flex justify-between"><span>Collected</span><b>{money(totalCollected)}</b></div>
                  <div className="flex justify-between"><span>Pending</span><b>{money(pendingAmount)}</b></div>
                  <div className="flex justify-between"><span>Verification</span><b>{verificationRows.length}</b></div>
                  <div className="flex justify-between"><span>Refunded</span><b>{money(refundedTotal)}</b></div>
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-black text-slate-900 text-sm">Quick Actions</h2>
              <div className="mt-3 space-y-2">
                <button onClick={()=>setCreateOpen(true)} className="w-full h-9 rounded-lg bg-[#075c3e] text-white text-[10px] font-black">Create Fee / Add Transaction</button>
                <button onClick={()=>setTab('verification')} className="w-full h-9 rounded-lg border border-slate-200 text-[10px] font-bold">Verify Payments ({verificationRows.length})</button>
                <button onClick={()=>setTab('receipts')} className="w-full h-9 rounded-lg border border-slate-200 text-[10px] font-bold">Generate Receipt</button>
                <button onClick={()=>setTab('settings')} className="w-full h-9 rounded-lg border border-slate-200 text-[10px] font-bold">Manage Fee Settings</button>
                <button onClick={()=>setTab('accounts')} className="w-full h-9 rounded-lg border border-slate-200 text-[10px] font-bold">Company Payment Accounts</button>
              </div>
            </section>
          </div>

          <div className="grid xl:grid-cols-3 gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex justify-between"><h2 className="font-black text-sm">Recent Payments</h2><button onClick={()=>setTab('collections')} className="text-[10px] font-bold text-emerald-700">View All</button></div>
              <div className="mt-3 divide-y divide-slate-100">{rows.slice(0,5).map((r:any)=><div key={r.id} className="py-2 flex items-center justify-between gap-2"><div className="min-w-0"><div className="font-bold text-xs truncate">{r.customerName}</div><div className="text-[9px] text-slate-400 truncate">{r.serviceType}</div></div><div className="text-right"><div className="font-black text-xs">{money(r.payable)}</div><span className={`inline-flex px-2 py-0.5 rounded-full border text-[8px] font-bold ${badgeClass(r.status)}`}>{statusLabel(r.status)}</span></div></div>)}</div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-black text-sm">Fee by Service Type</h2>
              <div className="mt-4 space-y-3">{serviceSummary.slice(0,6).map(x=><div key={x.name}><div className="flex justify-between text-[10px]"><span>{x.name}</span><b>{money(x.amount)}</b></div><div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{width:`${totalExpected?Math.max(4,x.amount/totalExpected*100):0}%`}}/></div></div>)}</div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-black text-sm">Payment Methods</h2>
              <div className="mt-4 space-y-3">{methodSummary.length?methodSummary.map(x=><div key={x.name}><div className="flex justify-between text-[10px]"><span>{x.name}</span><b>{money(x.amount)}</b></div><div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500" style={{width:`${totalCollected?Math.max(4,x.amount/totalCollected*100):0}%`}}/></div></div>):<div className="text-xs text-slate-400">No verified payment method data yet.</div>}</div>
            </section>
          </div>
        </>}

        {tab==='settings'&&<section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-emerald-700"/><h2 className="font-black">Fee & Offer Settings</h2></div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <label className="text-xs font-bold">Base Initial Fee<input type="number" value={initialFee} onChange={e=>setInitialFee(e.target.value)} className="mt-2 w-full h-10 rounded-xl border border-slate-300 px-3"/></label>
            <label className="text-xs font-bold">Offer Discount %<input type="number" min="0" max="100" value={discount} onChange={e=>setDiscount(e.target.value)} className="mt-2 w-full h-10 rounded-xl border border-slate-300 px-3"/></label>
            <label className="text-xs font-bold sm:col-span-2">Offer Name<input value={offerLabel} onChange={e=>setOfferLabel(e.target.value)} className="mt-2 w-full h-10 rounded-xl border border-slate-300 px-3" placeholder="Example: Festive Offer 20% OFF"/></label>
            <label className="sm:col-span-2 flex items-center justify-between rounded-xl border p-3 text-xs font-bold"><span>Offer Active</span><input type="checkbox" checked={offerActive} onChange={e=>setOfferActive(e.target.checked)} className="w-5 h-5 accent-emerald-700"/></label>
            <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-[10px] font-bold text-emerald-700">CUSTOMER PAYABLE FEE</div><div className="text-3xl font-black text-emerald-950">{money(payable)}</div>{offerActive&&Number(discount)>0&&<div className="text-xs text-emerald-700 mt-1">Base {money(Number(initialFee||0))} · {discount}% discount</div>}</div>
          </div>
          <button disabled={saving} onClick={saveConfig} className="mt-4 h-10 px-5 rounded-xl bg-[#075c3e] text-white text-xs font-black">{saving?'Saving…':'Save Fee Settings'}</button>
        </section>}

        {tab==='accounts'&&<section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex justify-between gap-3"><div><h2 className="font-black">Company Payment Accounts</h2><p className="text-xs text-slate-500 mt-1">Set the default bank/UPI/QR shown to customers.</p></div><button onClick={resetAccountForm} className="h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1"><Plus className="w-3 h-3"/>New Account</button></div>
          <div className="mt-5 grid xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
            <div className="rounded-xl border p-4 space-y-3">
              {['label','accountHolder','bankName','accountNumber','ifsc','branch','upiId','qrImageUrl'].map((key:any)=><input key={key} value={(accountForm as any)[key]} onChange={e=>setAccountForm(p=>({...p,[key]:key==='ifsc'?e.target.value.toUpperCase():e.target.value}))} placeholder={({label:'Account label',accountHolder:'Account holder name',bankName:'Bank name',accountNumber:'Account number',ifsc:'IFSC',branch:'Branch',upiId:'UPI ID',qrImageUrl:'QR image URL'} as any)[key]} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs"/>)}
              <label className="block rounded-xl border border-dashed bg-slate-50 p-3 text-[10px] font-bold">Upload QR / Barcode<input type="file" accept="image/png,image/jpeg,image/webp" disabled={qrUploading} onChange={e=>{const x=e.target.files?.[0];if(x)void uploadQr(x)}} className="mt-2 block w-full text-[10px]"/></label>
              {accountForm.qrImageUrl&&<img src={accountForm.qrImageUrl} className="h-32 mx-auto object-contain" alt="QR preview"/>}
              <button disabled={accountSaving} onClick={saveAccount} className="w-full h-10 rounded-xl bg-[#075c3e] text-white text-xs font-black">{accountForm.id?'Update Account':'Save Account'}</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3 content-start">{accounts.map((a:any)=><div key={a.id} className={`rounded-xl border p-4 ${a.isDefault?'border-emerald-300 bg-emerald-50':'border-slate-200'}`}>
              <div className="flex justify-between"><div><div className="font-black text-sm">{a.label}</div><div className="text-[10px] text-slate-500">{a.accountHolder}</div></div>{a.isDefault&&<span className="h-fit px-2 py-1 rounded-full bg-emerald-700 text-white text-[8px] font-black">DEFAULT</span>}</div>
              <div className="mt-3 text-xs space-y-1">{a.bankName&&<div>Bank: <b>{a.bankName}</b></div>}{a.accountNumber&&<div>A/C: <b>{a.accountNumber}</b></div>}{a.ifsc&&<div>IFSC: <b>{a.ifsc}</b></div>}{a.upiId&&<div>UPI: <b>{a.upiId}</b></div>}</div>
              {a.qrImageUrl&&<img src={a.qrImageUrl} className="mt-3 h-24 w-24 object-contain rounded-lg border bg-white p-2" alt="Payment QR"/>}
              <div className="mt-3 flex gap-2"><button onClick={()=>editAccount(a)} className="h-8 px-3 rounded-lg border text-[10px] font-bold">Edit</button>{!a.isDefault&&<button onClick={()=>void setDefaultAccount(a.id)} className="h-8 px-3 rounded-lg bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1"><Star className="w-3 h-3"/>Set Default</button>}<button onClick={()=>void deactivateAccount(a.id)} className="h-8 px-3 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold"><Trash2 className="w-3 h-3"/></button></div>
            </div>)}{!accounts.length&&<div className="md:col-span-2 p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">No payment account added yet.</div>}</div>
          </div>
        </section>}

        {['collections','verification','receipts'].includes(tab)&&<section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="font-black">{tab==='verification'?'Payment Verification':tab==='receipts'?'Receipts':'Customer Collections'}</h2><p className="text-[10px] text-slate-500 mt-1">Live fee transactions and payment status.</p></div><div className="flex gap-2"><div className="relative"><Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, UTR..." className="h-9 pl-9 pr-3 rounded-lg border text-xs"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-lg border px-2 text-xs"><option value="ALL">All Status</option><option>PENDING</option><option>UNDER_REVIEW</option><option>PROOF_SUBMITTED</option><option>VERIFIED</option><option>REJECTED</option><option>REFUNDED</option></select></div></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="p-3 text-left">Date & Time</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Application ID</th><th className="p-3 text-left">Service / Fee Type</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Discount</th><th className="p-3 text-left">Payable</th><th className="p-3 text-left">Payment Method</th><th className="p-3 text-left">UTR / Transaction ID</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
            {filteredRows.filter((r:any)=>tab!=='verification'||['UNDER_REVIEW','PROOF_SUBMITTED'].includes(String(r.status).toUpperCase())).map((r:any)=><tr key={r.id} className="border-t"><td className="p-3 text-[10px]">{dt(r.createdAt)}</td><td className="p-3"><b>{r.customerName}</b><div className="text-[9px] text-slate-400">{r.phone}</div></td><td className="p-3 font-mono text-[9px]">{r.applicationId||'—'}</td><td className="p-3">{r.serviceType}</td><td className="p-3 font-bold">{money(r.amount)}</td><td className="p-3">{money(r.discount)}</td><td className="p-3 font-black">{money(r.payable)}</td><td className="p-3">{r.paymentMethod||'—'}</td><td className="p-3 font-mono text-[9px]">{r.transactionRef||'—'}</td><td className="p-3"><span className={`px-2 py-1 rounded-full border text-[9px] font-bold ${badgeClass(r.status)}`}>{statusLabel(r.status)}</span></td><td className="p-3 text-right"><div className="inline-flex gap-1">{['UNDER_REVIEW','PROOF_SUBMITTED'].includes(String(r.status).toUpperCase())&&<><button onClick={()=>r.kind==='portal'?void verifyPortal(r.leadId,'VERIFIED'):void verifyManual(String(r.id).replace('manual-',''),'VERIFIED')} className="px-2 py-1 rounded bg-emerald-700 text-white text-[9px] font-bold">Verify</button><button onClick={()=>r.kind==='portal'?void verifyPortal(r.leadId,'REJECTED'):void verifyManual(String(r.id).replace('manual-',''),'REJECTED')} className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[9px] font-bold">Reject</button></>}{tab==='receipts'&&String(r.status).toUpperCase()==='VERIFIED'&&<button onClick={()=>printReceipt(r)} className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[9px] font-bold">View / Print</button>}<button className="p-1"><MoreHorizontal className="w-4 h-4"/></button></div></td></tr>)}
            {!filteredRows.length&&<tr><td colSpan={11} className="p-10 text-center text-slate-400">No payment records found.</td></tr>}
          </tbody></table></div>
        </section>}

        {tab==='refunds'&&<section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-black">Refunds & Adjustments</h2><p className="text-xs text-slate-500 mt-1">Record refunds against verified collections and keep an audit trail.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Service</th><th className="p-3 text-left">Collected</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{verifiedRows.map((r:any)=><tr key={r.id} className="border-t"><td className="p-3 font-bold">{r.customerName}</td><td className="p-3">{r.serviceType}</td><td className="p-3 font-black">{money(r.payable)}</td><td className="p-3"><span className={`px-2 py-1 rounded-full border text-[9px] font-bold ${badgeClass(r.status)}`}>Verified</span></td><td className="p-3 text-right"><button onClick={()=>{setRefundRow(r);setRefundAmount(String(r.payable||0));}} className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold">Record Refund</button></td></tr>)}</tbody></table></div>
        </section>}

        {tab==='reports'&&<section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex justify-between gap-3"><div><h2 className="font-black">Fee Reports</h2><p className="text-xs text-slate-500 mt-1">Live collection summary generated from CRM transactions.</p></div><button onClick={exportCsv} className="h-9 px-3 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center gap-2"><Download className="w-4 h-4"/>Export CSV</button></div>
          <div className="mt-5 grid md:grid-cols-4 gap-3">{[['Expected',totalExpected],['Collected',totalCollected],['Pending',pendingAmount],['Refunded',refundedTotal]].map(([l,v])=><div key={String(l)} className="rounded-xl border p-4"><div className="text-[10px] text-slate-400 uppercase">{l}</div><div className="mt-1 text-2xl font-black">{money(Number(v))}</div></div>)}</div>
          <div className="mt-5"><h3 className="font-black text-sm">Service-wise Revenue</h3><div className="mt-3 space-y-2">{serviceSummary.map(x=><div key={x.name} className="flex justify-between rounded-lg border px-3 py-2 text-xs"><span>{x.name} <span className="text-slate-400">({x.count})</span></span><b>{money(x.amount)}</b></div>)}</div></div>
        </section>}

        {tab==='audit'&&<section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-black">Payment Audit Log</h2><p className="text-xs text-slate-500 mt-1">Refund and adjustment events with staff accountability.</p>
          <div className="mt-4 space-y-2">{events.map((e:any)=><div key={e.id} className="rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div><div className="font-bold text-xs">{e.eventType} · {money(e.amount)}</div><div className="text-[10px] text-slate-500">{e.note||'No note'} · by {e.createdBy}</div></div><div className="text-[10px] text-slate-400">{dt(e.createdAt)}</div></div>)}{!events.length&&<div className="text-xs text-slate-400">No audit events yet.</div>}</div>
        </section>}
    </main>

    {createOpen&&<div className="fixed inset-0 z-[100] bg-slate-950/60 grid place-items-center p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-5">
      <div className="flex justify-between"><div><h2 className="font-black">Create Fee / Add Transaction</h2><p className="text-xs text-slate-500 mt-1">Add a service fee or record an offline payment reference.</p></div><button onClick={()=>setCreateOpen(false)}><XCircle className="w-5 h-5 text-slate-400"/></button></div>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <select value={manualForm.leadId} onChange={e=>setManualForm(p=>({...p,leadId:e.target.value}))} className="h-10 rounded-xl border px-3 text-xs sm:col-span-2"><option value="">General / no customer</option>{(data?.rows||[]).map((r:any)=><option key={r.leadId} value={r.leadId}>{r.customerName} · {r.applicationId}</option>)}</select>
        <select value={manualForm.serviceType} onChange={e=>setManualForm(p=>({...p,serviceType:e.target.value}))} className="h-10 rounded-xl border px-3 text-xs"><option>Registration Fee</option><option>Soft Quotation Fee</option><option>DPR Proposal Fee</option><option>Site Visit Fee</option><option>Consultation Fee</option><option>Loan Processing Fee</option><option>Complete Project Assistance</option><option>Other Fee</option></select>
        <select value={manualForm.paymentMethod} onChange={e=>setManualForm(p=>({...p,paymentMethod:e.target.value}))} className="h-10 rounded-xl border px-3 text-xs"><option>UPI / QR Code</option><option>Bank Transfer</option><option>Cash</option><option>Razorpay</option><option>Other</option></select>
        <input type="number" value={manualForm.amount} onChange={e=>setManualForm(p=>({...p,amount:e.target.value}))} placeholder="Amount" className="h-10 rounded-xl border px-3 text-xs"/>
        <input type="number" value={manualForm.discount} onChange={e=>setManualForm(p=>({...p,discount:e.target.value}))} placeholder="Discount amount" className="h-10 rounded-xl border px-3 text-xs"/>
        <input value={manualForm.transactionRef} onChange={e=>setManualForm(p=>({...p,transactionRef:e.target.value}))} placeholder="UTR / Transaction Ref (optional)" className="h-10 rounded-xl border px-3 text-xs sm:col-span-2"/>
        <textarea value={manualForm.note} onChange={e=>setManualForm(p=>({...p,note:e.target.value}))} placeholder="Internal note" className="min-h-20 rounded-xl border p-3 text-xs sm:col-span-2"/>
      </div>
      <div className="mt-4 flex justify-end gap-2"><button onClick={()=>setCreateOpen(false)} className="h-9 px-4 rounded-lg border text-xs font-bold">Cancel</button><button disabled={saving} onClick={createManual} className="h-9 px-4 rounded-lg bg-[#075c3e] text-white text-xs font-black">{saving?'Saving…':'Create Transaction'}</button></div>
    </div></div>}

    {refundRow&&<div className="fixed inset-0 z-[100] bg-slate-950/60 grid place-items-center p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-black">Record Refund</h2><p className="mt-1 text-xs text-slate-500">{refundRow.customerName} · {refundRow.serviceType}</p>
      <input type="number" value={refundAmount} onChange={e=>setRefundAmount(e.target.value)} className="mt-4 h-10 w-full rounded-xl border px-3 text-xs" placeholder="Refund amount"/>
      <textarea value={refundNote} onChange={e=>setRefundNote(e.target.value)} className="mt-3 min-h-20 w-full rounded-xl border p-3 text-xs" placeholder="Refund reason / note"/>
      <div className="mt-4 flex justify-end gap-2"><button onClick={()=>setRefundRow(null)} className="h-9 px-4 rounded-lg border text-xs font-bold">Cancel</button><button disabled={saving} onClick={submitRefund} className="h-9 px-4 rounded-lg bg-rose-700 text-white text-xs font-black">Save Refund</button></div>
    </div></div>}
  </div>;
};
