// Vercel production sync trigger — latest CRM production
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { LeadsView } from './components/LeadsView';
import { CustomersView } from './components/CustomersView';
import { PartnersView } from './components/PartnersView';
import { FollowUpsView } from './components/FollowUpsView';
import { DprProposalsView } from './components/DprProposalsView';
import { FinanceLoansView } from './components/FinanceLoansView';
import { DocumentsView } from './components/DocumentsView';
import { EmployeesView } from './components/EmployeesView';
import { TasksView } from './components/TasksView';
import { ReportsView } from './components/ReportsView';
import { CommunicationView } from './components/CommunicationView';
import { SettingsView } from './components/SettingsView';
import { CustomerRegistrationPortal } from './components/CustomerRegistrationPortal';
import { PartnerRegistrationPortal } from './components/PartnerRegistrationPortal';
import { RegistrationHub } from './components/RegistrationHub';
import { ManagerPortalView } from './components/portals/ManagerPortalView';
import { EmployeePortalView } from './components/portals/EmployeePortalView';
import { PartnerPortalView } from './components/portals/PartnerPortalView';
import { AdminControlView } from './components/portals/AdminControlView';
import {
  AddLeadModal,
  AddCustomerModal,
  LeadDetailDrawer,
  EditLeadModal,
  AssignLeadModal,
  AddFollowUpModal,
  AddProposalModal,
  AddLoanModal,
  UploadDocumentModal
} from './components/Modals';
import { SoftQuotationsModule } from './features/softQuotations/SoftQuotationsModule';
import { SoftQuotationAcceptancePage } from './features/softQuotations/SoftQuotationAcceptancePage';
import { SoftQuotation } from './features/softQuotations/types';

import { useCrm } from './lib/crm';
import { mapLead, leadPayload, stageValue, dateLabel } from './lib/leadAdapter';

import {
  NavigationSection,
  Lead,
  Customer,
  Partner,
  ProposalDPR,
  LoanApplication,
  DocumentRecord,
  Task,
  Activity,
  FollowUp,
  LeadStatus,
  PortalRole,
  SiteVisitLog,
  PartnerSupplyOrder,
  ManagerApproval
} from './types';

export default function App() {
  const isCustomerRegistrationRoute = typeof window !== 'undefined' && /^\/customer-registration\/?$/.test(window.location.pathname);
  const isPartnerRegistrationRoute = typeof window !== 'undefined' && /^\/partner-registration\/?$/.test(window.location.pathname);
  const isSoftQuotationAcceptanceRoute = typeof window !== 'undefined' && /^\/soft-quotations\/accept\/[^/]+\/?$/.test(window.location.pathname);
  const isSoftQuotationRoute = typeof window !== 'undefined' && /^\/soft-quotations(?:\/|$)/.test(window.location.pathname) && !isSoftQuotationAcceptanceRoute;
  const [currentSection, setCurrentSection] = useState<NavigationSection>(isSoftQuotationRoute ? 'soft-quotations' : 'dashboard');
  const [currentRole, setCurrentRole] = useState<PortalRole>('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const crm=useCrm();
  const [saveError,setSaveError]=useState('');
  const [saving,setSaving]=useState(false);
  const run=async(action:string,data:Record<string,any>)=>{setSaving(true);setSaveError('');try{return await crm.command(action,data);}catch(e:any){setSaveError(e.message);await crm.refresh().catch(()=>{});return null;}finally{setSaving(false);}};
  const leads=crm.leads.map(l=>mapLead(l,crm.users));
  const nameFor=(id:string)=>leads.find(l=>l.id===id)?.name||'';
  const records=(kind:string)=>crm.records.filter(r=>r.kind===kind).map(r=>({...r.data,id:r.id}));
  const customers:Customer[]=[...records('customer'),...leads.filter(l=>l.status==='Converted').map(l=>({id:l.id,name:l.name,farmName:l.name,phone:l.phone,email:l.email,location:l.location,state:l.state||'',capacity:l.birdCapacity,shedType:'Environment Controlled (EC)' as const,status:'Active' as const,batchesCompleted:0,currentBatchBirds:0,joinedDate:l.date,integrationPartner:''}))];
  const partners:Partner[]=records('partner');
  const employees=crm.users.filter(u=>['ADMIN','MANAGER','EMPLOYEE','FINANCE'].includes(u.role)).map(u=>({id:u.id,name:u.name,role:(u.role==='ADMIN'?'Super Admin':u.role==='FINANCE'?'Accountant':'Sales Manager') as any,department:'Sales & CRM' as const,phone:u.profile?.phone||'',email:u.login||'',status:'Active' as const,activeLeadsCount:crm.leads.filter(l=>l.assigned_to===u.id).length}));
  const proposals:ProposalDPR[]=crm.workflows.filter(w=>w.kind==='proposal').map(w=>({id:w.id,leadName:nameFor(w.lead_id),leadPhone:leads.find(l=>l.id===w.lead_id)?.phone||'',projectTitle:w.title,birdCapacity:leads.find(l=>l.id===w.lead_id)?.birdCapacity||0,totalCost:w.amount,subsidyEligible:0,bankLoanAmount:0,farmerContribution:0,shedSizeSqFt:0,roiMonths:0,status:({DRAFT:'Draft',UNDER_REVIEW:'Under Review',APPROVED:'Under Review',SENT:'Sent',ACCEPTED:'Accepted',REJECTED:'Rejected'} as any)[w.status],createdDate:''}));
  const loans:LoanApplication[]=crm.workflows.filter(w=>w.kind==='financing').map(w=>({id:w.id,applicantName:nameFor(w.lead_id),phone:leads.find(l=>l.id===w.lead_id)?.phone||'',bankName:w.bank,scheme:'AHIDF Scheme',appliedAmount:w.amount,status:({SANCTIONED:'Sanctioned',DISBURSED:'Disbursed'} as any)[w.status]||'Under Process',submissionDate:''}));
  const documents:DocumentRecord[]=crm.documents.map(d=>({id:d.id,name:d.name,category:d.category as any,relatedEntity:nameFor(d.lead_id),uploadDate:dateLabel(d.created_at),fileSize:`${(d.size/1024).toFixed(1)} KB`,fileType:d.mime,status:'Pending Verification'}));
  const tasks:Task[]=crm.workflows.filter(w=>w.kind==='task').map(w=>({id:w.id,title:w.title,subtitle:nameFor(w.lead_id),priority:'Medium',time:dateLabel(w.due_at||''),dueDate:dateLabel(w.due_at||''),completed:w.status==='COMPLETED',category:'Call'}));
  const activities:Activity[]=crm.activities.map(a=>({id:a.id,type:'inquiry',title:a.action.replaceAll('_',' '),description:a.note,time:dateLabel(a.created_at)}));
  const siteVisits:SiteVisitLog[]=crm.workflows.filter(w=>w.kind==='visit').map(w=>({id:w.id,employeeName:crm.users.find(u=>u.id===w.assignee_id)?.name||'',farmerName:nameFor(w.lead_id),location:w.location,birdCapacity:0,shedSizeSqFt:0,waterTds:0,powerAvailable:false,notes:w.notes,visitDate:dateLabel(w.due_at||''),status:w.status==='COMPLETED'?'Approved':'Pending Review'}));
  const supplyOrders:PartnerSupplyOrder[]=records('supply_order');
  const managerApprovals:ManagerApproval[]=crm.workflows.filter(w=>w.kind==='proposal'&&w.status==='UNDER_REVIEW').map(w=>({id:w.id,title:w.title,requestedBy:'',category:'DPR Proposal',amount:w.amount,farmerName:nameFor(w.lead_id),submittedDate:'',status:'Pending',priority:'Medium'}));
  const followUps:FollowUp[]=crm.workflows.filter(w=>w.kind==='followup').map(w=>({id:w.id,leadId:w.lead_id,leadName:nameFor(w.lead_id),phone:leads.find(l=>l.id===w.lead_id)?.phone||'',scheduledDate:dateLabel(w.due_at||''),scheduledTime:w.due_at?new Date(w.due_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'',type:'Phone Call',priority:'Medium',status:w.status==='COMPLETED'?'Completed':'Pending',notes:w.notes}));
  const PORTAL_USERS=crm.users.map(u=>({id:u.id,name:u.name,role:u.role.toLowerCase() as PortalRole,roleTitle:u.role,email:u.login||'',phone:u.profile?.phone||'',departmentOrCompany:'AKBS',avatarLetter:u.name.slice(0,1)}));
  const updateWorkflow=(id:string,status:string)=>{const w=crm.workflows.find(w=>w.id===id);if(w)return run('workflow_update',{...w,status});};
  const handleApproveManagerRequest=(id:string)=>{void updateWorkflow(id,'APPROVED');};
  const handleRejectManagerRequest=(id:string)=>{void updateWorkflow(id,'REJECTED');};
  const handleAssignLead=(id:string,name:string)=>{const l=crm.leads.find(l=>l.id===id);const u=crm.users.find(u=>u.name===name&&u.role==='EMPLOYEE'&&u.active);if(!l||!u){setSaveError('Choose an active employee from your team.');return;}void run('lead_update',{lead_id:id,version:l.version,assigned_to:u.id});};
  const handleAddSiteVisit=(v:SiteVisitLog)=>{const l=leads.find(l=>l.name===v.farmerName);if(!l){setSaveError('Select an existing lead for this visit.');return;}void run('workflow_create',{lead_id:l.id,kind:'visit',title:'Site visit',status:'SCHEDULED',location:v.location,notes:v.notes,due_at:new Date(v.visitDate).toISOString()});};
  const handleUpdateSupplyOrderStatus=(id:string,status:PartnerSupplyOrder['status'],challan?:string)=>{const r=crm.records.find(r=>r.id===id);if(r)void run('record_save',{id,version:r.version,kind:'supply_order',data:{...r.data,status,dispatchChallanNo:challan||r.data.dispatchChallanNo}});};
  useEffect(()=>{setCurrentRole(crm.user.role==='FINANCE'?'employee':crm.user.role.toLowerCase() as PortalRole);},[crm.user.role]);

  // Modal State
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [actionLead, setActionLead] = useState<Lead | null>(null);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [isAssignLeadOpen, setIsAssignLeadOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);

  useEffect(()=>{setSelectedLeadForDrawer(prev=>prev?leads.find(l=>l.id===prev.id)||null:null);},[crm.leads]);
  // Quick Action Handler
  const handleOpenQuickAction = (actionKey: string, lead?: Lead) => {
    const activeLead = lead || selectedLeadForDrawer || leads.find(l => l.id === selectedLeadId) || leads[0] || null;
    if (lead) {
      setSelectedLeadId(lead.id);
      setActionLead(lead);
    }

    switch (actionKey) {
      case 'send-soft-quotation':
        setCurrentSection('soft-quotations');
        window.history.pushState({}, '', activeLead ? `/soft-quotations/new?lead=${activeLead.id}` : '/soft-quotations/new');
        window.dispatchEvent(new Event('soft-quotation-route'));
        break;
      case 'add-lead':
        setIsAddLeadOpen(true);
        break;
      case 'add-customer':
        setIsAddCustomerOpen(true);
        break;
      case 'add-partner':
        window.open('/partner-registration', '_blank', 'noopener,noreferrer');
        break;
      case 'create-proposal':
        setActionLead(activeLead);
        setIsProposalOpen(true);
        break;
      case 'loan-application':
        setIsLoanOpen(true);
        break;
      case 'add-followup':
      case 'followup':
        setActionLead(activeLead);
        setIsFollowUpOpen(true);
        break;
      case 'upload-document':
        setIsDocumentUploadOpen(true);
        break;
      case 'send-email':
      case 'email':
        if (activeLead?.email) {
          window.location.href = `mailto:${activeLead.email}?subject=${encodeURIComponent('AKBS Poultry Farming - Follow-up')}`;
        } else {
          setCurrentSection('communication');
        }
        break;
      case 'call':
        if (activeLead?.phone) window.location.href = `tel:${activeLead.phone}`;
        break;
      case 'task':
        if (activeLead) {
          handleAddTask({
            title: `Follow up: ${activeLead.name}`,
            subtitle: `${activeLead.birdCapacity.toLocaleString()} birds · ${activeLead.location}`,
            priority: activeLead.priority || 'Medium',
            time: 'Today',
            dueDate: 'Today',
            category: 'Call',
            assignedTo: activeLead.assignedTo
          });
          setCurrentSection('tasks');
        }
        break;
      case 'edit':
        setActionLead(activeLead);
        setIsEditLeadOpen(true);
        break;
      case 'assign':
        setActionLead(activeLead);
        setIsAssignLeadOpen(true);
        break;
      default:
        break;
    }
  };

  const handleAddLead=(lead:Lead)=>{void run('lead_create',leadPayload(lead));};
  const handleAddCustomer=(customer:Customer)=>{void run('record_save',{kind:'customer',data:customer});};
  const handleToggleTask=(id:string)=>{const w=crm.workflows.find(w=>w.id===id);if(w)void updateWorkflow(id,w.status==='COMPLETED'?'OPEN':'COMPLETED');};
  const handleAddTask=(task:Partial<Task>)=>{const l=actionLead||selectedLeadForDrawer||leads.find(l=>l.id===selectedLeadId);if(!l){setSaveError('Select a lead before adding a task.');return;}const due=new Date();due.setDate(due.getDate()+1);void run('workflow_create',{lead_id:l.id,kind:'task',title:task.title||'Follow up',status:'OPEN',notes:task.subtitle||'',due_at:due.toISOString()});};
  const handleUpdateLeadStatus=(id:string,status:LeadStatus)=>{const l=crm.leads.find(l=>l.id===id);const stage=stageValue(status);if(!l)return;if(!stage){setSaveError('Use a follow-up task for this activity; choose a supported lead stage.');return;}let reason='';if(stage==='LOST'){reason=window.prompt('Reason for closing this lead')||'';if(!reason)return;}void run('lead_update',{lead_id:id,version:l.version,stage,reason});};
  const handleDeleteLead=()=>setSaveError('Leads are retained for tracking. Mark a lead Lost with a reason to close it.');
  const handleEditLead=(id:string,patch:Partial<Lead>)=>{const l=crm.leads.find(l=>l.id===id);if(l)void run('lead_update',{lead_id:id,version:l.version,...leadPayload(patch),...(patch.status&&stageValue(patch.status)?{stage:stageValue(patch.status)}:{})});};
  const handleAddFollowUp=(f:FollowUp)=>{const due=new Date(`${f.scheduledDate} ${f.scheduledTime}`);if(!Number.isFinite(due.getTime())){setSaveError('Please choose a valid follow-up date and time.');return;}void run('workflow_create',{lead_id:f.leadId,kind:'followup',title:f.type,status:'SCHEDULED',notes:f.notes,due_at:due.toISOString()});};
  const handleAddProposal=(p:ProposalDPR)=>{const l=leads.find(l=>l.name===p.leadName&&l.phone===p.leadPhone);if(!l){setSaveError('Select an existing lead.');return;}void run('workflow_create',{lead_id:l.id,kind:'proposal',title:p.projectTitle,status:'DRAFT',amount:p.totalCost});};
  const handleAddLoan=(loan:LoanApplication)=>{const l=leads.find(l=>l.name===loan.applicantName&&l.phone===loan.phone);if(!l){setSaveError('Applicant name and phone must match an existing lead.');return;}void run('workflow_create',{lead_id:l.id,kind:'financing',title:loan.scheme,bank:loan.bankName,amount:loan.appliedAmount,status:'DOCUMENTS_PENDING'});};
  const handleAddDocument=async(doc:DocumentRecord,file?:File)=>{
    const lead=leads.find(l=>l.name===doc.relatedEntity||l.applicationId===doc.relatedEntity);
    if(!lead||!file){setSaveError('Choose a file and enter the exact lead name or application ID.');return;}
    if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>2097152){setSaveError('Choose a PDF, JPG or PNG up to 2 MB.');return;}
    const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
    await run('document_upload',{lead_id:lead.id,name:file.name,category:doc.category,mime:file.type,size:file.size,content:btoa(binary),shared:false});
  };
  const handleUpdateProposalStatus=(id:string,status:ProposalDPR['status'])=>{void updateWorkflow(id,status.toUpperCase().replaceAll(' ','_'));};
  const handleUpdateLoanStatus=(id:string,status:LoanApplication['status'])=>{const value=({Sanctioned:'SANCTIONED',Disbursed:'DISBURSED','Under Process':'UNDER_REVIEW','Documents Verified':'SUBMITTED','Inspection Completed':'UNDER_REVIEW'} as const)[status];void updateWorkflow(id,value);};
  const handleUpdateDocumentStatus=()=>setSaveError('Document verification is managed in the website staff portal.');
  const handleConvertAcceptedQuotation=(q:SoftQuotation)=>{if(q.status!=='ACCEPTED')return;setSaveError('Create a DPR from the linked lead to record this accepted quotation in the shared database.');};
  const handleCustomerPortalLead=()=>{window.location.assign('https://www.akbspoultry.com/customer/register');};
  const openCustomerPortalLeadInCrm=()=>setCurrentSection('leads');
  const handleToggleFollowupStatus=(id:string)=>{const w=crm.workflows.find(w=>w.id===id);if(w)void updateWorkflow(id,w.status==='COMPLETED'?'SCHEDULED':'COMPLETED');};

  // Standalone customer registration route with CRM lead creation.
  if (isCustomerRegistrationRoute) {
    return (
      <CustomerRegistrationPortal
        onRegisterCustomer={handleCustomerPortalLead}
        onGoToCRM={() => {
          window.history.pushState({}, '', '/');
          setCurrentSection('dashboard');
        }}
        onGoToLeads={openCustomerPortalLeadInCrm}
      />
    );
  }

  if (isPartnerRegistrationRoute) {
    return <PartnerRegistrationPortal />;
  }

  if (isSoftQuotationAcceptanceRoute) {
    return <SoftQuotationAcceptancePage />;
  }

  return (
    <div className="crm-shell min-h-screen bg-[#f3f6f4] flex font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        currentRole={currentRole}
        onSelectRole={()=>setSaveError('Your access role is set by your staff account.')}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
          if (sec === 'soft-quotations') {
            window.history.pushState({}, '', '/soft-quotations');
            window.dispatchEvent(new Event('soft-quotation-route'));
          } else if (window.location.pathname.startsWith('/soft-quotations')) {
            window.history.pushState({}, '', '/');
          }
          if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenQuickAction={handleOpenQuickAction}
          onSelectSection={(sec) => {
            setCurrentSection(sec);
            if (sec === 'soft-quotations') {
              window.history.pushState({}, '', '/soft-quotations');
              window.dispatchEvent(new Event('soft-quotation-route'));
            }
          }}
          currentSection={currentSection}
          leads={leads}
          customers={customers}
          onSelectLead={(lead) => {
            setSelectedLeadId(lead.id);
            setSelectedLeadForDrawer(lead);
          }}
          currentRole={currentRole}
          onSelectRole={()=>setSaveError('Your access role is set by your staff account.')}
        />

        {/* Dynamic Route View */}
        <main className="flex-1 overflow-y-auto bg-[#f3f6f4]">
          <div className="connection-bar"><span>{saving?'Saving…':'Connected to website database'} · {crm.user.name} · {leads.length} leads</span><button onClick={()=>void crm.refresh().catch(()=>{})}>Refresh</button><button onClick={crm.logout}>Sign out</button></div>
          {(saveError||crm.error)&&<div role="alert" className="connection-error">{saveError||crm.error}</div>}
          {currentSection === 'dashboard' && (
            <Dashboard
              leads={leads}
              tasks={tasks}
              activities={activities}
              onSelectSection={setCurrentSection}
              onOpenQuickAction={handleOpenQuickAction}
              onSelectLead={(lead) => {
                setSelectedLeadId(lead.id);
                setSelectedLeadForDrawer(lead);
              }}
              onToggleTask={handleToggleTask}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onAssignLead={handleAssignLead}
              onEditLead={handleEditLead}
            />
          )}

          {currentSection === 'leads' && (
            <LeadsView
              leads={leads}
              selectedLeadId={selectedLeadId}
              onSelectLead={(lead) => {
                setSelectedLeadId(lead.id);
                setSelectedLeadForDrawer(lead);
              }}
              onOpenAddLead={() => setIsAddLeadOpen(true)}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onDeleteLead={handleDeleteLead}
              onOpenQuickAction={handleOpenQuickAction}
              onEditLead={handleEditLead}
              documents={documents}
              followUps={followUps}
              activities={activities}
            />
          )}

          {currentSection === 'customers' && (
            <CustomersView
              customers={customers}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
            />
          )}

          {currentSection === 'partners' && (
            <PartnersView
              partners={partners}
              onOpenAddPartner={() => window.open('/partner-registration', '_blank', 'noopener,noreferrer')}
            />
          )}

          {currentSection === 'registrations' && (
            <RegistrationHub />
          )}

          {currentSection === 'followups' && (
            <FollowUpsView
              followUps={followUps}
              onOpenAddFollowUp={() => { setActionLead(leads.find(l => l.id === selectedLeadId) || null); setIsFollowUpOpen(true); }}
              onToggleStatus={handleToggleFollowupStatus}
            />
          )}

          {currentSection === 'soft-quotations' && (
            <SoftQuotationsModule
              currentRole={currentRole}
              currentUserName={PORTAL_USERS.find(u => u.role === currentRole)?.name || 'AKBS CRM User'}
              customers={customers}
              leads={leads}
              onCreateCustomer={() => setIsAddCustomerOpen(true)}
              onConvertToProject={handleConvertAcceptedQuotation}
            />
          )}

                    {currentSection === 'proposals' && (
            <DprProposalsView
              proposals={proposals}
              onOpenCreateProposal={() => { setActionLead(leads.find(l => l.id === selectedLeadId) || null); setIsProposalOpen(true); }}
              onUpdateProposalStatus={handleUpdateProposalStatus}
            />
          )}

          {currentSection === 'loans' && (
            <FinanceLoansView
              loans={loans}
              onOpenNewLoan={() => setIsLoanOpen(true)}
              onUpdateLoanStatus={handleUpdateLoanStatus}
            />
          )}

          {currentSection === 'documents' && (
            <DocumentsView
              documents={documents}
              onOpenUpload={() => setIsDocumentUploadOpen(true)}
              onUpdateStatus={handleUpdateDocumentStatus}
            />
          )}

          {currentSection === 'employees' && (
            <EmployeesView employees={employees} />
          )}

          {currentSection === 'tasks' && (
            <TasksView
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
            />
          )}

          {currentSection === 'reports' && (
            <ReportsView leads={leads} customers={customers} />
          )}

          {currentSection === 'communication' && (
            <CommunicationView leads={leads} />
          )}

          {currentSection === 'settings' && (
            <SettingsView />
          )}

          {currentSection === 'manager-portal' && (
            <ManagerPortalView
              leads={leads}
              employees={employees}
              approvals={managerApprovals}
              siteVisits={siteVisits}
              onApprove={handleApproveManagerRequest}
              onReject={handleRejectManagerRequest}
              onAssignLead={handleAssignLead}
              onSwitchPortal={(role) => {
                setCurrentRole(role);
                if (role === 'admin') setCurrentSection('dashboard');
                else if (role === 'employee') setCurrentSection('employee-portal');
                else if (role === 'partner') setCurrentSection('partner-portal');
              }}
              isAdminViewing={currentRole === 'admin'}
            />
          )}

          {currentSection === 'employee-portal' && (
            <EmployeePortalView
              leads={leads}
              tasks={tasks}
              siteVisits={siteVisits}
              onAddSiteVisit={handleAddSiteVisit}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onSwitchPortal={(role) => {
                setCurrentRole(role);
                if (role === 'admin') setCurrentSection('dashboard');
                else if (role === 'manager') setCurrentSection('manager-portal');
                else if (role === 'partner') setCurrentSection('partner-portal');
              }}
              isAdminViewing={currentRole === 'admin'}
            />
          )}

          {currentSection === 'partner-portal' && (
            <PartnerPortalView
              orders={supplyOrders}
              onUpdateOrderStatus={handleUpdateSupplyOrderStatus}
              onSwitchPortal={(role) => {
                setCurrentRole(role);
                if (role === 'admin') setCurrentSection('dashboard');
                else if (role === 'manager') setCurrentSection('manager-portal');
                else if (role === 'employee') setCurrentSection('employee-portal');
              }}
              isAdminViewing={currentRole === 'admin'}
            />
          )}

          {currentSection === 'admin-control' && (
            <AdminControlView
              currentRole={currentRole}
              onSelectRole={(role) => {
                setCurrentRole(role);
              }}
              portalUsers={PORTAL_USERS}
              onOpenSection={setCurrentSection}
            />
          )}
        </main>
      </div>

      {/* Global Modals and Drawers */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onAdd={handleAddLead}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAdd={handleAddCustomer}
      />

      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        onClose={() => setSelectedLeadForDrawer(null)}
        onUpdateStatus={handleUpdateLeadStatus}
        onOpenCreateProposal={() => setCurrentSection('proposals')}
        onOpenSoftQuotation={() => {
          if (!selectedLeadForDrawer) return;
          setCurrentSection('soft-quotations');
          window.history.pushState({}, '', `/soft-quotations/new?lead=${selectedLeadForDrawer.id}`);
          window.dispatchEvent(new Event('soft-quotation-route'));
        }}
      />

      <EditLeadModal
        isOpen={isEditLeadOpen}
        onClose={() => setIsEditLeadOpen(false)}
        lead={actionLead}
        onSave={handleEditLead}
      />

      <AssignLeadModal
        isOpen={isAssignLeadOpen}
        onClose={() => setIsAssignLeadOpen(false)}
        lead={actionLead}
        employeeNames={employees.map(e => e.name)}
        onAssign={handleAssignLead}
      />

      <AddFollowUpModal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        lead={actionLead}
        leads={leads}
        onAdd={handleAddFollowUp}
      />

      <AddProposalModal
        isOpen={isProposalOpen}
        onClose={() => setIsProposalOpen(false)}
        lead={actionLead}
        leads={leads}
        onAdd={handleAddProposal}
      />

      <AddLoanModal
        isOpen={isLoanOpen}
        onClose={() => setIsLoanOpen(false)}
        onAdd={handleAddLoan}
      />

      <UploadDocumentModal
        isOpen={isDocumentUploadOpen}
        onClose={() => setIsDocumentUploadOpen(false)}
        onAdd={handleAddDocument}
      />

    </div>
  );
}

