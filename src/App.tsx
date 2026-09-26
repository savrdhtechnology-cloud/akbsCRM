// Vercel production sync trigger — AI Soft Quotations
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

import {
  INITIAL_LEADS,
  INITIAL_CUSTOMERS,
  INITIAL_PARTNERS,
  INITIAL_EMPLOYEES,
  INITIAL_PROPOSALS,
  INITIAL_LOANS,
  INITIAL_DOCUMENTS,
  INITIAL_TASKS,
  INITIAL_ACTIVITIES,
  PORTAL_USERS,
  INITIAL_SITE_VISITS,
  INITIAL_SUPPLY_ORDERS,
  INITIAL_MANAGER_APPROVALS
} from './data/mockData';

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

const loadLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const isCustomerRegistrationRoute = typeof window !== 'undefined' && /^\/customer-registration\/?$/.test(window.location.pathname);
  const isPartnerRegistrationRoute = typeof window !== 'undefined' && /^\/partner-registration\/?$/.test(window.location.pathname);
  const isSoftQuotationAcceptanceRoute = typeof window !== 'undefined' && /^\/soft-quotations\/accept\/[^/]+\/?$/.test(window.location.pathname);
  const isSoftQuotationRoute = typeof window !== 'undefined' && /^\/soft-quotations(?:\/|$)/.test(window.location.pathname) && !isSoftQuotationAcceptanceRoute;
  const [currentSection, setCurrentSection] = useState<NavigationSection>(isSoftQuotationRoute ? 'soft-quotations' : 'dashboard');
  const [currentRole, setCurrentRole] = useState<PortalRole>('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Core Data State
  const [leads, setLeads] = useState<Lead[]>(() => loadLocal('akbs.crm.leads', INITIAL_LEADS));
  const [customers, setCustomers] = useState<Customer[]>(() => loadLocal('akbs.crm.customers', INITIAL_CUSTOMERS));
  const [partners, setPartners] = useState<Partner[]>(() => loadLocal('akbs.crm.partners', INITIAL_PARTNERS));
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [proposals, setProposals] = useState<ProposalDPR[]>(() => loadLocal('akbs.crm.proposals', INITIAL_PROPOSALS));
  const [loans, setLoans] = useState<LoanApplication[]>(() => loadLocal('akbs.crm.loans', INITIAL_LOANS));
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => loadLocal('akbs.crm.documents', INITIAL_DOCUMENTS));
  const [tasks, setTasks] = useState<Task[]>(() => loadLocal('akbs.crm.tasks', INITIAL_TASKS));
  const [activities, setActivities] = useState<Activity[]>(() => loadLocal('akbs.crm.activities', INITIAL_ACTIVITIES));

  // Portals state
  const [siteVisits, setSiteVisits] = useState<SiteVisitLog[]>(INITIAL_SITE_VISITS);
  const [supplyOrders, setSupplyOrders] = useState<PartnerSupplyOrder[]>(INITIAL_SUPPLY_ORDERS);
  const [managerApprovals, setManagerApprovals] = useState<ManagerApproval[]>(INITIAL_MANAGER_APPROVALS);

  const handleApproveManagerRequest = (id: string) => {
    setManagerApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved' } : a));
  };

  const handleRejectManagerRequest = (id: string) => {
    setManagerApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'Rejected' } : a));
  };

  const handleAssignLead = (leadId: string, employeeName: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignedTo: employeeName } : l));
  };

  const handleAddSiteVisit = (visit: SiteVisitLog) => {
    setSiteVisits(prev => [visit, ...prev]);
  };

  const handleUpdateSupplyOrderStatus = (orderId: string, status: PartnerSupplyOrder['status'], challan?: string) => {
    setSupplyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, dispatchChallanNo: challan || o.dispatchChallanNo } : o));
  };

  // Follow-ups state
  const [followUps, setFollowUps] = useState<FollowUp[]>(() => loadLocal('akbs.crm.followups', [
    {
      id: 'fu-1',
      leadId: 'lead-13',
      leadName: 'viredra singh',
      phone: '+91 99281 44021',
      scheduledDate: '24 Sep 2026',
      scheduledTime: '3:00 pm',
      type: 'Phone Call',
      priority: 'High',
      status: 'Pending',
      notes: 'Discuss 12,000 birds poultry setup requirements and shed dimension layout.'
    },
    {
      id: 'fu-2',
      leadId: 'lead-23',
      leadName: 'Mohammad Faisal',
      phone: '+91 98930 11982',
      scheduledDate: '24 Sep 2026',
      scheduledTime: '4:00 pm',
      type: 'Site Visit',
      priority: 'Medium',
      status: 'Pending',
      notes: 'Site visit confirmation with technical team for 20,000 birds EC shed.'
    },
    {
      id: 'fu-3',
      leadId: 'lead-14',
      leadName: 'Rakesh Patel',
      phone: '+91 94250 88219',
      scheduledDate: '24 Sep 2026',
      scheduledTime: '6:00 pm',
      type: 'Phone Call',
      priority: 'Low',
      status: 'Pending',
      notes: 'Loan documentation status check for SBI Agri term loan.'
    },
    {
      id: 'fu-4',
      leadId: 'lead-31',
      leadName: 'Ajay Sharma',
      phone: '+91 98271 55670',
      scheduledDate: '24 Sep 2026',
      scheduledTime: '5:00 pm',
      type: 'DPR Discussion',
      priority: 'Medium',
      status: 'Completed',
      notes: 'Sent formal turnkey proposal for 20,000 birds project.'
    }
  ]));

  // Modal State
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [actionLead, setActionLead] = useState<Lead | null>(null);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [isAssignLeadOpen, setIsAssignLeadOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);

  useEffect(() => { window.localStorage.setItem('akbs.crm.leads', JSON.stringify(leads)); }, [leads]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.partners', JSON.stringify(partners)); }, [partners]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.proposals', JSON.stringify(proposals)); }, [proposals]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.loans', JSON.stringify(loans)); }, [loans]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.documents', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { window.localStorage.setItem('akbs.crm.followups', JSON.stringify(followUps)); }, [followUps]);

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

  // Add Lead
  const handleAddLead = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        type: 'inquiry',
        title: `New lead added: ${newLead.name}`,
        description: `${newLead.birdCapacity.toLocaleString()} birds project in ${newLead.location}`,
        time: 'Just now'
      },
      ...prev
    ]);
  };

  // Add Customer
  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
  };

  // Toggle Task Completion
  const handleToggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Add Task
  const handleAddTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskData.title || 'New Task',
      subtitle: taskData.subtitle || '',
      priority: taskData.priority || 'Medium',
      time: taskData.time || 'Today',
      dueDate: taskData.dueDate || 'Today',
      completed: false,
      category: taskData.category || 'Call'
    };
    setTasks(prev => [newTask, ...prev]);
  };

  // Update Lead Status
  const handleUpdateLeadStatus = (leadId: string, status: LeadStatus) => {
    const lead = leads.find(l => l.id === leadId);
    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, status } : l))
    );
    if (selectedLeadForDrawer?.id === leadId) {
      setSelectedLeadForDrawer(prev => (prev ? { ...prev, status } : null));
    }
    if (status === 'Converted' && lead) {
      setCustomers(prev => {
        const exists = prev.some(c => c.phone.replace(/\D/g,'') === lead.phone.replace(/\D/g,''));
        if (exists) return prev;
        const newCustomer: Customer = {
          id: `cust-${Date.now()}`,
          name: lead.name,
          farmName: `${lead.name} Poultry Farm`,
          phone: lead.phone,
          email: lead.email || '',
          location: lead.location || lead.district || 'Madhya Pradesh',
          state: lead.state || 'Madhya Pradesh',
          capacity: lead.birdCapacity || 0,
          shedType: lead.shedType?.toLowerCase().includes('open') ? 'Open Sided / Deep Litter' : 'Environment Controlled (EC)',
          status: 'Active',
          batchesCompleted: 0,
          currentBatchBirds: 0,
          joinedDate: new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),
          integrationPartner: 'AKBS Direct Farming'
        };
        return [newCustomer, ...prev];
      });
    }
  };

  // Delete Lead
  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  const handleEditLead = (leadId: string, patch: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...patch } : l));
    setActionLead(prev => prev?.id === leadId ? { ...prev, ...patch } : prev);
    setSelectedLeadForDrawer(prev => prev?.id === leadId ? { ...prev, ...patch } : prev);
  };

  const handleAddFollowUp = (followUp: FollowUp) => {
    setFollowUps(prev => [followUp, ...prev]);
    handleUpdateLeadStatus(followUp.leadId, 'Follow Up');
  };

  const handleAddProposal = (proposal: ProposalDPR) => {
    setProposals(prev => [proposal, ...prev]);
    const lead = leads.find(l => l.name === proposal.leadName && l.phone === proposal.leadPhone);
    if (lead) handleUpdateLeadStatus(lead.id, 'DPR');
    setCurrentSection('proposals');
  };

  const handleAddLoan = (loan: LoanApplication) => {
    setLoans(prev => [loan, ...prev]);
    setCurrentSection('loans');
  };

  const handleAddDocument = (doc: DocumentRecord) => {
    setDocuments(prev => [doc, ...prev]);
    setCurrentSection('documents');
  };

  const handleUpdateProposalStatus = (proposalId: string, status: ProposalDPR['status']) => {
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status } : p));
  };

  const handleUpdateLoanStatus = (loanId: string, status: LoanApplication['status']) => {
    setLoans(prev => prev.map(l => l.id === loanId ? { ...l, status } : l));
  };

  const handleUpdateDocumentStatus = (docId: string, status: DocumentRecord['status']) => {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
  };

  const handleConvertAcceptedQuotation = (quotation: SoftQuotation) => {
    if (quotation.status !== 'ACCEPTED') return;

    const proposal: ProposalDPR = {
      id: `DPR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      leadName: quotation.customer.customerName || 'Customer',
      leadPhone: quotation.customer.mobile || '',
      projectTitle: quotation.projectName,
      birdCapacity: quotation.projectCapacity,
      totalCost: quotation.grandTotal,
      subsidyEligible: 0,
      bankLoanAmount: 0,
      farmerContribution: quotation.grandTotal,
      shedSizeSqFt: Number(String(quotation.coveredArea).replace(/[^0-9.]/g, '')) || 0,
      roiMonths: 0,
      status: 'Accepted',
      createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    setProposals(prev => [proposal, ...prev]);

    if (quotation.customer.leadId) {
      handleUpdateLeadStatus(quotation.customer.leadId, 'Converted');
    }

    setCurrentSection('proposals');
    window.history.pushState({}, '', '/');
  };

    const handleCustomerPortalLead = (payload: Partial<Lead>) => {
    const applicationId = payload.applicationId || `AKBS-LEAD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const now = new Date();
    const normalizedPhone = payload.phone || '';
    const newLead: Lead = {
      id: applicationId,
      name: payload.name || 'Customer',
      phone: normalizedPhone,
      email: payload.email || '',
      source: payload.source || 'Website',
      status: payload.status || 'New',
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      location: payload.location || [payload.village, payload.district, payload.state].filter(Boolean).join(', ') || 'Not provided',
      birdCapacity: payload.birdCapacity || 0,
      projectType: payload.projectType || 'Broiler',
      budgetEstimate: payload.budgetEstimate || '',
      notes: payload.notes || `Customer portal registration ${applicationId}`,
      assignedTo: payload.assignedTo || 'Unassigned',
      isHot: payload.isHot ?? true,
      whatsApp: payload.whatsApp,
      language: payload.language,
      shedType: payload.shedType,
      landAvailable: payload.landAvailable,
      landOwnership: payload.landOwnership,
      landArea: payload.landArea,
      loanRequired: payload.loanRequired,
      timeline: payload.timeline,
      experience: payload.experience,
      supportNeeded: payload.supportNeeded,
      applicationId,
      relativeTime: 'Just now',
      estimatedCost: payload.estimatedCost,
      priority: payload.priority || 'High',
      nextFollowUp: payload.nextFollowUp || 'Not scheduled',
      lastContact: 'Customer portal submission',
      state: payload.state,
      district: payload.district,
      village: payload.village,
      googleMapsLink: payload.googleMapsLink
    };

    setLeads(prev => {
      const exists = prev.some(lead => lead.applicationId === applicationId || lead.id === applicationId);
      return exists ? prev.map(lead => (lead.applicationId === applicationId || lead.id === applicationId) ? { ...lead, ...newLead } : lead) : [newLead, ...prev];
    });
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        type: 'inquiry',
        title: `Customer portal lead created: ${newLead.name}`,
        description: `${applicationId} · ${newLead.birdCapacity.toLocaleString()} birds · ${newLead.location}`,
        time: 'Just now'
      },
      ...prev
    ]);
    setSelectedLeadId(applicationId);
  };

  const openCustomerPortalLeadInCrm = (applicationId?: string) => {
    if (applicationId) setSelectedLeadId(applicationId);
    window.history.pushState({}, '', '/');
    setCurrentSection('leads');
  };

  // Customer registration is standalone visually, but submitted applications are connected to CRM Leads.

  // Toggle Followup status
  const handleToggleFollowupStatus = (id: string) => {
    setFollowUps(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, status: f.status === 'Completed' ? 'Pending' : 'Completed' }
          : f
      )
    );
  };

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
        onSelectRole={setCurrentRole}
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
          onSelectRole={setCurrentRole}
        />

        {/* Dynamic Route View */}
        <main className="flex-1 overflow-y-auto bg-[#f3f6f4]">
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
