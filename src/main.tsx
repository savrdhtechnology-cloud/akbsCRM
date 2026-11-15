import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CustomerRegistrationPortal } from './components/CustomerRegistrationPortal';
import { PartnerRegistrationPortal } from './components/PartnerRegistrationPortal';
import { PartnerBusinessPortal } from './components/PartnerBusinessPortal';
import { SoftQuotationAcceptancePage } from './features/softQuotations/SoftQuotationAcceptancePage';
import { CrmProvider } from './lib/crm';
import './lib/connection.css';
import './index.css';
import './components/premium/premium.css';
import './components/premium/premium-vite.css';
import './components/premium/portal-theme.css';

const path = window.location.pathname;
const isCustomerRegistration = /^\/customer-registration\/?$/.test(path);
const isPartnerRegistration = /^\/partner-registration\/?$/.test(path);
const isPartnerPortal = /^\/partner-portal\/?$/.test(path);
const publicAcceptance = /^\/soft-quotations\/accept\/[^/]+\/?$/.test(path);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCustomerRegistration ? (
      <div className="akbs-self-service"><CustomerRegistrationPortal /></div>
    ) : isPartnerRegistration ? (
      <div className="akbs-self-service"><PartnerRegistrationPortal /></div>
    ) : isPartnerPortal ? (
      <div className="akbs-self-service"><PartnerBusinessPortal /></div>
    ) : publicAcceptance ? (
      <SoftQuotationAcceptancePage />
    ) : (
      <CrmProvider><App /></CrmProvider>
    )}
  </StrictMode>,
);
