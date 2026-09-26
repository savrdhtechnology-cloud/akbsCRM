import { Customer, Lead, PortalRole } from '../../types';

export type SoftQuotationStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'ARCHIVED';

export interface SoftQuotationCustomer {
  crmCustomerId?: string;
  leadId?: string;
  customerName: string;
  companyName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  gstin: string;
  contactPerson: string;
  customerType: string;
}

export interface SoftQuotationCostItem {
  id: string;
  component: string;
  description: string;
  estimatedAmount: number;
  taxable?: boolean;
}

export interface SoftQuotationTimelineStage {
  id: string;
  stage: string;
  estimatedDays: number | null;
}

export interface SoftQuotationCommercialTerms {
  quotationValidity: number;
  paymentTerms: string;
  advancePercent: number | null;
  milestonePaymentPercent: number | null;
  finalPaymentPercent: number | null;
  taxes: string;
  transportation: string;
  warranty: string;
  installationTerms: string;
  deliveryTerms: string;
}

export interface SoftQuotationEconomics {
  enabled: boolean;
  birdCapacity: number | null;
  batchesPerYear: number | null;
  averagePlacement: number | null;
  mortalityPercent: number | null;
  averageSaleWeight: number | null;
  expectedFcr: number | null;
  feedConsumption: number | null;
  chickCost: number | null;
  feedCost: number | null;
  medicineVaccine: number | null;
  electricity: number | null;
  labour: number | null;
  litter: number | null;
  maintenance: number | null;
  otherOperatingExpenses: number | null;
  expectedSalePrice: number | null;
}

export interface SoftQuotationAcceptance {
  customerName: string;
  email: string;
  mobile: string;
  typedSignature: string;
  acceptedAt: string;
  acceptanceVersion: number;
  ipAddress?: string;
}

export interface SoftQuotationVersion {
  version: number;
  status: SoftQuotationStatus;
  createdBy: string;
  createdAt: string;
  snapshot: Omit<SoftQuotation, 'versions'>;
}

export interface SoftQuotation {
  id: string;
  quotationNo: string;
  version: number;
  acceptanceToken: string;
  status: SoftQuotationStatus;
  createdBy: string;
  createdByRole: PortalRole;
  createdAt: string;
  modifiedBy: string;
  modifiedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  archivedAt?: string;

  customer: SoftQuotationCustomer;

  projectName: string;
  projectType: string;
  projectLocation: string;
  projectCapacity: number;
  projectUnit: string;
  shedSize: string;
  coveredArea: string;
  technology: string;
  estimatedProjectCost: number;
  quotationValidity: number;
  validUntil: string;
  expectedCompletionTimeline: string;

  projectOverview: string;
  technicalSpecifications: {
    shed: string[];
    environmentControl: string[];
    automation: string[];
  };
  scopeOfWork: string[];
  exclusions: string[];
  executionTimeline: SoftQuotationTimelineStage[];
  commercialTerms: SoftQuotationCommercialTerms;
  projectEconomics: SoftQuotationEconomics;

  costBreakup: SoftQuotationCostItem[];
  gstPercent: number;
  otherCharges: number;
  discount: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;

  customerFriendlySummary: string;
  commercialNotes: string;
  requiresConfirmation: string[];
  acceptance?: SoftQuotationAcceptance;
  versions: SoftQuotationVersion[];
}

export interface SoftQuotationTemplate {
  id: string;
  code: string;
  name: string;
  projectType: string;
  capacity: number;
  capacityUnit: string;
  shedSize: string;
  coveredArea: string;
  technology: string;
  technicalSpecifications: SoftQuotation['technicalSpecifications'];
  scopeOfWork: string[];
  costBreakup: SoftQuotationCostItem[];
  exclusions: string[];
  executionTimeline: SoftQuotationTimelineStage[];
  commercialTerms: SoftQuotationCommercialTerms;
}

export interface SoftQuotationModuleProps {
  currentRole: PortalRole;
  currentUserName: string;
  customers: Customer[];
  leads: Lead[];
  onCreateCustomer: () => void;
  onConvertToProject?: (quotation: SoftQuotation) => void;
}
