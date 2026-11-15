import React, { useEffect, useState } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  TrendingUp,
  MapPin,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState('AKBS POULTRY FARMING PVT. LTD.');
  const [gstin, setGstin] = useState('');
  const [regNo, setRegNo] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [broilerRate, setBroilerRate] = useState<number | ''>('');
  const [docRate, setDocRate] = useState<number | ''>('');
  const [feedRate, setFeedRate] = useState<number | ''>('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('akbs.crm.settings');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.companyName) setCompanyName(data.companyName);
      if (data.gstin && data.gstin !== '22AABCA1234F1Z8') setGstin(data.gstin);
      if (data.regNo && data.regNo !== 'U01409CT2023PTC014520') setRegNo(data.regNo);
      if (data.officeAddress && data.officeAddress !== 'Plot No. 14, Ring Road No. 1, Transport Nagar, Raipur, Chhattisgarh - 492001') setOfficeAddress(data.officeAddress);
      if (typeof data.broilerRate === 'number' && data.broilerRate !== 118) setBroilerRate(data.broilerRate);
      if (typeof data.docRate === 'number' && data.docRate !== 36) setDocRate(data.docRate);
      if (typeof data.feedRate === 'number' && data.feedRate !== 42.5) setFeedRate(data.feedRate);
    } catch {}
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    window.localStorage.setItem('akbs.crm.settings', JSON.stringify({
      companyName, gstin, regNo, officeAddress, broilerRate, docRate, feedRate
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          System & Business Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter verified company details and manually sourced market rates.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Daily Mandi Rate Board */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Daily Poultry Mandi & Farm Gate Rates
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Manual entry · no live market feed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Broiler Live Bird (Per Kg)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={broilerRate}
                  onChange={(e) => setBroilerRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Enter the current rate from your source</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Day Old Chick / DOC (Per Bird)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={docRate}
                  onChange={(e) => setDocRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Enter the current rate from your source</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Broiler Pre-Starter Feed (Per Kg)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.5"
                  value={feedRate}
                  onChange={(e) => setFeedRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Enter the current rate from your source</span>
            </div>
          </div>
        </div>

        {/* Corporate Profile */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Company Registration & Legal Profile
            </h2>
          </div>

          <p className="text-xs text-amber-700">Use details exactly as shown on official company documents. These settings are saved in this browser only.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Company Legal Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">CIN / Registration No.</label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Registered Office Address</label>
              <input
                type="text"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved on this device.
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-[#0b2818] hover:bg-[#123e27] text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
