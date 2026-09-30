import { IncompleteApplications } from './IncompleteApplications';
import { csvCell } from '../lib/escapeHtml';
import { useCrm } from '../lib/crm';
import { useReminderCooldown } from '../lib/reminderCooldown';
import { applicationEligible } from '../lib/feeCollections';
import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Phone,
  MessageSquare,
  Globe,
  MoreVertical,
  Calendar,
  MapPin,
  CheckCircle2,
  Building,
  Eye,
  Trash2,
  Users,
  Target,
  Clock,
  Send,
  UserCheck,
  Edit,
  UserPlus,
  FileText,
  Paperclip,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Star,
  Layers,
  Landmark,
  Shield,
  UploadCloud,
  CheckSquare,
  BadgeIndianRupee
} from 'lucide-react';
import { Lead, LeadStatus, LeadSource, DocumentRecord, FollowUp, Activity } from '../types';
import { SoftQuotationModal } from './SoftQuotationModal';
import { ApplicationProgressTimeline } from './ApplicationProgressTimeline';
import { crmLeadProgress } from '../lib/applicationProgress';
import { secureRequest } from '../lib/secureRequest';

interface LeadsViewProps {
  leads: Lead[];
  selectedLeadId?: string;
  onOpenFees?: (leadId: string) => void;
  onSelectLead: (lead: Lead) => void;
  onOpenAddLead: () => void;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => void;
  onConvertLeadToCustomer?: (leadId: string) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenQuickAction?: (actionKey: string, lead?: Lead) => void;
  onEditLead?: (leadId: string, patch: Partial<Lead>) => void;
  documents?: DocumentRecord[];
  followUps?: FollowUp[];
  activities?: Activity[];
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  selectedLeadId,
  onOpenFees,
  onSelectLead,
  onOpenAddLead,
  onUpdateLeadStatus,
  onConvertLeadToCustomer,
  onDeleteLead,
  onOpenQuickAction,
  onEditLead,
  documents = [],
  followUps = [],
  activities = []
}) => {
  const crm=useCrm();
  const [incomplete,setIncomplete]=useState(false);
  const [noteError,setNoteError]=useState('');
  const [employeeQuotationRequests,setEmployeeQuotationRequests]=useState<any[]>([]);
  const [feeConfig,setFeeConfig]=useState<any>({payableFee:2999});
  const isEmployeePortal = crm.user.role === 'EMPLOYEE';
  const isManagerPortal = crm.user.role === 'MANAGER';
  const isAdminPortal = crm.user.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'unassigned'>(crm.user.role === 'EMPLOYEE' ? 'my' : 'all');
  useEffect(() => {
    let active=true;
    crm.fee('snapshot',{})
      .then((out:any)=>{ if(active && out?.config) setFeeConfig(out.config); })
      .catch(()=>undefined);
    return ()=>{ active=false; };
  }, [crm.user.role]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [stateFilter, setStateFilter] = useState('All States');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [selectedLead, setSelectedLead] = useState<Lead>(() => {
    if (selectedLeadId) {
      const found = leads.find(l => l.id === selectedLeadId);
      if (found) return found;
    }
    return leads[0] || ({} as Lead);
  });
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [activeDetailTab, setActiveDetailTab] = useState<
    'overview' | 'project' | 'financial' | 'documents' | 'activities' | 'followups'
  >('overview');
  const [isProjectEditing, setIsProjectEditing] = useState(false);
  const [isFinancialEditing, setIsFinancialEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const registrationReminders=useReminderCooldown(crm.leads.filter(l=>!applicationEligible(l)).map(l=>({purpose:'registration' as const,leadId:l.id})));
  const sendRegistrationReminder=async(lead:Lead)=>{
    setNoteError('');setSavedMessage('');
    try{
      const target={leadId:lead.id,purpose:'registration' as const};
      const out=await registrationReminders.send(target,()=>secureRequest('akbs-fee-reminder-email',{...target,requestId:crypto.randomUUID()}));
      if(out)setSavedMessage(`Registration reminder emailed only to ${out.email}. Resend is available after 60 minutes.`);
      void crm.refresh().catch(()=>undefined);
    }catch(e:any){setNoteError(e.message||'Unable to send registration reminder.');}
  };
  const [projectDraft, setProjectDraft] = useState({
    projectType: 'Broiler' as Lead['projectType'],
    birdCapacity: 10000,
    shedType: '',
    landArea: '',
    landOwnership: '',
    timeline: '',
    supportNeeded: ''
  });
  const [financialDraft, setFinancialDraft] = useState({
    estimatedCost: '',
    budgetEstimate: '',
    loanRequired: '',
    priority: 'Medium' as NonNullable<Lead['priority']>,
    status: 'New' as LeadStatus
  });

  const [newNoteText, setNewNoteText] = useState('');
  const [noteType, setNoteType] = useState('Internal Note');
  const notesList=crm.activities.filter(a=>a.lead_id===selectedLead?.id&&['NOTE_ADDED','CALL_LOGGED'].includes(a.action)).map(a=>({id:a.id,text:a.note,author:a.actor_name,time:new Date(a.created_at).toLocaleString('en-IN'),type:a.action==='CALL_LOGGED'?'Call':'Internal Note'}));

  React.useEffect(() => {
    if (!isEmployeePortal) return;
    let cancelled=false;
    const load=async()=>{
      try{
        const data=await crm.quotation('list');
        if(!cancelled) setEmployeeQuotationRequests(Array.isArray(data?.quotes)?data.quotes:[]);
      }catch{}
    };
    void load();
    const timer=window.setInterval(()=>void load(),2500);
    return ()=>{cancelled=true;window.clearInterval(timer);};
  },[isEmployeePortal,crm.user.id]);

  // Synchronize when selectedLeadId prop changes
  React.useEffect(() => {
    if (selectedLeadId) {
      const found = leads.find(l => l.id === selectedLeadId);
      if (found) {
        setSelectedLead(found);
      }
    }
  }, [selectedLeadId, leads]);

  // Handle lead selection
  const handleSelectLeadCard = (lead: Lead) => {
    setSelectedLead(lead);
    onSelectLead(lead);
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      (l.location && l.location.toLowerCase().includes(search.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStage = stageFilter === 'All Stages' || l.status === stageFilter;
    const matchesState = stateFilter === 'All States' || (l.state && l.state.toLowerCase().includes(stateFilter.toLowerCase()));
    const matchesSource = sourceFilter === 'All Sources' || l.source === sourceFilter;

    if (activeTab === 'my') {
      return matchesSearch && matchesStage && matchesState && matchesSource && (crm.leads.find(row=>row.id===l.id)?.assigned_to===crm.user.id);
    }
    if (activeTab === 'unassigned') {
      return matchesSearch && matchesStage && matchesState && matchesSource && (!l.assignedTo || l.assignedTo === 'Unassigned');
    }
    return matchesSearch && matchesStage && matchesState && matchesSource;
  });

  React.useEffect(() => {
    setPage(1);
  }, [search, stageFilter, stateFilter, sourceFilter, activeTab]);

  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / perPage));
  const safePage = Math.min(page, pageCount);
  const pagedLeads = filteredLeads.slice((safePage - 1) * perPage, safePage * perPage);

  const currentLead = leads.find(l => l.id === selectedLead.id) || selectedLead || leads[0];
  const currentLeadQuotation = employeeQuotationRequests
    .filter(q => q?.akbsLeadId === currentLead?.id)
    .sort((a,b)=>new Date(b?.modifiedAt || b?.createdAt || 0).getTime()-new Date(a?.modifiedAt || a?.createdAt || 0).getTime())[0];
  const quotationReviewPending = currentLeadQuotation?.status === 'REVIEW';
  const quotationApproved = ['APPROVED','SENT','VIEWED'].includes(currentLeadQuotation?.status);
  const currentLeadRow = crm.leads.find(row => row.id === currentLead?.id);
  const leadManager = crm.users.find(u => u.id === currentLeadRow?.manager_id);
  const loggedInManager = crm.users.find(u => u.id === crm.user.manager_id);
  const managerDisplayName =
    leadManager?.name ||
    loggedInManager?.name ||
    crm.user.profile?.manager_name ||
    (isManagerPortal ? crm.user.name : '') ||
    (isEmployeePortal ? 'Reporting manager unavailable' : 'Not assigned');
  const managerDisplayLogin =
    leadManager?.login ||
    loggedInManager?.login ||
    crm.user.profile?.manager_login ||
    '';
  const leadAssignee = crm.users.find(u => u.id === currentLeadRow?.assigned_to);
  const leadAssigneeTitle =
    leadAssignee?.profile?.role_title ||
    (leadAssignee?.profile?.job_profile
      ? String(leadAssignee.profile.job_profile).replaceAll('_',' ').replace(/w/g, m => m.toUpperCase())
      : leadAssignee?.role === 'EMPLOYEE' ? 'Employee' : leadAssignee?.role || 'Unassigned');
  const activeLeadWorkflows = crm.workflows
    .filter(w => w.lead_id === currentLead?.id && !['COMPLETED','CANCELLED','REJECTED'].includes(w.status))
    .sort((a,b) => new Date(a.due_at || a.created_at || 0).getTime() - new Date(b.due_at || b.created_at || 0).getTime());
  const currentWorkItem = activeLeadWorkflows[0];
  const currentWorkOwner = crm.users.find(u => u.id === currentWorkItem?.assignee_id);

  const farmLocationText = [
    currentLead?.village,
    currentLead?.district,
    currentLead?.state
  ].filter(Boolean).join(', ') || currentLead?.location || '';

  const farmMapsHref = currentLead?.googleMapsLink ||
    (farmLocationText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(farmLocationText)}` : '');

  const farmMapEmbedSrc = farmLocationText
    ? `https://www.google.com/maps?q=${encodeURIComponent(farmLocationText)}&output=embed`
    : '';

  const currentLeadProgress = currentLead?.id ? crmLeadProgress(currentLead as any) : [];
  const currentLeadProgressId =
    currentLeadProgress.find(stage => stage.status === 'in_progress')?.id ||
    currentLeadProgress.find(stage => stage.status === 'pending')?.id ||
    currentLeadProgress[currentLeadProgress.length - 1]?.id;


  React.useEffect(() => {
    if (!currentLead?.id) return;
    setProjectDraft({
      projectType: currentLead.projectType || 'Broiler',
      birdCapacity: currentLead.birdCapacity || 10000,
      shedType: currentLead.shedType || '',
      landArea: currentLead.landArea || '',
      landOwnership: currentLead.landOwnership || currentLead.landAvailable || '',
      timeline: currentLead.timeline || '',
      supportNeeded: currentLead.supportNeeded?.join(', ') || ''
    });
    setFinancialDraft({
      estimatedCost: currentLead.estimatedCost || '',
      budgetEstimate: currentLead.budgetEstimate || '',
      loanRequired: currentLead.loanRequired || '',
      priority: currentLead.priority || 'Medium',
      status: currentLead.status || 'New'
    });
    setIsProjectEditing(false);
    setIsFinancialEditing(false);
  }, [currentLead?.id]);
  const relatedDocuments = documents.filter(d =>
    d.relatedEntity.toLowerCase().includes(currentLead?.name?.toLowerCase() || '')
  );
  const relatedFollowUps = followUps.filter(f => f.leadId === currentLead?.id);
  const similarLeads = leads
    .filter(l => l.id !== currentLead?.id)
    .sort((a, b) => Math.abs((a.birdCapacity || 0) - (currentLead?.birdCapacity || 0)) - Math.abs((b.birdCapacity || 0) - (currentLead?.birdCapacity || 0)))
    .slice(0, 3);

  const exportFilteredLeads = () => {
    const rows = [
      ['Name','Phone','Email','Location','Status','Source','Bird Capacity','Assigned To'],
      ...filteredLeads.map(l => [l.name,l.phone,l.email,l.location,l.status,l.source,String(l.birdCapacity),l.assignedTo])
    ];
    const csv = rows.map(row => row.map(v => csvCell(v)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'akbs-leads.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const showSaved = (message: string) => {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(''), 2200);
  };

  const saveProjectDetails = () => {
    if (!currentLead || !onEditLead) return;
    onEditLead(currentLead.id, {
      projectType: projectDraft.projectType,
      birdCapacity: Number(projectDraft.birdCapacity) || 0,
      shedType: projectDraft.shedType,
      landArea: projectDraft.landArea,
      landOwnership: projectDraft.landOwnership,
      landAvailable: projectDraft.landOwnership,
      timeline: projectDraft.timeline,
      supportNeeded: projectDraft.supportNeeded
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
    });
    setSelectedLead(prev => ({ ...prev,
      projectType: projectDraft.projectType,
      birdCapacity: Number(projectDraft.birdCapacity) || 0,
      shedType: projectDraft.shedType,
      landArea: projectDraft.landArea,
      landOwnership: projectDraft.landOwnership,
      landAvailable: projectDraft.landOwnership,
      timeline: projectDraft.timeline,
      supportNeeded: projectDraft.supportNeeded.split(',').map(v => v.trim()).filter(Boolean)
    }));
    setIsProjectEditing(false);
    showSaved('Saving project details…');
  };

  const saveFinancialDetails = () => {
    if (!currentLead || !onEditLead) return;
    onEditLead(currentLead.id, {
      estimatedCost: financialDraft.estimatedCost,
      budgetEstimate: financialDraft.budgetEstimate,
      loanRequired: financialDraft.loanRequired,
      priority: financialDraft.priority,
      status: financialDraft.status
    });

    setSelectedLead(prev => ({ ...prev,
      estimatedCost: financialDraft.estimatedCost,
      budgetEstimate: financialDraft.budgetEstimate,
      loanRequired: financialDraft.loanRequired,
      priority: financialDraft.priority,
      status: financialDraft.status
    }));
    setIsFinancialEditing(false);
    showSaved('Saving financial details…');
  };

  const handleSaveNote = async () => {
    if(!newNoteText.trim()||!currentLead)return;
    try{await crm.command('note',{lead_id:currentLead.id,note:newNoteText.trim(),kind:noteType==='Call'?'CALL':'NOTE'});setNewNoteText('');showSaved('Note saved to lead');setNoteError('');}catch(e:any){setNoteError(e.message);}
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Contacted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Qualified':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Site Visit':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DPR':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Loan Processing':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Converted':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'Lost':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'In Discussion':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Follow Up':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-700 text-white',
      'bg-pink-600 text-white',
      'bg-amber-600 text-white',
      'bg-blue-600 text-white',
      'bg-purple-600 text-white',
      'bg-teal-600 text-white',
      'bg-indigo-600 text-white'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    if (!name) return 'L';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if(incomplete && crm.user.role==='ADMIN') return <IncompleteApplications kind="customer" inquiries={leads.filter(l=>l.sourceDetail==='Website Inquiry Form'&&!l.applicationEligible)} onOpenInquiry={lead=>{setIncomplete(false);setSelectedLead(lead);onSelectLead(lead);}} onBack={()=>setIncomplete(false)} onCompleted={()=>void crm.refresh()}/>;

  if(!leads.length)return <div className="p-6"><h1 className="text-xl font-bold">Leads</h1>{crm.user.role==='ADMIN'&&<button onClick={()=>setIncomplete(true)}>Incomplete Applications →</button>}<p className="my-4">No leads yet. Website enquiries will appear here after submission.</p><button onClick={onOpenAddLead}>Add Lead</button></div>;
  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1680px] mx-auto font-sans antialiased text-slate-800">
      {crm.user.role==='ADMIN'&&<button onClick={()=>setIncomplete(true)} className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900">Incomplete Applications →</button>}
      {/* Top Header Row matching Image 3 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isEmployeePortal ? 'My Lead Workspace' : 'Leads Management'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEmployeePortal ? 'Work only on leads assigned to you and update every customer interaction.' : 'Manage, track and convert your poultry project leads into successful customers.'}
          </p>
        </div>

        {/* Counter Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">{isEmployeePortal ? 'My Leads' : 'Total Leads'}</div>
              <div className="text-sm font-extrabold text-blue-950 font-mono mt-0.5">{isEmployeePortal ? leads.filter(l => crm.leads.find(row=>row.id===l.id)?.assigned_to===crm.user.id).length : leads.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">New Leads</div>
              <div className="text-sm font-extrabold text-emerald-950 font-mono mt-0.5">{leads.filter(l => l.status === 'New').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">In Process</div>
              <div className="text-sm font-extrabold text-amber-950 font-mono mt-0.5">{leads.filter(l => !['New','Converted','Lost'].includes(l.status)).length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">Site Visit</div>
              <div className="text-sm font-extrabold text-purple-950 font-mono mt-0.5">{leads.filter(l => l.status === 'Site Visit').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">Converted</div>
              <div className="text-sm font-extrabold text-teal-950 font-mono mt-0.5">{leads.filter(l => l.status === 'Converted').length}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-[11px]">01 Sep 2026 - 30 Sep 2026</span>
          </div>

          {!isEmployeePortal && (
            <button
              onClick={onOpenAddLead}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Column Grid Layout matching Image 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ================= COLUMN 1: Leads List (4 cols) ================= */}
        <div className={`${isEmployeePortal ? 'lg:col-span-4' : 'lg:col-span-4'} bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col ${isEmployeePortal ? 'h-[760px]' : 'h-[820px]'}`}>
          {/* Top Sub-tabs */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            {isEmployeePortal ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <div>
                  <div className="text-[11px] font-black text-blue-950">My Assigned Leads</div>
                  <div className="text-[10px] text-blue-600">
                    {leads.filter(l => crm.leads.find(row=>row.id===l.id)?.assigned_to===crm.user.id).length} leads assigned to you
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Leads ({leads.length})
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'my' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Leads ({leads.filter(l => crm.leads.find(row=>row.id===l.id)?.assigned_to===crm.user.id).length})
              </button>
              <button
                onClick={() => setActiveTab('unassigned')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTab === 'unassigned' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unassigned ({leads.filter(l => !l.assignedTo || l.assignedTo === 'Unassigned').length})
              </button>
            </div>
            )}
            <button onClick={exportFilteredLeads} className="text-slate-400 hover:text-slate-600 p-1" title="Export filtered leads CSV">
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar & Filter row */}
          <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile, location..."
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
              >
                <option value="All Stages">All Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Site Visit">Site Visit</option>
                <option value="DPR">DPR</option>
                <option value="Loan Processing">Loan Processing</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>

              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
              >
                <option value="All States">All States</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>

              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:outline-none"
              >
                <option value="All Sources">All Sources</option>
                <option value="Website">Website</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Direct Call">Direct Call</option>
                <option value="Email">Email</option>
              </select>
            </div>
          </div>

          {/* Lead Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {pagedLeads.map((lead) => {
              const isSelected = lead.id === currentLead.id;
              const initials = getInitials(lead.name);

              return (
                <div
                  key={lead.id}
                  onClick={() => handleSelectLeadCard(lead)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-400/80 shadow-2xs'
                      : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(lead.name)}`}>
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <span>{lead.name}</span>
                          {lead.isHot && (
                            <span className="text-[10px] text-red-500 font-bold">★</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lead.location || 'India'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {lead.estimatedCost || lead.budgetEstimate || 'Not provided'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {lead.birdCapacity ? `${lead.birdCapacity.toLocaleString()} Birds` : 'Poultry'} {lead.shedType?.includes('EC') ? '(EC)' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md font-semibold border ${getStatusBadgeStyle(lead.status)}`}>
                        {lead.status}
                      </span>
                      {lead.applicationEligible ? <button type="button" disabled={!onOpenFees} onClick={e=>{e.stopPropagation();onOpenFees?.(lead.id);}} title="Open this application’s fees and payment reminders" className={`px-2 py-0.5 rounded-md font-bold border hover:underline ${
                        lead.feeStatus === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : lead.feeStatus === 'Proof Submitted'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : lead.feeStatus === 'Rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        Fee: {lead.feeStatus || 'Pending'}
                      </button> : <span className="px-2 py-0.5 rounded-md font-bold border bg-slate-50 text-slate-600 border-slate-200">Registration required</span>}
                    </div>
                    <span className="text-slate-400 shrink-0">
                      {lead.relativeTime || lead.date || 'Today'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>
              Showing {filteredLeads.length === 0 ? 0 : (safePage - 1) * perPage + 1}-{Math.min(safePage * perPage, filteredLeads.length)} of {filteredLeads.length} leads
            </span>
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="w-6 h-6 rounded flex items-center justify-center border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(3, pageCount) }, (_, index) => {
                const start = Math.max(1, Math.min(safePage - 1, pageCount - 2));
                const pageNo = start + index;
                return (
                  <button
                    key={pageNo}
                    onClick={() => setPage(pageNo)}
                    className={`w-6 h-6 rounded flex items-center justify-center border font-bold text-xs ${safePage === pageNo ? 'bg-[#0b2818] text-white border-[#0b2818]' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                  >
                    {pageNo}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="w-6 h-6 rounded flex items-center justify-center border bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: Lead Details & Requirements (5 cols) ================= */}
        <div className={`${isEmployeePortal ? 'lg:col-span-8' : 'lg:col-span-5'} space-y-4`}>
          {/* Main Card Header */}
          <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs ${isEmployeePortal ? 'p-4 sm:p-4 space-y-3' : 'p-4 sm:p-5 space-y-4'}`}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${getAvatarColor(currentLead.name)}`}>
                  {getInitials(currentLead.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {currentLead.name}
                    </h2>
                    {currentLead.isHot && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <span>★</span> Hot Lead
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                    <span className="font-mono flex items-center gap-1 text-slate-800 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {currentLead.phone}
                    </span>
                    <a
                      href={`https://wa.me/${currentLead.whatsApp?.replace(/[^0-9]/g, '') || currentLead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <MessageSquare className="w-4 h-4 fill-emerald-500 text-white" />
                    </a>
                    {currentLead.email && (
                      <span className="text-slate-500 truncate max-w-[160px]">
                        {currentLead.email}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {currentLead.location}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-800 font-medium">
                      Source: {currentLead.sourceDetail||currentLead.source}
                    </span>
                  </div>
                  {isEmployeePortal ? (
                    <div className="mt-2 grid sm:grid-cols-3 gap-2">
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-wide font-bold text-amber-700">Reporting Manager</div>
                        <div className="mt-0.5 text-[11px] font-black text-amber-950">{managerDisplayName}</div>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-wide font-bold text-blue-700">Your Role</div>
                        <div className="mt-0.5 text-[11px] font-black text-blue-950">{crm.user.profile?.role_title || 'Employee'}</div>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
                        <div className="text-[9px] uppercase tracking-wide font-bold text-emerald-700">Lead Status</div>
                        <div className="mt-0.5 text-[11px] font-black text-emerald-950">{currentLead.status}</div>
                      </div>
                    </div>
                  ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                      <Shield className="w-3 h-3" />
                      Manager: {managerDisplayName}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-900">
                      <UserCheck className="w-3 h-3" />
                      Current Owner: {currentLeadRow?.assigned_to === crm.user.id ? crm.user.name : (leadAssignee?.name || 'Unassigned')}{currentLeadRow?.assigned_to === crm.user.id ? ` · ${crm.user.profile?.role_title || leadAssigneeTitle || 'Employee'}` : (leadAssignee ? ` · ${leadAssigneeTitle}` : '')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
                      <Target className="w-3 h-3" />
                      Lead Status: {currentLead.status}
                    </span>
                    {currentLead.applicationEligible ? <button type="button" disabled={!onOpenFees} onClick={()=>onOpenFees?.(currentLead.id)} title="Open this application’s fees and payment reminders" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold hover:underline ${
                      currentLead.feeStatus === 'Verified'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : currentLead.feeStatus === 'Proof Submitted'
                          ? 'border-blue-200 bg-blue-50 text-blue-900'
                          : currentLead.feeStatus === 'Rejected'
                            ? 'border-rose-200 bg-rose-50 text-rose-900'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}>
                      <BadgeIndianRupee className="w-3 h-3" />
                      Fee: {currentLead.feeStatus || 'Pending'} · ₹{Number(currentLead.feeStatus === 'Pending' ? (feeConfig?.payableFee || 2999) : (currentLead.feeAmount || feeConfig?.payableFee || 2999)).toLocaleString('en-IN')}
                    </button> : <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">Registration not submitted · Fee not applicable yet</span>}
                  </div>
                  )}
                  {!currentLead.applicationEligible&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    <p>{currentLead.sourceDetail==='Website Inquiry Form'?'This lead came from the website inquiry form.':'This lead does not have a submitted customer application.'} Customer registration must be completed before the registration fee is payable.</p>
                    <div className="mt-2 flex flex-wrap gap-2"><button disabled={registrationReminders.disabled({purpose:'registration',leadId:currentLead.id})||!currentLead.email} onClick={()=>void sendRegistrationReminder(currentLead)} title={currentLead.email?'Send the registration link to the recorded customer email':'Customer email is missing'} className="rounded-lg bg-emerald-800 px-3 py-2 font-bold text-white disabled:opacity-50">{registrationReminders.label({purpose:'registration',leadId:currentLead.id},'Email Registration Reminder')}</button><button onClick={()=>void navigator.clipboard.writeText('https://crm.akbspoultry.com/customer-registration').then(()=>setSavedMessage('Customer registration link copied.')).catch(()=>setNoteError('Unable to copy registration link.'))} className="rounded-lg border bg-white px-3 py-2 font-bold">Copy Registration Link</button></div>
                    {noteError&&<p role="alert" className="mt-2 text-rose-700">{noteError}</p>}
                  </div>}
                </div>
              </div>

              {/* Action Buttons right */}
              <div className="flex items-center gap-1.5">
                {isEmployeePortal ? (
                  quotationReviewPending ? (
                    <div className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-black flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Quotation Requested</span>
                    </div>
                  ) : quotationApproved ? (
                    <div className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-black flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Quotation Approved</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onOpenQuickAction?.('send-soft-quotation', currentLead)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
                      title="Request quotation from manager — no customer sending before approval"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Request Quotation</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setIsQuotationModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
                    title="Open Soft Quotation"
                  >
                    <span>📜</span>
                    <span>Soft Quotation</span>
                  </button>
                )}
                {!isEmployeePortal && (
                  <>
                    <button
                      onClick={() => onOpenQuickAction && onOpenQuickAction('edit', currentLead)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onOpenQuickAction && onOpenQuickAction('assign', currentLead)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Assign</span>
                    </button>
                    {isAdminPortal && (
                      <button
                        onClick={() => currentLead?.id && onDeleteLead(currentLead.id)}
                        className="px-2.5 py-1.5 border border-rose-200 bg-rose-50 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1"
                        title="Permanently delete this lead from all CRM staff portals"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setActiveDetailTab('activities')} className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700" title="View activities">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-tabs bar */}
            <div className={`flex items-center ${isEmployeePortal ? 'gap-1.5' : 'gap-2'} border-b border-slate-100 pb-2 overflow-x-auto text-xs font-semibold`}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'project', label: 'Project Details' },
                { id: 'financial', label: 'Financial' },
                { id: 'documents', label: 'Documents' },
                { id: 'activities', label: 'Activities' },
                { id: 'followups', label: 'Follow-ups' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveDetailTab(tab.id as any);
                    setSavedMessage('');
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                    activeDetailTab === tab.id
                      ? 'bg-[#0f2e20] text-white font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {savedMessage && (
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {savedMessage}
              </div>
            )}

            {activeDetailTab === 'overview' && (
              <>
            {isEmployeePortal ? (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-white to-emerald-50/50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-emerald-700">Your Current Work</div>
                    <div className="mt-1 text-base font-black text-slate-900">{currentWorkItem?.title || 'Customer follow-up'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Manager: <span className="font-bold text-slate-700">{managerDisplayName}</span>
                      {currentWorkItem ? ` · ${currentWorkItem.kind}` : ''}
                    </div>
                    <div className={`mt-1 text-[10px] font-semibold ${quotationReviewPending ? 'text-amber-700' : quotationApproved ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {quotationReviewPending
                        ? 'Quotation requested — waiting for manager review and approval.'
                        : quotationApproved
                          ? 'Quotation approved by manager. Approved summary is available in Soft Quotations.'
                          : 'Quotation requests go to your manager for approval; customer sending is locked.'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 min-w-[150px]">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">CRM Stage</div>
                    <div className="mt-1 text-sm font-black text-emerald-800">{currentLead.status}</div>
                  </div>
                </div>
              </div>
            ) : currentLeadProgress.length > 0 && (
              <ApplicationProgressTimeline
                title="Lead / Application Progress"
                subtitle="Live progress calculated from the application data and current CRM stage."
                stages={currentLeadProgress}
                activeStageId={currentLeadProgressId}
                readOnly
                compact
              />
            )}

            {/* Basic Information Box */}
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>Basic Information</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Full Name:</span>
                  <div className="font-semibold text-slate-900">{currentLead.name}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Mobile:</span>
                  <div className="font-mono font-semibold text-slate-900">{currentLead.phone}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <div className="text-slate-900 truncate">{currentLead.email || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Location:</span>
                  <div className="text-slate-900">{currentLead.location}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Language:</span>
                  <div className="text-slate-900">{currentLead.language || 'Hindi'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Created On:</span>
                  <div className="font-mono text-slate-900">{currentLead.date}, {currentLead.time}</div>
                </div>
              </div>
            </div>

            {/* Project Requirement Box */}
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                <span>Project Requirement</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Project Type:</span>
                  <div className="font-semibold text-slate-900">New Poultry Farm</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Poultry Type:</span>
                  <div className="font-semibold text-slate-900">{currentLead.projectType || 'Broiler'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Shed Type:</span>
                  <div className="text-slate-900 font-semibold">{currentLead.shedType || 'EC (Environment Controlled)'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Proposed Capacity:</span>
                  <div className="text-slate-900 font-bold font-mono">
                    {currentLead.birdCapacity ? `${currentLead.birdCapacity.toLocaleString()} Birds` : '20,000 Birds'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Land Available:</span>
                  <div className="text-slate-900">{currentLead.landAvailable || 'Not provided'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Land Area:</span>
                  <div className="text-slate-900 font-mono">{currentLead.landArea || 'Not provided'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Estimated Cost:</span>
                  <div className="text-slate-900 font-bold text-emerald-800 font-mono">
                    {currentLead.estimatedCost || currentLead.budgetEstimate || 'Not provided'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Loan Required:</span>
                  <div className="text-slate-900 font-mono">{currentLead.loanRequired || 'Not provided'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Timeline:</span>
                  <div className="text-slate-900 font-medium">{currentLead.timeline || 'Not provided'}</div>
                </div>
              </div>
            </div>

            {/* Current Status Box */}
            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200/60 pb-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-700" />
                <span>Current Status</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[11px]">Stage:</span>
                  <div>
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getStatusBadgeStyle(currentLead.status)}`}>
                      {currentLead.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Manager:</span>
                  <div className="font-semibold text-slate-900">{managerDisplayName}</div>
                  <div className="text-[10px] text-slate-400">{leadManager?.profile?.role_title || loggedInManager?.profile?.role_title || (managerDisplayName !== 'Not assigned' ? 'Manager' : '')}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Current Employee:</span>
                  <div className="font-semibold text-slate-900">{leadAssignee?.name || currentLead.assignedTo || 'Unassigned'}</div>
                  <div className="text-[10px] text-slate-400">{leadAssignee ? leadAssigneeTitle : ''}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Current Work:</span>
                  <div className="font-semibold text-slate-900">{currentWorkItem?.title || 'No active task'}</div>
                  <div className="text-[10px] text-slate-400">
                    {currentWorkOwner ? `${currentWorkOwner.name} · ${currentWorkItem?.kind || ''}` : 'No active workflow owner'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Priority:</span>
                  <div className="font-semibold text-rose-700">★ {currentLead.priority || 'High'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Next Follow-up:</span>
                  <div className="font-mono text-slate-900">{currentLead.nextFollowUp || 'Not provided'}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px]">Remarks:</span>
                  <div className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 mt-1">
                    {currentLead.notes || 'No notes recorded.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Ownership & Routing */}
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-white via-emerald-50/30 to-white p-3.5">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Lead Ownership & Routing</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeStyle(currentLead.status)}`}>
                  {currentLead.status}
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mt-3 text-xs">
                <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-amber-700 font-bold">Responsible Manager</div>
                  <div className="mt-1 font-black text-slate-900">{managerDisplayName}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{managerDisplayLogin}</div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-blue-700 font-bold">Current Employee</div>
                  <div className="mt-1 font-black text-slate-900">{leadAssignee?.name || 'Unassigned'}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{leadAssignee ? leadAssigneeTitle : ''}</div>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold">Active Work Item</div>
                  <div className="mt-1 font-black text-slate-900">{currentWorkItem?.title || 'No active task'}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {currentWorkItem ? `${currentWorkItem.kind} · ${currentWorkOwner?.name || 'Unassigned'}` : 'Lead is currently idle'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid matching Image 3 */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                <span>Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {!isEmployeePortal && (
                  <button
                    onClick={() => setIsQuotationModalOpen(true)}
                    className="p-2.5 rounded-xl border-2 border-emerald-600 bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 font-black text-emerald-950 shadow-xs col-span-2 sm:col-span-3"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Soft Quotation</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('call', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Log Call</span>
                </button>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('followup', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Schedule Follow-up</span>
                </button>

                <a
                  href={`https://wa.me/${currentLead.whatsApp?.replace(/[^0-9]/g, '') || currentLead.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send WhatsApp</span>
                </a>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('email', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <Send className="w-3.5 h-3.5 text-purple-600" />
                  <span>Send Email</span>
                </button>

                <button
                  onClick={() => onOpenQuickAction && onOpenQuickAction('task', currentLead)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 font-bold text-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Create Task</span>
                </button>

                {!isEmployeePortal && (
                  <button
                    onClick={() => onConvertLeadToCustomer?.(currentLead.id)}
                    disabled={currentLead.status === 'Converted'}
                    className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-bold text-emerald-900"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{currentLead.status === 'Converted' ? 'Customer Converted' : 'Convert to Customer'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Similar Leads / Suggestions */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  Similar Leads / Suggestions
                </span>
                <button onClick={() => setActiveDetailTab('project')} className="text-emerald-700 hover:underline font-semibold text-[11px]">
                  View Similar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {similarLeads.map((item) => (
                  <button key={item.id} onClick={() => handleSelectLeadCard(item)} className="p-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all cursor-pointer text-left">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${getAvatarColor(item.name)} text-[9px] font-bold flex items-center justify-center`}>
                        {getInitials(item.name)}
                      </div>
                      <div className="font-bold text-[11px] text-slate-900 truncate">{item.name}</div>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{item.location}</div>
                    <div className="text-[10px] font-bold font-mono text-emerald-900">{item.estimatedCost || item.budgetEstimate}</div>
                    <div className="text-[9px] text-slate-400">{item.birdCapacity.toLocaleString()} Birds</div>
                  </button>
                ))}
              </div>
            </div>
              </>
            )}

            {activeDetailTab === 'project' && (
              <div key="project-panel" className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-700" />
                    Project Details
                  </div>
                  {!isProjectEditing ? (
                    <button onClick={() => setIsProjectEditing(true)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1">
                      <Edit className="w-3.5 h-3.5" /> Edit Details
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsProjectEditing(false)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600">Cancel</button>
                      <button onClick={saveProjectDetails} className="px-3 py-1.5 bg-[#0b2818] text-white rounded-lg font-bold">Save Changes</button>
                    </div>
                  )}
                </div>

                {isProjectEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-slate-500 font-semibold">Poultry Type</span>
                      <select value={projectDraft.projectType} onChange={e => setProjectDraft(d => ({...d, projectType:e.target.value as Lead['projectType']}))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg">
                        <option value="Broiler">Broiler</option><option value="Layer">Layer</option><option value="Breeder">Breeder</option><option value="Country Chicken / Desi">Country Chicken / Desi</option><option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500 font-semibold">Proposed Capacity</span>
                      <input type="number" min="0" value={projectDraft.birdCapacity} onChange={e => setProjectDraft(d => ({...d,birdCapacity:Number(e.target.value)}))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"/>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500 font-semibold">Shed Type</span>
                      <input value={projectDraft.shedType} onChange={e => setProjectDraft(d => ({...d,shedType:e.target.value}))} placeholder="EC (Environment Controlled)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500 font-semibold">Land Area</span>
                      <input value={projectDraft.landArea} onChange={e => setProjectDraft(d => ({...d,landArea:e.target.value}))} placeholder="e.g. 5 Acres" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500 font-semibold">Land Ownership / Availability</span>
                      <input value={projectDraft.landOwnership} onChange={e => setProjectDraft(d => ({...d,landOwnership:e.target.value}))} placeholder="Yes (Own Land)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-500 font-semibold">Timeline</span>
                      <input value={projectDraft.timeline} onChange={e => setProjectDraft(d => ({...d,timeline:e.target.value}))} placeholder="Within 3 months" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/>
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className="text-slate-500 font-semibold">Support Needed</span>
                      <input value={projectDraft.supportNeeded} onChange={e => setProjectDraft(d => ({...d,supportNeeded:e.target.value}))} placeholder="DPR, Loan, Shed Design, Equipment" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/>
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-slate-400">Poultry Type</span><div className="font-bold">{currentLead.projectType}</div></div>
                    <div><span className="text-slate-400">Bird Capacity</span><div className="font-bold font-mono">{currentLead.birdCapacity.toLocaleString()} Birds</div></div>
                    <div><span className="text-slate-400">Shed Type</span><div className="font-semibold">{currentLead.shedType || 'Not specified'}</div></div>
                    <div><span className="text-slate-400">Land Area</span><div className="font-semibold">{currentLead.landArea || 'Not specified'}</div></div>
                    <div><span className="text-slate-400">Land Ownership</span><div className="font-semibold">{currentLead.landOwnership || currentLead.landAvailable || 'Not specified'}</div></div>
                    <div><span className="text-slate-400">Timeline</span><div className="font-semibold">{currentLead.timeline || 'Not specified'}</div></div>
                    <div className="col-span-2"><span className="text-slate-400">Support Needed</span><div className="font-semibold">{currentLead.supportNeeded?.join(', ') || 'Not provided'}</div></div>
                  </div>
                )}

                <div className="rounded-xl border border-emerald-200 bg-white overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-emerald-50/60">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">Farm Location</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Location submitted by the customer during the application.
                        </div>
                      </div>
                    </div>
                    {farmMapsHref ? (
                      <a
                        href={farmMapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b2818] text-white font-bold hover:bg-[#123d27] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open in Google Maps
                      </a>
                    ) : null}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400">Submitted Address / Location</span>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {farmLocationText || 'Location not provided'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Land Details</span>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {[currentLead.landArea ? `${currentLead.landArea} Acres` : '', currentLead.landOwnership || currentLead.landAvailable || '']
                            .filter(Boolean)
                            .join(' · ') || 'Not provided'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Village / City</span>
                        <div className="font-semibold text-slate-900 mt-0.5">{currentLead.village || 'Not provided'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">District / State</span>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {[currentLead.district, currentLead.state].filter(Boolean).join(', ') || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    {farmMapEmbedSrc ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <iframe
                          title={`Farm location for ${currentLead.name}`}
                          src={farmMapEmbedSrc}
                          className="w-full h-64 sm:h-72"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-500">
                        Farm location map will appear here when the customer provides location details.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => onOpenQuickAction?.('followup', currentLead)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100">Schedule Follow-up</button>
                  <button onClick={() => onOpenQuickAction?.('create-proposal', currentLead)} className="px-3 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Create DPR / Proposal</button>
                </div>
              </div>
            )}

            {activeDetailTab === 'financial' && (
              <div key="financial-panel" className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    Financial & Loan Requirement
                  </div>
                  {!isFinancialEditing ? (
                    <button onClick={() => setIsFinancialEditing(true)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1">
                      <Edit className="w-3.5 h-3.5" /> Edit Financial
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setIsFinancialEditing(false)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-600">Cancel</button>
                      <button onClick={saveFinancialDetails} className="px-3 py-1.5 bg-[#0b2818] text-white rounded-lg font-bold">Save Changes</button>
                    </div>
                  )}
                </div>

                {isFinancialEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="space-y-1"><span className="text-slate-500 font-semibold">Estimated Cost</span><input value={financialDraft.estimatedCost} onChange={e=>setFinancialDraft(d=>({...d,estimatedCost:e.target.value}))} placeholder="₹ 1.75 Cr" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/></label>
                    <label className="space-y-1"><span className="text-slate-500 font-semibold">Budget Estimate</span><input value={financialDraft.budgetEstimate} onChange={e=>setFinancialDraft(d=>({...d,budgetEstimate:e.target.value}))} placeholder="₹ 1.50 - 1.75 Cr" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/></label>
                    <label className="space-y-1"><span className="text-slate-500 font-semibold">Loan Requirement</span><input value={financialDraft.loanRequired} onChange={e=>setFinancialDraft(d=>({...d,loanRequired:e.target.value}))} placeholder="Yes (₹ 1.20 Cr)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"/></label>
                    <label className="space-y-1"><span className="text-slate-500 font-semibold">Priority</span><select value={financialDraft.priority} onChange={e=>setFinancialDraft(d=>({...d,priority:e.target.value as NonNullable<Lead['priority']>}))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"><option>High</option><option>Medium</option><option>Low</option></select></label>
                    <label className="space-y-1 sm:col-span-2"><span className="text-slate-500 font-semibold">Lead / Finance Stage</span><select value={financialDraft.status} onChange={e=>setFinancialDraft(d=>({...d,status:e.target.value as LeadStatus}))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"><option>New</option><option>Contacted</option><option>Qualified</option><option>Site Visit</option><option>Proposal Sent</option><option>DPR</option><option>Loan Processing</option><option>In Discussion</option><option>Follow Up</option><option>Negotiation</option><option>Converted</option><option>Lost</option></select></label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-slate-400">Estimated Cost</span><div className="font-bold text-emerald-800">{currentLead.estimatedCost || currentLead.budgetEstimate || 'Not specified'}</div></div>
                    <div><span className="text-slate-400">Budget Estimate</span><div className="font-bold">{currentLead.budgetEstimate || 'Not specified'}</div></div>
                    <div><span className="text-slate-400">Loan Required</span><div className="font-bold">{currentLead.loanRequired || 'To be discussed'}</div></div>
                    <div><span className="text-slate-400">Priority</span><div className="font-semibold">{currentLead.priority || 'Medium'}</div></div>
                    <div className="col-span-2"><span className="text-slate-400">Current Stage</span><div className="mt-1"><span className={`px-2 py-1 rounded-md border font-bold ${getStatusBadgeStyle(currentLead.status)}`}>{currentLead.status}</span></div></div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => onOpenQuickAction?.('loan-application', currentLead)} className="px-3 py-2 bg-[#0b2818] text-white rounded-lg font-bold">Create Loan File</button>
                  <button onClick={() => onOpenQuickAction?.('create-proposal', currentLead)} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold">Create DPR</button>
                  {!isEmployeePortal && (
                    <button
                      onClick={() => setIsQuotationModalOpen(true)}
                      className="px-3 py-2 bg-amber-400 text-slate-950 rounded-lg font-bold"
                    >
                      Soft Quotation
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeDetailTab === 'documents' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-2"><Paperclip className="w-4 h-4 text-emerald-700" />Documents for {currentLead.name}</div>
                  <div className="flex gap-2">
                    <button onClick={() => onOpenQuickAction?.('upload-document', currentLead)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-emerald-800"><UploadCloud className="w-3.5 h-3.5 inline mr-1"/>Upload</button>
                    <button onClick={() => onOpenQuickAction?.('upload-document', currentLead)} className="px-3 py-1.5 bg-[#0b2818] text-white rounded-lg font-bold">Add Document</button>
                  </div>
                </div>
                {relatedDocuments.length ? relatedDocuments.map(doc => (
                  <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div><div className="font-bold text-slate-900">{doc.name}</div><div className="text-[10px] text-slate-400">{doc.category} · {doc.fileSize} · {doc.uploadDate}</div></div>
                    <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-full">{doc.status}</span>
                  </div>
                )) : <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-center">No documents linked to this lead yet.</div>}
              </div>
            )}

            {activeDetailTab === 'activities' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-700" />Activity Timeline</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onOpenQuickAction?.('call', currentLead)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold">Call</button>
                  <button onClick={() => onOpenQuickAction?.('email', currentLead)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold">Email</button>
                  <button onClick={() => onOpenQuickAction?.('followup', currentLead)} className="px-3 py-1.5 bg-[#0b2818] text-white rounded-lg font-bold">Schedule Follow-up</button>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl"><div className="font-bold">Lead created</div><div className="text-slate-500">{currentLead.date}, {currentLead.time} · Source: {currentLead.source}</div></div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl"><div className="font-bold">Current stage</div><div className="text-slate-500">{currentLead.status} · Assigned to {currentLead.assignedTo || 'Unassigned'}</div></div>
                  {crm.activities.filter(a=>a.lead_id===currentLead.id).slice(0,4).map(row=>({id:row.id,title:row.action.replaceAll('_',' '),description:row.note,time:new Date(row.created_at).toLocaleString('en-IN')})).map(a => <div key={a.id} className="p-3 bg-white border border-slate-200 rounded-xl"><div className="font-bold">{a.title}</div><div className="text-slate-500">{a.description} · {a.time}</div></div>)}
                </div>
              </div>
            )}

            {activeDetailTab === 'followups' && (
              <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between"><div className="font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-700" />Follow-ups</div><button onClick={() => onOpenQuickAction?.('followup', currentLead)} className="px-3 py-1.5 bg-[#0b2818] text-white rounded-lg font-bold">Schedule</button></div>
                {relatedFollowUps.length ? relatedFollowUps.map(f => (
                  <div key={f.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3">
                    <div><div className="font-bold">{f.type} · {f.scheduledDate} {f.scheduledTime}</div><div className="text-slate-500 mt-1">{f.notes}</div></div>
                    <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-full">{f.status}</span>
                  </div>
                )) : <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-center">No follow-ups scheduled for this lead.</div>}
              </div>
            )}

          </div>
        </div>

        {/* ================= COLUMN 3: Activity Log, Notes, Follow-ups, Documents (3 cols) ================= */}
        <div className={`${isEmployeePortal ? 'hidden' : 'lg:col-span-3'} space-y-4`}>
          {/* Timeline / Activity Log */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Timeline / Activity Log</span>
              </h3>
              <button onClick={() => setActiveDetailTab('activities')} className="text-[11px] text-emerald-700 font-semibold hover:underline">
                View All
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {crm.activities.filter(a=>a.lead_id===currentLead.id).slice(0,5).map(a=><div key={a.id}><strong>{a.action.replaceAll('_',' ')}</strong><p>{a.note}</p><small>{a.actor_name} · {new Date(a.created_at).toLocaleString('en-IN')}</small></div>)}
              {!crm.activities.some(a=>a.lead_id===currentLead.id)&&<p>No activity recorded.</p>}
            </div>
          </div>

          {/* Add Note Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Add Note</span>
              {noteError&&<span role="alert">{noteError}</span>}
            </h3>
            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write a note about this lead..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none"
              >
                <option value="Internal Note">Internal Note</option>
                <option value="Client Discussion">Client Discussion</option>
                <option value="Site Observation">Site Observation</option>
              </select>
              <button
                onClick={handleSaveNote}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                Save Note
              </button>
            </div>

            {/* Saved Notes List */}
            {notesList.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                {notesList.map((n) => (
                  <div key={n.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-700">{n.author}</span>
                      <span>{n.time}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-snug">{n.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Follow-ups Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upcoming Follow-ups</span>
              </h3>
              <button onClick={() => setActiveDetailTab('followups')} className="text-[11px] text-emerald-700 font-semibold hover:underline">
                View All
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call with {currentLead.name}</span>
                </div>
                <button onClick={() => setActiveDetailTab('followups')} className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-emerald-800 font-mono font-medium">
                23 Sep 2026, 11:00 AM
              </div>
              <p className="text-[11px] text-slate-500">
                Discuss land documents and financing options
              </p>
            </div>
          </div>

          {/* Related Documents Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                <span>Related Documents</span>
              </h3>
              <button onClick={() => onOpenQuickAction?.('upload-document', currentLead)} className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1">
                <UploadCloud className="w-3 h-3" />
                <span>Upload</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Land Photo.jpg', size: '2.4 MB', date: '22 Sep 2026', icon: '🖼️' },
                { name: 'Aadhaar.pdf', size: '1.1 MB', date: '22 Sep 2026', icon: '📄' },
                { name: 'Project Proposal (Customer).pdf', size: '3.2 MB', date: '22 Sep 2026', icon: '📑' }
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{doc.icon}</span>
                    <div>
                      <div className="font-semibold text-slate-800 text-[11px]">{doc.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{doc.size} • {doc.date}</div>
                    </div>
                  </div>
                  <button onClick={() => setActiveDetailTab('documents')} className="text-slate-400 hover:text-slate-600">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Soft Quotation Modal is never available to employees; employees can only request manager review. */}
      {!isEmployeePortal && (
        <SoftQuotationModal
          isOpen={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          initialData={{
            name: currentLead.name,
            phone: currentLead.phone,
            email: currentLead.email,
            location: currentLead.location,
            state: currentLead.state,
            district: currentLead.district,
            village: currentLead.village,
            birdCapacity: currentLead.birdCapacity || 20000,
            poultryType: currentLead.projectType || 'Broiler',
            shedType: currentLead.shedType || 'EC (Environment Controlled)',
            leadId: currentLead.id,
            projectCost: currentLead.estimatedCost || currentLead.budgetEstimate
          }}
          onQuotationSent={(leadId) => {
            if (leadId) {
              onUpdateLeadStatus(leadId, 'Proposal Sent');
            }
          }}
        />
      )}
    </div>
  );
};
