import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Printer,
  Copy,
  Check,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ChevronDown,
  Info,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Landmark,
  ShieldCheck,
  FileCheck,
  Share2
} from 'lucide-react';
import akbsLogoImg from '../assets/images/akbs_poultry_logo_1790286883961.jpg';

export interface SoftQuotationData {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  state?: string;
  district?: string;
  village?: string;
  birdCapacity?: number;
  poultryType?: string;
  shedType?: string;
  applicationId?: string;
  leadId?: string;
  projectCost?: string;
}

interface SoftQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SoftQuotationData | null;
  onQuotationSent?: (leadId?: string, summary?: any) => void;
}

export const SoftQuotationModal: React.FC<SoftQuotationModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onQuotationSent
}) => {
  // Quotation Reference Info
  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Beneficiary Info
  const [clientName, setClientName] = useState('Rakesh Yadav');
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [emailAddress, setEmailAddress] = useState('');
  const [farmLocation, setFarmLocation] = useState('Kokta, Bhopal, Madhya Pradesh');

  // Technical Specs
  const [birdsCount, setBirdsCount] = useState<number>(20000);
  const [birdType, setBirdType] = useState<'Broiler' | 'Layer' | 'Country / Desi' | 'Breeder'>('Broiler');
  const [shedTech, setShedTech] = useState<'EC' | 'Conventional'>('EC');
  const [subsidyCategory, setSubsidyCategory] = useState<'General (25%)' | 'SC/ST/Women/NE (33%)' | 'None'>('General (25%)');

  // Included Line Items toggles
  const [includeCivilShed, setIncludeCivilShed] = useState(true);
  const [includeVentilation, setIncludeVentilation] = useState(true);
  const [includeFeedingDrinking, setIncludeFeedingDrinking] = useState(true);
  const [includeElectricals, setIncludeElectricals] = useState(true);
  const [includeSilo, setIncludeSilo] = useState(true);
  const [includeBiosecurity, setIncludeBiosecurity] = useState(true);

  // Active view tab in modal: 'preview' (Official Letterhead) or 'customize' (Inputs & Line items)
  const [activeTab, setActiveTab] = useState<'preview' | 'customize'>('preview');

  // Copy toast state
  const [copied, setCopied] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Initialize or update data when modal opens
  useEffect(() => {
    if (isOpen) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setQuotationNo(`AKBS-SQ-2026-${randomNum}`);
      const today = new Date();
      const validDate = new Date();
      validDate.setDate(today.getDate() + 30);

      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      setQuotationDate(today.toLocaleDateString('en-GB', options));
      setValidUntil(validDate.toLocaleDateString('en-GB', options));

      if (initialData) {
        if (initialData.name) setClientName(initialData.name);
        if (initialData.phone) setMobileNumber(initialData.phone.replace(/[^0-9]/g, '').slice(-10));
        if (initialData.email) setEmailAddress(initialData.email);

        const loc = [initialData.village, initialData.district, initialData.state]
          .filter(Boolean)
          .join(', ') || initialData.location || 'Bhopal, Madhya Pradesh';
        setFarmLocation(loc);

        if (initialData.birdCapacity && !isNaN(Number(initialData.birdCapacity))) {
          setBirdsCount(Number(initialData.birdCapacity));
        }

        if (initialData.poultryType) {
          if (initialData.poultryType.toLowerCase().includes('layer')) setBirdType('Layer');
          else if (initialData.poultryType.toLowerCase().includes('country') || initialData.poultryType.toLowerCase().includes('desi')) setBirdType('Country / Desi');
          else setBirdType('Broiler');
        }

        if (initialData.shedType) {
          if (initialData.shedType.toLowerCase().includes('ec') || initialData.shedType.toLowerCase().includes('environment')) {
            setShedTech('EC');
          } else {
            setShedTech('Conventional');
          }
        }
      }
      setSendSuccess(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Realistic poultry sizing & engineering calculations
  // EC Shed: 0.75 sq.ft per bird | Conventional Shed: 1.25 sq.ft per bird
  const sqFtRatio = shedTech === 'EC' ? 0.75 : 1.25;
  const shedSqFt = Math.round(birdsCount * sqFtRatio);
  // Standard poultry shed width is 40 to 45 ft
  const shedWidth = 45;
  const shedLength = Math.round(shedSqFt / shedWidth);

  // Costs calculation
  // Civil: Pre-fab steel truss, purlins, foundation, concrete flooring, GI sheeting
  const civilRatePerSqFt = shedTech === 'EC' ? 320 : 250;
  const civilCost = includeCivilShed ? shedSqFt * civilRatePerSqFt : 0;

  // Climate Control: 50" exhaust cone fans, 150mm cooling pads, environmental controller, tunnel curtain
  const fanCount = Math.max(2, Math.round(birdsCount / 2500));
  const coolingPadSqFt = Math.max(100, Math.round(birdsCount * 0.05));
  const ventilationCost = includeVentilation
    ? shedTech === 'EC'
      ? fanCount * 42000 + coolingPadSqFt * 550 + 120000 // Controller + temp sensors + actuators
      : 75000 // Simple air circulators for open shed
    : 0;

  // Automatic Feeding (Pan) & Nipple Drinking system
  const feedingDrinkingCost = includeFeedingDrinking
    ? Math.round(birdsCount * (shedTech === 'EC' ? 95 : 65))
    : 0;

  // Silo & Unloader
  const siloCost = includeSilo ? (birdsCount >= 10000 ? 320000 : 180000) : 0;

  // Electricals, LED lighting, Generator connection, Water plumbing
  const electricalCost = includeElectricals ? Math.round(shedSqFt * 25 + 90000) : 0;

  // Biosecurity, disinfectant spray system, boot dip & basic office room
  const biosecurityCost = includeBiosecurity ? 110000 : 0;

  // Subtotal & Totals
  const subTotalCost = civilCost + ventilationCost + feedingDrinkingCost + siloCost + electricalCost + biosecurityCost;
  const contingencyCost = Math.round(subTotalCost * 0.03); // 3% contingency
  const totalProjectCost = subTotalCost + contingencyCost;

  // Subsidy calculation
  const subsidyPercent = subsidyCategory === 'General (25%)' ? 0.25 : subsidyCategory === 'SC/ST/Women/NE (33%)' ? 0.33 : 0;
  const estimatedSubsidy = Math.round(totalProjectCost * subsidyPercent);

  // Bank Loan (75% term loan under SBI/PNB/NABARD Agri infrastructure fund)
  const bankLoan = Math.round(totalProjectCost * 0.75);
  // Farmer Margin (25% equity)
  const farmerEquity = Math.max(0, totalProjectCost - bankLoan);

  // Projected Annual Returns: 6 batches/year @ ₹ 14.50 rearing charges per bird for EC broiler
  const annualRearingGross = Math.round(birdsCount * 6 * 14.5);
  const annualOpCosts = Math.round(birdsCount * 6 * 3.8); // electricity, bedding, labour, sanitization
  const netEstimatedAnnualIncome = annualRearingGross - annualOpCosts;
  const estPaybackYears = (totalProjectCost / (netEstimatedAnnualIncome || 1)).toFixed(1);

  const quotationItems = [
    includeCivilShed && {
      title: 'Shed Civil Construction & Pre-Engineered Steel Structure',
      description: 'High tensile steel truss, columns, roof purlins, 0.50mm galvalume roofing, thermal insulation barrier, civil foundation and PCC concrete flooring.',
      qty: `${shedSqFt.toLocaleString()} sq.ft`,
      amount: civilCost
    },
    includeVentilation && {
      title: shedTech === 'EC' ? 'EC Climate Control & Ventilation System' : 'Natural Ventilation System',
      description: shedTech === 'EC'
        ? `${fanCount} Nos. 50" galvanized cone exhaust fans, ${coolingPadSqFt} sq.ft cooling pads, digital temperature/humidity controller and tunnel inlet system.`
        : 'Side mesh, winchable curtain system and air-circulation fans for conventional poultry shed.',
      qty: shedTech === 'EC' ? `${fanCount} Fans` : 'Complete',
      amount: ventilationCost
    },
    includeFeedingDrinking && {
      title: 'Automated Pan Feeding & Nipple Drinking Lines',
      description: 'Automatic pan feeder lines, drive motors, feed-level sensors, SS 360° nipple drinker lines, pressure regulators, filters and medicator provision.',
      qty: 'Full Setup',
      amount: feedingDrinkingCost
    },
    includeSilo && {
      title: 'Outdoor Galvanized Feed Storage Silo & Flex Auger',
      description: 'Corrugated hot-dip galvanized bulk silo with ladder, inspection glass and automated feed transfer auger to shed hoppers.',
      qty: '1 Unit',
      amount: siloCost
    },
    includeElectricals && {
      title: 'Electrical Control Panel, Lighting & Internal Plumbing',
      description: 'IP65 control panel, protection relays, LED poultry lighting, generator changeover provision and internal water plumbing.',
      qty: 'Complete',
      amount: electricalCost
    },
    includeBiosecurity && {
      title: 'Biosecurity Disinfection System & Farm Staff Room',
      description: 'Vehicle tyre dip, high-pressure fogger/sprayer, boot-dip station and basic operator/staff room provision.',
      qty: '1 Setup',
      amount: biosecurityCost
    }
  ].filter(Boolean) as Array<{ title: string; description: string; qty: string; amount: number }>;

  // Format currency helper
  const formatINR = (val: number) => {
    return '₹ ' + val.toLocaleString('en-IN');
  };

  const formatLakhs = (val: number) => {
    return `₹ ${(val / 100000).toFixed(2)} Lakhs`;
  };

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    return (
`*AKBS POULTRY FARMING PVT. LTD.*
*PRELIMINARY SOFT QUOTATION / अनुमानित प्राक्कलन*
Ref No: ${quotationNo} | Date: ${quotationDate}

नमस्ते *${clientName}* जी,
आपके पोल्ट्री प्रोजेक्ट का Soft Quotation नीचे दिया गया है:

📋 *Project Overview:*
• Capacity: *${birdsCount.toLocaleString()} Birds (${birdType})*
• Technology: *${shedTech === 'EC' ? 'Environment Controlled (EC) Shed' : 'Conventional Open Shed'}*
• Shed Dimensions: *${shedLength} ft × ${shedWidth} ft (${shedSqFt.toLocaleString()} sq.ft)*
• Location: *${farmLocation}*

💰 *Itemized Cost Estimate:*
1. Shed Civil & Structural Work: ${formatINR(civilCost)}
2. Climate Control (Fans, Cooling Pads & Controller): ${formatINR(ventilationCost)}
3. Auto Pan Feeding & Nipple Drinking Line: ${formatINR(feedingDrinkingCost)}
4. Bulk Feed Storage Silo & Auger: ${formatINR(siloCost)}
5. Electrification, LED Lighting & Plumbing: ${formatINR(electricalCost)}
6. Biosecurity & Disinfection Setup: ${formatINR(biosecurityCost)}
• *Total Project Outlay:* *${formatLakhs(totalProjectCost)}* (${formatINR(totalProjectCost)})

🏛️ *Bank Loan & Subsidy Eligibility:*
• NABARD / AHIDF Subsidy: *${formatLakhs(estimatedSubsidy)}*
• Bank Term Loan (75%): *${formatLakhs(bankLoan)}*
• Farmer Margin (Equity): *${formatLakhs(farmerEquity)}*
• Est. Annual Farm Profit: *${formatLakhs(netEstimatedAnnualIncome)}* (Payback: ~${estPaybackYears} Years)

📞 *Contact Our Technical Team:*
Er. Ankit Mishra (Project Head): +91 98765 43210
AKBS Poultry Farming Private Limited
Office: 01 Rajaram House, Bamhori, Raisen (M.P.) - 464551
Mail: akbspoultryfarming@gmail.com | Website: www.Akbspoultry.com
Verified by: Balram Singh Ahirwar
_Note: This is a preliminary soft quotation for project planning and initial bank feasibility._`
    );
  };

  // 1. Send via WhatsApp
  const handleSendWhatsApp = () => {
    const cleanPhone = mobileNumber.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(generateWhatsAppMessage());
    const waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${text}`;

    window.open(waUrl, '_blank');
    setSendSuccess(`Soft Quotation successfully dispatched to WhatsApp (+91 ${cleanPhone})!`);

    if (onQuotationSent) {
      onQuotationSent(initialData?.leadId, {
        quotationNo,
        birdsCount,
        totalProjectCost,
        channel: 'WhatsApp'
      });
    }
  };

  // 2. Send via Email
  const handleSendEmail = () => {
    const subject = encodeURIComponent(`AKBS Poultry Soft Quotation - ${birdsCount.toLocaleString()} Birds Project [${quotationNo}]`);
    const body = encodeURIComponent(generateWhatsAppMessage());
    const mailUrl = `mailto:${emailAddress || ''}?subject=${subject}&body=${body}`;

    window.open(mailUrl, '_blank');
    setSendSuccess(`Soft Quotation draft opened in email!`);

    if (onQuotationSent) {
      onQuotationSent(initialData?.leadId, {
        quotationNo,
        birdsCount,
        totalProjectCost,
        channel: 'Email'
      });
    }
  };

  // 3. Copy Quotation Text to Clipboard
  const handleCopyQuotation = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // 4. Print / PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[96vh] overflow-hidden text-slate-800">
        
        {/* Top Header */}
        <div className="print:hidden bg-[#071d12] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 border-b border-[#143e27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0">
              <img src={akbsLogoImg} alt="AKBS Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  Send Soft Quotation (कच्चा कोटेशन)
                </h2>
                <span className="text-[10px] bg-emerald-700/80 text-emerald-100 font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-600">
                  {quotationNo}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300">
                Instant Turnkey Poultry Farm Project Feasibility & Cost Estimate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex bg-[#0d2a1b] p-0.5 rounded-lg border border-emerald-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'preview' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Document Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('customize')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  activeTab === 'customize' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                Customize Specs
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="print:hidden sm:hidden flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 text-center border-b-2 ${
              activeTab === 'preview' ? 'border-[#0b2818] text-[#0b2818] font-bold bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            Quotation Letterhead
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            className={`flex-1 py-2 text-center border-b-2 ${
              activeTab === 'customize' ? 'border-[#0b2818] text-[#0b2818] font-bold bg-white' : 'border-transparent text-slate-500'
            }`}
          >
            Edit Specs & Scope
          </button>
        </div>

        {/* Success Alert Banner */}
        {sendSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs text-emerald-900 font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sendSuccess}</span>
            </div>
            <button onClick={() => setSendSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs bg-slate-50/50">
          
          {/* Quick Beneficiary Bar */}
          <div className="print:hidden bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                Client / Farmer Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 focus:outline-none pb-0.5"
                placeholder="Farmer Name"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                WhatsApp / Mobile
              </label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-mono text-[11px]">+91</span>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full font-mono font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 focus:outline-none pb-0.5"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                Farm Location / District
              </label>
              <input
                type="text"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                className="w-full text-slate-900 font-medium bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 focus:outline-none pb-0.5"
                placeholder="Bhopal, MP"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                Target Capacity
              </label>
              <select
                value={birdsCount}
                onChange={(e) => setBirdsCount(Number(e.target.value))}
                className="w-full font-mono font-bold text-emerald-800 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 focus:outline-none pb-0.5"
              >
                <option value={5000}>5,000 Birds</option>
                <option value={10000}>10,000 Birds</option>
                <option value={15000}>15,000 Birds</option>
                <option value={20000}>20,000 Birds (Standard Commercial)</option>
                <option value={25000}>25,000 Birds</option>
                <option value={30000}>30,000 Birds</option>
                <option value={50000}>50,000+ Birds</option>
              </select>
            </div>
          </div>

          {/* CUSTOMIZE TAB */}
          {activeTab === 'customize' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Controls card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Project Configuration & Inclusions</span>
                  <span className="text-[11px] text-slate-400 font-normal">Adjust specifications to recalculate quotation</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Poultry Type */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Poultry Segment</label>
                    <select
                      value={birdType}
                      onChange={(e) => setBirdType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      <option value="Broiler">Commercial Broiler (Meat)</option>
                      <option value="Layer">Commercial Layer (Eggs)</option>
                      <option value="Country / Desi">Country Chicken / Desi / Kadaknath</option>
                      <option value="Breeder">Parent Stock / Breeder</option>
                    </select>
                  </div>

                  {/* Shed Technology */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Shed Housing Technology</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShedTech('EC')}
                        className={`p-2 rounded-lg font-bold border text-center transition-all ${
                          shedTech === 'EC'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        EC Controlled
                      </button>
                      <button
                        type="button"
                        onClick={() => setShedTech('Conventional')}
                        className={`p-2 rounded-lg font-bold border text-center transition-all ${
                          shedTech === 'Conventional'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        Conventional
                      </button>
                    </div>
                  </div>

                  {/* Subsidy Scheme */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">NABARD / AHIDF Subsidy Category</label>
                    <select
                      value={subsidyCategory}
                      onChange={(e) => setSubsidyCategory(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
                    >
                      <option value="General (25%)">General Category (25% Capital Subsidy)</option>
                      <option value="SC/ST/Women/NE (33%)">SC / ST / Women / North-East (33%)</option>
                      <option value="None">Direct Commercial / No Subsidy</option>
                    </select>
                  </div>
                </div>

                {/* Scope of Supply Inclusions Checkboxes */}
                <div>
                  <label className="block text-slate-700 font-bold mb-2">Scope of Supply & Work</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCivilShed}
                        onChange={(e) => setIncludeCivilShed(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Civil Shed & PEB Steel Truss</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeVentilation}
                        onChange={(e) => setIncludeVentilation(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Exhaust Fans & Cooling Pads</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFeedingDrinking}
                        onChange={(e) => setIncludeFeedingDrinking(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Auto Pan Feeder & Drinker</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSilo}
                        onChange={(e) => setIncludeSilo(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Bulk Feed Silo & Auger System</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeElectricals}
                        onChange={(e) => setIncludeElectricals(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Poultry LED & Panel Wiring</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBiosecurity}
                        onChange={(e) => setIncludeBiosecurity(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span>Biosecurity, Sprayer & Office</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFESSIONAL A4 SOFT QUOTATION */}
          <div
            id="soft-quotation-document"
            className="bg-white rounded-2xl border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden print:rounded-none print:border-0 print:shadow-none"
          >
            {/* Corporate Letterhead / Reference-style header */}
            <div className="grid grid-cols-1 sm:grid-cols-[230px_1fr] border-b border-slate-200">
              <div className="relative overflow-hidden bg-[#07543a] text-white min-h-[184px] p-5 sm:p-6">
                <div className="absolute -right-12 -bottom-16 w-44 h-44 rounded-full bg-white/10" />
                <div className="absolute right-[-42px] bottom-[-64px] w-44 h-44 rotate-12 bg-white" />
                <div className="relative z-10">
                  <div className="w-24 h-24 rounded-2xl bg-white p-2.5 shadow-sm overflow-hidden">
                    <img src={akbsLogoImg} alt="AKBS Poultry Farming" className="w-full h-full object-contain" />
                  </div>
                  <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-emerald-100/80 font-bold">
                    Poultry Project Solutions
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7 flex flex-col justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Quotation issued by</div>
                    <h1 className="mt-1 font-['Outfit',sans-serif] text-[22px] sm:text-[26px] font-black tracking-[-0.035em] text-slate-950 leading-tight">
                      AKBS Poultry Farming Private Limited
                    </h1>
                    <div className="mt-2 space-y-0.5 text-[10.5px] text-slate-500 leading-relaxed">
                      <div><b className="text-slate-700">Office:</b> 01 Rajaram House, Bamhori, Raisen (M.P.) - 464551</div>
                      <div><b className="text-slate-700">Mail:</b> akbspoultryfarming@gmail.com</div>
                      <div><b className="text-slate-700">Website:</b> www.Akbspoultry.com</div>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-black tracking-[0.02em]">
                      SOFT QUOTATION
                    </div>
                    <div className="mt-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[10.5px] sm:justify-end">
                      <span className="text-slate-400">Quotation No.</span>
                      <span className="font-mono font-bold text-slate-800">{quotationNo}</span>
                      <span className="text-slate-400">Date</span>
                      <span className="font-semibold text-slate-700">{quotationDate}</span>
                      <span className="text-slate-400">Valid Until</span>
                      <span className="font-semibold text-slate-700">{validUntil}</span>
                    </div>
                  </div>
                </div>

                <div className="h-1 w-full bg-[linear-gradient(90deg,#0f6b4a_0%,#0f6b4a_42%,#d8b55b_42%,#d8b55b_58%,#e2e8f0_58%,#e2e8f0_100%)] rounded-full" />
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {/* Client + project information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-bold">Quotation for</div>
                  <div className="mt-2 text-base font-black text-slate-950">{clientName}</div>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-700" /><span>+91 {mobileNumber}</span></div>
                    {emailAddress && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><span>{emailAddress}</span></div>}
                    <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" /><span>{farmLocation}</span></div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 font-bold">Project information</div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <div><span className="text-slate-400 block">Capacity</span><b className="font-mono text-slate-900">{birdsCount.toLocaleString()} Birds</b></div>
                    <div><span className="text-slate-400 block">Poultry Type</span><b className="text-slate-900">{birdType}</b></div>
                    <div><span className="text-slate-400 block">Shed Technology</span><b className="text-slate-900">{shedTech === 'EC' ? 'Environment Controlled' : 'Conventional'}</b></div>
                    <div><span className="text-slate-400 block">Covered Area</span><b className="font-mono text-slate-900">{shedSqFt.toLocaleString()} sq.ft</b></div>
                    <div className="col-span-2"><span className="text-slate-400 block">Approx. Shed Dimension</span><b className="font-mono text-slate-900">{shedLength}' × {shedWidth}'</b></div>
                  </div>
                </div>
              </div>

              {/* Itemized estimate */}
              <div>
                <div className="flex items-end justify-between gap-3 mb-2.5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-700 font-bold">Estimate details</div>
                    <h2 className="text-sm font-black text-slate-950">Scope of Work & Cost Breakdown</h2>
                  </div>
                  <span className="hidden sm:block text-[9.5px] text-slate-400">Indicative estimate · subject to final site verification</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#202a35] text-white text-[10.5px]">
                        <th className="px-3 py-2.5 w-10 text-center font-bold">#</th>
                        <th className="px-3 py-2.5 font-bold">Description</th>
                        <th className="px-3 py-2.5 text-center font-bold w-28">Qty / Dim</th>
                        <th className="px-3 py-2.5 text-right font-bold w-36">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotationItems.map((item, index) => (
                        <tr key={item.title} className="text-[10.5px] align-top">
                          <td className="px-3 py-3 text-center font-mono text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                          <td className="px-3 py-3">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            <div className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">{item.description}</div>
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-slate-600">{item.qty}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">{formatINR(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 ml-auto max-w-sm rounded-xl border border-slate-200 overflow-hidden text-[11px]">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50"><span className="text-slate-500">Subtotal</span><b className="font-mono text-slate-800">{formatINR(subTotalCost)}</b></div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200"><span className="text-slate-500">Contingency, Freight & Site Erection (3%)</span><b className="font-mono text-slate-800">{formatINR(contingencyCost)}</b></div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-[#f1f8f5]"><span className="font-black text-[#07543a]">Total Estimated Project Outlay</span><b className="font-mono text-[14px] text-[#07543a]">{formatINR(totalProjectCost)}</b></div>
                </div>
              </div>

              {/* Financing summary */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    <div>
                      <div className="text-xs font-black text-slate-950">Indicative Financing & Subsidy Summary</div>
                      <div className="text-[9.5px] text-slate-400">For preliminary planning / bank discussion only</div>
                    </div>
                  </div>
                  <span className="text-[9.5px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">{subsidyCategory}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100"><span className="text-[9.5px] text-slate-400 block">Project Cost</span><b className="font-mono text-[12px] text-slate-900">{formatLakhs(totalProjectCost)}</b></div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100"><span className="text-[9.5px] text-slate-400 block">Indicative Subsidy</span><b className="font-mono text-[12px] text-emerald-700">{estimatedSubsidy > 0 ? formatLakhs(estimatedSubsidy) : 'N/A'}</b></div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100"><span className="text-[9.5px] text-slate-400 block">Bank Loan (75%)</span><b className="font-mono text-[12px] text-slate-900">{formatLakhs(bankLoan)}</b></div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100"><span className="text-[9.5px] text-slate-400 block">Promoter Margin</span><b className="font-mono text-[12px] text-slate-900">{formatLakhs(farmerEquity)}</b></div>
                </div>
              </div>

              {/* Notes + authorization */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_250px] gap-6 pt-2 border-t border-slate-200">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">Commercial notes</div>
                  <div className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-slate-500">
                    <p><b className="text-slate-700">1. Nature of document:</b> Preliminary soft quotation / indicative project estimate for project planning and initial bank feasibility. Final pricing is subject to site survey and detailed engineering.</p>
                    <p><b className="text-slate-700">2. Validity:</b> This estimate is valid for 30 calendar days from the issue date unless revised in writing.</p>
                    <p><b className="text-slate-700">3. Site utilities:</b> Land readiness, approach road, 3-phase power and suitable water source are to be arranged by the client unless specifically included.</p>
                    <p><b className="text-slate-700">4. Subsidy / finance:</b> Any subsidy or loan indication is subject to scheme eligibility, bank appraisal, sanction and applicable government guidelines.</p>
                    <p><b className="text-slate-700">5. Taxes & exclusions:</b> Statutory taxes, duties and exclusions, if applicable, will be confirmed in the final commercial proposal.</p>
                  </div>

                  <div className="mt-5">
                    <div className="text-[10px] font-bold text-slate-700">Prepared by</div>
                    <div className="text-[10px] text-slate-500">Technical Sales Engineering Team</div>
                    <div className="text-[9.5px] text-slate-400">AKBS Poultry Farming Private Limited</div>
                  </div>
                </div>

                <div className="sm:text-center flex flex-col sm:items-center sm:justify-end">
                  <div className="relative w-[94px] h-[94px] rounded-full border-[3px] border-blue-700 text-blue-700 flex items-center justify-center bg-white shadow-sm">
                    <div className="absolute inset-[7px] rounded-full border border-blue-700" />
                    <div className="text-center relative z-10 leading-tight">
                      <div className="text-[9px] font-black tracking-[0.08em]">AKBS</div>
                      <div className="text-[7px] font-bold">POULTRY FARMING</div>
                      <div className="text-[7px] font-bold">PVT. LTD.</div>
                      <div className="mt-1 text-[18px]">✦</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-slate-400 font-bold">Company Seal</div>
                  <div className="mt-2 font-black text-[11px] text-slate-900">Verified by Balram Singh Ahirwar</div>
                  <div className="text-[9.5px] text-slate-500">Authorized Signatory</div>
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-7 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-1 sm:items-center sm:justify-between text-[9px] text-slate-400">
              <span>AKBS Poultry Farming Private Limited · 01 Rajaram House, Bamhori, Raisen (M.P.) - 464551</span>
              <span>akbspoultryfarming@gmail.com · www.Akbspoultry.com</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR - DISPATCH CHANNELS */}
        <div className="print:hidden bg-white px-4 sm:px-6 py-3.5 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-900">Total:</span>
            <span className="font-mono font-extrabold text-[#0b2818] text-sm">
              {formatINR(totalProjectCost)}
            </span>
            <span className="text-slate-400">({formatLakhs(totalProjectCost)})</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyQuotation}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            {/* Print / PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            {/* Email Button */}
            <button
              type="button"
              onClick={handleSendEmail}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </button>

            {/* WhatsApp Send Button (Primary Highlight) */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send on WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
