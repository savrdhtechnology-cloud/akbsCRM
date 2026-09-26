import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  FileDown,
  FilePlus2,
  FileSignature,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Send,
  Share2,
  Sparkles,
  Trash2,
  UserPlus,
  XCircle
} from 'lucide-react';
import { Customer, Lead, PortalRole } from '../../types';
import { AKBS_EC_20000_TEMPLATE, createBlankQuotation, recalculateTotals } from './defaults';
import { generateAiContent, AiAction } from './aiAssistant';
import {
  changeQuotationStatus,
  duplicateSoftQuotation,
  loadSoftQuotations,
  nextQuotationNumber,
  persistSoftQuotations,
  saveSoftQuotation
} from './store';
import { SoftQuotationDocument } from './SoftQuotationDocument';
import {
  SoftQuotation,
  SoftQuotationCostItem,
  SoftQuotationModuleProps,
  SoftQuotationStatus
} from './types';

type ViewMode = 'dashboard' | 'builder' | 'detail';

const roleCanApprove = (role: PortalRole) => role === 'admin' || role === 'manager';
const roleCanEditApproved = (role: PortalRole) => role === 'admin' || role === 'manager';

const formatMoney = (value: number) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN') : '—';

const pathParts = () => window.location.pathname.split('/').filter(Boolean);

const parseRoute = () => {
  const parts = pathParts();
  if (parts[0] !== 'soft-quotations') return { mode: 'dashboard' as ViewMode, id: '', edit: false };
  if (parts[1] === 'new') return { mode: 'builder' as ViewMode, id: '', edit: false };
  if (parts[1] === 'accept') return { mode: 'dashboard' as ViewMode, id: '', edit: false };
  if (parts[1]) return { mode: parts[2] === 'edit' ? 'builder' as ViewMode : 'detail' as ViewMode, id: parts[1], edit: parts[2] === 'edit' };
  return { mode: 'dashboard' as ViewMode, id: '', edit: false };
};

export const SoftQuotationsModule: React.FC<SoftQuotationModuleProps> = ({
  currentRole,
  currentUserName,
  customers,
  leads,
  onCreateCustomer,
  onConvertToProject
}) => {
  const [route, setRoute] = useState(parseRoute);
  const [quotes, setQuotes] = useState<SoftQuotation[]>(loadSoftQuotations);
  const [draft, setDraft] = useState<SoftQuotation | null>(null);
  const [builderStep, setBuilderStep] = useState(1);
  const [filter, setFilter] = useState<SoftQuotationStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [aiBusy, setAiBusy] = useState<AiAction | null>(null);
  const [notice, setNotice] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('popstate', handler);
    window.addEventListener('soft-quotation-route', handler as EventListener);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('soft-quotation-route', handler as EventListener);
    };
  }, []);

  useEffect(() => {
    persistSoftQuotations(quotes);
  }, [quotes]);

  useEffect(() => {
    if (route.mode !== 'builder') return;
    if (route.id) {
      const existing = quotes.find(q => q.id === route.id);
      setDraft(existing ? JSON.parse(JSON.stringify(existing)) : null);
    } else {
      setDraft(createBlankQuotation(
        crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        nextQuotationNumber(),
        currentRole,
        currentUserName
      ));
    }
    setBuilderStep(1);
  }, [route.mode, route.id]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parseRoute());
    window.dispatchEvent(new Event('soft-quotation-route'));
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const activeQuote = route.id ? quotes.find(q => q.id === route.id) || null : null;

  const filteredQuotes = useMemo(() => quotes.filter(q => {
    if (filter !== 'ALL' && q.status !== filter) return false;
    const text = `${q.quotationNo} ${q.customer.customerName} ${q.projectName} ${q.projectType}`.toLowerCase();
    return text.includes(search.toLowerCase());
  }), [quotes, filter, search]);

  const totalValue = quotes.filter(q => q.status !== 'ARCHIVED').reduce((sum, q) => sum + q.grandTotal, 0);
  const metric = (status: SoftQuotationStatus) => quotes.filter(q => q.status === status).length;

  const persistDraft = (status?: SoftQuotationStatus) => {
    if (!draft) return;
    const updated = status ? { ...draft, status } : draft;
    const next = saveSoftQuotation(quotes, updated, currentUserName, currentRole);
    setQuotes(next);
    const saved = next.find(q => q.id === updated.id)!;
    setDraft(JSON.parse(JSON.stringify(saved)));
    flash(status === 'REVIEW' ? 'Quotation submitted for manager review.' : 'Quotation saved.');
  };

  const approveQuote = (id: string) => {
    if (!roleCanApprove(currentRole)) return flash('Manager or Admin approval is required.');
    setQuotes(q => changeQuotationStatus(q, id, 'APPROVED', currentUserName, currentRole));
    flash('Quotation approved.');
  };

  const rejectQuote = (id: string) => {
    if (!roleCanApprove(currentRole)) return;
    setQuotes(q => changeQuotationStatus(q, id, 'REJECTED', currentUserName, currentRole, 'Revision requested by manager'));
    flash('Quotation returned for revision.');
  };

  const sendQuote = (quote: SoftQuotation) => {
    if (!['APPROVED', 'SENT', 'VIEWED'].includes(quote.status)) {
      return flash('Manager approval is required before sending.');
    }
    setQuotes(q => changeQuotationStatus(q, quote.id, 'SENT', currentUserName, currentRole));
    flash('Quotation marked as sent.');
  };

  const recordAcceptance = (quote: SoftQuotation) => {
    if (!roleCanApprove(currentRole)) return flash('Only Manager/Admin can record customer acceptance.');
    const now = new Date().toISOString();
    const accepted: SoftQuotation = {
      ...quote,
      status: 'ACCEPTED',
      acceptedAt: now,
      acceptance: {
        customerName: quote.customer.customerName || 'Customer',
        email: quote.customer.email,
        mobile: quote.customer.mobile,
        typedSignature: quote.customer.customerName || 'Customer',
        acceptedAt: now,
        acceptanceVersion: quote.version
      }
    };
    setQuotes(prev => prev.map(q => q.id === quote.id ? accepted : q));
    flash('Customer acceptance recorded separately for this version.');
  };

  const archiveQuote = (id: string) => {
    setQuotes(q => changeQuotationStatus(q, id, 'ARCHIVED', currentUserName, currentRole));
    setActionMenu(null);
  };

  const duplicateQuote = (quote: SoftQuotation) => {
    const next = duplicateSoftQuotation(quotes, quote, currentUserName, currentRole);
    setQuotes(next);
    navigate(`/soft-quotations/${next[0].id}/edit`);
  };

  const shareLink = (quote: SoftQuotation) => `${window.location.origin}/soft-quotations/accept/${quote.acceptanceToken}`;

  const shareQuote = async (quote: SoftQuotation) => {
    const url = shareLink(quote);
    try {
      if (navigator.share) await navigator.share({ title: quote.quotationNo, text: quote.projectName, url });
      else {
        await navigator.clipboard.writeText(url);
        flash('Secure acceptance link copied.');
      }
    } catch {}
  };

  const sendWhatsApp = (quote: SoftQuotation) => {
    const phone = quote.customer.mobile.replace(/\D/g, '');
    const normalized = phone.length === 10 ? `91${phone}` : phone;
    const message = `Dear ${quote.customer.customerName},

Please find the Soft Quotation / Preliminary Project Estimate for your proposed ${quote.projectName}.

Project Capacity: ${quote.projectCapacity.toLocaleString('en-IN')} ${quote.projectUnit}
Estimated Project Cost: ${formatMoney(quote.grandTotal)}

The quotation contains the proposed technical specifications, scope of work and preliminary cost estimate.

Acceptance link: ${shareLink(quote)}

Regards,
AKBS Poultry Farming Private Limited`;
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    sendQuote(quote);
  };

  const sendEmail = (quote: SoftQuotation) => {
    const subject = `Soft Quotation – ${quote.projectName} | ${quote.quotationNo}`;
    const body = `Dear ${quote.customer.customerName},

Please find the Soft Quotation / Preliminary Project Estimate for your proposed ${quote.projectName}.

Project Capacity: ${quote.projectCapacity.toLocaleString('en-IN')} ${quote.projectUnit}
Estimated Project Cost: ${formatMoney(quote.grandTotal)}

Review / acceptance link:
${shareLink(quote)}

Regards,
AKBS Poultry Farming Private Limited`;
    window.location.href = `mailto:${quote.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    sendQuote(quote);
  };

  const downloadPdf = async (quote: SoftQuotation) => {
    const element = document.getElementById('soft-quotation-pdf');
    if (!element) {
      navigate(`/soft-quotations/${quote.id}`);
      flash('Open the quotation preview, then use Download PDF.');
      return;
    }
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(element, { scale: 1.6, useCORS: true, backgroundColor: '#ffffff' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${quote.quotationNo}-v${quote.version}.pdf`);
    } catch {
      window.print();
    }
  };

  const applyExistingCustomer = (customerId: string) => {
    if (!draft) return;
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    setDraft({
      ...draft,
      customer: {
        ...draft.customer,
        crmCustomerId: customer.id,
        customerName: customer.name,
        companyName: customer.farmName,
        mobile: customer.phone,
        email: customer.email,
        city: customer.location,
        state: customer.state,
        contactPerson: customer.name
      }
    });
  };

  const applyLead = (leadId: string) => {
    if (!draft) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    setDraft({
      ...draft,
      customer: {
        ...draft.customer,
        leadId: lead.id,
        customerName: lead.name,
        mobile: lead.phone,
        email: lead.email,
        city: lead.district || lead.location,
        state: lead.state || ''
      },
      projectLocation: lead.location,
      projectCapacity: lead.birdCapacity || draft.projectCapacity,
      projectName: `${(lead.birdCapacity || draft.projectCapacity).toLocaleString('en-IN')} Birds Environment Controlled Broiler Farm`
    });
  };

  const applyDefaultTemplate = () => {
    if (!draft) return;
    const t = AKBS_EC_20000_TEMPLATE;
    setDraft(recalculateTotals({
      ...draft,
      projectName: t.name,
      projectType: t.projectType,
      projectCapacity: t.capacity,
      projectUnit: t.capacityUnit,
      shedSize: t.shedSize,
      coveredArea: t.coveredArea,
      technology: t.technology,
      technicalSpecifications: JSON.parse(JSON.stringify(t.technicalSpecifications)),
      scopeOfWork: [...t.scopeOfWork],
      costBreakup: t.costBreakup.map(x => ({ ...x })),
      exclusions: [...t.exclusions],
      executionTimeline: t.executionTimeline.map(x => ({ ...x })),
      commercialTerms: { ...t.commercialTerms },
      quotationValidity: t.commercialTerms.quotationValidity
    }));
  };

  const runAi = async (action: AiAction) => {
    if (!draft) return;
    setAiBusy(action);
    const result = await generateAiContent(action, recalculateTotals(draft));
    setAiBusy(null);

    if (action === 'project-details') {
      setDraft(prev => prev ? recalculateTotals({
        ...prev,
        ...result,
        requiresConfirmation: result.requiresConfirmation || prev.requiresConfirmation
      }) : prev);
    } else if (action === 'overview' || action === 'improve-language') {
      setDraft(prev => prev ? { ...prev, projectOverview: result.text || prev.projectOverview, requiresConfirmation: result.requiresConfirmation || prev.requiresConfirmation } : prev);
    } else if (action === 'customer-summary') {
      setDraft(prev => prev ? { ...prev, customerFriendlySummary: result.text || prev.customerFriendlySummary } : prev);
    } else if (action === 'commercial-notes' || action === 'cost-explanation') {
      setDraft(prev => prev ? { ...prev, commercialNotes: result.text || prev.commercialNotes } : prev);
    } else if (action === 'scope' && result.text) {
      setDraft(prev => prev ? { ...prev, scopeOfWork: String(result.text).split('\n').filter(Boolean) } : prev);
    } else if (action === 'exclusions' && result.text) {
      setDraft(prev => prev ? { ...prev, exclusions: String(result.text).split('\n').filter(Boolean) } : prev);
    }
    flash('AI assistant updated the draft using approved quotation data.');
  };

  if (route.mode === 'builder') {
    return draft ? (
      <QuotationBuilder
        quotation={draft}
        setQuotation={q => setDraft(recalculateTotals(q))}
        step={builderStep}
        setStep={setBuilderStep}
        customers={customers}
        leads={leads}
        currentRole={currentRole}
        aiBusy={aiBusy}
        onAi={runAi}
        onSelectCustomer={applyExistingCustomer}
        onSelectLead={applyLead}
        onCreateCustomer={onCreateCustomer}
        onApplyTemplate={applyDefaultTemplate}
        onSave={() => persistDraft()}
        onSubmit={() => persistDraft('REVIEW')}
        onCancel={() => navigate('/soft-quotations')}
        notice={notice}
      />
    ) : <div className="p-8">Quotation not found.</div>;
  }

  if (route.mode === 'detail') {
    if (!activeQuote) return <div className="p-8">Quotation not found.</div>;
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
          <div>
            <button onClick={() => navigate('/soft-quotations')} className="text-xs text-emerald-700 font-bold flex items-center gap-1"><ChevronLeft className="w-4 h-4"/>Soft Quotations</button>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">{activeQuote.quotationNo}</h1>
              <StatusBadge status={activeQuote.status}/>
              <span className="text-xs text-slate-400">Version {activeQuote.version}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{activeQuote.customer.customerName} · {activeQuote.projectName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(activeQuote.status === 'DRAFT' || activeQuote.status === 'REJECTED' || roleCanEditApproved(currentRole)) && (
              <button onClick={() => navigate(`/soft-quotations/${activeQuote.id}/edit`)} className="btn-secondary"><Edit3 className="w-4 h-4"/>Edit</button>
            )}
            {activeQuote.status === 'REVIEW' && roleCanApprove(currentRole) && <>
              <button onClick={() => rejectQuote(activeQuote.id)} className="btn-secondary text-rose-700"><XCircle className="w-4 h-4"/>Reject</button>
              <button onClick={() => approveQuote(activeQuote.id)} className="btn-primary"><BadgeCheck className="w-4 h-4"/>Approve</button>
            </>}
            <button onClick={() => window.print()} className="btn-secondary"><Printer className="w-4 h-4"/>Generate PDF</button>
            <button onClick={() => downloadPdf(activeQuote)} className="btn-secondary"><Download className="w-4 h-4"/>Download PDF</button>
            <button onClick={() => sendWhatsApp(activeQuote)} className="btn-secondary"><Send className="w-4 h-4"/>WhatsApp</button>
            <button onClick={() => sendEmail(activeQuote)} className="btn-secondary"><Mail className="w-4 h-4"/>Email</button>
            <button onClick={() => shareQuote(activeQuote)} className="btn-secondary"><Share2 className="w-4 h-4"/>Share</button>
          </div>
        </div>
        {notice && <Notice>{notice}</Notice>}
        {activeQuote.versions?.length > 0 && (
          <div className="print:hidden rounded-xl border bg-white p-4 text-xs">
            <b>Version history:</b> {activeQuote.versions.map(v => `Version ${v.version} (${v.status})`).join(' · ')}
          </div>
        )}
        <SoftQuotationDocument quotation={activeQuote}/>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[.16em] font-black text-emerald-700">Sales / Projects</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-[-.04em] text-slate-950">Soft Quotations</h1>
          <p className="text-sm text-slate-500 mt-1">AI-assisted preliminary project estimates with approval, versioning and customer acceptance.</p>
        </div>
        <button onClick={() => navigate('/soft-quotations/new')} className="btn-primary"><Plus className="w-4 h-4"/>New Soft Quotation</button>
      </div>

      {notice && <Notice>{notice}</Notice>}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Metric label="Total Quotations" value={quotes.length} onClick={() => setFilter('ALL')}/>
        <Metric label="Draft" value={metric('DRAFT')} onClick={() => setFilter('DRAFT')}/>
        <Metric label="Sent" value={metric('SENT')} onClick={() => setFilter('SENT')}/>
        <Metric label="Viewed" value={metric('VIEWED')} onClick={() => setFilter('VIEWED')}/>
        <Metric label="Accepted" value={metric('ACCEPTED')} onClick={() => setFilter('ACCEPTED')}/>
        <Metric label="Expired" value={metric('EXPIRED')} onClick={() => setFilter('EXPIRED')}/>
        <Metric label="Estimated Value" value={formatMoney(totalValue)} onClick={() => setFilter('ALL')}/>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {(['ALL','DRAFT','REVIEW','APPROVED','SENT','VIEWED','ACCEPTED','EXPIRED'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter === s ? 'bg-[#073323] text-white' : 'bg-slate-100 text-slate-600'}`}>{s === 'ALL' ? 'All' : s}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotation, customer, project..." className="h-10 px-3 rounded-xl border border-slate-200 text-sm w-full md:w-80"/>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                {['Quotation No.','Customer','Project','Project Type','Capacity','Estimated Cost','Created By','Date','Valid Until','Status','Actions'].map(h => <th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQuotes.map(q => (
                <tr key={q.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3"><button onClick={() => navigate(`/soft-quotations/${q.id}`)} className="font-mono font-black text-emerald-800 hover:underline">{q.quotationNo}</button><div className="text-[10px] text-slate-400 mt-1">Version {q.version}</div></td>
                  <td className="px-4 py-3"><div className="font-bold">{q.customer.customerName || '—'}</div><div className="text-xs text-slate-400">{q.customer.mobile}</div></td>
                  <td className="px-4 py-3 max-w-[220px]"><div className="font-semibold truncate">{q.projectName}</div></td>
                  <td className="px-4 py-3">{q.projectType}</td>
                  <td className="px-4 py-3 font-mono">{q.projectCapacity.toLocaleString('en-IN')} {q.projectUnit}</td>
                  <td className="px-4 py-3 font-mono font-bold">{formatMoney(q.grandTotal)}</td>
                  <td className="px-4 py-3">{q.createdBy}</td>
                  <td className="px-4 py-3">{formatDate(q.createdAt)}</td>
                  <td className="px-4 py-3">{q.validUntil}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status}/></td>
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center gap-1">
                      <button title="View" onClick={() => navigate(`/soft-quotations/${q.id}`)} className="icon-btn"><Eye className="w-4 h-4"/></button>
                      <button title="Edit" onClick={() => navigate(`/soft-quotations/${q.id}/edit`)} className="icon-btn"><Edit3 className="w-4 h-4"/></button>
                      <button title="Duplicate" onClick={() => duplicateQuote(q)} className="icon-btn"><Copy className="w-4 h-4"/></button>
                      <button onClick={() => setActionMenu(actionMenu === q.id ? null : q.id)} className="icon-btn"><MoreHorizontal className="w-4 h-4"/></button>
                    </div>
                    {actionMenu === q.id && (
                      <div className="absolute right-3 top-11 z-20 w-56 bg-white border rounded-xl shadow-xl p-1 text-xs">
                        <Action label="Generate / Print PDF" icon={<Printer/>} onClick={() => { navigate(`/soft-quotations/${q.id}`); setActionMenu(null); }}/>
                        <Action label="Share secure link" icon={<Share2/>} onClick={() => shareQuote(q)}/>
                        <Action label="Send via WhatsApp" icon={<Send/>} onClick={() => sendWhatsApp(q)}/>
                        <Action label="Send via Email" icon={<Mail/>} onClick={() => sendEmail(q)}/>
                        {roleCanApprove(currentRole) && q.status !== 'ACCEPTED' && <Action label="Record Customer Acceptance" icon={<CheckCircle2/>} onClick={() => recordAcceptance(q)}/>}
                        {q.status === 'ACCEPTED' && onConvertToProject && <Action label="Convert to Project / Deal" icon={<RefreshCcw/>} onClick={() => onConvertToProject(q)}/>}
                        <Action label="Archive" icon={<Archive/>} onClick={() => archiveQuote(q.id)} danger/>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredQuotes.length && <tr><td colSpan={11} className="px-6 py-16 text-center text-slate-400">No soft quotations found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <ModuleStyles/>
    </div>
  );
};

interface BuilderProps {
  quotation: SoftQuotation;
  setQuotation: (quotation: SoftQuotation) => void;
  step: number;
  setStep: (step: number) => void;
  customers: Customer[];
  leads: Lead[];
  currentRole: PortalRole;
  aiBusy: AiAction | null;
  onAi: (action: AiAction) => void;
  onSelectCustomer: (id: string) => void;
  onSelectLead: (id: string) => void;
  onCreateCustomer: () => void;
  onApplyTemplate: () => void;
  onSave: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  notice: string;
}

const QuotationBuilder: React.FC<BuilderProps> = ({
  quotation, setQuotation, step, setStep, customers, leads, currentRole, aiBusy, onAi,
  onSelectCustomer, onSelectLead, onCreateCustomer, onApplyTemplate, onSave, onSubmit, onCancel, notice
}) => {
  const steps = ['Customer','Project','Technical & AI','Cost Estimate','Scope & Terms','Economics','Preview'];
  const update = <K extends keyof SoftQuotation,>(key: K, value: SoftQuotation[K]) => setQuotation({ ...quotation, [key]: value });
  const updateCustomer = (key: keyof SoftQuotation['customer'], value: string) => setQuotation({ ...quotation, customer: { ...quotation.customer, [key]: value } });
  const updateCommercial = (key: keyof SoftQuotation['commercialTerms'], value: any) => setQuotation({ ...quotation, commercialTerms: { ...quotation.commercialTerms, [key]: value } });
  const updateEconomics = (key: keyof SoftQuotation['projectEconomics'], value: any) => setQuotation({ ...quotation, projectEconomics: { ...quotation.projectEconomics, [key]: value } });

  const changeItem = (id: string, patch: Partial<SoftQuotationCostItem>) => {
    setQuotation(recalculateTotals({ ...quotation, costBreakup: quotation.costBreakup.map(i => i.id === id ? { ...i, ...patch } : i) }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col xl:flex-row gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
            <div>
              <button onClick={onCancel} className="text-xs text-emerald-700 font-bold flex items-center gap-1"><ChevronLeft className="w-4 h-4"/>Soft Quotations</button>
              <h1 className="mt-2 text-2xl font-black tracking-tight">{quotation.id ? 'Soft Quotation Builder' : 'New Soft Quotation'}</h1>
              <div className="text-xs text-slate-500 mt-1 font-mono">{quotation.quotationNo} · Version {quotation.version} · {quotation.status}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={onSave} className="btn-secondary"><Save className="w-4 h-4"/>Save Draft</button>
              <button onClick={onSubmit} className="btn-primary"><Send className="w-4 h-4"/>{currentRole === 'employee' ? 'Submit for Review' : 'Save & Review'}</button>
            </div>
          </div>
          {notice && <Notice>{notice}</Notice>}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto border-b">
              <div className="flex min-w-[800px]">
                {steps.map((label, i) => (
                  <button key={label} onClick={() => setStep(i + 1)} className={`flex-1 px-3 py-3 text-xs font-bold border-b-2 ${step === i + 1 ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40' : 'border-transparent text-slate-400'}`}>
                    <span className="font-mono mr-1">{i + 1}.</span>{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {step === 1 && (
                <div className="space-y-5">
                  <SectionHead title="Customer Details" subtitle="Select an existing CRM customer/lead or enter a new customer."/>
                  <div className="grid md:grid-cols-3 gap-3">
                    <label className="field md:col-span-2"><span>Existing CRM Customer</span><select onChange={e => onSelectCustomer(e.target.value)} defaultValue=""><option value="">Select customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}</select></label>
                    <button onClick={onCreateCustomer} className="btn-secondary self-end h-10"><UserPlus className="w-4 h-4"/>Create Customer</button>
                    <label className="field md:col-span-2"><span>Existing Lead / Application</span><select onChange={e => onSelectLead(e.target.value)} defaultValue=""><option value="">Select lead...</option>{leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}</select></label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Customer Name" value={quotation.customer.customerName} onChange={v => updateCustomer('customerName', v)} required/>
                    <Field label="Company Name" value={quotation.customer.companyName} onChange={v => updateCustomer('companyName', v)}/>
                    <Field label="Mobile" value={quotation.customer.mobile} onChange={v => updateCustomer('mobile', v)} required/>
                    <Field label="Email" value={quotation.customer.email} onChange={v => updateCustomer('email', v)}/>
                    <Field label="Contact Person" value={quotation.customer.contactPerson} onChange={v => updateCustomer('contactPerson', v)}/>
                    <Field label="Customer Type" value={quotation.customer.customerType} onChange={v => updateCustomer('customerType', v)}/>
                    <Field label="Address" value={quotation.customer.address} onChange={v => updateCustomer('address', v)}/>
                    <Field label="City" value={quotation.customer.city} onChange={v => updateCustomer('city', v)}/>
                    <Field label="State" value={quotation.customer.state} onChange={v => updateCustomer('state', v)}/>
                    <Field label="Country" value={quotation.customer.country} onChange={v => updateCustomer('country', v)}/>
                    <Field label="GSTIN" value={quotation.customer.gstin} onChange={v => updateCustomer('gstin', v)}/>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <SectionHead title="Project Details" subtitle="Use the approved AKBS template or edit the project configuration." actions={<button onClick={onApplyTemplate} className="btn-secondary"><RefreshCcw className="w-4 h-4"/>Apply 20,000 Birds EC Template</button>}/>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Project Name" value={quotation.projectName} onChange={v => update('projectName', v)}/>
                    <Field label="Project Type" value={quotation.projectType} onChange={v => update('projectType', v)}/>
                    <Field label="Project Location" value={quotation.projectLocation} onChange={v => update('projectLocation', v)}/>
                    <NumberField label="Project Capacity" value={quotation.projectCapacity} onChange={v => update('projectCapacity', v)}/>
                    <Field label="Project Unit" value={quotation.projectUnit} onChange={v => update('projectUnit', v)}/>
                    <Field label="Shed Size" value={quotation.shedSize} onChange={v => update('shedSize', v)}/>
                    <Field label="Covered Area" value={quotation.coveredArea} onChange={v => update('coveredArea', v)}/>
                    <Field label="Technology" value={quotation.technology} onChange={v => update('technology', v)}/>
                    <NumberField label="Quotation Validity (days)" value={quotation.quotationValidity} onChange={v => { update('quotationValidity', v); updateCommercial('quotationValidity', v); }}/>
                    <Field label="Expected Completion Timeline" value={quotation.expectedCompletionTimeline} onChange={v => update('expectedCompletionTimeline', v)}/>
                  </div>
                  <button onClick={() => onAi('project-details')} disabled={!!aiBusy} className="w-full p-4 rounded-xl bg-gradient-to-r from-[#073323] to-emerald-700 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"><Sparkles className="w-5 h-5"/>{aiBusy === 'project-details' ? 'Generating...' : 'Generate Project Details with AI'}</button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <SectionHead title="Technical Specifications & AI Content" subtitle="AI only uses approved template data and information entered in this quotation."/>
                  <label className="field"><span>Project Overview</span><textarea rows={6} value={quotation.projectOverview} onChange={e => update('projectOverview', e.target.value)}/></label>
                  <ListEditor title="Civil & Structural Specifications" items={quotation.technicalSpecifications.shed} onChange={items => update('technicalSpecifications', { ...quotation.technicalSpecifications, shed: items })}/>
                  <ListEditor title="Environment Control System" items={quotation.technicalSpecifications.environmentControl} onChange={items => update('technicalSpecifications', { ...quotation.technicalSpecifications, environmentControl: items })}/>
                  <ListEditor title="Automation & Equipment" items={quotation.technicalSpecifications.automation} onChange={items => update('technicalSpecifications', { ...quotation.technicalSpecifications, automation: items })}/>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <SectionHead title="Editable Cost Breakup" subtitle="All values are indicative. Every amount is editable by an authorized CRM user."/>
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">Component</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Estimated Amount</th><th className="w-12"></th></tr></thead>
                      <tbody className="divide-y">
                        {quotation.costBreakup.map(item => <tr key={item.id}><td className="p-2"><input value={item.component} onChange={e => changeItem(item.id,{component:e.target.value})} className="cell-input font-bold"/></td><td className="p-2"><input value={item.description} onChange={e => changeItem(item.id,{description:e.target.value})} className="cell-input"/></td><td className="p-2"><input type="number" value={item.estimatedAmount} onChange={e => changeItem(item.id,{estimatedAmount:Number(e.target.value)})} className="cell-input text-right font-mono"/></td><td><button onClick={() => update('costBreakup', quotation.costBreakup.filter(i => i.id !== item.id))} className="icon-btn text-rose-500"><Trash2 className="w-4 h-4"/></button></td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => update('costBreakup', [...quotation.costBreakup,{id:`item-${Date.now()}`,component:'New Component',description:'',estimatedAmount:0}])} className="btn-secondary"><Plus className="w-4 h-4"/>Add Cost Item</button>
                  <div className="grid md:grid-cols-3 gap-3">
                    <NumberField label="GST / Tax %" value={quotation.gstPercent} onChange={v => update('gstPercent', v)}/>
                    <NumberField label="Other Charges" value={quotation.otherCharges} onChange={v => update('otherCharges', v)}/>
                    <NumberField label="Discount" value={quotation.discount} onChange={v => update('discount', v)}/>
                  </div>
                  <div className="ml-auto max-w-md rounded-xl border bg-slate-50 p-4 text-sm space-y-2">
                    <SummaryLine label="Subtotal" value={quotation.subtotal}/><SummaryLine label="Tax / GST" value={quotation.taxAmount}/><SummaryLine label="Other Charges" value={quotation.otherCharges}/><SummaryLine label="Discount" value={-quotation.discount}/><div className="border-t pt-3 flex justify-between font-black text-lg text-emerald-900"><span>Estimated Project Cost</span><span>{formatMoney(quotation.grandTotal)}</span></div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <SectionHead title="Scope, Exclusions, Timeline & Commercial Terms" subtitle="No commercial commitment is hardcoded. Confirm every applicable term before approval."/>
                  <ListEditor title="Our Scope / Project Support" items={quotation.scopeOfWork} onChange={items => update('scopeOfWork', items)}/>
                  <ListEditor title="Exclusions" items={quotation.exclusions} onChange={items => update('exclusions', items)}/>
                  <div>
                    <h3 className="font-black mb-3">Execution Timeline</h3>
                    <div className="space-y-2">{quotation.executionTimeline.map((s,i) => <div key={s.id} className="grid grid-cols-[40px_1fr_140px] gap-2"><div className="pt-2 text-xs font-mono text-slate-400">{i+1}</div><input value={s.stage} onChange={e => update('executionTimeline', quotation.executionTimeline.map(x=>x.id===s.id?{...x,stage:e.target.value}:x))} className="cell-input"/><input type="number" placeholder="Days" value={s.estimatedDays ?? ''} onChange={e => update('executionTimeline', quotation.executionTimeline.map(x=>x.id===s.id?{...x,estimatedDays:e.target.value?Number(e.target.value):null}:x))} className="cell-input"/></div>)}</div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Payment Terms" value={quotation.commercialTerms.paymentTerms} onChange={v => updateCommercial('paymentTerms', v)}/>
                    <Field label="Taxes" value={quotation.commercialTerms.taxes} onChange={v => updateCommercial('taxes', v)}/>
                    <NumberField label="Advance %" value={quotation.commercialTerms.advancePercent ?? 0} blankWhenZero onChange={v => updateCommercial('advancePercent', v || null)}/>
                    <NumberField label="Milestone Payment %" value={quotation.commercialTerms.milestonePaymentPercent ?? 0} blankWhenZero onChange={v => updateCommercial('milestonePaymentPercent', v || null)}/>
                    <NumberField label="Final Payment %" value={quotation.commercialTerms.finalPaymentPercent ?? 0} blankWhenZero onChange={v => updateCommercial('finalPaymentPercent', v || null)}/>
                    <Field label="Transportation" value={quotation.commercialTerms.transportation} onChange={v => updateCommercial('transportation', v)}/>
                    <Field label="Warranty" value={quotation.commercialTerms.warranty} onChange={v => updateCommercial('warranty', v)}/>
                    <Field label="Installation Terms" value={quotation.commercialTerms.installationTerms} onChange={v => updateCommercial('installationTerms', v)}/>
                    <Field label="Delivery Terms" value={quotation.commercialTerms.deliveryTerms} onChange={v => updateCommercial('deliveryTerms', v)}/>
                  </div>
                  <label className="field"><span>Commercial Notes / Cost Explanation</span><textarea rows={5} value={quotation.commercialNotes} onChange={e=>update('commercialNotes',e.target.value)}/></label>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-5">
                  <SectionHead title="Indicative Project Economics" subtitle="Optional. Market rates are never invented; empty values stay “To be confirmed”." actions={<label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={quotation.projectEconomics.enabled} onChange={e=>updateEconomics('enabled',e.target.checked)}/>Include in quotation</label>}/>
                  <div className="grid md:grid-cols-3 gap-3">
                    {([
                      ['birdCapacity','Bird Capacity'],['batchesPerYear','Batches Per Year'],['averagePlacement','Average Placement'],['mortalityPercent','Mortality %'],['averageSaleWeight','Average Sale Weight (kg)'],['expectedFcr','Expected FCR'],['feedConsumption','Feed Consumption (kg/batch)'],['chickCost','Chick Cost / Bird'],['feedCost','Feed Cost / kg'],['medicineVaccine','Medicine / Vaccine / Batch'],['electricity','Electricity / Batch'],['labour','Labour / Batch'],['litter','Litter / Batch'],['maintenance','Maintenance / Batch'],['otherOperatingExpenses','Other Operating Expenses / Batch'],['expectedSalePrice','Expected Sale Price / kg']
                    ] as const).map(([key,label]) => <OptionalNumberField key={key} label={label} value={quotation.projectEconomics[key] as number|null} onChange={v=>updateEconomics(key,v)}/>)}
                  </div>
                </div>
              )}

              {step === 7 && (
                <div>
                  <SectionHead title="Final A4 Preview" subtitle="Review the exact document before manager approval and customer dispatch."/>
                  <div className="-mx-4 sm:mx-0 bg-slate-100 rounded-xl p-2 sm:p-4 overflow-auto"><SoftQuotationDocument quotation={quotation} compact/></div>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between gap-3">
              <button disabled={step===1} onClick={()=>setStep(Math.max(1,step-1))} className="btn-secondary disabled:opacity-40"><ChevronLeft className="w-4 h-4"/>Back</button>
              {step < 7 ? <button onClick={()=>setStep(Math.min(7,step+1))} className="btn-primary">Save & Next<ChevronRight className="w-4 h-4"/></button> : <button onClick={onSubmit} className="btn-primary"><Send className="w-4 h-4"/>Submit for Review</button>}
            </div>
          </div>
        </div>

        <aside className="xl:w-80 shrink-0">
          <div className="xl:sticky xl:top-4 bg-[#071d12] text-white rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-300"/><div><div className="font-black">AI Content Assistant</div><div className="text-[10px] text-emerald-200/70">Approved CRM/template data only</div></div></div>
            <div className="mt-4 space-y-2">
              {([
                ['overview','Generate Project Overview'],
                ['scope','Generate Scope of Work'],
                ['technical','Generate Technical Description'],
                ['cost-explanation','Generate Cost Explanation'],
                ['exclusions','Generate Exclusions'],
                ['commercial-notes','Generate Commercial Notes'],
                ['customer-summary','Generate Customer-Friendly Summary'],
                ['improve-language','Improve Professional Language']
              ] as [AiAction,string][]).map(([action,label]) => <button key={action} disabled={!!aiBusy} onClick={()=>onAi(action)} className="w-full text-left px-3 py-2.5 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 text-xs font-semibold disabled:opacity-50 flex items-center justify-between"><span>{label}</span>{aiBusy===action?<span className="animate-pulse">...</span>:<Sparkles className="w-3.5 h-3.5 text-emerald-300"/>}</button>)}
            </div>
            {!!quotation.requiresConfirmation.length && <div className="mt-4 rounded-xl bg-amber-400/10 border border-amber-300/20 p-3"><div className="text-xs font-black text-amber-300">Requires Confirmation</div><div className="mt-2 space-y-1 text-[11px] text-amber-50/80">{quotation.requiresConfirmation.map(x=><div key={x}>• {x}</div>)}</div></div>}
          </div>
        </aside>
      </div>
      <ModuleStyles/>
    </div>
  );
};

const Metric: React.FC<{label:string;value:string|number;onClick:()=>void}> = ({label,value,onClick}) => <button onClick={onClick} className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-300 shadow-sm"><div className="text-[11px] text-slate-400 font-bold uppercase tracking-[.08em]">{label}</div><div className="mt-2 text-xl font-black text-[#073323]">{value}</div></button>;

const StatusBadge: React.FC<{status:SoftQuotationStatus}> = ({status}) => {
  const cls:Record<SoftQuotationStatus,string> = {
    DRAFT:'bg-slate-100 text-slate-700',REVIEW:'bg-amber-100 text-amber-800',APPROVED:'bg-emerald-100 text-emerald-800',REJECTED:'bg-rose-100 text-rose-700',SENT:'bg-blue-100 text-blue-800',VIEWED:'bg-violet-100 text-violet-800',ACCEPTED:'bg-teal-100 text-teal-800',EXPIRED:'bg-orange-100 text-orange-800',ARCHIVED:'bg-slate-200 text-slate-500'
  };
  return <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black ${cls[status]}`}>{status}</span>;
};

const Action:React.FC<{label:string;icon:React.ReactNode;onClick:()=>void;danger?:boolean}> = ({label,icon,onClick,danger}) => <button onClick={onClick} className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-left hover:bg-slate-50 ${danger?'text-rose-700':'text-slate-700'}`}><span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>{label}</button>;
const Notice:React.FC<React.PropsWithChildren> = ({children}) => <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 flex gap-2 items-center"><CheckCircle2 className="w-4 h-4"/>{children}</div>;

const SectionHead:React.FC<{title:string;subtitle:string;actions?:React.ReactNode}> = ({title,subtitle,actions}) => <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b pb-4"><div><h2 className="text-lg font-black">{title}</h2><p className="text-xs text-slate-400 mt-1">{subtitle}</p></div>{actions}</div>;

const Field:React.FC<{label:string;value:string;onChange:(v:string)=>void;required?:boolean}> = ({label,value,onChange,required}) => <label className="field"><span>{label}{required?' *':''}</span><input value={value} onChange={e=>onChange(e.target.value)}/></label>;
const NumberField:React.FC<{label:string;value:number;onChange:(v:number)=>void;blankWhenZero?:boolean}> = ({label,value,onChange,blankWhenZero}) => <label className="field"><span>{label}</span><input type="number" value={blankWhenZero&&value===0?'':value} onChange={e=>onChange(Number(e.target.value)||0)}/></label>;
const OptionalNumberField:React.FC<{label:string;value:number|null;onChange:(v:number|null)=>void}> = ({label,value,onChange}) => <label className="field"><span>{label}</span><input type="number" placeholder="To be confirmed" value={value??''} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}/></label>;

const ListEditor:React.FC<{title:string;items:string[];onChange:(items:string[])=>void}> = ({title,items,onChange}) => <div><div className="flex items-center justify-between mb-2"><h3 className="font-black">{title}</h3><button onClick={()=>onChange([...items,'New item'])} className="text-xs text-emerald-700 font-bold">+ Add Item</button></div><div className="space-y-2">{items.map((item,i)=><div key={i} className="flex gap-2"><input value={item} onChange={e=>onChange(items.map((x,j)=>j===i?e.target.value:x))} className="cell-input"/><button onClick={()=>onChange(items.filter((_,j)=>j!==i))} className="icon-btn text-rose-500"><Trash2 className="w-4 h-4"/></button></div>)}</div></div>;

const SummaryLine:React.FC<{label:string;value:number}> = ({label,value}) => <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-mono font-bold">{value<0?'- ':''}{formatMoney(Math.abs(value))}</span></div>;

const ModuleStyles = () => <style>{`
  .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;background:#073323;color:white;border-radius:.75rem;padding:.62rem .9rem;font-size:.78rem;font-weight:800;box-shadow:0 4px 12px rgba(7,51,35,.12)}
  .btn-primary:hover{background:#0a4933}
  .btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;background:white;color:#334155;border:1px solid #e2e8f0;border-radius:.75rem;padding:.58rem .82rem;font-size:.78rem;font-weight:750}
  .btn-secondary:hover{background:#f8fafc}
  .icon-btn{display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;border-radius:.6rem;color:#64748b}
  .icon-btn:hover{background:#f1f5f9;color:#0f172a}
  .field{display:flex;flex-direction:column;gap:.35rem}
  .field>span{font-size:.68rem;font-weight:750;color:#64748b}
  .field input,.field select,.field textarea{width:100%;border:1px solid #dbe3df;background:#fff;border-radius:.65rem;padding:.62rem .75rem;font-size:.82rem;color:#0f172a;outline:none}
  .field input:focus,.field select:focus,.field textarea:focus{border-color:#2c8b65;box-shadow:0 0 0 3px rgba(44,139,101,.10)}
  .cell-input{width:100%;border:1px solid #e2e8f0;background:white;border-radius:.55rem;padding:.55rem .65rem;font-size:.78rem;outline:none}
  .cell-input:focus{border-color:#2c8b65}
`}</style>;
