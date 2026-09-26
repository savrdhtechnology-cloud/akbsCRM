import { AKBS_EC_20000_TEMPLATE } from './defaults';
import { SoftQuotation } from './types';

export type AiAction =
  | 'project-details'
  | 'overview'
  | 'scope'
  | 'technical'
  | 'cost-explanation'
  | 'exclusions'
  | 'commercial-notes'
  | 'customer-summary'
  | 'improve-language';

const missing = (q: SoftQuotation) => {
  const items: string[] = [];
  if (!q.projectType) items.push('Project Type');
  if (!q.projectCapacity) items.push('Capacity');
  if (!q.shedSize) items.push('Shed Size');
  if (!q.projectLocation) items.push('Project Location');
  return items;
};

export const deterministicAi = (action: AiAction, quotation: SoftQuotation) => {
  const confirmations = missing(quotation);
  const requires = confirmations.length ? confirmations : quotation.requiresConfirmation;

  if (action === 'project-details') {
    return {
      projectName: quotation.projectName || AKBS_EC_20000_TEMPLATE.name,
      projectType: quotation.projectType || AKBS_EC_20000_TEMPLATE.projectType,
      projectCapacity: quotation.projectCapacity || AKBS_EC_20000_TEMPLATE.capacity,
      projectUnit: quotation.projectUnit || AKBS_EC_20000_TEMPLATE.capacityUnit,
      shedSize: quotation.shedSize || AKBS_EC_20000_TEMPLATE.shedSize,
      coveredArea: quotation.coveredArea || AKBS_EC_20000_TEMPLATE.coveredArea,
      technology: quotation.technology || AKBS_EC_20000_TEMPLATE.technology,
      technicalSpecifications: quotation.technicalSpecifications,
      requiresConfirmation: requires
    };
  }

  const overview = `${quotation.projectName || 'Proposed poultry project'} is proposed for ${quotation.customer.customerName || 'the customer'} at ${quotation.projectLocation || 'Requires Confirmation'}. The preliminary configuration is ${quotation.projectCapacity || 'Requires Confirmation'} ${quotation.projectUnit || 'Birds'} with ${quotation.technology || 'Requires Confirmation'}. The specifications are based on the approved AKBS project template and remain subject to final site survey and engineering confirmation.`;

  const customerSummary = `AKBS proposes a preliminary ${quotation.projectType || 'poultry'} project for ${quotation.customer.customerName || 'the customer'}, with a planned capacity of ${quotation.projectCapacity || 'Requires Confirmation'} ${quotation.projectUnit || 'Birds'}. The current estimated project cost is ₹${quotation.grandTotal.toLocaleString('en-IN')}. This is an indicative planning estimate and will be finalized only after site survey, engineering review and confirmation of commercial scope.`;

  const costExplanation = `The estimated project cost is derived only from the editable cost components shown in this quotation. The current subtotal is ₹${quotation.subtotal.toLocaleString('en-IN')}, with GST/tax of ₹${quotation.taxAmount.toLocaleString('en-IN')}, other charges of ₹${quotation.otherCharges.toLocaleString('en-IN')} and discount of ₹${quotation.discount.toLocaleString('en-IN')}. No unconfigured market rate has been added by AI.`;

  const commercialNotes = `Commercial terms remain subject to confirmation. Quotation validity is ${quotation.commercialTerms.quotationValidity} days. Payment terms: ${quotation.commercialTerms.paymentTerms || 'Requires Confirmation'}. Taxes: ${quotation.commercialTerms.taxes || 'As applicable'}. Transportation: ${quotation.commercialTerms.transportation || 'Requires Confirmation'}. Warranty and delivery commitments must be confirmed by an authorized AKBS manager before issue.`;

  return {
    text:
      action === 'overview' ? overview :
      action === 'cost-explanation' ? costExplanation :
      action === 'commercial-notes' ? commercialNotes :
      action === 'customer-summary' ? customerSummary :
      action === 'scope' ? quotation.scopeOfWork.join('\n') :
      action === 'exclusions' ? quotation.exclusions.join('\n') :
      action === 'technical' ? [
        ...quotation.technicalSpecifications.shed,
        ...quotation.technicalSpecifications.environmentControl,
        ...quotation.technicalSpecifications.automation
      ].join('\n') :
      action === 'improve-language' ? overview :
      overview,
    requiresConfirmation: requires
  };
};

export const generateAiContent = async (action: AiAction, quotation: SoftQuotation) => {
  try {
    const response = await fetch('/api/soft-quotation-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        quotation,
        approvedTemplate: AKBS_EC_20000_TEMPLATE
      })
    });
    if (!response.ok) throw new Error('AI service unavailable');
    const data = await response.json();
    if (!data || data.error) throw new Error(data?.error || 'AI service unavailable');
    return data;
  } catch {
    return deterministicAi(action, quotation);
  }
};
