import React, { useState } from 'react';
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
import { ManagerPortalView } from './components/portals/ManagerPortalView';
import { EmployeePortalView } from './components/portals/EmployeePortalView';
import { PartnerPortalView } from './components/portals/PartnerPortalView';
import { AdminControlView } from './components/portals/AdminControlView';
import {
  AddLeadModal,
  AddCustomerModal,
  LeadDetailDrawer
} from './components/Modals';
import { SoftQuotationModal } from './components/SoftQuotationModal';

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

export default function App() {
  const isCustomerRegistrationRoute = typeof window !== 'undefined' && /^\/customer-registration\/?$/.test(window.location.pathname);
  const [currentSection, setCurrentSection] = useState<NavigationSection>('dashboard');
  const [currentRole, setCurrentRole] = useState<PortalRole>('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Core Data State
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [partners, setPartners] = useState<Partner[]>(INITIAL_PARTNERS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [proposals, setProposals] = useState<ProposalDPR[]>(INITIAL_PROPOSALS);
  const [loans, setLoans] = useState<LoanApplication[]>(INITIAL_LOANS);
  const [documents, setDocuments] = useState<DocumentRecord[]>(INITIAL_DOCUMENTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);

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
  const [followUps, setFollowUps] = useState<FollowUp[]>([
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
      notes: 'Site visit confirmation with Er. Ankit Mishra for 20,000 birds EC shed.'
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
  ]);

  // Modal State
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [isSoftQuotationOpen, setIsSoftQuotationOpen] = useState(false);
  const [softQuotationLead, setSoftQuotationLead] = useState<Lead | null>(null);

  // Quick Action Handler
  const handleOpenQuickAction = (actionKey: string) => {
    switch (actionKey) {
      case 'send-soft-quotation': {
        const activeLd = selectedLeadForDrawer || leads.find(l => l.id === selectedLeadId) || leads[0];
        setSoftQuotationLead(activeLd);
        setIsSoftQuotationOpen(true);
        break;
      }
      case 'add-lead':
        setIsAddLeadOpen(true);
        break;
      case 'add-customer':
        setIsAddCustomerOpen(true);
        break;
      case 'add-partner':
        setCurrentSection('partners');
        break;
      case 'create-proposal':
        setCurrentSection('proposals');
        break;
      case 'loan-application':
        setCurrentSection('loans');
        break;
      case 'add-followup':
        setCurrentSection('followups');
        break;
      case 'upload-document':
        setCurrentSection('documents');
        break;
      case 'send-email':
        setCurrentSection('communication');
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
    setLeads(prev =>
      prev.map(l => (l.id === leadId ? { ...l, status } : l))
    );
    if (selectedLeadForDrawer?.id === leadId) {
      setSelectedLeadForDrawer(prev => (prev ? { ...prev, status } : null));
    }
  };

  // Delete Lead
  const handleDeleteLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  // Customer registration is intentionally standalone and not connected to the CRM yet.

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

  // Standalone customer registration route. No website or CRM data connection yet.
  if (isCustomerRegistrationRoute) {
    return <CustomerRegistrationPortal />;
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] flex font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
          // On mobile, auto close sidebar when item is clicked
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
          onSelectSection={setCurrentSection}
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
        <main className="flex-1 overflow-y-auto">
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
              onOpenAddPartner={() => alert('Partner registration wizard')}
            />
          )}

          {currentSection === 'followups' && (
            <FollowUpsView
              followUps={followUps}
              onOpenAddFollowUp={() => alert('Schedule Follow-up Dialog')}
              onToggleStatus={handleToggleFollowupStatus}
            />
          )}

          {currentSection === 'proposals' && (
            <DprProposalsView
              proposals={proposals}
              onOpenCreateProposal={() => alert('New DPR Wizard initiated')}
            />
          )}

          {currentSection === 'loans' && (
            <FinanceLoansView
              loans={loans}
              onOpenNewLoan={() => alert('New Bank Loan Application initiated')}
            />
          )}

          {currentSection === 'documents' && (
            <DocumentsView
              documents={documents}
              onOpenUpload={() => alert('Document upload modal')}
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
          setSoftQuotationLead(selectedLeadForDrawer);
          setIsSoftQuotationOpen(true);
        }}
      />

      {/* Global Soft Quotation Modal */}
      <SoftQuotationModal
        isOpen={isSoftQuotationOpen}
        onClose={() => setIsSoftQuotationOpen(false)}
        initialData={softQuotationLead ? {
          name: softQuotationLead.name,
          phone: softQuotationLead.phone,
          email: softQuotationLead.email,
          location: softQuotationLead.location,
          state: softQuotationLead.state,
          district: softQuotationLead.district,
          village: softQuotationLead.village,
          birdCapacity: softQuotationLead.birdCapacity,
          poultryType: softQuotationLead.projectType,
          shedType: softQuotationLead.shedType,
          leadId: softQuotationLead.id,
          projectCost: softQuotationLead.estimatedCost || softQuotationLead.budgetEstimate
        } : null}
        onQuotationSent={(leadId) => {
          if (leadId) {
            handleUpdateLeadStatus(leadId, 'Proposal Sent');
          }
        }}
      />
    </div>
  );
}
