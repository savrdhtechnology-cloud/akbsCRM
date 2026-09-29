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

const path = window.location.pathname;
const isCustomerRegistration = /^\/customer-registration\/?$/.test(path);
const isPartnerRegistration = /^\/partner-registration\/?$/.test(path);
const isPartnerPortal = /^\/partner-portal\/?$/.test(path);
const publicAcceptance = /^\/soft-quotations\/accept\/[^/]+\/?$/.test(path);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCustomerRegistration ? (
      <CustomerRegistrationPortal />
    ) : isPartnerRegistration ? (
      <PartnerRegistrationPortal />
    ) : isPartnerPortal ? (
      <PartnerBusinessPortal />
    ) : publicAcceptance ? (
      <SoftQuotationAcceptancePage />
    ) : (
      <CrmProvider><App /></CrmProvider>
    )}
  </StrictMode>,
);
