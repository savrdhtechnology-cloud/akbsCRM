import { PortalRole } from '../../types';
import { recalculateTotals } from './defaults';
import { SoftQuotation, SoftQuotationStatus } from './types';

const STORAGE_KEY = 'akbs.crm.softQuotations.v2';
const SEQUENCE_KEY = 'akbs.crm.softQuotations.sequence.v2';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const loadSoftQuotations = (): SoftQuotation[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as SoftQuotation[];
    const today = new Date().toISOString().slice(0, 10);
    return data.map(q => q.status !== 'ACCEPTED' && q.status !== 'ARCHIVED' && q.validUntil && q.validUntil < today
      ? { ...q, status: 'EXPIRED' as const }
      : q
    );
  } catch {
    return [];
  }
};

export const persistSoftQuotations = (quotes: SoftQuotation[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
};

export const nextQuotationNumber = () => {
  const year = new Date().getFullYear();
  const key = `${SEQUENCE_KEY}.${year}`;
  const current = Number(window.localStorage.getItem(key) || '0') + 1;
  window.localStorage.setItem(key, String(current));
  return `AKBS-SQ-${year}-${String(current).padStart(4, '0')}`;
};

const contentFingerprint = (quote: SoftQuotation) => JSON.stringify({
  customer: quote.customer,
  projectName: quote.projectName,
  projectType: quote.projectType,
  projectLocation: quote.projectLocation,
  projectCapacity: quote.projectCapacity,
  projectUnit: quote.projectUnit,
  shedSize: quote.shedSize,
  coveredArea: quote.coveredArea,
  technology: quote.technology,
  projectOverview: quote.projectOverview,
  technicalSpecifications: quote.technicalSpecifications,
  scopeOfWork: quote.scopeOfWork,
  costBreakup: quote.costBreakup,
  exclusions: quote.exclusions,
  commercialTerms: quote.commercialTerms,
  projectEconomics: quote.projectEconomics,
  executionTimeline: quote.executionTimeline,
  gstPercent: quote.gstPercent,
  otherCharges: quote.otherCharges,
  discount: quote.discount,
  customerFriendlySummary: quote.customerFriendlySummary,
  commercialNotes: quote.commercialNotes
});

export const saveSoftQuotation = (
  existing: SoftQuotation[],
  input: SoftQuotation,
  actor: string,
  role: PortalRole
): SoftQuotation[] => {
  const current = existing.find(q => q.id === input.id);
  let next = recalculateTotals({ ...clone(input), modifiedBy: actor, modifiedAt: new Date().toISOString() });

  if (current) {
    const issued = ['APPROVED', 'SENT', 'VIEWED'] as SoftQuotationStatus[];
    const changed = contentFingerprint(current) !== contentFingerprint(next);
    if (issued.includes(current.status) && changed) {
      const snapshot = clone(current);
      const { versions: _ignore, ...withoutVersions } = snapshot;
      next = {
        ...next,
        version: current.version + 1,
        status: 'DRAFT',
        approvedBy: undefined,
        approvedAt: undefined,
        sentAt: undefined,
        viewedAt: undefined,
        versions: [
          ...(current.versions || []),
          {
            version: current.version,
            status: current.status,
            createdBy: current.modifiedBy || current.createdBy,
            createdAt: current.modifiedAt || current.createdAt,
            snapshot: withoutVersions
          }
        ]
      };
    } else {
      next.versions = current.versions || [];
    }
    return existing.map(q => q.id === next.id ? next : q);
  }

  return [next, ...existing];
};

export const changeQuotationStatus = (
  quotes: SoftQuotation[],
  id: string,
  status: SoftQuotationStatus,
  actor: string,
  role: PortalRole,
  reason?: string
) => quotes.map(q => {
  if (q.id !== id) return q;
  if (role === 'employee' && ['APPROVED', 'ACCEPTED'].includes(status)) return q;
  const now = new Date().toISOString();
  return {
    ...q,
    status,
    modifiedBy: actor,
    modifiedAt: now,
    approvedBy: status === 'APPROVED' ? actor : q.approvedBy,
    approvedAt: status === 'APPROVED' ? now : q.approvedAt,
    rejectedBy: status === 'REJECTED' ? actor : q.rejectedBy,
    rejectedAt: status === 'REJECTED' ? now : q.rejectedAt,
    rejectionReason: status === 'REJECTED' ? reason || 'Requires revision' : q.rejectionReason,
    sentAt: status === 'SENT' ? now : q.sentAt,
    viewedAt: status === 'VIEWED' ? now : q.viewedAt,
    acceptedAt: status === 'ACCEPTED' ? now : q.acceptedAt,
    archivedAt: status === 'ARCHIVED' ? now : q.archivedAt
  };
});

export const duplicateSoftQuotation = (
  quotes: SoftQuotation[],
  source: SoftQuotation,
  actor: string,
  role: PortalRole
) => {
  const now = new Date().toISOString();
  const copy: SoftQuotation = {
    ...clone(source),
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now(),
    quotationNo: nextQuotationNumber(),
    version: 1,
    acceptanceToken: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now(),
    status: 'DRAFT',
    createdBy: actor,
    createdByRole: role,
    createdAt: now,
    modifiedBy: actor,
    modifiedAt: now,
    approvedBy: undefined,
    approvedAt: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
    sentAt: undefined,
    viewedAt: undefined,
    acceptedAt: undefined,
    archivedAt: undefined,
    acceptance: undefined,
    versions: []
  };
  return [copy, ...quotes];
};
