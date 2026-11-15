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
  Share2,
  Save,
  RotateCcw,
  Palette,
  SlidersHorizontal
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


interface QuotationTemplateConfig {
  companyName: string;
  tagline: string;
  officeAddress: string;
  companyEmail: string;
  website: string;
  quotationTitle: string;
  quotationSubtitle: string;
  estimateLabel: string;
  quotationPrefix: string;
  validityDays: number;
  preparedByTitle: string;
  preparedByDepartment: string;
  verifierName: string;
  verifierDesignation: string;
  termsTitle: string;
  terms: string[];
  primaryColor: string;
  accentColor: string;
  showLogo: boolean;
  showTagline: boolean;
  showFinanceSection: boolean;
  itemTitles: {
    civil: string;
    ventilation: string;
    feeding: string;
    silo: string;
    electrical: string;
    biosecurity: string;
  };
}

interface QuotationProjectDefaults {
  birdsCount: number;
  birdType: 'Broiler' | 'Layer' | 'Country / Desi' | 'Breeder';
  shedTech: 'EC' | 'Conventional';
  subsidyCategory: 'General (25%)' | 'SC/ST/Women/NE (33%)' | 'None';
  includeCivilShed: boolean;
  includeVentilation: boolean;
  includeFeedingDrinking: boolean;
  includeElectricals: boolean;
  includeSilo: boolean;
  includeBiosecurity: boolean;
}

const QUOTATION_DEFAULTS_STORAGE_KEY = 'akbs-soft-quotation-defaults-v1';

const DEFAULT_TEMPLATE_CONFIG: QuotationTemplateConfig = {
  companyName: 'AKBS Poultry Farming Private Limited',
  tagline: 'HEALTHY BIRDS | BETTER TOMORROW',
  officeAddress: '01 Rajaram House, Bamhori, Raisen (M.P.) - 464551',
  companyEmail: 'akbspoultryfarming@gmail.com',
  website: 'www.Akbspoultry.com',
  quotationTitle: 'Send Soft Quotation (कच्चा कोटेशन)',
  quotationSubtitle: 'Instant Turnkey Poultry Farm Project Feasibility & Cost Estimate',
  estimateLabel: 'Soft Project Estimate',
  quotationPrefix: 'AKBS-SQ',
  validityDays: 30,
  preparedByTitle: 'Prepared by:',
  preparedByDepartment: 'Technical Sales Engineering Team',
  verifierName: 'Balram Singh Ahirwar',
  verifierDesignation: 'Authorized Signatory',
  termsTitle: 'Important Notes & Commercial Terms:',
  terms: [
    'Nature of Document: This is a preliminary soft quotation / rough budget estimate for project planning, farmer discussions, and initial bank feasibility. Final detailed project report (DPR) will be prepared after detailed site verification.',
    'Validity: The quoted prices are tentative and valid for the configured validity period from the date of issue.',
    'Civil Land & Utilities: 3-phase commercial electricity line and clean borewell water connection are to be arranged at the site boundary by the client unless specifically included.',
    'Subsidy Support: AKBS provides assistance in DPR preparation and bank-loan documentation under applicable NABARD / NLM / AHIDF or other eligible schemes.'
  ],
  primaryColor: '#0b2818',
  accentColor: '#00873E',
  showLogo: true,
  showTagline: true,
  showFinanceSection: true,
  itemTitles: {
    civil: 'Shed Civil Construction & Pre-Engineered Steel Structure',
    ventilation: 'EC Climate Control & Ventilation System',
    feeding: 'Automated Pan Feeding & Nipple Drinking Lines',
    silo: 'Outdoor Galvanized Feed Storage Silo & Flex Auger',
    electrical: 'Electrical Control Panel, Lighting & Internal Plumbing',
    biosecurity: 'Biosecurity Disinfection System & Farm Staff Room'
  }
};

const DEFAULT_PROJECT_DEFAULTS: QuotationProjectDefaults = {
  birdsCount: 20000,
  birdType: 'Broiler',
  shedTech: 'EC',
  subsidyCategory: 'General (25%)',
  includeCivilShed: true,
  includeVentilation: true,
  includeFeedingDrinking: true,
  includeElectricals: true,
  includeSilo: true,
  includeBiosecurity: true
};

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
  const [templateConfig, setTemplateConfig] = useState<QuotationTemplateConfig>(DEFAULT_TEMPLATE_CONFIG);
  const [defaultSaveStatus, setDefaultSaveStatus] = useState<string | null>(null);

  // Initialize or update data when modal opens
  useEffect(() => {
    if (isOpen) {
      let effectiveTemplate: QuotationTemplateConfig = DEFAULT_TEMPLATE_CONFIG;
      let effectiveProject: QuotationProjectDefaults = DEFAULT_PROJECT_DEFAULTS;

      try {
        const saved = window.localStorage.getItem(QUOTATION_DEFAULTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.template) {
            effectiveTemplate = {
              ...DEFAULT_TEMPLATE_CONFIG,
              ...parsed.template,
              itemTitles: {
                ...DEFAULT_TEMPLATE_CONFIG.itemTitles,
                ...(parsed.template.itemTitles || {})
              },
              terms: Array.isArray(parsed.template.terms) && parsed.template.terms.length
                ? parsed.template.terms
                : DEFAULT_TEMPLATE_CONFIG.terms
            };
          }
          if (parsed?.project) {
            effectiveProject = {
              ...DEFAULT_PROJECT_DEFAULTS,
              ...parsed.project
            };
          }
        }
      } catch (error) {
        console.warn('Unable to load quotation defaults', error);
      }

      setTemplateConfig(effectiveTemplate);
      setBirdsCount(effectiveProject.birdsCount);
      setBirdType(effectiveProject.birdType);
      setShedTech(effectiveProject.shedTech);
      setSubsidyCategory(effectiveProject.subsidyCategory);
      setIncludeCivilShed(effectiveProject.includeCivilShed);
      setIncludeVentilation(effectiveProject.includeVentilation);
      setIncludeFeedingDrinking(effectiveProject.includeFeedingDrinking);
      setIncludeElectricals(effectiveProject.includeElectricals);
      setIncludeSilo(effectiveProject.includeSilo);
      setIncludeBiosecurity(effectiveProject.includeBiosecurity);

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const today = new Date();
      setQuotationNo(`${effectiveTemplate.quotationPrefix}-${today.getFullYear()}-${randomNum}`);
      const validDate = new Date(today);
      validDate.setDate(today.getDate() + Number(effectiveTemplate.validityDays || 30));

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
      setDefaultSaveStatus(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // AKBS approved quotation calculation.
  // IMPORTANT: Only the approved 20,000 Birds EC Broiler template carries default commercial figures.
  // Other capacities / technologies require authorized confirmation instead of auto-inventing rates.
  const isApprovedAkbsTemplate = birdsCount === 20000 && shedTech === 'EC' && birdType === 'Broiler';

  const shedSqFt = isApprovedAkbsTemplate ? 12000 : Math.round(birdsCount * (shedTech === 'EC' ? 0.6 : 1.2));
  const shedWidth = isApprovedAkbsTemplate ? 40 : 40;
  const shedLength = isApprovedAkbsTemplate ? 300 : Math.round(shedSqFt / shedWidth);

  // Approved AKBS 20,000 Birds EC Broiler template breakup:
  // Civil Work & Flooring                         ₹17,00,000
  // Steel Structural Work                        ₹27,00,000
  // Roofing & GI Sheets                           ₹8,00,000
  // Environment Control Equipment                ₹20,00,000
  // Utilities & Infrastructure                   ₹28,00,000
  // Contingency & Pre-operative Expenses         ₹20,00,000
  // TOTAL                                        ₹1,20,00,000
  const civilCost = includeCivilShed && isApprovedAkbsTemplate ? 1700000 : 0;
  const steelStructuralCost = includeVentilation && isApprovedAkbsTemplate ? 2700000 : 0;
  const roofingCost = includeFeedingDrinking && isApprovedAkbsTemplate ? 800000 : 0;
  const environmentControlCost = includeSilo && isApprovedAkbsTemplate ? 2000000 : 0;
  const utilitiesCost = includeElectricals && isApprovedAkbsTemplate ? 2800000 : 0;
  const preOperativeCost = includeBiosecurity && isApprovedAkbsTemplate ? 2000000 : 0;

  // Keep the existing render variable names mapped to the approved commercial components.
  const ventilationCost = steelStructuralCost;
  const feedingDrinkingCost = roofingCost;
  const siloCost = environmentControlCost;
  const electricalCost = utilitiesCost;
  const biosecurityCost = preOperativeCost;

  const fanCount = isApprovedAkbsTemplate ? 6 : 0;
  const coolingPadSqFt = 0;

  const subTotalCost =
    civilCost +
    steelStructuralCost +
    roofingCost +
    environmentControlCost +
    utilitiesCost +
    preOperativeCost;
  const contingencyCost = 0;
  const totalProjectCost = subTotalCost;

  // Finance figures are mathematical illustrations only after the user selects an assumption.
  const subsidyPercent = subsidyCategory === 'General (25%)' ? 0.25 : subsidyCategory === 'SC/ST/Women/NE (33%)' ? 0.33 : 0;
  const estimatedSubsidy = isApprovedAkbsTemplate ? Math.round(totalProjectCost * subsidyPercent) : 0;
  const bankLoan = isApprovedAkbsTemplate ? Math.round(totalProjectCost * 0.75) : 0;
  const farmerEquity = isApprovedAkbsTemplate ? Math.max(0, totalProjectCost - bankLoan) : 0;

  // Do not invent production economics / market returns.
  const netEstimatedAnnualIncome = 0;
  const estPaybackYears = 'Requires Confirmation';

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
`*${templateConfig.companyName}*
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
• Indicative Project Economics: *Requires Confirmation*

*${templateConfig.companyName}*
Office: ${templateConfig.officeAddress}
Mail: ${templateConfig.companyEmail}
Website: ${templateConfig.website}
Verified by: ${templateConfig.verifierName}
_Note: This is a preliminary soft quotation for bank feasibility and planning purpose._`
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

  const handleSaveAsDefault = () => {
    const payload = {
      template: templateConfig,
      project: {
        birdsCount,
        birdType,
        shedTech,
        subsidyCategory,
        includeCivilShed,
        includeVentilation,
        includeFeedingDrinking,
        includeElectricals,
        includeSilo,
        includeBiosecurity
      }
    };

    window.localStorage.setItem(QUOTATION_DEFAULTS_STORAGE_KEY, JSON.stringify(payload));
    const currentYear = new Date().getFullYear();
    const existingSuffix = quotationNo.split('-').pop() || String(Math.floor(1000 + Math.random() * 9000));
    setQuotationNo(`${templateConfig.quotationPrefix}-${currentYear}-${existingSuffix}`);
    setDefaultSaveStatus('Saved as default. New quotations will use these settings.');
    window.setTimeout(() => setDefaultSaveStatus(null), 3500);
  };

  const handleResetFactoryDefaults = () => {
    setTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
    setBirdsCount(DEFAULT_PROJECT_DEFAULTS.birdsCount);
    setBirdType(DEFAULT_PROJECT_DEFAULTS.birdType);
    setShedTech(DEFAULT_PROJECT_DEFAULTS.shedTech);
    setSubsidyCategory(DEFAULT_PROJECT_DEFAULTS.subsidyCategory);
    setIncludeCivilShed(DEFAULT_PROJECT_DEFAULTS.includeCivilShed);
    setIncludeVentilation(DEFAULT_PROJECT_DEFAULTS.includeVentilation);
    setIncludeFeedingDrinking(DEFAULT_PROJECT_DEFAULTS.includeFeedingDrinking);
    setIncludeElectricals(DEFAULT_PROJECT_DEFAULTS.includeElectricals);
    setIncludeSilo(DEFAULT_PROJECT_DEFAULTS.includeSilo);
    setIncludeBiosecurity(DEFAULT_PROJECT_DEFAULTS.includeBiosecurity);
    window.localStorage.removeItem(QUOTATION_DEFAULTS_STORAGE_KEY);
    setDefaultSaveStatus('Factory defaults restored.');
    window.setTimeout(() => setDefaultSaveStatus(null), 3000);
  };

  const updateTemplateField = <K extends keyof QuotationTemplateConfig,>(key: K, value: QuotationTemplateConfig[K]) => {
    setTemplateConfig((prev) => ({ ...prev, [key]: value }));
  };

  const updateItemTitle = (key: keyof QuotationTemplateConfig['itemTitles'], value: string) => {
    setTemplateConfig((prev) => ({
      ...prev,
      itemTitles: {
        ...prev.itemTitles,
        [key]: value
      }
    }));
  };

  const updateTerm = (index: number, value: string) => {
    setTemplateConfig((prev) => ({
      ...prev,
      terms: prev.terms.map((term, termIndex) => termIndex === index ? value : term)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[96vh] overflow-hidden text-slate-800">
        
        {/* Top Header */}
        <div className="bg-[#071d12] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 border-b border-[#143e27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0">
              <img src={akbsLogoImg} alt="AKBS Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  {templateConfig.quotationTitle}
                </h2>
                <span className="text-[10px] bg-emerald-700/80 text-emerald-100 font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-600">
                  {quotationNo}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300">
                {templateConfig.quotationSubtitle}
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
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
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
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-4 -mb-1 text-[9.5px] text-slate-400">
              Client details are specific to this quotation and are not stored in template defaults.
            </div>
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

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                      <h3 className="font-bold text-slate-900">Quotation Template Builder</h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Customize branding, labels, terms and defaults. Changes preview instantly.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetFactoryDefaults}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[11px] flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAsDefault}
                      className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save as Default
                    </button>
                  </div>
                </div>

                {defaultSaveStatus && (
                  <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {defaultSaveStatus}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Company & Header</div>
                    {[
                      ['Company Name','companyName'],
                      ['Tagline','tagline'],
                      ['Office Address','officeAddress'],
                      ['Company Email','companyEmail'],
                      ['Website','website'],
                      ['Quotation Title','quotationTitle'],
                      ['Quotation Subtitle','quotationSubtitle'],
                      ['Estimate Label','estimateLabel'],
                      ['Quotation Prefix','quotationPrefix'],
                      ['Prepared By Label','preparedByTitle'],
                      ['Prepared By Department','preparedByDepartment'],
                      ['Verifier Name','verifierName'],
                      ['Verifier Designation','verifierDesignation']
                    ].map(([label,key]) => (
                      <label key={key} className="block">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">{label}</span>
                        <input
                          value={String(templateConfig[key as keyof QuotationTemplateConfig] ?? '')}
                          onChange={(e) => updateTemplateField(key as keyof QuotationTemplateConfig, e.target.value as any)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </label>
                    ))}

                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Validity Days</span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={templateConfig.validityDays}
                        onChange={(e) => {
                          const days = Math.max(1, Number(e.target.value) || 30);
                          updateTemplateField('validityDays', days);
                          const baseDate = new Date();
                          const nextValid = new Date(baseDate);
                          nextValid.setDate(baseDate.getDate() + days);
                          const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                          setValidUntil(nextValid.toLocaleDateString('en-GB', options));
                        }}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-800"
                      />
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
                        <Palette className="w-3.5 h-3.5" /> Appearance & Sections
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">Primary Color</span>
                          <div className="flex items-center gap-2 h-9 px-2 rounded-lg border border-slate-200 bg-slate-50">
                            <input type="color" value={templateConfig.primaryColor} onChange={(e) => updateTemplateField('primaryColor', e.target.value)} className="w-7 h-7 rounded border-0 bg-transparent" />
                            <input value={templateConfig.primaryColor} onChange={(e) => updateTemplateField('primaryColor', e.target.value)} className="min-w-0 flex-1 bg-transparent text-[10px] font-mono outline-none" />
                          </div>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">Accent Color</span>
                          <div className="flex items-center gap-2 h-9 px-2 rounded-lg border border-slate-200 bg-slate-50">
                            <input type="color" value={templateConfig.accentColor} onChange={(e) => updateTemplateField('accentColor', e.target.value)} className="w-7 h-7 rounded border-0 bg-transparent" />
                            <input value={templateConfig.accentColor} onChange={(e) => updateTemplateField('accentColor', e.target.value)} className="min-w-0 flex-1 bg-transparent text-[10px] font-mono outline-none" />
                          </div>
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          ['Show Logo','showLogo'],
                          ['Show Tagline','showTagline'],
                          ['Show Finance Section','showFinanceSection']
                        ].map(([label,key]) => (
                          <label key={key} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(templateConfig[key as keyof QuotationTemplateConfig])}
                              onChange={(e) => updateTemplateField(key as keyof QuotationTemplateConfig, e.target.checked as any)}
                              className="w-4 h-4"
                            />
                            <span className="text-[10px] font-semibold text-slate-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">Cost Table Item Titles</div>
                      <div className="space-y-2">
                        {([
                          ['Civil / Shed','civil'],
                          ['Ventilation','ventilation'],
                          ['Feeding & Drinking','feeding'],
                          ['Silo','silo'],
                          ['Electrical','electrical'],
                          ['Biosecurity','biosecurity']
                        ] as const).map(([label,key]) => (
                          <label key={key} className="block">
                            <span className="text-[9.5px] font-semibold text-slate-500 block mb-1">{label}</span>
                            <input
                              value={templateConfig.itemTitles[key]}
                              onChange={(e) => updateItemTitle(key, e.target.value)}
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px] text-slate-800"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Commercial Terms</div>
                        <input
                          value={templateConfig.termsTitle}
                          onChange={(e) => updateTemplateField('termsTitle', e.target.value)}
                          className="w-48 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-[9.5px] font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        {templateConfig.terms.map((term,index) => (
                          <textarea
                            key={index}
                            value={term}
                            onChange={(e) => updateTerm(index,e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[10px] leading-relaxed text-slate-700 resize-y"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Default Project Configuration & Inclusions</span>
                  <span className="text-[11px] text-slate-400 font-normal">These values can also be saved as defaults for new quotations</span>
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

          {/* OFFICIAL QUOTATION DOCUMENT LETTERHEAD (PRINTABLE & PREVIEW) */}
          <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none">
            {/* Letterhead Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b-2 gap-4" style={{ borderColor: templateConfig.primaryColor }}>
              <div className="flex items-center gap-3.5">
                {templateConfig.showLogo && (
                  <div
                    className="w-14 h-14 rounded-full bg-white p-0.5 border-[3px] flex items-center justify-center shrink-0 shadow-md overflow-hidden"
                    style={{ borderColor: templateConfig.accentColor }}
                  >
                    <img src={akbsLogoImg} alt="AKBS Logo" className="w-full h-full object-cover rounded-full" />
                  </div>
                )}
                <div>
                  <h1 className="font-['Outfit',sans-serif] text-lg sm:text-xl font-black text-slate-950 tracking-tight leading-none">
                    {templateConfig.companyName}
                  </h1>
                  {templateConfig.showTagline && (
                    <p
                      className="font-['Outfit',sans-serif] text-[10.5px] font-bold tracking-[0.08em] uppercase mt-1"
                      style={{ color: templateConfig.accentColor }}
                    >
                      {templateConfig.tagline}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-0.5 font-['Plus_Jakarta_Sans',sans-serif]">
                    Office Address: {templateConfig.officeAddress}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-['Plus_Jakarta_Sans',sans-serif]">
                    Mail: {templateConfig.companyEmail} | Website: {templateConfig.website}
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 sm:border-none sm:p-0 sm:bg-transparent">
                <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  {templateConfig.estimateLabel}
                </span>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                  Ref: {quotationNo}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Date: <b>{quotationDate}</b> | Valid: <b>{validUntil}</b>
                </div>
              </div>
            </div>

            {/* Client & Technical Specifications Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotation Prepared For:</div>
                <div className="text-sm font-bold text-slate-900">{clientName}</div>
                <div className="text-slate-600 flex items-center gap-1 font-mono text-[11px]">
                  <Phone className="w-3 h-3 text-emerald-700" />
                  +91 {mobileNumber}
                </div>
                <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {farmLocation}
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technical Configuration:</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Flock Capacity:</span>
                  <span className="font-mono font-bold text-slate-900">{birdsCount.toLocaleString()} Birds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Poultry Segment:</span>
                  <span className="font-semibold text-slate-900">{birdType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shed Type & Covered Area:</span>
                  <span className="font-semibold text-emerald-900">
                    {shedTech === 'EC' ? 'EC Controlled' : 'Conventional'} ({shedLength}' × {shedWidth}' = {shedSqFt.toLocaleString()} sq.ft)
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-800" />
                  <span>Itemized Scope & Cost Breakdown</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">*All rates inclusive of fabrication & installation</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-white text-[11px]" style={{ backgroundColor: templateConfig.primaryColor }}>
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">Scope of Work & Technical Specification</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Qty / Dim</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Estimated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {includeCivilShed && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">01</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">Civil Work & Flooring</span>
                          <span className="text-[10px] text-slate-500">
                            Civil foundations and PCC/RCC flooring as per the approved AKBS 20,000 Birds EC preliminary template.
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{shedSqFt.toLocaleString()} sq.ft</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(civilCost)}</td>
                      </tr>
                    )}

                    {includeVentilation && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">02</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">
                            Steel Structural Work
                          </span>
                          <span className="text-[10px] text-slate-500">
                            'Main columns, trusses, purlins, bracing and associated structural steel work as per approved AKBS specification.'
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">Structural Package</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(ventilationCost)}</td>
                      </tr>
                    )}

                    {includeFeedingDrinking && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">03</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">Roofing & GI Sheets</span>
                          <span className="text-[10px] text-slate-500">
                            0.50 mm TCT colour-coated GI roofing sheets and associated roofing components.
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">Roofing Package</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(feedingDrinkingCost)}</td>
                      </tr>
                    )}

                    {includeSilo && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">04</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">Environment Control Equipment</span>
                          <span className="text-[10px] text-slate-500">
                            Tunnel ventilation, C-type cooling pad, 6 × 50" exhaust fans and digital climate-control equipment.
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">EC Package</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(siloCost)}</td>
                      </tr>
                    )}

                    {includeElectricals && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">05</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">Utilities & Infrastructure</span>
                          <span className="text-[10px] text-slate-500">
                            Utilities and internal infrastructure included in the approved preliminary AKBS project estimate.
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">Project Utilities</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(electricalCost)}</td>
                      </tr>
                    )}

                    {includeBiosecurity && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">06</td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 block">Contingency & Pre-operative Expenses</span>
                          <span className="text-[10px] text-slate-500">
                            Indicative contingency and pre-operative expenses included in the approved AKBS template.
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">Lump Sum</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(biosecurityCost)}</td>
                      </tr>
                    )}

                    {!isApprovedAkbsTemplate && (
                      <tr className="bg-amber-50 font-semibold">
                        <td colSpan={4} className="py-2.5 px-3 text-amber-800 text-center">
                          Commercial rates for this capacity / technology are not approved in the saved AKBS template. Requires Confirmation.
                        </td>
                      </tr>
                    )}

                    <tr className="bg-emerald-50/80 font-bold text-emerald-950 text-xs">
                      <td colSpan={3} className="py-2.5 px-3 text-right text-emerald-900">
                        TOTAL ESTIMATED PROJECT OUTLAY (कुल अनुमानित लागत):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm text-[#0b2818] font-black">
                        {formatINR(totalProjectCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial & Subsidy Structuring Card */}
            {templateConfig.showFinanceSection && (
            <div className="text-white p-4 rounded-xl space-y-3" style={{ background: `linear-gradient(135deg, ${templateConfig.primaryColor}, #082014)` }}>
              <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs">NABARD / Bank Loan Structuring & Feasibility</span>
                </div>
                <span className="text-[10px] bg-emerald-700/60 px-2 py-0.5 rounded font-mono text-emerald-200">
                  {subsidyCategory}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
                <div className="bg-black/20 p-2.5 rounded-lg border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-300 block">Total Project Cost</span>
                  <span className="font-mono font-bold text-sm text-white">{formatLakhs(totalProjectCost)}</span>
                </div>

                <div className="bg-black/20 p-2.5 rounded-lg border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-300 block">Eligible Subsidy</span>
                  <span className="font-mono font-bold text-sm text-emerald-300">
                    {estimatedSubsidy > 0 ? formatLakhs(estimatedSubsidy) : 'N/A'}
                  </span>
                </div>

                <div className="bg-black/20 p-2.5 rounded-lg border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-300 block">Bank Loan (75%)</span>
                  <span className="font-mono font-bold text-sm text-white">{formatLakhs(bankLoan)}</span>
                </div>

                <div className="bg-black/20 p-2.5 rounded-lg border border-emerald-700/40">
                  <span className="text-[10px] text-emerald-300 block">Est. Annual Profit</span>
                  <span className="font-mono font-bold text-sm text-amber-300">{formatLakhs(netEstimatedAnnualIncome)}</span>
                </div>
              </div>
            </div>
            )}

            {/* Terms & Notes Footer */}
            <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-1 leading-relaxed">
              <div className="font-bold text-slate-700">{templateConfig.termsTitle}</div>
              {templateConfig.terms.map((term,index) => (
                <div key={index}>{index + 1}. {term}</div>
              ))}
            </div>

            {/* Signature row */}
            <div className="pt-4 flex items-end justify-between text-xs">
              <div>
                <div className="font-bold text-slate-800">{templateConfig.preparedByTitle}</div>
                <div className="text-slate-600">{templateConfig.preparedByDepartment}</div>
                <div className="text-[10px] text-slate-400 font-mono">{templateConfig.companyName}</div>
              </div>

              <div className="text-right">
                <div className="font-bold text-emerald-950">Verified by {templateConfig.verifierName}</div>
                <div className="text-[10px] text-slate-500">{templateConfig.verifierDesignation}</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR - DISPATCH CHANNELS */}
        <div className="bg-white px-4 sm:px-6 py-3.5 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
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
