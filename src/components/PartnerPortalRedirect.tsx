import React, { useEffect } from 'react';

export const PartnerPortalRedirect: React.FC = () => {
  useEffect(() => {
    window.location.replace('/partner-portal');
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f6f4] flex items-center justify-center p-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow-sm">
        Opening your Partner Portal…
      </div>
    </div>
  );
};
