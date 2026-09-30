export const INITIAL_SERVICE = 'Initial Project Assessment & Registration Fee';
export const validApplicationId = (value: unknown) => /^AKBS-\d{4}-\d{6}$/.test(String(value || '').trim());
export const paymentReferenceKey = (value: unknown) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isRegistrationFee = (value: unknown) => /^(initial (project assessment & )?registration fee|registration fee)$/i.test(String(value || '').trim());

export function applicationEligible(lead: any): boolean {
  if (typeof lead?.applicationEligible === 'boolean') return lead.applicationEligible && validApplicationId(lead.reference);
  // A website inquiry has a CRM reference too; that reference is not a submitted application.
  return validApplicationId(lead?.reference) && ['CUSTOMER_PORTAL', 'CUSTOMER'].includes(String(lead?.source)) && Object.keys(lead?.details?.portal_form || lead?.details?.formData || {}).length > 0;
}

export function collectionRows(data: any, manualRows: any[] = []) {
  const portal = (data?.rows || []).filter((r: any) => r.applicationEligible !== false && validApplicationId(r.applicationId)).map((r: any) => {
    const payable = Number(r.payable ?? r.amount ?? data?.config?.payableFee ?? 0);
    const amount = Number(r.baseAmount ?? data?.config?.baseFee ?? payable);
    return {
      ...r, id: 'portal-' + r.leadId, kind: 'portal', status:String(r.status||'PENDING').toUpperCase(), serviceType: r.serviceType || INITIAL_SERVICE,
      amount, discount: Number(r.discount ?? Math.max(0, amount - payable)), payable,
      paymentMethod: r.paymentMethod || (r.reference ? 'Customer Submitted' : '—'),
      transactionRef: r.reference || '', createdAt: r.submittedAt || r.createdAt,
      receiptDate: r.verifiedAt || r.updatedAt || r.submittedAt || r.createdAt
    };
  });
  const registrationLeads = new Set(portal.map((r: any) => r.leadId));
  const ids = new Set(portal.map((r: any) => r.transactionId).filter(Boolean));
  const references = new Set(portal.filter((r: any) => paymentReferenceKey(r.transactionRef)).map((r: any) => `${r.leadId}:${paymentReferenceKey(r.transactionRef)}`));
  const manual = manualRows.filter(r => {
    if (isRegistrationFee(r.serviceType) && (!validApplicationId(r.applicationId) || r.applicationEligible === false || registrationLeads.has(r.leadId))) return false;
    const ref = paymentReferenceKey(r.transactionRef);
    const key = `${r.leadId}:${ref}`;
    if (ids.has(r.id) || ref && references.has(key)) return false;
    if (ref) references.add(key);
    ids.add(r.id);
    return true;
  }).map(r => ({...r, id: 'manual-' + r.id, transactionId: r.id, kind: 'manual', status:String(r.status||'PENDING').toUpperCase(), receiptDate: r.verifiedAt || r.updatedAt || r.createdAt}));
  return [...portal, ...manual].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

export function collectionActions(row: any, role: string) {
  const status = String(row.status || '').toUpperCase();
  const finance = ['ADMIN', 'FINANCE'].includes(role.toUpperCase());
  const verification = ['UNDER_REVIEW', 'PROOF_SUBMITTED', 'PENDING_VERIFICATION'].includes(status);
  return {
    reminder: row.kind === 'portal' && validApplicationId(row.applicationId) && status === 'PENDING',
    proof: finance && Boolean(row.proofPath),
    verify: finance && verification,
    receipt: status === 'VERIFIED',
    emailReceipt: finance && row.kind === 'portal' && status === 'VERIFIED'
  };
}
