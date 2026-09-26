export type PortalRole = 'admin' | 'manager' | 'employee' | 'partner';

export type NavigationSection = 
  | 'customer-portal'
  | 'dashboard'
  | 'leads'
  | 'followups'
  | 'customers'
  | 'registrations'
  | 'partners'
  | 'employees'
  | 'soft-quotations'
  | 'proposals'
  | 'loans'
  | 'documents'
  | 'tasks'
  | 'reports'
  | 'communication'
  | 'settings'
  | 'manager-portal'
  | 'employee-portal'
  | 'partner-portal'
  | 'admin-control';

export interface PortalUser {
  id: string;
  name: string;
  role: PortalRole;
  roleTitle: string;
  email: string;
  phone: string;
  departmentOrCompany: string;
  avatarLetter: string;
}

export interface SiteVisitLog {
  id: string;
  employeeName: string;
  farmerName: string;
  location: string;
  birdCapacity: number;
  shedSizeSqFt: number;
  waterTds: number;
  powerAvailable: boolean;
  notes: string;
  visitDate: string;
  status: 'Approved' | 'Pending Review' | 'Needs Follow-up';
}

export interface PartnerSupplyOrder {
  id: string;
  partnerName: string;
  category: 'Feed Supplier' | 'Equipment & Automation' | 'Hatchery / DOC' | 'Veterinary & Pharma';
  itemDescription: string;
  farmerName: string;
  farmLocation: string;
  quantity: string;
  totalAmount: number;
  status: 'Pending Dispatch' | 'In Transit' | 'Delivered' | 'Payment Settled';
  orderDate: string;
  dispatchChallanNo?: string;
}

export interface ManagerApproval {
  id: string;
  title: string;
  requestedBy: string;
  category: 'DPR Proposal' | 'Bank Loan Guarantee' | 'Feed Credit Limit' | 'Equipment Quotation';
  amount: number;
  farmerName: string;
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  priority: 'High' | 'Medium' | 'Low';
  comments?: string;
}

export type LeadStatus = 
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Site Visit'
  | 'Proposal Sent'
  | 'DPR'
  | 'Loan Processing'
  | 'In Discussion'
  | 'Follow Up'
  | 'Negotiation'
  | 'Converted'
  | 'Lost';

export type LeadSource = 
  | 'Website'
  | 'Phone Call'
  | 'WhatsApp'
  | 'Direct Visit'
  | 'Direct Call'
  | 'Email'
  | 'Others';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  date: string;
  time: string;
  location: string;
  birdCapacity: number;
  projectType: 'Broiler' | 'Layer' | 'Breeder' | 'Country Chicken / Desi' | 'Other';
  budgetEstimate: string;
  notes: string;
  assignedTo: string;
  // Extra detailed fields matching Customer Portal & Leads CRM
  isHot?: boolean;
  whatsApp?: string;
  language?: string;
  shedType?: string;
  landAvailable?: string;
  landOwnership?: string;
  landArea?: string;
  loanRequired?: string;
  timeline?: string;
  experience?: string;
  supportNeeded?: string[];
  applicationId?: string;
  relativeTime?: string;
  estimatedCost?: string;
  priority?: 'High' | 'Medium' | 'Low';
  nextFollowUp?: string;
  lastContact?: string;
  state?: string;
  district?: string;
  village?: string;
  googleMapsLink?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  scheduledDate: string;
  scheduledTime: string;
  type: 'Phone Call' | 'Site Visit' | 'DPR Discussion' | 'Proposal Review' | 'Loan Assistance';
  status: 'Pending' | 'Completed' | 'Overdue' | 'Rescheduled';
  priority: 'High' | 'Medium' | 'Low';
  notes: string;
}

export interface Customer {
  id: string;
  name: string;
  farmName: string;
  phone: string;
  email: string;
  location: string;
  state: string;
  capacity: number;
  shedType: 'Environment Controlled (EC)' | 'Open Sided / Deep Litter' | 'Automated Layer Cages';
  status: 'Active' | 'Batch In Progress' | 'Harvesting' | 'Under Maintenance';
  batchesCompleted: number;
  currentBatchBirds: number;
  joinedDate: string;
  integrationPartner: string;
}

export interface Partner {
  id: string;
  name: string;
  category: 'Feed Supplier' | 'Equipment & Automation' | 'Hatchery / DOC' | 'Veterinary & Pharma' | 'Bank / NBFC Partner' | 'Processing & Meat Off-taker';
  contactPerson: string;
  phone: string;
  email: string;
  location: string;
  status: 'Active' | 'Under Agreement' | 'Pending Review';
  commissionRate: string;
  rating: number;
}

export interface Employee {
  id: string;
  name: string;
  role: 'Super Admin' | 'Field Technical Supervisor' | 'Poultry Project Consultant' | 'Sales Manager' | 'Veterinary Doctor' | 'Accountant';
  department: 'Management' | 'Sales & CRM' | 'Field Operations' | 'Technical / Veterinary' | 'Finance';
  phone: string;
  email: string;
  status: 'Active' | 'On Field' | 'On Leave';
  activeLeadsCount: number;
}

export interface ProposalDPR {
  id: string;
  leadName: string;
  leadPhone: string;
  projectTitle: string;
  birdCapacity: number;
  totalCost: number;
  subsidyEligible: number;
  bankLoanAmount: number;
  farmerContribution: number;
  shedSizeSqFt: number;
  roiMonths: number;
  status: 'Draft' | 'Sent' | 'Under Review' | 'Accepted' | 'Rejected';
  createdDate: string;
}

export interface LoanApplication {
  id: string;
  applicantName: string;
  phone: string;
  bankName: string;
  scheme: 'NABARD Poultry Venture Capital' | 'AHIDF Scheme' | 'SBI Agri Poultry Loan' | 'PMAY Agri';
  appliedAmount: number;
  sanctionAmount?: number;
  status: 'Under Process' | 'Documents Verified' | 'Inspection Completed' | 'Sanctioned' | 'Disbursed';
  submissionDate: string;
  dprId?: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  category: 'Land 7/12 Records' | 'Electricity Sanction' | 'Pollution NOC' | 'DPR Report' | 'Bank Sanction' | 'Contract Agreement' | 'Architect Drawing';
  relatedEntity: string;
  uploadDate: string;
  fileSize: string;
  fileType: string;
  status: 'Verified' | 'Pending Verification' | 'Rejected';
}

export interface Task {
  id: string;
  title: string;
  subtitle: string;
  priority: 'High' | 'Medium' | 'Low';
  time: string;
  dueDate: string;
  completed: boolean;
  assignedTo?: string;
  category: 'Call' | 'Visit' | 'DPR' | 'Loan';
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'call' | 'inquiry' | 'dpr' | 'whatsapp' | 'meeting';
}
