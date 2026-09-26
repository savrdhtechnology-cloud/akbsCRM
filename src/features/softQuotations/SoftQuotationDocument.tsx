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
  return (
    <article
      id="soft-quotation-pdf"
      className={`sq-document bg-white text-slate-900 mx-auto shadow-[0_18px_50px_rgba(15,23,42,.10)] print:shadow-none ${compact ? 'max-w-[860px]' : 'max-w-[900px]'}`}
    >
      <section className="sq-page min-h-[1120px] p-10 sm:p-14 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-8 border-b-4 border-[#073323] pb-6">
            <div>
              <div className="text-[11px] uppercase tracking-[.22em] font-black text-emerald-800">AKBS Poultry Farming Private Limited</div>
              <h1 className="mt-8 text-5xl font-black tracking-[-.045em] text-slate-950 leading-[1.02]">SOFT QUOTATION</h1>
              <div className="mt-2 text-xl font-bold text-slate-500 tracking-[.02em]">PRELIMINARY PROJECT ESTIMATE</div>
            </div>
            <div className="text-right text-xs leading-6">
              <div className="font-mono font-black text-emerald-900">{quotation.quotationNo}</div>
              <div>Version {quotation.version}</div>
              <div>Status: <b>{quotation.status}</b></div>
              <div>Valid until: <b>{quotation.validUntil || 'Requires Confirmation'}</b></div>
            </div>
          </div>

          <div className="mt-20">
            <div className="text-xs uppercase tracking-[.2em] font-black text-slate-400">Project</div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-[#073323]">{quotation.projectName}</h2>
            <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
              <div>
                <div className="text-slate-400">Prepared for</div>
                <div className="mt-1 text-xl font-bold">{quotation.customer.customerName || 'Requires Confirmation'}</div>
                <div className="mt-1 text-slate-600">{quotation.customer.companyName}</div>
                <div className="text-slate-500">{quotation.customer.city}{quotation.customer.state ? `, ${quotation.customer.state}` : ''}</div>
              </div>
              <div className="rounded-2xl bg-[#f1f7f4] border border-emerald-100 p-6">
                <div className="text-slate-500">Project Capacity</div>
                <div className="mt-1 text-2xl font-black text-[#073323]">{quotation.projectCapacity.toLocaleString('en-IN')} {quotation.projectUnit}</div>
                <div className="mt-4 text-slate-500">Estimated Project Cost</div>
                <div className="mt-1 text-2xl font-black text-[#073323]">{money(quotation.grandTotal)}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-amber-700">Indicative estimate — not final price</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-4 text-[11px] text-slate-500">
            <div><b className="text-slate-700">Office:</b><br/>01 Rajaram House, Bamhori, Raisen (M.P.) – 464551</div>
            <div><b className="text-slate-700">Email:</b><br/>akbspoultryfarming@gmail.com</div>
            <div><b className="text-slate-700">Website:</b><br/>www.Akbspoultry.com</div>
          </div>
          <div className="mt-8 text-xs leading-6 text-slate-500 border-t pt-6">{DISCLAIMER_ONE}</div>
        </div>
      </section>

      <section className="sq-page p-10 sm:p-14">
        <DocHeader title="Customer Details & Project Overview" quotation={quotation} />
        <div className="grid grid-cols-2 gap-6">
          <InfoCard title="Customer Details" rows={[
            ['Customer', quotation.customer.customerName],
            ['Company', quotation.customer.companyName],
            ['Mobile', quotation.customer.mobile],
            ['Email', quotation.customer.email],
            ['Contact Person', quotation.customer.contactPerson],
            ['Address', [quotation.customer.address, quotation.customer.city, quotation.customer.state, quotation.customer.country].filter(Boolean).join(', ')],
            ['GSTIN', quotation.customer.gstin],
            ['Customer Type', quotation.customer.customerType]
          ]}/>
          <InfoCard title="Project Overview" rows={[
            ['Project Type', quotation.projectType],
            ['Location', quotation.projectLocation],
            ['Capacity', `${quotation.projectCapacity.toLocaleString('en-IN')} ${quotation.projectUnit}`],
            ['Shed Size', quotation.shedSize],
            ['Covered Area', quotation.coveredArea],
            ['Technology', quotation.technology],
            ['Timeline', quotation.expectedCompletionTimeline]
          ]}/>
        </div>
        <SectionTitle>Project Overview</SectionTitle>
        <p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">{quotation.projectOverview || 'Requires Confirmation'}</p>

        <SectionTitle>AKBS Scope of Services / Project Support</SectionTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {quotation.scopeOfWork.map((item, index) => <CheckLine key={index}>{item}</CheckLine>)}
        </div>
      </section>

      <section className="sq-page p-10 sm:p-14">
        <DocHeader title="Technical Specifications" quotation={quotation} />
        <SpecBlock title="Civil & Structural Specifications" items={quotation.technicalSpecifications.shed}/>
        <SpecBlock title="Environment Control System" items={quotation.technicalSpecifications.environmentControl}/>
        <SpecBlock title="Automation & Equipment" items={quotation.technicalSpecifications.automation}/>
      </section>

      <section className="sq-page p-10 sm:p-14">
        <DocHeader title="Cost Estimate" quotation={quotation} />
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#073323] text-white">
              <tr><th className="p-3 text-left w-12">#</th><th className="p-3 text-left">Component</th><th className="p-3 text-right w-44">Estimated Amount</th></tr>
            </thead>
            <tbody>
              {quotation.costBreakup.map((item, index) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="p-3 font-mono text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                  <td className="p-3"><div className="font-bold">{item.component}</div>{item.description && <div className="text-xs text-slate-500 mt-1">{item.description}</div>}</td>
                  <td className="p-3 text-right font-mono font-bold">{money(item.estimatedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 ml-auto max-w-md text-sm">
          <TotalLine label="Subtotal" value={quotation.subtotal}/>
          <TotalLine label={`Tax / GST (${quotation.gstPercent || 0}%)`} value={quotation.taxAmount}/>
          <TotalLine label="Other Charges" value={quotation.otherCharges}/>
          <TotalLine label="Discount" value={-quotation.discount}/>
          <div className="mt-2 flex justify-between rounded-xl bg-[#073323] text-white p-4 text-lg font-black"><span>Estimated Project Cost</span><span>{money(quotation.grandTotal)}</span></div>
          <div className="mt-2 text-[10px] text-right font-bold uppercase tracking-[.12em] text-amber-700">Estimated Project Cost — not a final price</div>
        </div>

        <SectionTitle>Cost Explanation</SectionTitle>
        <p className="text-sm leading-7 text-slate-600">{quotation.commercialNotes || 'Cost components are indicative and editable. Final commercial pricing requires confirmation by an authorized AKBS manager.'}</p>
      </section>

      {quotation.projectEconomics.enabled && (
        <section className="sq-page p-10 sm:p-14">
          <DocHeader title="Indicative Project Economics" quotation={quotation} />
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Bird Capacity', valueOrConfirm(quotation.projectEconomics.birdCapacity, ' Birds')],
              ['Batches / Year', valueOrConfirm(quotation.projectEconomics.batchesPerYear)],
              ['Average Placement', valueOrConfirm(quotation.projectEconomics.averagePlacement)],
              ['Mortality', valueOrConfirm(quotation.projectEconomics.mortalityPercent, '%')],
              ['Avg. Sale Weight', valueOrConfirm(quotation.projectEconomics.averageSaleWeight, ' kg')],
              ['Expected FCR', valueOrConfirm(quotation.projectEconomics.expectedFcr)],
              ['Feed Consumption', valueOrConfirm(quotation.projectEconomics.feedConsumption, ' kg')],
              ['Chick Cost', money(quotation.projectEconomics.chickCost)],
              ['Feed Cost / kg', money(quotation.projectEconomics.feedCost)],
              ['Medicine / Vaccine', money(quotation.projectEconomics.medicineVaccine)],
              ['Electricity', money(quotation.projectEconomics.electricity)],
              ['Labour', money(quotation.projectEconomics.labour)],
              ['Expected Sale Price / kg', money(quotation.projectEconomics.expectedSalePrice)]
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 border p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 font-bold">{value}</div></div>)}
          </div>
          <SectionTitle>Calculated Indicators</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            {[
              ['Revenue / Batch', economics ? money(economics.revenue) : 'To be confirmed'],
              ['Operating Cost / Batch', economics ? money(economics.operating) : 'To be confirmed'],
              ['Indicative Operating Surplus', economics ? money(economics.surplus) : 'To be confirmed'],
              ['Annual Revenue', economics ? money(economics.annualRevenue) : 'To be confirmed'],
              ['Annual Operating Cost', economics ? money(economics.annualOperating) : 'To be confirmed'],
              ['Indicative Annual Surplus', economics ? money(economics.annualSurplus) : 'To be confirmed']
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-black text-emerald-900">{value}</div></div>)}
          </div>
          <p className="mt-8 text-xs leading-6 text-slate-500">{ECONOMICS_DISCLAIMER}</p>
        </section>
      )}

      <section className="sq-page p-10 sm:p-14">
        <DocHeader title="Execution, Exclusions & Commercial Terms" quotation={quotation} />
        <SectionTitle>Execution Timeline</SectionTitle>
        <div className="space-y-2">
          {quotation.executionTimeline.map((stage, index) => (
            <div key={stage.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
              <div><span className="font-mono text-slate-400 mr-3">{String(index + 1).padStart(2, '0')}</span><b>{stage.stage}</b></div>
              <span className="text-slate-500">{stage.estimatedDays == null ? 'Requires Confirmation' : `${stage.estimatedDays} days`}</span>
            </div>
          ))}
        </div>

        <SectionTitle>Exclusions</SectionTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {quotation.exclusions.map((item, index) => <div key={index} className="text-sm text-slate-600 flex gap-2"><span className="text-rose-500">—</span>{item}</div>)}
        </div>

        <SectionTitle>Commercial Terms</SectionTitle>
        <InfoCard rows={[
          ['Quotation Validity', `${quotation.commercialTerms.quotationValidity} days`],
          ['Payment Terms', quotation.commercialTerms.paymentTerms],
          ['Advance', quotation.commercialTerms.advancePercent == null ? 'Requires Confirmation' : `${quotation.commercialTerms.advancePercent}%`],
          ['Milestone Payment', quotation.commercialTerms.milestonePaymentPercent == null ? 'Requires Confirmation' : `${quotation.commercialTerms.milestonePaymentPercent}%`],
          ['Final Payment', quotation.commercialTerms.finalPaymentPercent == null ? 'Requires Confirmation' : `${quotation.commercialTerms.finalPaymentPercent}%`],
          ['Taxes', quotation.commercialTerms.taxes],
          ['Transportation', quotation.commercialTerms.transportation],
          ['Warranty', quotation.commercialTerms.warranty],
          ['Installation Terms', quotation.commercialTerms.installationTerms],
          ['Delivery Terms', quotation.commercialTerms.deliveryTerms]
        ]}/>
      </section>

      <section className="sq-page min-h-[1120px] p-10 sm:p-14 flex flex-col justify-between">
        <div>
          <DocHeader title="Important Notes, Disclaimer & Acceptance" quotation={quotation} />
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>{DISCLAIMER_ONE}</p>
            <p>{DISCLAIMER_TWO}</p>
            <p>All items marked “Requires Confirmation” must be confirmed before the quotation is approved or issued as a final customer-facing document.</p>
          </div>

          <SectionTitle>Customer-Friendly Summary</SectionTitle>
          <p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">{quotation.customerFriendlySummary || 'Requires Confirmation'}</p>

          <SectionTitle>Customer Acceptance</SectionTitle>
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-sm">
            {quotation.acceptance ? (
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-400">Accepted by</span><div className="font-bold">{quotation.acceptance.customerName}</div></div>
                <div><span className="text-slate-400">Version</span><div className="font-bold">Version {quotation.acceptance.acceptanceVersion}</div></div>
                <div><span className="text-slate-400">Accepted at</span><div className="font-bold">{new Date(quotation.acceptance.acceptedAt).toLocaleString('en-IN')}</div></div>
                <div><span className="text-slate-400">Typed Signature</span><div className="font-display text-2xl font-bold italic">{quotation.acceptance.typedSignature}</div></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-10">
                <div><div className="h-16 border-b"></div><div className="mt-2 text-slate-400">Customer Name / Signature</div></div>
                <div><div className="h-16 border-b"></div><div className="mt-2 text-slate-400">Date</div></div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6 grid grid-cols-2 gap-10 text-sm">
          <div>
            <div className="font-bold text-slate-900">Prepared by AKBS</div>
            <div className="text-slate-500">{quotation.createdBy}</div>
            <div className="text-slate-400">{quotation.createdByRole}</div>
          </div>
          <div className="text-right">
            <div className="h-12"></div>
            <div className="border-t pt-2 font-bold">Authorized Signature</div>
            <div className="text-slate-400">No stamp is digitally implied by this document</div>
          </div>
        </div>
      </section>

      <style>{`
        .sq-page { break-after: page; background: white; }
        .sq-page:last-child { break-after: auto; }
        @media print {
          body * { visibility: hidden !important; }
          #soft-quotation-pdf, #soft-quotation-pdf * { visibility: visible !important; }
          #soft-quotation-pdf { position: absolute; inset: 0; width: 210mm; max-width: none; box-shadow: none; }
          .sq-page { width: 210mm; min-height: 297mm; padding: 14mm 15mm !important; page-break-after: always; }
          .sq-page:last-child { page-break-after: auto; }
        }
      `}</style>
    </article>
  );
};

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
