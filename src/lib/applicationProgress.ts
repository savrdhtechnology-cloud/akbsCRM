export type ProgressStatus = 'completed' | 'in_progress' | 'pending' | 'locked' | 'action_required';

export type ProgressStage = {
  id: string;
  title: string;
  description?: string;
  percentage: number;
  status: ProgressStatus;
  completedFields?: number;
  totalRequiredFields?: number;
  lastUpdated?: string;
};

const filled = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value;
  return value !== undefined && value !== null && String(value).trim() !== '';
};

export const percentageFromFields = (values: unknown[]) => {
  if (!values.length) return 0;
  return Math.round((values.filter(filled).length / values.length) * 100);
};

export const statusFromPercentage = (
  percentage: number,
  locked = false,
  actionRequired = false
): ProgressStatus => {
  if (actionRequired) return 'action_required';
  if (locked) return 'locked';
  if (percentage >= 100) return 'completed';
  if (percentage > 0) return 'in_progress';
  return 'pending';
};

export const overallProgress = (stages: ProgressStage[]) =>
  stages.length ? Math.round(stages.reduce((sum, stage) => sum + stage.percentage, 0) / stages.length) : 0;

export const customerApplicationProgress = (form: Record<string, any>): ProgressStage[] => {
  const defs = [
    {
      id: 'basic',
      title: 'Basic Details',
      description: 'Name, mobile, WhatsApp, email and language',
      fields: [form.fullName, form.mobileNumber, form.email, form.preferredLanguage]
    },
    {
      id: 'project',
      title: 'Project Details',
      description: 'Project objective, poultry type, shed and capacity',
      fields: [form.projectObjective, form.poultryType, form.shedType, form.proposedCapacity]
    },
    {
      id: 'land',
      title: 'Land Details',
      description: 'Availability, ownership, area and project location',
      fields: [form.hasLand, form.landOwnership, form.landAreaAcres, form.villageOrCity, form.district, form.state, form.googleMapsLink]
    },
    {
      id: 'financial',
      title: 'Financial Details',
      description: 'Project cost, contribution and financing requirement',
      fields: [form.approxProjectCost, form.needsLoan, form.ownContribution, form.needsLoan === 'Yes' ? form.approxLoanAmount : 'not-required', form.discussedWithBank]
    },
    {
      id: 'support',
      title: 'Experience & Support',
      description: 'Experience, support requirements and project timeline',
      fields: [form.experience, Array.isArray(form.supportNeeded) && form.supportNeeded.length ? form.supportNeeded : '', form.startTimeline]
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Declaration, final review and application submission',
      fields: [form.declarationConfirmed]
    }
  ];

  let previousComplete = true;
  return defs.map((def) => {
    const completedFields = def.fields.filter(filled).length;
    const totalRequiredFields = def.fields.length;
    const percentage = totalRequiredFields ? Math.round((completedFields / totalRequiredFields) * 100) : 0;
    const locked = !previousComplete;
    const status = statusFromPercentage(percentage, locked);
    previousComplete = previousComplete && percentage === 100;
    return { ...def, percentage, status, completedFields, totalRequiredFields };
  });
};

export const crmLeadProgress = (lead: Record<string, any>): ProgressStage[] => {
  const form = {
    fullName: lead.name,
    mobileNumber: lead.phone,
    email: lead.email,
    preferredLanguage: lead.language,
    projectObjective: lead.projectObjective || lead.projectType,
    poultryType: lead.projectType,
    shedType: lead.shedType,
    proposedCapacity: lead.birdCapacity,
    hasLand: lead.landAvailable,
    landOwnership: lead.landOwnership,
    landAreaAcres: lead.landArea,
    villageOrCity: lead.village || lead.location,
    district: lead.district,
    state: lead.state,
    googleMapsLink: lead.googleMapsLink,
    approxProjectCost: lead.estimatedCost || lead.budgetEstimate,
    needsLoan: lead.loanRequired,
    ownContribution: lead.ownContribution,
    approxLoanAmount: lead.approxLoanAmount,
    discussedWithBank: lead.discussedWithBank,
    experience: lead.experience,
    supportNeeded: lead.supportNeeded,
    startTimeline: lead.timeline,
    declarationConfirmed: lead.applicationEligible === true
  };
  const stages = customerApplicationProgress(form);

  const stageOrder: Record<string, number> = {
    New: 0,
    Contacted: 1,
    Qualified: 1,
    'Site Visit': 2,
    DPR: 3,
    'Proposal Sent': 3,
    'Loan Processing': 4,
    Converted: 5
  };
  const minimumStage = stageOrder[lead.status] ?? 0;

  return stages.map((stage, index) => {
    if (index < minimumStage) return { ...stage, percentage: 100, status: 'completed' as const };
    if (index === minimumStage && stage.percentage === 0 && minimumStage > 0) {
      return { ...stage, percentage: 20, status: 'in_progress' as const };
    }
    return stage;
  });
};

export const partnerOnboardingProgress = (form: Record<string, any>, submitted = false): ProgressStage[] => {
  const defs = [
    { id:'profile', title:'Partner Profile', description:'Identity and contact details', fields:[form.fullName, form.mobile, form.email] },
    { id:'company', title:'KYC & Company Details', description:'Business and firm information', fields:[form.businessName, form.profession, form.experience] },
    { id:'territory', title:'Territory & Product Selection', description:'Location and partner category', fields:[form.city, form.state, form.category] },
    { id:'lead-setup', title:'Lead Generation Setup', description:'Referral and lead preferences', fields:[form.message] },
    { id:'agreement', title:'Agreement & Banking', description:'Partner agreement and payout setup', fields:[submitted ? 'submitted' : ''] },
    { id:'activate', title:'Review & Activate', description:'Final AKBS review and activation', fields:[submitted ? 'submitted' : ''] }
  ];
  let previousComplete = true;
  return defs.map((def) => {
    const completedFields=def.fields.filter(filled).length;
    const totalRequiredFields=def.fields.length;
    const percentage=Math.round((completedFields/totalRequiredFields)*100);
    const locked=!previousComplete;
    const status=statusFromPercentage(percentage, locked);
    previousComplete=previousComplete && percentage===100;
    return {...def,percentage,status,completedFields,totalRequiredFields};
  });
};
