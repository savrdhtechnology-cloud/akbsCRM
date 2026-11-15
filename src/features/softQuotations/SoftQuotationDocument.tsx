import React from 'react';
import { ECONOMICS_DISCLAIMER, DISCLAIMER_ONE, DISCLAIMER_TWO } from './defaults';
import { SoftQuotation } from './types';

interface Props {
  quotation: SoftQuotation;
  compact?: boolean;
}

const money = (value: number | null | undefined) =>
  value == null || Number.isNaN(Number(value))
    ? 'To be confirmed'
    : `₹ ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const valueOrConfirm = (value: string | number | null | undefined, suffix = '') =>
  value === null || value === undefined || value === '' ? 'Requires Confirmation' : `${value}${suffix}`;

const formatQuoteDate = (value: string | null | undefined) => {
  if (!value) return 'Requires Confirmation';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN');
};

const STANDARD_COST_DETAILS: Record<string,{qty:string;amount:number;description:string}> = {
  'Civil Work & Flooring': {
    qty: '12,000 sq.ft',
    amount: 1700000,
    description: 'Civil foundations and PCC/RCC flooring as per the approved AKBS 20,000 Birds EC preliminary template.'
  },
  'Steel Structural Work': {
    qty: 'Structural Package',
    amount: 2700000,
    description: 'Main columns, trusses, purlins, bracing and associated structural steel work as per approved AKBS specification.'
  },
  'Roofing & GI Sheets': {
    qty: 'Roofing Package',
    amount: 800000,
    description: '0.50 mm TCT colour-coated GI roofing sheets and associated roofing components.'
  },
  'Environment Control Equipment': {
    qty: 'EC Package',
    amount: 2000000,
    description: 'Tunnel ventilation, C-type cooling pad, 6 × 50-inch exhaust fans and digital climate-control equipment.'
  },
  'Utilities & Infrastructure': {
    qty: 'Project Utilities',
    amount: 2800000,
    description: 'Utilities and internal infrastructure included in the approved preliminary AKBS project estimate.'
  },
  'Contingency & Pre-operative Expenses': {
    qty: 'Lump Sum',
    amount: 2000000,
    description: 'Indicative contingency and pre-operative expenses included in the approved AKBS template.'
  }
};

const calculateContractFarmingReturn = (q: SoftQuotation) => {
  const capacity = Number(q.projectCapacity || 0);
  const investment = Number(q.grandTotal || 0);
  if (!capacity || !investment) return null;

  // AKBS soft-estimate assumptions for contract farming only.
  // These are planning assumptions, not guaranteed commercial terms.
  const lotsLow = 6;
  const lotsHigh = 7;
  const avgWeightLow = 2.25;
  const avgWeightHigh = 2.5;
  const payoutLow = 13;
  const payoutHigh = 15;

  const annualPayoutLow = capacity * avgWeightLow * payoutLow * lotsLow;
  const annualPayoutHigh = capacity * avgWeightHigh * payoutHigh * lotsHigh;
  const roiLow = (annualPayoutLow / investment) * 100;
  const roiHigh = (annualPayoutHigh / investment) * 100;

  return {
    capacity,
    investment,
    lotsLow,
    lotsHigh,
    avgWeightLow,
    avgWeightHigh,
    payoutLow,
    payoutHigh,
    annualPayoutLow,
    annualPayoutHigh,
    roiLow,
    roiHigh
  };
};

const calculateEconomics = (q: SoftQuotation) => {
  const e = q.projectEconomics;
  const required = [
    e.averagePlacement,
    e.mortalityPercent,
    e.averageSaleWeight,
    e.expectedSalePrice,
    e.chickCost,
    e.feedConsumption,
    e.feedCost
  ];
  if (required.some(v => v === null || v === undefined)) return null;
  const liveBirds = Number(e.averagePlacement) * (1 - Number(e.mortalityPercent) / 100);
  const saleKg = liveBirds * Number(e.averageSaleWeight);
  const revenue = saleKg * Number(e.expectedSalePrice);
  const operating =
    Number(e.averagePlacement) * Number(e.chickCost) +
    Number(e.feedConsumption) * Number(e.feedCost) +
    Number(e.medicineVaccine || 0) +
    Number(e.electricity || 0) +
    Number(e.labour || 0) +
    Number(e.litter || 0) +
    Number(e.maintenance || 0) +
    Number(e.otherOperatingExpenses || 0);
  const surplus = revenue - operating;
  const batches = e.batchesPerYear == null ? null : Number(e.batchesPerYear);
  return {
    revenue,
    operating,
    surplus,
    annualRevenue: batches == null ? null : revenue * batches,
    annualOperating: batches == null ? null : operating * batches,
    annualSurplus: batches == null ? null : surplus * batches
  };
};

export const SoftQuotationDocument: React.FC<Props> = ({ quotation, compact = false }) => {
  const economics = calculateEconomics(quotation);
  const contractReturn = calculateContractFarmingReturn(quotation);
  const totalCost = quotation.grandTotal || quotation.costBreakup.reduce((s,i)=>s+Number(i.estimatedAmount||0),0);
  const customerLocation = [quotation.customer.address, quotation.customer.city, quotation.customer.state, quotation.customer.country].filter(Boolean).join(', ') || quotation.projectLocation || 'Requires Confirmation';

  return (
    <article
      id="soft-quotation-pdf"
      className={`sq-document bg-white text-slate-900 mx-auto shadow-[0_18px_50px_rgba(15,23,42,.10)] print:shadow-none ${compact ? 'max-w-[980px]' : 'max-w-[1080px]'}`}
    >
      <section className="sq-page p-8 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b-2 border-[#073323] pb-5">
          <div>
            <div className="text-2xl font-black text-[#073323]">AKBS Poultry Farming Private Limited</div>
            <div className="mt-1 text-[11px] uppercase tracking-[.14em] font-bold text-emerald-700">Healthy Birds | Better Tomorrow</div>
            <div className="mt-2 text-xs text-slate-500">01 Rajaram House, Bamhori, Raisen (M.P.) – 464551</div>
            <div className="text-xs text-slate-500">akbspoultryfarming@gmail.com · www.akbspoultry.com</div>
          </div>
          <div className="text-left lg:text-right text-xs leading-6">
            <div className="text-[10px] uppercase tracking-[.12em] font-black text-emerald-700">SOFT PROJECT ESTIMATE</div>
            <div className="font-mono font-black text-slate-900">Ref : {quotation.quotationNo}</div>
            <div>Date: {formatQuoteDate(quotation.createdAt)} | Valid: {quotation.validUntil || 'Requires Confirmation'}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wide font-black text-slate-400">Quotation Prepared For</div>
            <div className="mt-2 text-xl font-black">{quotation.customer.customerName || 'Requires Confirmation'}</div>
            <div className="mt-2 text-sm text-slate-600">{quotation.customer.mobile || 'Mobile not provided'}</div>
            <div className="text-sm text-slate-500">{customerLocation}</div>
          </div>
          <div className="lg:border-l lg:pl-6">
            <div className="text-[10px] uppercase tracking-wide font-black text-slate-400">Technical Configuration</div>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
              <span className="text-slate-500">Flock Capacity</span><b>{quotation.projectCapacity.toLocaleString('en-IN')} {quotation.projectUnit}</b>
              <span className="text-slate-500">Poultry Segment</span><b>{quotation.projectType || 'Broiler'}</b>
              <span className="text-slate-500">Shed Type & Covered Area</span><b>{quotation.shedSize || 'Requires Confirmation'} · {quotation.coveredArea || 'Requires Confirmation'}</b>
              <span className="text-slate-500">Technology</span><b>{quotation.technology || 'Requires Confirmation'}</b>
            </div>
          </div>
        </div>

        <SectionTitle>Itemized Scope & Cost Breakdown</SectionTitle>
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#073323] text-white">
              <tr>
                <th className="p-3 text-left w-12">#</th>
                <th className="p-3 text-left">Scope of Work & Technical Specification</th>
                <th className="p-3 text-center w-40">Qty / Dim</th>
                <th className="p-3 text-right w-44">Estimated Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.costBreakup.map((item,index)=>{
                const standard = STANDARD_COST_DETAILS[item.component];
                const raw = item as any;
                const amount = Number(raw.estimatedAmount ?? raw.amount ?? standard?.amount ?? 0);
                const qty = raw.quantity || raw.unit || standard?.qty || 'Lump Sum';
                const description = item.description || standard?.description || 'As per approved AKBS preliminary template and final site requirements.';
                return (
                  <tr key={item.id || `${item.component}-${index}`} className="border-b last:border-b-0">
                    <td className="p-3 font-mono text-slate-400">{String(index+1).padStart(2,'0')}</td>
                    <td className="p-3">
                      <div className="font-bold">{item.component}</div>
                      <div className="mt-1 text-xs text-slate-500">{description}</div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">{qty}</td>
                    <td className="p-3 text-right font-mono font-black">{money(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50">
                <td colSpan={3} className="p-4 text-right font-black text-[#073323]">TOTAL ESTIMATED PROJECT OUTLAY</td>
                <td className="p-4 text-right font-mono text-xl font-black text-[#073323]">{money(totalCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 rounded-2xl bg-[#073323] text-white p-5">
          <div className="flex items-center justify-between gap-4 border-b border-emerald-700 pb-3">
            <div className="font-black">NABARD / Bank Loan Structuring & Feasibility</div>
            <div className="text-[10px] rounded-md bg-emerald-700 px-2 py-1 font-mono">General (25%)</div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DarkMetric label="Total Project Cost" value={money(totalCost)}/>
            <DarkMetric label="Indicative Margin (25%)" value={money(totalCost*0.25)}/>
            <DarkMetric label="Indicative Loan (75%)" value={money(totalCost*0.75)}/>
            <DarkMetric label="Project Capacity" value={`${quotation.projectCapacity.toLocaleString('en-IN')} ${quotation.projectUnit}`}/>
          </div>

          {contractReturn && (
            <>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <DarkMetric label="Standard Lots / Year" value={`${contractReturn.lotsLow}–${contractReturn.lotsHigh}`}/>
                <DarkMetric label="Payout Assumption" value={`₹${contractReturn.payoutLow}–₹${contractReturn.payoutHigh}/kg`}/>
                <DarkMetric label="Approx. Annual Earnings" value={`${money(contractReturn.annualPayoutLow)} – ${money(contractReturn.annualPayoutHigh)}`}/>
                <DarkMetric label="Indicative Gross ROI" value={`${contractReturn.roiLow.toFixed(1)}% – ${contractReturn.roiHigh.toFixed(1)}%`}/>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-700 bg-black/10 p-4 text-[11px] leading-5 text-emerald-50">
                <b>Standard calculation basis:</b> {contractReturn.capacity.toLocaleString('en-IN')} birds × average live weight {contractReturn.avgWeightLow}–{contractReturn.avgWeightHigh} kg × payout ₹{contractReturn.payoutLow}–₹{contractReturn.payoutHigh}/kg × {contractReturn.lotsLow}–{contractReturn.lotsHigh} lots/year.
                This gives the approximate annual contract-farming earning range. It is not guaranteed net profit; final net profit depends on electricity, labour, litter, maintenance, mortality, downtime, taxes and the final integrator settlement.
              </div>
            </>
          )}
        </div>

        <SectionTitle>Important Notes</SectionTitle>
        <div className="space-y-2 text-xs leading-6 text-slate-600">
          <p>1. <b>Nature of Document:</b> This is a preliminary soft quotation / rough budget estimate for project planning, farmer discussions and initial bank feasibility. Final detailed project report (DPR) and final commercial quotation will be prepared after detailed site verification.</p>
          <p>2. <b>Validity:</b> The quoted prices are tentative and valid for the configured validity period from the date of issue.</p>
          <p>3. <b>Civil Land & Utilities:</b> Site-specific civil requirements, electricity, water connection and external infrastructure may change after physical site assessment.</p>
          <p>4. <b>Loan / Subsidy Support:</b> AKBS may assist with DPR preparation and bank-loan documentation under applicable schemes; eligibility and sanction remain subject to the concerned authority / lender.</p>
        </div>

        <div className="mt-8 border-t pt-5 flex flex-col sm:flex-row justify-between gap-4 text-xs text-slate-500">
          <div>
            <b className="text-slate-800">Prepared by:</b>
            <div className="font-semibold text-slate-700">Technical Sales Engineering Team</div>
            <div>AKBS Poultry Farming Private Limited</div>
          </div>
          <div className="sm:text-right">
            <b className="text-slate-800">{quotation.status === 'APPROVED' ? 'Verified / Approved by:' : 'Manager Review:'}</b>
            <div className="font-semibold text-slate-700">{quotation.approvedBy || 'Pending manager approval'}</div>
            <div>{quotation.status === 'APPROVED' ? 'Authorized Signatory' : quotation.status}</div>
          </div>
        </div>
      </section>

      <style>{`
        .sq-page { background:white; }
        @media print {
          body * { visibility:hidden !important; }
          #soft-quotation-pdf, #soft-quotation-pdf * { visibility:visible !important; }
          #soft-quotation-pdf { position:absolute; inset:0; width:210mm; max-width:none; box-shadow:none; }
          .sq-page { width:210mm; padding:12mm 14mm !important; }
        }
      `}</style>
    </article>
  );
};

const DarkMetric: React.FC<{label:string;value:string}> = ({label,value}) => (
  <div className="rounded-xl border border-white/15 bg-white/5 p-4">
    <div className="text-[10px] uppercase tracking-wide text-emerald-200 font-bold">{label}</div>
    <div className="mt-1 text-base font-black">{value}</div>
  </div>
);

const LightMetric: React.FC<{label:string;value:string}> = ({label,value}) => (
  <div className="rounded-xl border border-emerald-100 bg-white p-4">
    <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-bold">{label}</div>
    <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
  </div>
);

const SpecCard: React.FC<{title:string;items:string[]}> = ({title,items}) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <div className="font-black text-[#073323]">{title}</div>
    <div className="mt-3 space-y-2">
      {(items || []).map((item,index)=><div key={index} className="flex gap-2 text-xs text-slate-600"><span className="text-emerald-600 font-black">✓</span><span>{item}</span></div>)}
    </div>
  </div>
);

const DocHeader: React.FC<{ title: string; quotation: SoftQuotation }> = ({ title, quotation }) => (
  <div className="flex items-end justify-between border-b-2 border-[#073323] pb-3 mb-7">
    <div><div className="text-[10px] uppercase tracking-[.18em] font-black text-emerald-700">AKBS Poultry Farming Private Limited</div><h2 className="mt-1 text-xl font-black tracking-tight">{title}</h2></div>
    <div className="text-right text-[10px] font-mono text-slate-500">{quotation.quotationNo}<br/>Version {quotation.version}</div>
  </div>
);

const SectionTitle: React.FC<React.PropsWithChildren> = ({ children }) => (
  <h3 className="mt-9 mb-4 text-sm font-black uppercase tracking-[.1em] text-[#073323] border-l-4 border-amber-400 pl-3">{children}</h3>
);

const InfoCard: React.FC<{ title?: string; rows: Array<[string, string | number | null | undefined]> }> = ({ title, rows }) => (
  <div className="rounded-xl border border-slate-200 p-5">
    {title && <div className="font-black text-[#073323] mb-4">{title}</div>}
    <div className="space-y-2.5">
      {rows.map(([label, value]) => <div key={label} className="grid grid-cols-[140px_1fr] gap-3 text-sm"><span className="text-slate-400">{label}</span><span className="font-semibold">{value === null || value === undefined || value === '' ? 'Requires Confirmation' : value}</span></div>)}
    </div>
  </div>
);

const CheckLine: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="text-sm text-slate-600 flex gap-2"><span className="text-emerald-600 font-black">✓</span><span>{children}</span></div>
);

const SpecBlock: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="mb-7">
    <h3 className="text-base font-black text-[#073323] mb-3">{title}</h3>
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, index) => <div key={index} className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700">{item}</div>)}
    </div>
  </div>
);

const TotalLine: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex justify-between border-b px-2 py-2"><span className="text-slate-500">{label}</span><span className="font-mono font-bold">{value < 0 ? '- ' : ''}{money(Math.abs(value))}</span></div>
);
