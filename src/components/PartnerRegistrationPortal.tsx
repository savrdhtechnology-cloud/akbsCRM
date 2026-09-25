import React, { useState } from 'react';
import {
  Handshake,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  BriefcaseBusiness,
  ArrowRight,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { AkbsLogo } from './AkbsLogo';

export const PartnerRegistrationPortal: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    mobile: '',
    email: '',
    city: '',
    state: 'Madhya Pradesh',
    category: 'Referral / Business Partner',
    profession: '',
    experience: '',
    message: ''
  });

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f3f6f4] flex items-center justify-center p-5">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Partner registration completed</h1>
          <p className="mt-2 text-sm text-slate-500">
            This module is currently standalone and is not connected to the website or Admin CRM database.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 h-11 px-5 rounded-xl bg-[#0b3824] text-white text-xs font-bold"
          >
            New Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3f0]">
      <header className="bg-[#082719] text-white border-b border-emerald-900">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-7 h-20 flex items-center justify-between">
          <div className="bg-white rounded-xl px-3 py-2">
            <AkbsLogo theme="light" size="md" showTagline={false} />
          </div>
          <div className="hidden md:block text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-300 font-bold">Standalone Module</div>
            <div className="text-sm font-bold">Partner Registration Portal</div>
          </div>
        </div>
      </header>

      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-7 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <aside className="space-y-4">
            <div className="rounded-3xl bg-[#0b3824] text-white p-6 shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Handshake className="w-6 h-6" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold leading-tight">Join AKBS as a Business / Referral Partner</h1>
              <p className="mt-3 text-sm text-emerald-100/75 leading-relaxed">
                Submit your profile for partnership onboarding. This page is separate from the Admin CRM.
              </p>
              <div className="mt-6 space-y-3 text-xs">
                {['Dedicated partner profile', 'Referral & business category', 'Separate onboarding workflow'].map((x, i) => (
                  <div key={x} className="flex gap-3 items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-400/15 flex items-center justify-center font-bold">{i + 1}</span>
                    <span>{x}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4" /> Integration disabled
              </div>
              <p className="mt-1 text-[11px] text-amber-800/80">
                No website or CRM database connection is active on this module yet.
              </p>
            </div>
          </aside>

          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-7 py-6 border-b border-slate-100">
              <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-700 font-bold">Partner Onboarding</div>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">Partner Registration Form</h2>
              <p className="mt-1 text-xs text-slate-500">Standalone UI/workflow for partner registration.</p>
            </div>

            <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="p-5 sm:p-7 space-y-6">
              <section>
                <div className="text-xs font-bold text-slate-900 mb-3">1. Contact Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field icon={<User />} label="Full Name" value={form.fullName} onChange={v => update('fullName', v)} placeholder="Partner full name" required />
                  <Field icon={<Building2 />} label="Business / Firm Name" value={form.businessName} onChange={v => update('businessName', v)} placeholder="Business name" />
                  <Field icon={<Phone />} label="Mobile Number" value={form.mobile} onChange={v => update('mobile', v)} placeholder="+91 98765 43210" required />
                  <Field icon={<Mail />} label="Email Address" value={form.email} onChange={v => update('email', v)} placeholder="name@example.com" />
                </div>
              </section>

              <section className="border-t border-slate-100 pt-6">
                <div className="text-xs font-bold text-slate-900 mb-3">2. Business Profile</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField
                    label="Partner Category"
                    value={form.category}
                    onChange={v => update('category', v)}
                    options={[
                      'Referral / Business Partner',
                      'Feed Supplier',
                      'Equipment & Automation',
                      'Hatchery / DOC',
                      'Veterinary & Pharma',
                      'Bank / NBFC Partner',
                      'Processing & Off-taker'
                    ]}
                  />
                  <Field icon={<BriefcaseBusiness />} label="Profession / Business Type" value={form.profession} onChange={v => update('profession', v)} placeholder="e.g. Poultry consultant" />
                  <Field icon={<MapPin />} label="City / District" value={form.city} onChange={v => update('city', v)} placeholder="City or district" />
                  <SelectField
                    label="State"
                    value={form.state}
                    onChange={v => update('state', v)}
                    options={['Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Maharashtra', 'Chhattisgarh', 'Other']}
                  />
                </div>
              </section>

              <section className="border-t border-slate-100 pt-6">
                <div className="text-xs font-bold text-slate-900 mb-3">3. Experience & Note</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField
                    label="Industry Experience"
                    value={form.experience}
                    onChange={v => update('experience', v)}
                    options={['', 'New / Less than 1 year', '1-3 years', '3-5 years', '5+ years']}
                  />
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Partnership Note</label>
                    <textarea
                      value={form.message}
                      onChange={e => update('message', e.target.value)}
                      rows={4}
                      placeholder="Tell us how you would like to work with AKBS..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>
              </section>

              <div className="pt-2 flex items-center justify-end">
                <button type="submit" className="h-11 px-6 rounded-xl bg-[#0b3824] hover:bg-[#0e472d] text-white text-xs font-bold flex items-center gap-2 shadow-sm">
                  Submit Partner Registration <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

const Field = ({
  icon,
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{label}{required ? ' *' : ''}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      <input
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
      />
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:bg-white focus:border-emerald-500"
    >
      {options.map(o => <option key={o || 'empty'} value={o}>{o || 'Select option'}</option>)}
    </select>
  </div>
);
