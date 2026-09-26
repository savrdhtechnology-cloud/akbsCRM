import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Headphones,
  TrendingUp,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Layers,
  ArrowRight,
  ArrowLeft,
  Lock,
  Edit3,
  Check,
  ChevronRight,
  Home,
  FileText,
  Landmark,
  Award,
  Sparkles,
  Search,
  ExternalLink,
  HelpCircle,
  Clock,
  X,
  Eye,
  Grid,
  Maximize2
} from 'lucide-react';
import poultryBannerImg from '../assets/images/poultry_farm_chickens_1790243201914.jpg';
import broilerImg from '../assets/images/broiler_poultry_birds_1790286868486.jpg';
import akbsLogoImg from '../assets/images/akbs_poultry_logo_1790286883961.jpg';
import aerialLandImg from '../assets/images/aerial_farm_land_1790245878786.jpg';
import { Lead } from '../types';

interface CustomerRegistrationPortalProps {
  onRegisterCustomer?: (newLead: Partial<Lead>) => void;
  onGoToCRM?: () => void;
  onGoToLeads?: (leadId?: string) => void;
}


type ConsentLanguage = 'English' | 'Hindi';

const CUSTOMER_CONSENT_VERSION = 'AKBS-CONSENT-2026-V1';

const CUSTOMER_CONSENT_CONTENT: Record<ConsentLanguage, {
  title: string;
  intro: string;
  agreeButton: string;
  cancelButton: string;
  secureText: string;
  scrollHint: string;
  termsConsent: string;
  contactConsent: string;
  sections: Array<{ title: string; paragraphs: string[]; bullets?: string[] }>;
}> = {
  English: {
    title: 'Customer Declaration & Consent',
    intro: 'Before submitting this application, please carefully read the following declaration. By clicking “I Agree & Continue”, you confirm that you have read, understood and accepted the terms mentioned below.',
    agreeButton: 'I Agree & Continue',
    cancelButton: 'Cancel',
    secureText: 'Your information is handled securely',
    scrollHint: 'Please scroll through the complete declaration to enable consent.',
    termsConsent: 'I have read and understood the Customer Declaration & Consent and I agree to the above terms.',
    contactConsent: 'I consent to AKBS contacting me regarding my application and project through phone, WhatsApp, SMS and/or email.',
    sections: [
      {
        title: '1. Accuracy of Information',
        paragraphs: [
          'I hereby declare that all information provided by me in this application, including my personal details, contact information, project details, land details, estimated project cost, financial information, business experience and financing requirements, is true, correct and complete to the best of my knowledge.'
        ]
      },
      {
        title: '2. Documents & Information',
        paragraphs: [
          'I confirm that the documents and information submitted by me belong to me or to the concerned business/entity and, to the best of my knowledge, are genuine, valid and accurate. I understand that AKBS may request additional documents or clarification whenever required.'
        ]
      },
      {
        title: '3. Project Assessment',
        paragraphs: [
          'I understand that the information submitted through this application may be reviewed by AKBS Poultry Farming Private Limited for understanding my project requirements, preliminary project assessment, DPR preparation, quotation preparation and related assistance.'
        ]
      },
      {
        title: '4. Loan / Finance / Subsidy',
        paragraphs: [
          'I understand that submission of this application does not mean that any loan, subsidy, grant, government benefit or financial assistance has been approved or guaranteed.',
          'Any loan, credit facility or subsidy shall be subject to the applicable eligibility criteria, documentation, appraisal, policies and final decision of the concerned bank, financial institution, government department or competent authority.'
        ]
      },
      {
        title: '5. Project Cost & Estimates',
        paragraphs: [
          'I understand that any project cost, quotation, feasibility estimate, subsidy estimate, loan requirement or financial projection provided by AKBS may be based on the information available at the time of assessment and may change depending upon actual site conditions, specifications, market prices, supplier quotations, government guidelines and other applicable factors.'
        ]
      },
      {
        title: '6. Contact & Communication Consent',
        paragraphs: [
          'I authorize AKBS Poultry Farming Private Limited and its authorized representatives to contact me regarding my application and project through my registered:'
        ],
        bullets: ['Mobile number', 'Phone call', 'WhatsApp', 'SMS', 'Email']
      },
      {
        title: '7. Verification & Clarification',
        paragraphs: [
          'I authorize AKBS to verify the information provided by me to the extent reasonably required for processing and evaluating my application. I agree to provide additional information or clarification if required.'
        ]
      },
      {
        title: '8. Responsibility for Submitted Information',
        paragraphs: [
          'I understand that I am responsible for the correctness and completeness of the information and documents submitted by me. If any information is found to be false, misleading, incomplete or materially incorrect, the application may be put on hold, rejected or otherwise dealt with as applicable.'
        ]
      },
      {
        title: '9. No Guarantee of Approval',
        paragraphs: [
          'I understand that AKBS may assist me with project planning, documentation, DPR preparation, quotation and financing-related processes, but such assistance does not constitute a guarantee of project approval, loan sanction, subsidy approval, disbursement or any particular financial outcome.'
        ]
      },
      {
        title: '10. Consent to Electronic Record',
        paragraphs: [
          'I agree that my application, declarations, submitted information, documents and consent may be stored electronically as part of my application/CRM record for processing, communication, verification and record-keeping purposes.'
        ]
      },
      {
        title: '11. Privacy & Confidentiality',
        paragraphs: [
          'AKBS will handle the information submitted through the application for legitimate purposes related to the customer’s project/application and associated services, subject to applicable law and the organization’s privacy practices.'
        ]
      },
      {
        title: '12. Final Declaration',
        paragraphs: [
          'I confirm that I have read and understood the above declaration. I confirm that the information and documents provided by me are true and correct to the best of my knowledge. I voluntarily provide my consent for AKBS Poultry Farming Private Limited to process my application and contact me regarding my project.'
        ]
      }
    ]
  },
  Hindi: {
    title: 'ग्राहक घोषणा एवं सहमति',
    intro: 'इस आवेदन को जमा करने से पहले कृपया नीचे दी गई घोषणा को ध्यानपूर्वक पढ़ें। “मैं सहमत हूँ एवं आगे बढ़ें” पर क्लिक करके आप पुष्टि करते हैं कि आपने नीचे दी गई जानकारी को पढ़ लिया है, समझ लिया है और इससे सहमत हैं।',
    agreeButton: 'मैं सहमत हूँ एवं आगे बढ़ें',
    cancelButton: 'रद्द करें',
    secureText: 'आपकी जानकारी सुरक्षित रूप से संभाली जाती है',
    scrollHint: 'सहमति देने से पहले कृपया पूरी घोषणा नीचे तक पढ़ें।',
    termsConsent: 'मैंने Customer Declaration & Consent को पढ़ और समझ लिया है तथा मैं ऊपर दी गई शर्तों से सहमत हूँ।',
    contactConsent: 'मैं AKBS को मेरे application एवं project के संबंध में Phone, WhatsApp, SMS और/या Email के माध्यम से संपर्क करने की सहमति देता/देती हूँ।',
    sections: [
      {
        title: '1. जानकारी की सत्यता',
        paragraphs: [
          'मैं घोषणा करता/करती हूँ कि इस आवेदन में मेरे द्वारा दी गई सभी जानकारी, जिसमें मेरी व्यक्तिगत जानकारी, संपर्क विवरण, परियोजना की जानकारी, भूमि का विवरण, अनुमानित परियोजना लागत, वित्तीय जानकारी, व्यवसायिक अनुभव तथा वित्तीय आवश्यकता शामिल है, मेरी जानकारी एवं विश्वास के अनुसार सही, पूर्ण और सत्य है।'
        ]
      },
      {
        title: '2. दस्तावेज एवं जानकारी',
        paragraphs: [
          'मैं पुष्टि करता/करती हूँ कि मेरे द्वारा जमा किए गए दस्तावेज मेरे या संबंधित व्यवसाय/संस्था से संबंधित हैं और मेरी जानकारी के अनुसार वास्तविक, वैध एवं सही हैं। आवश्यकता होने पर मैं अतिरिक्त दस्तावेज या स्पष्टीकरण उपलब्ध कराने के लिए सहमत हूँ।'
        ]
      },
      {
        title: '3. परियोजना का मूल्यांकन',
        paragraphs: [
          'मैं समझता/समझती हूँ कि इस आवेदन के माध्यम से दी गई जानकारी का उपयोग AKBS Poultry Farming Private Limited द्वारा मेरी परियोजना की आवश्यकता समझने, प्रारंभिक परियोजना मूल्यांकन, DPR तैयार करने, quotation तैयार करने तथा संबंधित सहायता प्रदान करने के लिए किया जा सकता है।'
        ]
      },
      {
        title: '4. ऋण / वित्त / सब्सिडी',
        paragraphs: [
          'मैं समझता/समझती हूँ कि यह आवेदन जमा करना किसी भी loan, subsidy, grant, government benefit या financial assistance की स्वीकृति या गारंटी नहीं है।',
          'किसी भी loan, credit facility या subsidy की स्वीकृति संबंधित eligibility criteria, documents, appraisal, policies तथा संबंधित bank, financial institution, government department अथवा competent authority के अंतिम निर्णय पर निर्भर करेगी।'
        ]
      },
      {
        title: '5. परियोजना लागत एवं अनुमान',
        paragraphs: [
          'मैं समझता/समझती हूँ कि AKBS द्वारा दी गई project cost, quotation, feasibility estimate, subsidy estimate, loan requirement या financial projection उस समय उपलब्ध जानकारी के आधार पर अनुमानित हो सकती है।',
          'वास्तविक लागत site conditions, specifications, market prices, supplier quotations, government guidelines तथा अन्य लागू परिस्थितियों के अनुसार बदल सकती है।'
        ]
      },
      {
        title: '6. संपर्क एवं संचार की सहमति',
        paragraphs: [
          'मैं AKBS Poultry Farming Private Limited तथा उसके अधिकृत प्रतिनिधियों को मेरे application और project के संबंध में मेरे registered माध्यमों से संपर्क करने की अनुमति देता/देती हूँ। इसमें project discussion, documents की आवश्यकता, quotation, DPR संबंधी communication, follow-up तथा financing-related information शामिल हो सकती है।'
        ],
        bullets: ['Mobile Number', 'Phone Call', 'WhatsApp', 'SMS', 'Email']
      },
      {
        title: '7. सत्यापन एवं अतिरिक्त जानकारी',
        paragraphs: [
          'मैं AKBS को application processing एवं evaluation के लिए आवश्यक सीमा तक मेरे द्वारा दी गई जानकारी को verify करने की अनुमति देता/देती हूँ। आवश्यक होने पर मैं अतिरिक्त जानकारी या clarification उपलब्ध कराने के लिए सहमत हूँ।'
        ]
      },
      {
        title: '8. दी गई जानकारी की जिम्मेदारी',
        paragraphs: [
          'मैं समझता/समझती हूँ कि मेरे द्वारा जमा की गई जानकारी एवं documents की सत्यता और पूर्णता की जिम्मेदारी मेरी है। यदि कोई जानकारी गलत, भ्रामक, अधूरी या महत्वपूर्ण रूप से गलत पाई जाती है, तो application को hold, reject या लागू प्रक्रिया के अनुसार आगे process किया जा सकता है।'
        ]
      },
      {
        title: '9. Approval की कोई गारंटी नहीं',
        paragraphs: [
          'मैं समझता/समझती हूँ कि AKBS project planning, documentation, DPR preparation, quotation और financing-related process में सहायता प्रदान कर सकता है, लेकिन ऐसी सहायता project approval, loan sanction, subsidy approval, disbursement या किसी निश्चित financial outcome की गारंटी नहीं है।'
        ]
      },
      {
        title: '10. Electronic Record की सहमति',
        paragraphs: [
          'मैं सहमत हूँ कि मेरे application, declaration, submitted information, documents और consent को application/CRM record के रूप में electronic form में processing, communication, verification और record-keeping के उद्देश्य से सुरक्षित रखा जा सकता है।'
        ]
      },
      {
        title: '11. Privacy एवं Confidentiality',
        paragraphs: [
          'Application के माध्यम से दी गई जानकारी को ग्राहक की project/application तथा संबंधित services से जुड़े वैध उद्देश्यों के लिए संभाला जाएगा, लागू कानून और संगठन की privacy practices के अधीन।'
        ]
      },
      {
        title: '12. अंतिम घोषणा',
        paragraphs: [
          'मैं पुष्टि करता/करती हूँ कि मैंने ऊपर दी गई Customer Declaration & Consent को पढ़ और समझ लिया है। मेरे द्वारा दी गई जानकारी एवं documents मेरी जानकारी के अनुसार सही और सत्य हैं। मैं स्वेच्छा से AKBS Poultry Farming Private Limited को मेरा application process करने तथा मेरे project के संबंध में मुझसे संपर्क करने की सहमति देता/देती हूँ।'
        ]
      }
    ]
  }
};

const createBlankCustomerApplication = () => ({
  fullName: '',
  mobileNumber: '',
  whatsAppNumber: '',
  email: '',
  preferredLanguage: 'Hindi' as 'Hindi' | 'English',
  projectObjective: 'New Poultry Farm' as 'New Poultry Farm' | 'Existing Farm Expansion' | 'Farm Renovation' | 'Capacity Expansion',
  poultryType: 'Broiler (Meat)' as 'Broiler (Meat)' | 'Layer (Egg)' | 'EC / Environment Controlled' | 'Other',
  shedType: 'Conventional / Normal' as 'EC (Environment Controlled)' | 'Conventional / Normal',
  proposedCapacity: '',
  hasLand: 'Yes' as 'Yes' | 'No',
  landOwnership: 'Own Land' as 'Own Land' | 'Leased Land' | 'Family Land' | 'Buying New Land',
  landAreaAcres: '',
  state: '',
  district: '',
  villageOrCity: '',
  googleMapsLink: '',
  approxProjectCost: '',
  needsLoan: 'Yes' as 'Yes' | 'No' | 'Need guidance',
  ownContribution: '',
  approxLoanAmount: '',
  discussedWithBank: 'No' as 'Yes' | 'No',
  experience: 'No, I am new' as 'No, I am new' | 'Yes, 1-3 years' | 'Yes, 3+ years' | 'Family poultry business',
  supportNeeded: [] as string[],
  startTimeline: 'Within 3 months' as 'Immediately' | 'Within 1 month' | 'Within 3 months' | 'In 3-6 months' | 'Planning stage',
  declarationConfirmed: false
});

export const CustomerRegistrationPortal: React.FC<CustomerRegistrationPortalProps> = ({
  onRegisterCustomer,
  onGoToCRM,
  onGoToLeads
}) => {
  // Entry flow: customer sees the portal login/welcome screen first.
  const [portalEntryMode, setPortalEntryMode] = useState<'welcome' | 'form'>('welcome');
  const [loginApplicationId, setLoginApplicationId] = useState('');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

  // View mode: 'wizard' (Step-by-step interactive) or 'poster' (All 6 screens matching reference poster)
  const [viewMode, setViewMode] = useState<'wizard' | 'poster'>('wizard');

  // Current active step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeSideMenu, setActiveSideMenu] = useState<
    'registration' | 'track' | 'projects' | 'loan' | 'stories' | 'contact'
  >('registration');

  // Form Data State matching all 6 steps from the reference mockup
  const [formData, setFormData] = useState(() => createBlankCustomerApplication());

  // Track Application state
  const [trackSearchId, setTrackSearchId] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackResults, setTrackResults] = useState<any[]>([]);
  const [trackMessage, setTrackMessage] = useState('');

  // Success state after step 6 submission
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState('');
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [consentLanguage, setConsentLanguage] = useState<ConsentLanguage>('Hindi');
  const [consentTermsAccepted, setConsentTermsAccepted] = useState(false);
  const [consentContactAccepted, setConsentContactAccepted] = useState(false);
  const [consentScrolledToEnd, setConsentScrolledToEnd] = useState(false);

  const stepsList = [
    { num: 1, label: 'Basic Details', subtitle: 'Name, Mobile, WhatsApp, Email, Language' },
    { num: 2, label: 'Project Details', subtitle: 'Project Type, Poultry Type, Shed Type, Capacity' },
    { num: 3, label: 'Land Details', subtitle: 'Land Availability, Ownership, Area, Location' },
    { num: 4, label: 'Financial Details', subtitle: 'Project Cost, Contribution, Loan Requirement' },
    { num: 5, label: 'Experience & Support', subtitle: 'Experience, Requirements, Timeline' },
    { num: 6, label: 'Review & Submit', subtitle: 'Confirm Details & Submit' }
  ];

  const toggleSupportItem = (item: string) => {
    setFormData(prev => ({
      ...prev,
      supportNeeded: prev.supportNeeded.includes(item)
        ? prev.supportNeeded.filter(i => i !== item)
        : [...prev.supportNeeded, item]
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const getSavedApplications = () => {
    try {
      const applications = JSON.parse(window.localStorage.getItem('akbs.customer.applications') || '[]');
      return Array.isArray(applications) ? applications : [];
    } catch {
      return [];
    }
  };

  const getCrmLeads = () => {
    try {
      const crmLeads = JSON.parse(window.localStorage.getItem('akbs.crm.leads') || '[]');
      return Array.isArray(crmLeads) ? crmLeads : [];
    } catch {
      return [];
    }
  };

  const generateLeadId = () => {
    const year = new Date().getFullYear();
    const sequenceKey = `akbs.customer.lead.sequence.${year}`;
    const existing = getSavedApplications();
    let sequence = Number(window.localStorage.getItem(sequenceKey) || '0') + 1;
    let candidate = `AKBS-LEAD-${year}-${String(sequence).padStart(4, '0')}`;

    while (existing.some((item: any) => String(item.appId || '').toUpperCase() === candidate)) {
      sequence += 1;
      candidate = `AKBS-LEAD-${year}-${String(sequence).padStart(4, '0')}`;
    }

    window.localStorage.setItem(sequenceKey, String(sequence));
    return candidate;
  };

  const handleSubmitApplication = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!consentTermsAccepted || !consentContactAccepted) {
      return;
    }

    const consentTimestamp = new Date().toISOString();
    const submittedFormData = {
      ...formData,
      declarationConfirmed: true
    };
    setFormData(submittedFormData);

    const generatedId = generateLeadId();
    setSubmittedAppId(generatedId);
    setIsSubmitted(true);
    setIsConsentModalOpen(false);

    try {
      const existing = JSON.parse(window.localStorage.getItem('akbs.customer.applications') || '[]');
      const applicationRecord = {
        appId: generatedId,
        mobileNumber: submittedFormData.mobileNumber,
        submittedAt: consentTimestamp,
        formData: submittedFormData,
        consent: {
          version: CUSTOMER_CONSENT_VERSION,
          language: consentLanguage,
          declarationAccepted: true,
          communicationConsentAccepted: true,
          acceptedAt: consentTimestamp
        }
      };
      window.localStorage.setItem(
        'akbs.customer.applications',
        JSON.stringify([applicationRecord, ...existing.filter((item: any) => item.appId !== generatedId)])
      );
    } catch {
      // Local tracking persistence is optional; registration submission should still continue.
    }

    if (onRegisterCustomer) {
      onRegisterCustomer({
        name: submittedFormData.fullName,
        phone: `+91 ${submittedFormData.mobileNumber}`,
        whatsApp: `+91 ${submittedFormData.whatsAppNumber || submittedFormData.mobileNumber}`,
        email: submittedFormData.email,
        source: 'Website',
        status: 'New',
        isHot: true,
        priority: 'High',
        location: `${submittedFormData.villageOrCity}, ${submittedFormData.district}, ${submittedFormData.state}`,
        state: submittedFormData.state,
        district: submittedFormData.district,
        village: submittedFormData.villageOrCity,
        birdCapacity: parseInt(submittedFormData.proposedCapacity.replace(/,/g, ''), 10) || 0,
        projectType: submittedFormData.poultryType.includes('Layer') ? 'Layer' : 'Broiler',
        shedType: submittedFormData.shedType,
        budgetEstimate: submittedFormData.approxProjectCost,
        estimatedCost: submittedFormData.approxProjectCost,
        landAvailable: submittedFormData.hasLand === 'Yes' ? `Yes (${submittedFormData.landOwnership})` : 'No',
        landOwnership: submittedFormData.landOwnership,
        landArea: `${submittedFormData.landAreaAcres} Acres`,
        loanRequired: submittedFormData.needsLoan === 'Yes' ? `Yes (${submittedFormData.approxLoanAmount})` : submittedFormData.needsLoan,
        timeline: submittedFormData.startTimeline,
        language: submittedFormData.preferredLanguage,
        experience: submittedFormData.experience,
        supportNeeded: submittedFormData.supportNeeded,
        applicationId: generatedId,
        assignedTo: 'Unassigned',
        nextFollowUp: 'Not scheduled',
        notes: `Customer Web Registration [${generatedId}]. Land: ${submittedFormData.landAreaAcres} Acres (${submittedFormData.landOwnership}). Loan req: ${submittedFormData.approxLoanAmount}. Start timeline: ${submittedFormData.startTimeline}. Support: ${submittedFormData.supportNeeded.join(', ')}. Consent: ${CUSTOMER_CONSENT_VERSION}, ${consentLanguage}, accepted ${consentTimestamp}.`
      });
    }
  };

  const requestFinalSubmission = () => {
    setConsentLanguage(formData.preferredLanguage);
    setConsentTermsAccepted(false);
    setConsentContactAccepted(false);
    setConsentScrolledToEnd(false);
    setIsConsentModalOpen(true);
  };

  const handleConsentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) {
      setConsentScrolledToEnd(true);
    }
  };

  const findSavedApplication = (applicationId: string, mobile: string) => {
    const applications = getSavedApplications();
    const normalizedId = applicationId.trim().toUpperCase();
    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);

    return applications.find((item: any) => {
      const savedId = String(item.appId || '').trim().toUpperCase();
      const savedMobile = String(item.mobileNumber || item.formData?.mobileNumber || '').replace(/\D/g, '').slice(-10);
      const idMatches = normalizedId ? savedId === normalizedId : true;
      const mobileMatches = normalizedMobile ? savedMobile === normalizedMobile : true;
      return idMatches && mobileMatches && Boolean(normalizedId || normalizedMobile);
    }) || null;
  };

  const searchSavedApplications = (query: string) => {
    const applications = getSavedApplications();
    const trimmed = query.trim();
    const upper = trimmed.toUpperCase();
    const digits = trimmed.replace(/\D/g, '');
    const isLeadId = upper.startsWith('AKBS-');

    return applications
      .filter((item: any) => {
        const savedId = String(item.appId || '').trim().toUpperCase();
        const savedMobile = String(item.mobileNumber || item.formData?.mobileNumber || '').replace(/\D/g, '').slice(-10);
        if (isLeadId) return savedId === upper;
        if (digits.length >= 10) return savedMobile === digits.slice(-10);
        return savedId === upper;
      })
      .sort((a: any, b: any) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  };

  const mapSavedApplicationToTrackResult = (record: any) => {
    const data = record?.formData || {};
    const crmLead = getCrmLeads().find((lead: any) =>
      String(lead.applicationId || '').toUpperCase() === String(record.appId || '').toUpperCase()
      || String(lead.id || '').toUpperCase() === String(record.appId || '').toUpperCase()
    );

    return {
      appId: record.appId,
      farmerName: data.fullName || crmLead?.name || 'Customer',
      mobileNumber: data.mobileNumber || record.mobileNumber || crmLead?.phone || '',
      location: [data.villageOrCity, data.district, data.state].filter(Boolean).join(', ') || crmLead?.location || 'Not provided',
      capacity: data.proposedCapacity ? `${data.proposedCapacity} Birds` : crmLead?.birdCapacity ? `${Number(crmLead.birdCapacity).toLocaleString('en-IN')} Birds` : 'Not provided',
      status: crmLead?.status || record.status || 'Application Submitted',
      dateSubmitted: record.submittedAt ? new Date(record.submittedAt).toLocaleString('en-IN') : 'Not available',
      projectType: data.poultryType || crmLead?.projectType || 'Not provided',
      shedType: data.shedType || crmLead?.shedType || 'Not provided',
      loanRequirement: data.needsLoan || crmLead?.loanRequired || 'Not provided',
      assignedTo: crmLead?.assignedTo && crmLead.assignedTo !== 'Unassigned' ? crmLead.assignedTo : 'Not assigned yet',
      nextFollowUp: crmLead?.nextFollowUp || 'Not scheduled'
    };
  };

  const openSavedApplication = (record: any, relatedRecords?: any[]) => {
    const results = (relatedRecords || [record]).map(mapSavedApplicationToTrackResult);
    setTrackResult(mapSavedApplicationToTrackResult(record));
    setTrackResults(results);
    setTrackSearchId(record.appId || '');
    setTrackMessage('');
    setPortalEntryMode('form');
    setIsSubmitted(false);
    setActiveSideMenu('track');
  };

  const handlePortalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMessage('');
    const record = findSavedApplication(loginApplicationId, loginMobile);
    if (!record) {
      setLoginMessage('No application found with this Lead ID / Mobile Number on this device.');
      return;
    }
    const sameMobile = searchSavedApplications(record.mobileNumber || record.formData?.mobileNumber || '');
    openSavedApplication(record, sameMobile.length ? sameMobile : [record]);
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackResult(null);
    setTrackResults([]);
    setTrackMessage('');

    const matches = searchSavedApplications(trackSearchId);
    if (!matches.length) {
      setTrackMessage('No saved application found. Please check the Lead ID / Application ID or registered mobile number.');
      return;
    }

    openSavedApplication(matches[0], matches);
  };

  const resetForNewApplication = () => {
    setFormData(createBlankCustomerApplication());
    setPortalEntryMode('form');
    setViewMode('wizard');
    setActiveSideMenu('registration');
    setCurrentStep(1);
    setIsSubmitted(false);
    setSubmittedAppId('');
    setTrackSearchId('');
    setTrackResult(null);
    setTrackResults([]);
    setTrackMessage('');
    setLoginApplicationId('');
    setLoginMobile('');
    setLoginMessage('');
    setIsConsentModalOpen(false);
    setConsentTermsAccepted(false);
    setConsentContactAccepted(false);
    setConsentScrolledToEnd(false);
    setConsentLanguage('Hindi');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startNewApplication = () => {
    resetForNewApplication();
  };

  const trackSubmittedApplication = () => {
    const record = getSavedApplications().find((item: any) => item.appId === submittedAppId);
    if (!record) {
      setIsSubmitted(false);
      setActiveSideMenu('track');
      setTrackSearchId(submittedAppId);
      return;
    }
    const sameMobile = searchSavedApplications(record.mobileNumber || record.formData?.mobileNumber || '');
    openSavedApplication(record, sameMobile.length ? sameMobile : [record]);
  };

  // Helper to render the step-specific image card on the left
  const renderSidebarImage = (step: number) => {
    switch (step) {
      case 1:
        return (
          <div className="relative rounded-2xl overflow-hidden shadow-md border border-slate-200 group">
            <img
              src={broilerImg}
              alt="Healthy Broiler Birds Prosperous Farmers"
              className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-3.5 text-left">
              <div className="text-[18px] font-bold text-white font-['Playfair_Display',serif] tracking-tight leading-tight drop-shadow-md">
                Healthy Birds
              </div>
              <div className="text-[15px] font-semibold text-emerald-300 font-['Playfair_Display',serif] italic drop-shadow-md">
                Prosperous Farmers
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
            <img
              src={poultryBannerImg}
              alt="Broiler & Layer Projects"
              className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-3 text-left">
              <div className="text-xs font-bold text-white">Modern Poultry Sizing</div>
              <div className="text-[10px] text-emerald-300">Broiler & EC Shed Turnkey Setup</div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
            <img
              src={aerialLandImg}
              alt="Farm Land Location"
              className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-3 text-center">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg animate-pulse mb-2">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                Select exact location for better assistance
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
            <img
              src={poultryBannerImg}
              alt="Turnkey Bank Loan"
              className="w-full h-44 object-cover object-center filter brightness-90 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute bottom-2 left-2 right-2 bg-emerald-900/90 backdrop-blur-xs text-white p-2.5 rounded-lg text-center border border-emerald-500/40 shadow-md">
              <p className="text-[10px] font-semibold text-emerald-100 leading-snug">
                We help you with bank loan assistance, DPR and complete project support.
              </p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
            <img
              src={poultryBannerImg}
              alt="Experience & Support"
              className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3 text-left">
              <div className="text-xs font-bold text-white">Full Handholding</div>
              <div className="text-[10px] text-emerald-300">From DPR to Day-Old Chick Inflow</div>
            </div>
          </div>
        );
      case 6:
      default:
        return (
          <div className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
            <img
              src={poultryBannerImg}
              alt="Commercial Poultry Shed"
              className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent flex flex-col justify-end p-3 text-left">
              <div className="text-xs font-bold text-white">Commercial EC Sheds</div>
              <div className="text-[10px] text-emerald-300">Turnkey Civil & HVAC Execution</div>
            </div>
          </div>
        );
    }
  };

  if (portalEntryMode === 'welcome') {
    return (
      <div className="min-h-screen bg-[#eef3f1] text-slate-800 font-sans">
        <header className="bg-[#0b2818] text-white border-b border-emerald-900 shadow-md">
          <div className="max-w-[1240px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border-[3px] border-emerald-500 overflow-hidden p-0.5">
                <img src={akbsLogoImg} alt="AKBS Poultry Farming" className="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <div className="font-['Outfit',sans-serif] text-xl font-black tracking-wide">AKBS</div>
                <div className="text-[10px] font-bold tracking-[0.12em] text-emerald-300 uppercase">Poultry Farming</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Secure Customer Portal
            </div>
          </div>
        </header>

        <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-14">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <section className="relative overflow-hidden rounded-3xl bg-[#0b2818] text-white min-h-[440px] shadow-xl">
              <img src={poultryBannerImg} alt="AKBS Poultry Project" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b2818]/95 via-[#0b2818]/85 to-emerald-900/70" />
              <div className="relative p-7 sm:p-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-emerald-200">
                    <Sparkles className="w-3.5 h-3.5" />
                    AKBS Customer Portal
                  </div>
                  <h1 className="mt-6 text-3xl sm:text-4xl font-['Outfit',sans-serif] font-black tracking-tight leading-tight">
                    Start your poultry project with AKBS
                  </h1>
                  <p className="mt-4 text-sm sm:text-base text-emerald-50/80 leading-7 max-w-xl">
                    Register your project requirements, land details and funding needs. New customers can start a fresh application and existing applicants can track a submitted application.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  {[
                    ['6-step application', 'Simple guided process'],
                    ['Project guidance', 'Technical support'],
                    ['Loan assistance', 'DPR & funding support'],
                    ['Secure details', 'Customer information']
                  ].map(([title, subtitle]) => (
                    <div key={title} className="rounded-xl bg-white/8 border border-white/10 p-3">
                      <div className="text-xs font-bold text-white">{title}</div>
                      <div className="text-[10px] text-emerald-100/70 mt-1">{subtitle}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
              <div>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="mt-4 text-2xl font-['Outfit',sans-serif] font-black text-slate-950">Customer Login</h2>
                <p className="mt-1 text-sm text-slate-500">Track an existing application using your Lead ID and registered mobile number.</p>
              </div>

              <form onSubmit={handlePortalLogin} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Lead ID</span>
                  <div className="relative mt-1.5">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      value={loginApplicationId}
                      onChange={(e) => setLoginApplicationId(e.target.value)}
                      placeholder="Enter Lead ID"
                      className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-700"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Registered Mobile Number</span>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={loginMobile}
                      onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full h-11 pl-10 pr-3 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-700"
                    />
                  </div>
                </label>

                {loginMessage && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs font-semibold text-amber-800">
                    {loginMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#0b2818] hover:bg-[#123e27] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <Search className="w-4 h-4" />
                  Login / Track Application
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Customer</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <button
                type="button"
                onClick={startNewApplication}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black flex items-center justify-center gap-2 shadow-md"
              >
                Apply Now
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="mt-4 text-center text-[11px] text-slate-400">
                New application form opens blank. No sample or dummy customer details are prefilled.
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf2f0] flex flex-col text-slate-800 font-sans">
      {/* Top Banner exactly matching the reference poster top banner */}
      <header className="bg-[#0b2818] text-white shadow-md border-b border-[#123e27]">
        <div className="max-w-[1560px] mx-auto px-4 py-3 sm:py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: AKBS Poultry Farming Logo & Brand (Matching Uploaded Screenshot 3 Exactly) */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-white flex items-center justify-center shadow-lg shrink-0 border-[3px] border-[#00C853] p-0.5 overflow-hidden ring-2 ring-emerald-500/30">
              <img
                src={akbsLogoImg}
                alt="AKBS Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="font-['Outfit',sans-serif] font-black text-xl sm:text-2xl tracking-[0.04em] text-white leading-none">
                AKBS
              </div>
              <div className="font-['Outfit',sans-serif] font-extrabold text-[11px] sm:text-[12px] tracking-[0.07em] text-white uppercase leading-none mt-1.5">
                POULTRY FARMING
              </div>
              <div className="font-['Outfit',sans-serif] font-bold text-[9px] sm:text-[9.5px] tracking-[0.14em] text-[#00E676] uppercase leading-none mt-1.5 drop-shadow-xs">
                HEALTHY BIRDS | BETTER TOMORROW
              </div>
            </div>
          </div>

          {/* Center Title & Subtitle with Premium Font */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl lg:text-[26px] font-['Outfit',sans-serif] font-black text-white tracking-wide drop-shadow-sm">
              Customer Registration Portal
            </h1>
            <p className="text-xs sm:text-[13px] text-emerald-300 font-medium mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
              Just 15 simple questions <span className="opacity-50">|</span> Get expert guidance <span className="opacity-50">|</span> Start your poultry journey today
            </p>
          </div>

          {/* Right: 4 Badges + Golden cursive script */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPortalEntryMode('welcome')}
              className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-emerald-100 whitespace-nowrap"
            >
              Customer Login
            </button>
            <div className="hidden xl:grid grid-cols-4 gap-3 text-center">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border border-emerald-400 flex items-center justify-center text-emerald-300 mb-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-200 font-medium leading-tight">
                  Simple Process<br />Just 6 Steps
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border border-emerald-400 flex items-center justify-center text-emerald-300 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-200 font-medium leading-tight">
                  100% Secure<br />& Confidential
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border border-emerald-400 flex items-center justify-center text-emerald-300 mb-0.5">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-200 font-medium leading-tight">
                  Expert Support<br />At Every Step
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border border-emerald-400 flex items-center justify-center text-emerald-300 mb-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-200 font-medium leading-tight">
                  From Concept<br />to Success
                </span>
              </div>
            </div>

            {/* Golden script text */}
            <div className="hidden lg:block pl-2 border-l border-emerald-700/50">
              <div className="font-serif italic text-amber-300 text-lg leading-tight drop-shadow font-normal text-right">
                Grow Poultry
              </div>
              <div className="font-serif italic text-amber-300 text-base leading-tight drop-shadow font-normal text-right">
                Grow Tomorrow
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODE 1: ALL 6 SCREENS POSTER VIEW (Matches reference image grid layout) */}
      {/* ========================================================================= */}
      {viewMode === 'poster' && (
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-6">
          <div className="bg-emerald-900/10 border border-emerald-800/20 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              Viewing full 6-step Customer Registration UI poster. Click on any screen or button to interact directly with that step!
            </span>
            <button
              onClick={() => setViewMode('wizard')}
              className="px-3 py-1 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors"
            >
              Switch to Live Form Mode →
            </button>
          </div>

          {/* 2 Rows x 3 Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
            {/* -------------------- STEP 1 CARD -------------------- */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col hover:border-emerald-600 transition-colors">
              {/* Inner Mini Header */}
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[11px] font-bold">
                    A
                  </div>
                  <div>
                    <div className="font-extrabold text-[11px] text-slate-900 leading-tight">AKBS</div>
                    <div className="text-[8px] text-slate-500 font-semibold leading-none">Poultry Farming</div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2.5 text-[10px] text-slate-600 font-medium">
                  <span className="text-emerald-800 font-bold">Home</span>
                  <span>Projects</span>
                  <span>Resources</span>
                  <span>Contact</span>
                </div>
                <button className="px-2.5 py-1 bg-[#0b2818] text-white text-[10px] font-bold rounded-md">
                  Login
                </button>
              </div>

              {/* Mini Inner Layout */}
              <div className="p-3.5 grid grid-cols-12 gap-3">
                {/* Left Mini Sidebar */}
                <div className="col-span-4 space-y-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-[10px] space-y-0.5">
                    <div className="px-2 py-1 bg-[#0b2818] text-white font-bold rounded-lg flex items-center gap-1">
                      <span>👤</span>
                      <span>Registration</span>
                    </div>
                    <div className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1">
                      <span>🔍</span>
                      <span className="truncate">Track App</span>
                    </div>
                    <div className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1">
                      <span>🏢</span>
                      <span className="truncate">Projects</span>
                    </div>
                    <div className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1">
                      <span>🏛️</span>
                      <span className="truncate">Loan & Fin</span>
                    </div>
                    <div className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1">
                      <span>⭐</span>
                      <span className="truncate">Stories</span>
                    </div>
                    <div className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded flex items-center gap-1">
                      <span>📞</span>
                      <span className="truncate">Contact</span>
                    </div>
                  </div>
                  {/* Broiler Birds Image (Replacing Rooster with White Commercial Broilers) */}
                  <div className="relative rounded-xl overflow-hidden shadow-xs border border-slate-200">
                    <img src={broilerImg} alt="Broiler Poultry" className="w-full h-28 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-2 text-left">
                      <div className="text-[11px] font-bold text-white font-['Playfair_Display',serif] leading-none">Healthy Birds</div>
                      <div className="text-[10px] text-emerald-300 font-['Playfair_Display',serif] italic">Prosperous Farmers</div>
                    </div>
                  </div>
                </div>

                {/* Right Mini Form */}
                <div className="col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">Customer Registration</div>
                        <div className="text-[9px] text-slate-500">Fill just 15 simple questions and get expert guidance</div>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        <Lock className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">Safe</span>
                      </div>
                    </div>

                    {/* Steps line */}
                    <div className="py-2 flex items-center justify-between text-[9px] font-bold border-b border-slate-100">
                      <span className="w-4 h-4 rounded-full bg-[#0b2818] text-white flex items-center justify-center text-[9px]">1</span>
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[9px]">2</span>
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[9px]">3</span>
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[9px]">4</span>
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[9px]">5</span>
                      <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[9px]">6</span>
                    </div>

                    {/* Fields */}
                    <div className="space-y-1.5 pt-1.5 text-[10px]">
                      <div className="font-bold text-slate-900 text-[11px]">1. Basic Details</div>
                      <div className="text-[9px] text-slate-500">Let's start with your basic information.</div>

                      <div>
                        <label className="text-slate-600 font-medium block text-[9px]">Full Name *</label>
                        <input
                          type="text"
                          readOnly
                          value={formData.fullName}
                          className="w-full px-2 py-1 text-[10px] bg-slate-50 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-medium block text-[9px]">Mobile Number *</label>
                        <input
                          type="text"
                          readOnly
                          value={`+91 ${formData.mobileNumber}`}
                          className="w-full px-2 py-1 text-[10px] bg-slate-50 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-medium block text-[9px]">WhatsApp Number</label>
                        <input
                          type="text"
                          readOnly
                          value={`+91 ${formData.whatsAppNumber}`}
                          className="w-full px-2 py-1 text-[10px] bg-slate-50 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-medium block text-[9px]">Email (Optional)</label>
                        <input
                          type="text"
                          readOnly
                          value={formData.email}
                          className="w-full px-2 py-1 text-[10px] bg-slate-50 border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-medium block text-[9px]">Preferred Language</label>
                        <div className="flex gap-3 text-[9px] text-slate-700">
                          <label className="flex items-center gap-1"><input type="radio" checked readOnly /> Hindi</label>
                          <label className="flex items-center gap-1"><input type="radio" disabled /> English</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                    <span className="text-[9px] text-slate-400">← Back</span>
                    <button
                      onClick={() => {
                        setCurrentStep(2);
                        setViewMode('wizard');
                      }}
                      className="px-3 py-1 bg-[#0b2818] hover:bg-emerald-800 text-white text-[10px] font-bold rounded"
                    >
                      Save & Next →
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Step Pill */}
              <div className="bg-[#0b2818] text-white px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between">
                <span className="font-bold tracking-wider text-emerald-300">STEP 1</span>
                <span>Basic Details (Name, Mobile, WhatsApp, Email, Language)</span>
              </div>
            </div>

            {/* -------------------- STEP 2 CARD -------------------- */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col hover:border-emerald-600 transition-colors">
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[11px] font-bold">
                    A
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-900">AKBS Poultry</span>
                </div>
                <button className="px-2.5 py-1 bg-[#0b2818] text-white text-[10px] font-bold rounded-md">
                  Login
                </button>
              </div>

              <div className="p-3.5 grid grid-cols-12 gap-3">
                <div className="col-span-4 space-y-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-[10px] space-y-0.5">
                    <div className="px-2 py-1 bg-[#0b2818] text-white font-bold rounded-lg">👤 Registration</div>
                    <div className="px-2 py-1 text-slate-600">🔍 Track</div>
                    <div className="px-2 py-1 text-slate-600">🏢 Projects</div>
                    <div className="px-2 py-1 text-slate-600">🏛️ Loans</div>
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-xs border border-slate-200">
                    <img src={poultryBannerImg} alt="Poultry" className="w-full h-28 object-cover" />
                  </div>
                </div>

                <div className="col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-[11px] text-slate-900">2. Project Details</div>
                    <div className="text-[9px] text-slate-500 mb-1.5">Tell us about your poultry project.</div>

                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <div className="text-slate-700 font-semibold text-[9px] mb-1">What do you want to do? *</div>
                        <div className="grid grid-cols-2 gap-1 text-[8px]">
                          <div className="p-1 rounded border border-emerald-600 bg-emerald-50 text-emerald-950 font-bold">● New Poultry Farm</div>
                          <div className="p-1 rounded border border-slate-200 text-slate-600">○ Farm Expansion</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 font-semibold text-[9px] mb-1">Poultry Type *</div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[8px]">
                          <div className="p-1 rounded border border-emerald-600 bg-emerald-50 font-bold">🐔 Broiler</div>
                          <div className="p-1 rounded border border-slate-200">🥚 Layer</div>
                          <div className="p-1 rounded border border-slate-200">🏛️ EC</div>
                          <div className="p-1 rounded border border-slate-200">⚙ Other</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 font-semibold text-[9px]">Shed Type *</div>
                        <div className="flex gap-2 text-[8px] text-slate-700 mt-0.5">
                          <label className="flex items-center gap-1"><input type="radio" disabled /> EC</label>
                          <label className="flex items-center gap-1 font-bold text-emerald-900"><input type="radio" checked readOnly /> Conventional / Normal</label>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-700 font-semibold text-[9px]">Proposed Capacity (Number of Birds) *</div>
                        <div className="p-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 text-[10px]">
                          20,000 Birds
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                    <span className="text-[9px] text-slate-400">← Back</span>
                    <button
                      onClick={() => {
                        setCurrentStep(3);
                        setViewMode('wizard');
                      }}
                      className="px-3 py-1 bg-[#0b2818] hover:bg-emerald-800 text-white text-[10px] font-bold rounded"
                    >
                      Save & Next →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b2818] text-white px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between">
                <span className="font-bold tracking-wider text-emerald-300">STEP 2</span>
                <span>Project Details (Project Type, Poultry Type, Shed Type, Capacity)</span>
              </div>
            </div>

            {/* -------------------- STEP 3 CARD -------------------- */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col hover:border-emerald-600 transition-colors">
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[11px] font-bold">
                    A
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-900">AKBS Poultry</span>
                </div>
                <button className="px-2.5 py-1 bg-[#0b2818] text-white text-[10px] font-bold rounded-md">
                  Login
                </button>
              </div>

              <div className="p-3.5 grid grid-cols-12 gap-3">
                <div className="col-span-4 space-y-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-[10px] space-y-0.5">
                    <div className="px-2 py-1 bg-[#0b2818] text-white font-bold rounded-lg">👤 Registration</div>
                    <div className="px-2 py-1 text-slate-600">🔍 Track</div>
                    <div className="px-2 py-1 text-slate-600">🏢 Projects</div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-xs border border-slate-200">
                    <img src={aerialLandImg} alt="Aerial Land" className="w-full h-28 object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-1 text-center">
                      <MapPin className="w-4 h-4 text-red-500 animate-bounce" />
                      <div className="text-[7px] text-white bg-black/60 px-1 py-0.5 rounded mt-0.5">
                        Select exact location
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-[11px] text-slate-900">3. Land Details</div>
                    <div className="text-[9px] text-slate-500 mb-1.5">Tell us about the land for your poultry farm.</div>

                    <div className="space-y-1.5 text-[10px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-slate-600 text-[9px]">Land Available? *</div>
                          <div className="font-bold text-slate-900 text-[10px]">● Yes</div>
                        </div>
                        <div>
                          <div className="text-slate-600 text-[9px]">Land Ownership *</div>
                          <div className="font-bold text-slate-900 text-[10px]">Own Land</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-slate-600 text-[9px]">Area (Acres) *</div>
                          <div className="font-mono font-bold text-slate-900 text-[10px]">2 Acres</div>
                        </div>
                        <div>
                          <div className="text-slate-600 text-[9px]">State *</div>
                          <div className="font-bold text-slate-900 text-[10px]">Madhya Pradesh</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-slate-600 text-[9px]">District *</div>
                          <div className="font-bold text-slate-900 text-[10px]">Bhopal</div>
                        </div>
                        <div>
                          <div className="text-slate-600 text-[9px]">Village / City *</div>
                          <div className="font-bold text-slate-900 text-[10px]">Kokta</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-600 text-[9px]">Project Location (Maps Link)</div>
                        <input
                          type="text"
                          readOnly
                          placeholder="Paste Google Maps location link"
                          className="w-full px-2 py-0.5 text-[9px] bg-slate-50 border border-slate-200 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                    <span className="text-[9px] text-slate-400">← Back</span>
                    <button
                      onClick={() => {
                        setCurrentStep(4);
                        setViewMode('wizard');
                      }}
                      className="px-3 py-1 bg-[#0b2818] hover:bg-emerald-800 text-white text-[10px] font-bold rounded"
                    >
                      Save & Next →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b2818] text-white px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between">
                <span className="font-bold tracking-wider text-emerald-300">STEP 3</span>
                <span>Land Details (Land Availability, Ownership, Area, Location)</span>
              </div>
            </div>

            {/* -------------------- STEP 4 CARD -------------------- */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col hover:border-emerald-600 transition-colors">
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[11px] font-bold">
                    A
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-900">AKBS Poultry</span>
                </div>
                <button className="px-2.5 py-1 bg-[#0b2818] text-white text-[10px] font-bold rounded-md">
                  Login
                </button>
              </div>

              <div className="p-3.5 grid grid-cols-12 gap-3">
                <div className="col-span-4 space-y-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-[10px] space-y-0.5">
                    <div className="px-2 py-1 bg-[#0b2818] text-white font-bold rounded-lg">👤 Registration</div>
                    <div className="px-2 py-1 text-slate-600">🔍 Track</div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-xs border border-slate-200">
                    <img src={poultryBannerImg} alt="Bank Loan" className="w-full h-28 object-cover" />
                    <div className="absolute inset-x-1 bottom-1 bg-emerald-950/90 text-[7px] text-emerald-200 p-1 rounded text-center leading-tight">
                      Bank loan assistance, DPR & support
                    </div>
                  </div>
                </div>

                <div className="col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-[11px] text-slate-900">4. Financial Details</div>
                    <div className="text-[9px] text-slate-500 mb-1.5">Help us understand your investment plan.</div>

                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <div className="text-slate-600 text-[9px]">Approx. Project Cost *</div>
                        <div className="p-1 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 text-[10px]">
                          ₹50 Lakh - ₹1 Crore
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-600 text-[9px]">Do you need bank loan / financing? *</div>
                        <div className="flex gap-2 text-[9px] mt-0.5">
                          <span className="font-bold text-emerald-900">● Yes</span>
                          <span className="text-slate-500">○ No</span>
                          <span className="text-slate-500">○ Need guidance</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-slate-600 text-[9px]">Own Contribution *</div>
                          <div className="font-bold text-slate-900 text-[10px]">₹10 - 25 Lakh</div>
                        </div>
                        <div>
                          <div className="text-slate-600 text-[9px]">Approx. Loan Amount *</div>
                          <div className="font-bold text-slate-900 text-[10px]">₹25 - 50 Lakh</div>
                        </div>
                      </div>

                      <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-[8px] text-emerald-900 leading-tight">
                        ✓ We help you with bank loan assistance, DPR and complete project support.
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                    <span className="text-[9px] text-slate-400">← Back</span>
                    <button
                      onClick={() => {
                        setCurrentStep(5);
                        setViewMode('wizard');
                      }}
                      className="px-3 py-1 bg-[#0b2818] hover:bg-emerald-800 text-white text-[10px] font-bold rounded"
                    >
                      Save & Next →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b2818] text-white px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between">
                <span className="font-bold tracking-wider text-emerald-300">STEP 4</span>
                <span>Financial Details (Project Cost, Contribution, Loan Requirement)</span>
              </div>
            </div>

            {/* -------------------- STEP 5 CARD -------------------- */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col hover:border-emerald-600 transition-colors">
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[11px] font-bold">
                    A
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-900">AKBS Poultry</span>
                </div>
                <button className="px-2.5 py-1 bg-[#0b2818] text-white text-[10px] font-bold rounded-md">
                  Login
                </button>
              </div>

              <div className="p-3.5 grid grid-cols-12 gap-3">
                <div className="col-span-4 space-y-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-[10px] space-y-0.5">
                    <div className="px-2 py-1 bg-[#0b2818] text-white font-bold rounded-lg">👤 Registration</div>
                    <div className="px-2 py-1 text-slate-600">🔍 Track</div>
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-xs border border-slate-200">
                    <img src={poultryBannerImg} alt="Support" className="w-full h-28 object-cover" />
                  </div>
                </div>

                <div className="col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-[11px] text-slate-900">5. Experience & Support</div>
                    <div className="text-[9px] text-slate-500 mb-1.5">Tell us about your experience and support needed.</div>

                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <div className="text-slate-600 text-[9px]">Poultry farming experience? *</div>
                        <div className="font-bold text-emerald-900 text-[9px]">● No, I am new</div>
                      </div>

                      <div>
                        <div className="text-slate-600 text-[9px] mb-0.5">Support Needed:</div>
                        <div className="grid grid-cols-2 gap-1 text-[8px]">
                          <div className="text-emerald-950 font-medium">☑ Farm Setup</div>
                          <div className="text-emerald-950 font-medium">☑ Shed Construction</div>
                          <div className="text-emerald-950 font-medium">☑ Poultry Equipment</div>
                          <div className="text-emerald-950 font-medium">☑ DPR Report</div>
                          <div className="text-emerald-950 font-medium">☑ Loan Assistance</div>
                          <div className="text-slate-400">☐ Consultancy</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-600 text-[9px]">When do you want to start? *</div>
                        <div className="p-1 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 text-[9px]">
                          Within 3 months
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                    <span className="text-[9px] text-slate-400">← Back</span>
                    <button
                      onClick={() => {
                        setCurrentStep(6);
                        setViewMode('wizard');
                      }}
                      className="px-3 py-1 bg-[#0b2818] hover:bg-emerald-800 text-white text-[10px] font-bold rounded"
                    >
                      Save & Next →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b2818] text-white px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between">
                <span className="font-bold tracking-wider text-emerald-300">STEP 5</span>
                <span>Experience & Support (Experience, Requirements, Timeline)</span>
              </div>
            </div>

            {/* -------------------- STEP 6 CARD -------------------- */}
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col hover:border-emerald-600 transition-colors">
              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[11px] font-bold">
                    A
                  </div>
                  <span className="font-extrabold text-[11px] text-slate-900">AKBS Poultry</span>
                </div>
                <button className="px-2.5 py-1 bg-[#0b2818] text-white text-[10px] font-bold rounded-md">
                  Login
                </button>
              </div>

              <div className="p-3.5 grid grid-cols-12 gap-3">
                <div className="col-span-4 space-y-2">
                  <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-[10px] space-y-0.5">
                    <div className="px-2 py-1 bg-[#0b2818] text-white font-bold rounded-lg">👤 Registration</div>
                    <div className="px-2 py-1 text-slate-600">🔍 Track</div>
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-xs border border-slate-200">
                    <img src={poultryBannerImg} alt="Review" className="w-full h-28 object-cover" />
                  </div>
                </div>

                <div className="col-span-8 flex flex-col justify-between">
                  <div>
                    <div className="font-extrabold text-[11px] text-slate-900">6. Review & Submit</div>

                    <div className="grid grid-cols-2 gap-2 text-[8px] pt-1">
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900 text-[9px] border-b pb-0.5">Your Details</div>
                        <div>Name: <b>Rakesh Yadav</b></div>
                        <div>Mobile: +91 9876543210</div>
                        <div>Location: Bhopal, MP</div>
                        <div>Project: Broiler (20k)</div>
                        <div>Cost: ₹50L - ₹1Cr</div>
                        <div>Loan: Yes (₹25-50L)</div>
                      </div>

                      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200 flex flex-col justify-between">
                        <div className="font-bold text-emerald-950 text-[9px]">Declaration</div>
                        <div className="text-[7.5px] text-slate-700 leading-tight">
                          I confirm that the information provided is true and correct.
                        </div>
                        <button
                          onClick={() => {
                            setViewMode('wizard');
                            requestFinalSubmission();
                          }}
                          className="w-full py-1 bg-[#0b2818] text-white text-[9px] font-bold rounded shadow-xs"
                        >
                          Submit Application →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                    <span className="text-[9px] text-slate-400">← Back</span>
                    <span className="text-[8px] text-emerald-700 font-semibold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> 100% Secure
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b2818] text-white px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between">
                <span className="font-bold tracking-wider text-emerald-300">STEP 6</span>
                <span>Review & Submit (Confirm Details & Submit)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INTERACTIVE STEP-BY-STEP FORM (Full size high-fidelity UI) */}
      {/* ========================================================================= */}
      {viewMode === 'wizard' && (
        <div className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Sidebar Menu & Visual Card */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-3 bg-[#0b2818] text-white border-b border-[#123e27] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Farmer Portal
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    AKBS Services
                  </div>
                </div>
                <span className="text-xs bg-emerald-700/80 text-white font-mono px-2 py-0.5 rounded">
                  Step {currentStep}/6
                </span>
              </div>

              <nav className="p-2 space-y-1 text-xs font-medium">
                <button
                  onClick={() => setActiveSideMenu('registration')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSideMenu === 'registration'
                      ? 'bg-[#0b2818] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSideMenu === 'registration' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>Registration</span>
                </button>

                <button
                  onClick={() => setActiveSideMenu('track')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSideMenu === 'track'
                      ? 'bg-[#0b2818] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSideMenu === 'track' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <span>Track Application</span>
                </button>

                <button
                  onClick={() => setActiveSideMenu('projects')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSideMenu === 'projects'
                      ? 'bg-[#0b2818] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSideMenu === 'projects' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <span>Our Projects</span>
                </button>

                <button
                  onClick={() => setActiveSideMenu('loan')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSideMenu === 'loan'
                      ? 'bg-[#0b2818] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSideMenu === 'loan' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Landmark className="w-3.5 h-3.5" />
                  </div>
                  <span>Loan & Financing</span>
                </button>

                <button
                  onClick={() => setActiveSideMenu('stories')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSideMenu === 'stories'
                      ? 'bg-[#0b2818] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSideMenu === 'stories' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <span>Success Stories</span>
                </button>

                <button
                  onClick={() => setActiveSideMenu('contact')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSideMenu === 'contact'
                      ? 'bg-[#0b2818] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    activeSideMenu === 'contact' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span>Contact Us</span>
                </button>
              </nav>
            </div>

            {/* Left Context-Sensitive Image matching active step in mockup */}
            {renderSidebarImage(currentStep)}

            {/* Quick Helpline Box */}
            <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200/80 text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <Headphones className="w-4 h-4 text-emerald-700" />
                <span>Expert Technical Helpline</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Facing issues while filling the registration? Call directly:
              </p>
              <div className="font-mono font-bold text-emerald-900 text-sm">
                +91 98271 22334
              </div>
            </div>
          </aside>

          {/* Right Main Content Card */}
          <main className="lg:col-span-9 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-7">
            {/* If Sub-view: Track Application */}
            {activeSideMenu === 'track' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Track Your Poultry Farm Application
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter Lead ID or registered Mobile Number
                    </p>
                  </div>
                  <button
                    onClick={startNewApplication}
                    className="text-xs font-bold text-emerald-800 hover:underline"
                  >
                    + New Apply
                  </button>
                </div>

                <form onSubmit={handleTrackSearch} className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    value={trackSearchId}
                    onChange={(e) => setTrackSearchId(e.target.value)}
                    placeholder="e.g. AKBS-LEAD-2026-0001 or 9876543210"
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Track Now
                  </button>
                </form>

                {trackMessage && (
                  <div className="max-w-md rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs font-semibold text-amber-800">
                    {trackMessage}
                  </div>
                )}

                {trackResults.length > 1 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="text-xs font-black text-slate-900">Your Applications / Leads</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Each registration has its own Lead ID and can be tracked separately.</div>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">{trackResults.length} Leads</span>
                    </div>
                    <div className="space-y-2">
                      {trackResults.map((item) => (
                        <button
                          key={item.appId}
                          type="button"
                          onClick={() => setTrackResult(item)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            trackResult?.appId === item.appId
                              ? 'border-emerald-600 bg-emerald-50'
                              : 'border-slate-200 hover:border-emerald-300 bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-mono text-[11px] font-black text-emerald-800">{item.appId}</div>
                              <div className="text-xs font-bold text-slate-900 mt-0.5">{item.projectType} · {item.capacity}</div>
                            </div>
                            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold">{item.status}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {trackResult && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[11px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                          {trackResult.appId}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {trackResult.farmerName} • {trackResult.location}
                        </h3>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {trackResult.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">Assigned Engineer:</span>
                        <div className="font-semibold text-slate-800">{trackResult.assignedTo || 'Not assigned yet'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Project Capacity:</span>
                        <div className="font-semibold text-slate-800">{trackResult.capacity}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Current CRM Stage:</span>
                        <div className="font-semibold text-slate-800">{trackResult.status}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Next Follow-up:</span>
                        <div className="font-semibold text-slate-800">{trackResult.nextFollowUp || 'Not scheduled'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Main View: Registration Form */}
            {activeSideMenu === 'registration' && !isSubmitted && (
              <div className="space-y-6">
                {/* Form Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      Customer Registration
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fill just 15 simple questions and get expert guidance for your poultry project.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your information is safe with us</span>
                  </div>
                </div>

                {/* Step Navigation Progress Indicator (1 to 6) */}
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-4 right-4 top-4 h-0.5 bg-slate-200 -z-0" />
                    <div
                      className="absolute left-4 top-4 h-0.5 bg-[#0b2818] transition-all duration-300 -z-0"
                      style={{
                        width: `${((currentStep - 1) / (stepsList.length - 1)) * 100}%`
                      }}
                    />

                    {stepsList.map((step) => {
                      const isCompleted = step.num < currentStep;
                      const isActive = step.num === currentStep;

                      return (
                        <div
                          key={step.num}
                          onClick={() => setCurrentStep(step.num)}
                          className="flex flex-col items-center cursor-pointer group z-10"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                              isActive
                                ? 'bg-[#0b2818] text-white ring-4 ring-emerald-100 scale-110'
                                : isCompleted
                                ? 'bg-emerald-700 text-white'
                                : 'bg-white border-2 border-slate-300 text-slate-500 group-hover:border-slate-400'
                            }`}
                          >
                            {isCompleted ? <Check className="w-4 h-4" /> : step.num}
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 font-medium hidden sm:block text-center max-w-[80px] leading-tight ${
                              isActive
                                ? 'font-bold text-emerald-950'
                                : isCompleted
                                ? 'text-slate-700 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FORM SECTIONS ACCORDING TO STEP */}

                {/* STEP 1: Basic Details */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="pb-2 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        1. Basic Details
                      </h3>
                      <p className="text-xs text-slate-500">
                        Let's start with your basic information.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            required
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Enter your full name"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Mobile Number *
                        </label>
                        <div className="relative flex">
                          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-xs font-mono font-semibold">
                            +91
                          </span>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={formData.mobileNumber}
                            onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                            placeholder="Enter 10-digit mobile number"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-r-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          WhatsApp Number
                        </label>
                        <div className="relative flex">
                          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-xs font-mono font-semibold">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={formData.whatsAppNumber}
                            onChange={(e) => setFormData({ ...formData, whatsAppNumber: e.target.value })}
                            placeholder="Enter WhatsApp number (if different)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-r-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Email (Optional)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Enter your email address"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                        Preferred Language
                      </label>
                      <div className="flex items-center gap-6 text-xs text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="preferredLanguage"
                            checked={formData.preferredLanguage === 'Hindi'}
                            onChange={() => setFormData({ ...formData, preferredLanguage: 'Hindi' })}
                            className="w-4 h-4 text-[#0b2818] focus:ring-emerald-500"
                          />
                          <span>Hindi (हिंदी)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="preferredLanguage"
                            checked={formData.preferredLanguage === 'English'}
                            onChange={() => setFormData({ ...formData, preferredLanguage: 'English' })}
                            className="w-4 h-4 text-[#0b2818] focus:ring-emerald-500"
                          />
                          <span>English</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Project Details */}
                {currentStep === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="pb-2 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        2. Project Details
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tell us about your poultry project.
                      </p>
                    </div>

                    {/* What do you want to do? */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs">
                        What do you want to do? *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          'New Poultry Farm',
                          'Existing Farm Expansion',
                          'Farm Renovation',
                          'Capacity Expansion'
                        ].map((obj) => (
                          <label
                            key={obj}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                              formData.projectObjective === obj
                                ? 'border-[#0b2818] bg-emerald-50/60 font-bold text-emerald-950'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="projectObjective"
                              checked={formData.projectObjective === obj}
                              onChange={() => setFormData({ ...formData, projectObjective: obj as any })}
                              className="w-4 h-4 text-[#0b2818] focus:ring-emerald-500"
                            />
                            <span>{obj}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Poultry Type */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs">
                        Poultry Type *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
                        {[
                          { type: 'Broiler (Meat)', icon: '🐔', desc: '40-45 Days Cycle' },
                          { type: 'Layer (Egg)', icon: '🥚', desc: 'Daily Egg Production' },
                          { type: 'EC / Environment Controlled', icon: '🏛️', desc: 'Modern High Density' },
                          { type: 'Other', icon: '⚙', desc: 'Desi / Breeder' }
                        ].map((item) => (
                          <div
                            key={item.type}
                            onClick={() => setFormData({ ...formData, poultryType: item.type as any })}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                              formData.poultryType === item.type
                                ? 'border-[#0b2818] bg-emerald-50 ring-2 ring-emerald-700/20 font-bold text-emerald-950 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                            }`}
                          >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-bold text-slate-900 text-xs">{item.type}</span>
                            <span className="text-[10px] text-slate-400">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shed Type & Capacity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-2">
                          Shed Type *
                        </label>
                        <div className="space-y-2">
                          <label
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer ${
                              formData.shedType === 'EC (Environment Controlled)'
                                ? 'border-[#0b2818] bg-emerald-50 text-emerald-950 font-bold'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shedType"
                              checked={formData.shedType === 'EC (Environment Controlled)'}
                              onChange={() => setFormData({ ...formData, shedType: 'EC (Environment Controlled)' })}
                              className="w-4 h-4 text-[#0b2818]"
                            />
                            <div>
                              <div>EC (Environment Controlled)</div>
                              <div className="text-[10px] text-slate-500 font-normal">Cooling pads, exhaust fans & auto feeders</div>
                            </div>
                          </label>

                          <label
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer ${
                              formData.shedType === 'Conventional / Normal'
                                ? 'border-[#0b2818] bg-emerald-50 text-emerald-950 font-bold'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shedType"
                              checked={formData.shedType === 'Conventional / Normal'}
                              onChange={() => setFormData({ ...formData, shedType: 'Conventional / Normal' })}
                              className="w-4 h-4 text-[#0b2818]"
                            />
                            <div>
                              <div>Conventional / Normal</div>
                              <div className="text-[10px] text-slate-500 font-normal">Open-sided deep litter system</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-2">
                          Proposed Capacity (Number of Birds) *
                        </label>
                        <select
                          value={formData.proposedCapacity}
                          onChange={(e) => setFormData({ ...formData, proposedCapacity: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        >
                          <option value="5,000">5,000 Birds</option>
                          <option value="10,000">10,000 Birds</option>
                          <option value="15,000">15,000 Birds</option>
                          <option value="20,000">20,000 Birds (Standard Commercial)</option>
                          <option value="25,000">25,000 Birds</option>
                          <option value="30,000">30,000 Birds</option>
                          <option value="50,000">50,000+ Birds</option>
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          Standard commercial setup: 20,000 birds requires approx 20,000 - 22,000 sq.ft shed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Land Details */}
                {currentStep === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="pb-2 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        3. Land Details
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tell us about the land for your poultry farm.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                          Do you have land available? *
                        </label>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="hasLand"
                              checked={formData.hasLand === 'Yes'}
                              onChange={() => setFormData({ ...formData, hasLand: 'Yes' })}
                              className="w-4 h-4 text-[#0b2818]"
                            />
                            <span>Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="hasLand"
                              checked={formData.hasLand === 'No'}
                              onChange={() => setFormData({ ...formData, hasLand: 'No' })}
                              className="w-4 h-4 text-[#0b2818]"
                            />
                            <span>No (Looking to purchase/lease)</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Land Ownership *
                        </label>
                        <select
                          value={formData.landOwnership}
                          onChange={(e) => setFormData({ ...formData, landOwnership: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        >
                          <option value="Own Land">Own Land</option>
                          <option value="Leased Land">Leased Land (Long term)</option>
                          <option value="Family Land">Family / Ancestral Land</option>
                          <option value="Buying New Land">Buying New Land</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Approx. Land Area (in Acres) *
                        </label>
                        <input
                          type="text"
                          value={formData.landAreaAcres}
                          onChange={(e) => setFormData({ ...formData, landAreaAcres: e.target.value })}
                          placeholder="e.g. 2"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          State *
                        </label>
                        <select
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        >
                          <option value="Madhya Pradesh">Madhya Pradesh</option>
                          <option value="Chhattisgarh">Chhattisgarh</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Odisha">Odisha</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          District *
                        </label>
                        <input
                          type="text"
                          value={formData.district}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          placeholder="e.g. Bhopal"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Village / City *
                        </label>
                        <input
                          type="text"
                          value={formData.villageOrCity}
                          onChange={(e) => setFormData({ ...formData, villageOrCity: e.target.value })}
                          placeholder="e.g. Kokta"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">
                        Project Location (Google Maps Link) (Optional)
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="url"
                          value={formData.googleMapsLink}
                          onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
                          placeholder="Paste Google Maps location link"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 mt-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Select exact location for better assistance & soil inspection.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Financial Details */}
                {currentStep === 4 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="pb-2 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        4. Financial Details
                      </h3>
                      <p className="text-xs text-slate-500">
                        Help us understand your investment plan.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Approx. Project Cost *
                        </label>
                        <select
                          value={formData.approxProjectCost}
                          onChange={(e) => setFormData({ ...formData, approxProjectCost: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        >
                          <option value="₹10 - 25 Lakh">₹10 - 25 Lakh</option>
                          <option value="₹25 - 50 Lakh">₹25 - 50 Lakh</option>
                          <option value="₹50 Lakh - ₹1 Crore">₹50 Lakh - ₹1 Crore</option>
                          <option value="Above ₹1 Crore">Above ₹1 Crore</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1.5">
                          Do you need bank loan / financing? *
                        </label>
                        <div className="flex items-center gap-4">
                          {['Yes', 'No', 'Need guidance'].map((opt) => (
                            <label key={opt} className="flex items-center gap-1.5 cursor-pointer font-medium">
                              <input
                                type="radio"
                                name="needsLoan"
                                checked={formData.needsLoan === opt}
                                onChange={() => setFormData({ ...formData, needsLoan: opt as any })}
                                className="w-4 h-4 text-[#0b2818]"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Your Own Contribution *
                        </label>
                        <select
                          value={formData.ownContribution}
                          onChange={(e) => setFormData({ ...formData, ownContribution: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        >
                          <option value="₹5 - 10 Lakh">₹5 - 10 Lakh</option>
                          <option value="₹10 - 25 Lakh">₹10 - 25 Lakh</option>
                          <option value="₹25 - 50 Lakh">₹25 - 50 Lakh</option>
                          <option value="Full Self Funded">Full Self Funded</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Approx. Loan Amount *
                        </label>
                        <select
                          value={formData.approxLoanAmount}
                          onChange={(e) => setFormData({ ...formData, approxLoanAmount: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                        >
                          <option value="₹10 - 25 Lakh">₹10 - 25 Lakh</option>
                          <option value="₹25 - 50 Lakh">₹25 - 50 Lakh</option>
                          <option value="₹50 - 75 Lakh">₹50 - 75 Lakh</option>
                          <option value="Above ₹75 Lakh">Above ₹75 Lakh</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                        Have you already discussed with any bank?
                      </label>
                      <div className="flex items-center gap-6 text-xs font-medium">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="discussedWithBank"
                            checked={formData.discussedWithBank === 'Yes'}
                            onChange={() => setFormData({ ...formData, discussedWithBank: 'Yes' })}
                            className="w-4 h-4 text-[#0b2818]"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="discussedWithBank"
                            checked={formData.discussedWithBank === 'No'}
                            onChange={() => setFormData({ ...formData, discussedWithBank: 'No' })}
                            className="w-4 h-4 text-[#0b2818]"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>

                    {/* Green Callout Highlight box matching image */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      <span className="font-semibold text-emerald-900">
                        We help you with bank loan assistance, DPR and complete project support.
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 5: Experience & Support */}
                {currentStep === 5 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="pb-2 border-b border-slate-100">
                      <h3 className="text-base font-bold text-slate-900">
                        5. Experience & Support
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tell us about your experience and what support you need.
                      </p>
                    </div>

                    {/* Experience */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs">
                        Do you have poultry farming experience? *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {[
                          'No, I am new',
                          'Yes, 1-3 years',
                          'Yes, 3+ years',
                          'Family poultry business'
                        ].map((exp) => (
                          <label
                            key={exp}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer ${
                              formData.experience === exp
                                ? 'border-[#0b2818] bg-emerald-50 text-emerald-950 font-bold'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="experience"
                              checked={formData.experience === exp}
                              onChange={() => setFormData({ ...formData, experience: exp as any })}
                              className="w-4 h-4 text-[#0b2818]"
                            />
                            <span>{exp}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Support Needed Checkboxes */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2 text-xs">
                        What support do you need? (Select all that apply)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          'Farm Setup / Project Planning',
                          'Shed Construction',
                          'Poultry Equipment',
                          'DPR / Project Report',
                          'Bank Loan Assistance',
                          'Technical Consultancy',
                          'Complete Project Setup'
                        ].map((item) => {
                          const isChecked = formData.supportNeeded.includes(item);
                          return (
                            <label
                              key={item}
                              onClick={() => toggleSupportItem(item)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                isChecked
                                  ? 'border-[#0b2818] bg-emerald-50/70 font-bold text-emerald-950'
                                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 text-[#0b2818] rounded"
                              />
                              <span>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">
                        When do you want to start this project? *
                      </label>
                      <select
                        value={formData.startTimeline}
                        onChange={(e) => setFormData({ ...formData, startTimeline: e.target.value as any })}
                        className="w-full sm:w-72 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b2818]"
                      >
                        <option value="Immediately">Immediately</option>
                        <option value="Within 1 month">Within 1 month</option>
                        <option value="Within 3 months">Within 3 months</option>
                        <option value="In 3-6 months">In 3-6 months</option>
                        <option value="Planning stage">Planning stage</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 6: Review & Submit */}
                {currentStep === 6 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          6. Review & Submit
                        </h3>
                        <p className="text-xs text-slate-500">
                          Please verify your project details before final registration.
                        </p>
                      </div>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* 2-Column Review Layout matching Mockup Step 6 */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                      {/* Left: Your Details */}
                      <div className="md:col-span-7 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-900">
                          <span>Your Details</span>
                          <button
                            onClick={() => setCurrentStep(1)}
                            className="text-emerald-800 flex items-center gap-1 font-semibold text-[11px]"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        </div>

                        <div className="space-y-1.5 text-slate-700">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Name:</span>
                            <span className="font-bold text-slate-900">{formData.fullName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Mobile:</span>
                            <span className="font-mono font-bold text-slate-900">+91 {formData.mobileNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Email:</span>
                            <span className="text-slate-800">{formData.email || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Location:</span>
                            <span className="font-semibold text-slate-900">{formData.villageOrCity}, {formData.district}, {formData.state}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Project:</span>
                            <span className="font-semibold text-slate-900">{formData.projectObjective} ({formData.poultryType.replace(' (Meat)', '').replace(' (Egg)', '')})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Capacity:</span>
                            <span className="font-mono font-bold text-emerald-900">{formData.proposedCapacity} Birds ({formData.shedType.replace('Conventional / ', '')})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Land:</span>
                            <span className="text-slate-800">{formData.landAreaAcres} Acres ({formData.landOwnership})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Project Cost:</span>
                            <span className="font-bold text-slate-900">{formData.approxProjectCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Loan Required:</span>
                            <span className="text-slate-800">{formData.needsLoan} ({formData.approxLoanAmount})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Experience:</span>
                            <span className="text-slate-800">New (Planning to start {formData.startTimeline.toLowerCase()})</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Declaration & Submit Box */}
                      <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                        <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs space-y-2.5">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                            <ShieldCheck className="w-4 h-4 text-emerald-700" />
                            <span>{formData.preferredLanguage === 'Hindi' ? 'ग्राहक घोषणा एवं सहमति' : 'Customer Declaration & Consent'}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed font-medium text-[11px]">
                            {formData.preferredLanguage === 'Hindi'
                              ? 'Submit Application पर क्लिक करने के बाद पूरी घोषणा खुलेगी। दोनों अनिवार्य सहमति स्वीकार करने के बाद ही आवेदन जमा होगा।'
                              : 'The complete declaration will open after you click Submit Application. The application will be submitted only after both mandatory consents are accepted.'}
                          </p>
                        </div>

                        <div className="space-y-2">

                          <button
                            type="button"
                            onClick={requestFinalSubmission}
                            className="w-full py-3.5 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 bg-[#0b2818] hover:bg-[#123e27] text-white shadow-[#0b2818]/20"
                          >
                            <span>{formData.preferredLanguage === 'Hindi' ? 'आवेदन जमा करें' : 'Submit Application'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 text-center">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Your information is 100% secure and confidential.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Buttons (Back / Save & Next) */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      currentStep === 1
                        ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  {currentStep < 6 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <span>Save & Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Success Screen after submission */}
            {isSubmitted && (
              <div className="py-8 px-4 text-center space-y-5 animate-in zoom-in-95 duration-200 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                    Lead ID: {submittedAppId}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                    Congratulations, {formData.fullName}!
                  </h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Your poultry farm registration has been successfully received by AKBS Poultry Farming Pvt. Ltd.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-left space-y-2">
                  <div className="font-bold text-slate-900">What Happens Next?</div>
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#0b2818] text-white text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                      <span>Our regional poultry technical consultant will call you within <b>2 business hours</b>.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#0b2818] text-white text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                      <span>Free feasibility estimate & customized DPR layout for <b>{formData.proposedCapacity} Birds</b>.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#0b2818] text-white text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                      <span>Site inspection, if required, will be scheduled after AKBS reviews the submitted project details.</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 pt-2">

                  {onGoToLeads && (
                    <button
                      onClick={() => onGoToLeads(submittedAppId)}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#0b2818] hover:bg-[#123e27] text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                    >
                      <span>👥</span>
                      <span>View Lead in Leads CRM</span>
                    </button>
                  )}

                  {onGoToCRM && (
                    <button
                      onClick={onGoToCRM}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span>📊</span>
                      <span>Open CRM Dashboard</span>
                    </button>
                  )}

                  <button
                    onClick={trackSubmittedApplication}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                  >
                    Track Status
                  </button>

                  <button
                    onClick={startNewApplication}
                    className="w-full sm:w-auto px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    + New Apply
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {isConsentModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-3xl max-h-[94vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-4 sm:px-5 py-3.5 bg-[#0b2818] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <Lock className="w-4.5 h-4.5 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-['Outfit',sans-serif] text-sm sm:text-base font-black truncate">
                    {CUSTOMER_CONSENT_CONTENT[consentLanguage].title}
                  </h2>
                  <div className="text-[10px] text-emerald-200 font-mono">{CUSTOMER_CONSENT_VERSION}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center shrink-0"
                aria-label="Close declaration"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed max-w-2xl">
                {CUSTOMER_CONSENT_CONTENT[consentLanguage].intro}
              </p>
              <select
                value={consentLanguage}
                onChange={(e) => {
                  setConsentLanguage(e.target.value as ConsentLanguage);
                  setConsentTermsAccepted(false);
                  setConsentContactAccepted(false);
                  setConsentScrolledToEnd(false);
                }}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 shrink-0"
              >
                <option value="English">English</option>
                <option value="Hindi">हिंदी</option>
              </select>
            </div>

            <div
              onScroll={handleConsentScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 bg-white"
            >
              <div className="max-w-2xl mx-auto space-y-5">
                {CUSTOMER_CONSENT_CONTENT[consentLanguage].sections.map((section) => (
                  <section key={section.title}>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">{section.title}</h3>
                    <div className="mt-1.5 space-y-2 text-[11px] sm:text-xs text-slate-600 leading-5 sm:leading-6">
                      {section.paragraphs.map((paragraph, index) => (
                        <p key={index} className={section.title.startsWith('12.') ? 'font-semibold text-slate-800' : ''}>
                          {paragraph}
                        </p>
                      ))}
                      {section.bullets && (
                        <ul className="pl-5 list-disc space-y-1">
                          {section.bullets.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}

                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[11px] sm:text-xs text-emerald-900 font-semibold">
                  {consentLanguage === 'Hindi'
                    ? 'आपने घोषणा के अंत तक पढ़ लिया है। अब नीचे दोनों अनिवार्य सहमति चुनकर आगे बढ़ें।'
                    : 'You have reached the end of the declaration. Please accept both mandatory consents below to continue.'}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-5 py-4 border-t border-slate-200 bg-slate-50 space-y-3">
              {!consentScrolledToEnd && (
                <div className="text-[10px] sm:text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {CUSTOMER_CONSENT_CONTENT[consentLanguage].scrollHint}
                </div>
              )}

              <label className={`flex items-start gap-2.5 text-[11px] sm:text-xs ${
                consentScrolledToEnd ? 'cursor-pointer text-slate-700' : 'cursor-not-allowed text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  disabled={!consentScrolledToEnd}
                  checked={consentTermsAccepted}
                  onChange={(e) => setConsentTermsAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#0b2818] focus:ring-emerald-500"
                />
                <span className="font-semibold leading-relaxed">{CUSTOMER_CONSENT_CONTENT[consentLanguage].termsConsent}</span>
              </label>

              <label className={`flex items-start gap-2.5 text-[11px] sm:text-xs ${
                consentScrolledToEnd ? 'cursor-pointer text-slate-700' : 'cursor-not-allowed text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  disabled={!consentScrolledToEnd}
                  checked={consentContactAccepted}
                  onChange={(e) => setConsentContactAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#0b2818] focus:ring-emerald-500"
                />
                <span className="font-semibold leading-relaxed">{CUSTOMER_CONSENT_CONTENT[consentLanguage].contactConsent}</span>
              </label>

              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{CUSTOMER_CONSENT_CONTENT[consentLanguage].secureText}</span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConsentModalOpen(false)}
                  className="h-10 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
                >
                  {CUSTOMER_CONSENT_CONTENT[consentLanguage].cancelButton}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitApplication()}
                  disabled={!consentScrolledToEnd || !consentTermsAccepted || !consentContactAccepted}
                  className="h-10 px-5 rounded-xl bg-[#0b2818] hover:bg-[#123e27] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-black flex items-center justify-center gap-2"
                >
                  <span>{CUSTOMER_CONSENT_CONTENT[consentLanguage].agreeButton}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM BANNER (Matching Screenshot 2 with Premium Fonts & Golden CTA) */}
      {/* ========================================================================= */}
      <footer className="mt-auto bg-[#071911] text-white border-t border-[#143e27] py-4 px-4 sm:px-6">
        <div className="max-w-[1560px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Left 4 Stats with Premium Outfit Typography */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6 sm:gap-8 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">500+</div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] text-slate-300 font-semibold leading-snug uppercase tracking-wider">Happy<br />Farmers</div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">₹500Cr+</div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] text-slate-300 font-semibold leading-snug uppercase tracking-wider">Projects<br />Supported</div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">28+</div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] text-slate-300 font-semibold leading-snug uppercase tracking-wider">Districts<br />Covered</div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">95%</div>
              <div className="font-['Plus_Jakarta_Sans',sans-serif] text-[11px] text-slate-300 font-semibold leading-snug uppercase tracking-wider">Success<br />Rate</div>
            </div>
          </div>

          {/* Center Tagline with Premium Editorial Playfair Display Serif */}
          <div className="text-center font-['Playfair_Display',serif] text-base sm:text-lg lg:text-xl font-medium italic text-[#A7F3D0] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            "Empowering Poultry Entrepreneurs Across India"
          </div>

          {/* Right Features & Golden CTA Button */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-300 font-medium">
              <span className="flex items-center gap-1">🏢 Project Guidance</span>
              <span className="flex items-center gap-1">🏛️ Bank Loan Support</span>
              <span className="flex items-center gap-1">📊 DPR Assistance</span>
              <span className="flex items-center gap-1">👥 Expert Team</span>
            </div>

            <button
              onClick={() => {
                setActiveSideMenu('registration');
                setCurrentStep(1);
                setIsSubmitted(false);
                setViewMode('wizard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-7 py-3 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-['Outfit',sans-serif] font-black text-xs sm:text-sm rounded-full shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 tracking-wide flex items-center gap-2.5"
            >
              <span>Start Your Journey Today</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
