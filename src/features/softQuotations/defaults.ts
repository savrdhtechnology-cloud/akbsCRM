import { SoftQuotation, SoftQuotationTemplate } from './types';

const line = (id: string, component: string, estimatedAmount: number, description = '') => ({
  id, component, estimatedAmount, description, taxable: false
});

export const AKBS_EC_20000_TEMPLATE: SoftQuotationTemplate = {
  id: 'akbs-ec-broiler-20000',
  code: 'AKBS-EC-BROILER-20000',
  name: '20,000 Birds Environment Controlled Broiler Farm',
  projectType: 'Environment Controlled Broiler Farm',
  capacity: 20000,
  capacityUnit: 'Birds',
  shedSize: '300 ft × 40 ft',
  coveredArea: '12,000 Sq.ft.',
  technology: 'Environment Controlled / Tunnel Ventilation',
  technicalSpecifications: {
    shed: [
      'Side Wall: 8 ft',
      'Ridge Height: Approx. 14.5 ft',
      'PCC/RCC Flooring',
      'Main Column: ISMC 150',
      'Column Spacing: 20 ft C/C',
      'Truss: 16 Nos.',
      'Bottom Chord: 2L 65×65×6 mm',
      'Top Chord: 2L 65×65×6 mm',
      'Web Members: L 50×50×5 mm',
      'Z-Purlin: 1.6 / 2 mm',
      'Roof Sheet: 0.50 mm TCT Colour Coated GI',
      'Bracing: L 50×50×5 mm',
      'Sag Rod: 16 mm Dia.'
    ],
    environmentControl: [
      'Tunnel Ventilation',
      'C-Type Cooling Pad',
      '6 × 50" Exhaust Fans',
      'Digital Climate Control Panel',
      'Temperature & Humidity Control'
    ],
    automation: [
      '4 Automatic Feed Lines',
      '4 Automatic Nipple Drinking Lines',
      'Automatic Climate Control',
      'LED Lighting System'
    ]
  },
  scopeOfWork: [
    'Site Survey',
    'Farm Design',
    'Project Planning',
    'DPR Preparation',
    'Loan / Funding Assistance',
    'Civil Work Coordination',
    'Steel Structure',
    'Environment Control Equipment',
    'Equipment Installation',
    'Testing',
    'Commissioning',
    'Operator Training',
    'Integration Support'
  ],
  costBreakup: [
    line('civil', 'Civil Work & Flooring', 1700000),
    line('steel', 'Steel Structural Work', 2700000),
    line('roofing', 'Roofing & GI Sheets', 800000),
    line('environment', 'Environment Control Equipment', 2000000),
    line('utilities', 'Utilities & Infrastructure', 2800000),
    line('contingency', 'Contingency & Pre-operative Expenses', 2000000)
  ],
  exclusions: [
    'Land Cost',
    'Statutory Permissions / Government Charges',
    'Electricity Connection Charges',
    'Transformer / DG if not specifically included',
    'Borewell / Major External Water Development',
    'Working Capital',
    'Chicks',
    'Feed',
    'Medicine / Vaccination',
    'Interest During Construction',
    'Bank Processing Charges',
    'Legal Charges',
    'Transportation where not included',
    'GST / Taxes as applicable'
  ],
  executionTimeline: [
    { id: 'survey', stage: 'Site Survey & Requirement Assessment', estimatedDays: null },
    { id: 'design', stage: 'Project Design & DPR', estimatedDays: null },
    { id: 'commercial', stage: 'Commercial Confirmation', estimatedDays: null },
    { id: 'procurement', stage: 'Procurement', estimatedDays: null },
    { id: 'civil', stage: 'Civil & Structural Work', estimatedDays: null },
    { id: 'installation', stage: 'Equipment Installation', estimatedDays: null },
    { id: 'testing', stage: 'Testing & Commissioning', estimatedDays: null },
    { id: 'handover', stage: 'Training & Handover', estimatedDays: null }
  ],
  commercialTerms: {
    quotationValidity: 30,
    paymentTerms: 'Requires Confirmation',
    advancePercent: null,
    milestonePaymentPercent: null,
    finalPaymentPercent: null,
    taxes: 'As applicable',
    transportation: 'Requires Confirmation',
    warranty: 'Requires Confirmation',
    installationTerms: 'Requires Confirmation',
    deliveryTerms: 'Requires Confirmation'
  }
};

export const DISCLAIMER_ONE =
  'This Soft Quotation is a preliminary project estimate prepared for discussion and planning purposes. The estimated project cost and specifications are subject to final site survey, engineering design, material specifications, prevailing market rates and confirmation of the final scope of work.';

export const DISCLAIMER_TWO =
  'This document does not constitute a final commercial contract or binding purchase order.';

export const ECONOMICS_DISCLAIMER =
  'Project economics are indicative and depend on prevailing market prices, integration terms, production performance, mortality, feed conversion, selling price and actual operating conditions.';

export const recalculateTotals = (quotation: SoftQuotation): SoftQuotation => {
  const subtotal = quotation.costBreakup.reduce((sum, item) => sum + Math.max(0, Number(item.estimatedAmount) || 0), 0);
  const taxAmount = subtotal * Math.max(0, Number(quotation.gstPercent) || 0) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount + Math.max(0, quotation.otherCharges || 0) - Math.max(0, quotation.discount || 0));
  return {
    ...quotation,
    subtotal,
    taxAmount,
    grandTotal,
    estimatedProjectCost: grandTotal
  };
};

export const createBlankQuotation = (
  id: string,
  quotationNo: string,
  role: SoftQuotation['createdByRole'],
  userName: string
): SoftQuotation => {
  const now = new Date();
  const valid = new Date(now);
  valid.setDate(valid.getDate() + AKBS_EC_20000_TEMPLATE.commercialTerms.quotationValidity);

  const base: SoftQuotation = {
    id,
    quotationNo,
    version: 1,
    acceptanceToken: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now(),
    status: 'DRAFT',
    createdBy: userName,
    createdByRole: role,
    createdAt: now.toISOString(),
    modifiedBy: userName,
    modifiedAt: now.toISOString(),
    customer: {
      customerName: '',
      companyName: '',
      mobile: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      gstin: '',
      contactPerson: '',
      customerType: 'Farmer / Project Owner'
    },
    projectName: AKBS_EC_20000_TEMPLATE.name,
    projectType: AKBS_EC_20000_TEMPLATE.projectType,
    projectLocation: '',
    projectCapacity: AKBS_EC_20000_TEMPLATE.capacity,
    projectUnit: AKBS_EC_20000_TEMPLATE.capacityUnit,
    shedSize: AKBS_EC_20000_TEMPLATE.shedSize,
    coveredArea: AKBS_EC_20000_TEMPLATE.coveredArea,
    technology: AKBS_EC_20000_TEMPLATE.technology,
    estimatedProjectCost: 12000000,
    quotationValidity: 30,
    validUntil: valid.toISOString().slice(0, 10),
    expectedCompletionTimeline: 'Requires Confirmation',
    projectOverview: '',
    technicalSpecifications: JSON.parse(JSON.stringify(AKBS_EC_20000_TEMPLATE.technicalSpecifications)),
    scopeOfWork: [...AKBS_EC_20000_TEMPLATE.scopeOfWork],
    exclusions: [...AKBS_EC_20000_TEMPLATE.exclusions],
    executionTimeline: AKBS_EC_20000_TEMPLATE.executionTimeline.map(x => ({ ...x })),
    commercialTerms: { ...AKBS_EC_20000_TEMPLATE.commercialTerms },
    projectEconomics: {
      enabled: false,
      birdCapacity: 20000,
      batchesPerYear: null,
      averagePlacement: null,
      mortalityPercent: null,
      averageSaleWeight: null,
      expectedFcr: null,
      feedConsumption: null,
      chickCost: null,
      feedCost: null,
      medicineVaccine: null,
      electricity: null,
      labour: null,
      litter: null,
      maintenance: null,
      otherOperatingExpenses: null,
      expectedSalePrice: null
    },
    costBreakup: AKBS_EC_20000_TEMPLATE.costBreakup.map(x => ({ ...x })),
    gstPercent: 0,
    otherCharges: 0,
    discount: 0,
    subtotal: 12000000,
    taxAmount: 0,
    grandTotal: 12000000,
    customerFriendlySummary: '',
    commercialNotes: '',
    requiresConfirmation: ['Expected completion timeline', 'Commercial payment terms', 'Warranty', 'Delivery terms'],
    versions: []
  };
  return recalculateTotals(base);
};
