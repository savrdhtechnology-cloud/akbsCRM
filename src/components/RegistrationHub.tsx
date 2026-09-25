import React from 'react';
import { ExternalLink, Globe2, Handshake, ShieldCheck, UserRoundPlus } from 'lucide-react';

export const RegistrationHub: React.FC = () => {
  const modules = [
    {
      title: 'Customer Registration',
      description: 'Standalone farmer/customer onboarding form kept separate from the Admin CRM.',
      path: '/customer-registration',
      icon: <UserRoundPlus className="w-6 h-6" />,
      badge: 'Customer Module',
      bullets: ['6-step registration flow', 'Independent full-screen form', 'Website connection disabled']
    },
    {
      title: 'Partner Registration',
      description: 'Standalone referral/business partner onboarding module for new partner applications.',
      path: '/partner-registration',
      icon: <Handshake className="w-6 h-6" />,
      badge: 'Partner Module',
      bullets: ['Partner profile details', 'Independent full-screen form', 'Website connection disabled']
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1480px] mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-emerald-700 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin controlled modules
        </div>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Registration Modules</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-2xl">
          Customer and partner registration are separated from the CRM workspace. Each opens as its own full-screen module.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {modules.map((m) => (
          <div key={m.path} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
                  {m.icon}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {m.badge}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-slate-900">{m.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{m.description}</p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {m.bullets.map((b) => (
                  <div key={b} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-[11px] font-semibold text-slate-600">
                    {b}
                  </div>
                ))}
              </div>

              <button
                onClick={() => window.open(m.path, '_blank', 'noopener,noreferrer')}
                className="mt-6 h-11 px-4 rounded-xl bg-[#0b3824] hover:bg-[#0e472d] text-white text-xs font-bold flex items-center gap-2"
              >
                Open {m.title}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
        <Globe2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold text-amber-900">Website integration is currently disabled</div>
          <div className="text-[11px] text-amber-800/80 mt-0.5">
            These modules are isolated for layout/workflow testing. Website/API integration can be added later.
          </div>
        </div>
      </div>
    </div>
  );
};
