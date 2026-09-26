import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SoftQuotationAcceptancePage } from './features/softQuotations/SoftQuotationAcceptancePage';
import { CrmProvider } from './lib/crm';
import './lib/connection.css';
import './index.css';

const publicRegistration = /^\/(customer|partner)-registration\/?$/.exec(window.location.pathname);
if(publicRegistration) window.location.replace(`https://www.akbspoultry.com/${publicRegistration[1]}/register`);
const publicAcceptance = /^\/soft-quotations\/accept\/[^/]+\/?$/.test(window.location.pathname);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicRegistration ? <p>Opening registration…</p> : publicAcceptance ? <SoftQuotationAcceptancePage /> : <CrmProvider><App /></CrmProvider>}
  </StrictMode>,
);

