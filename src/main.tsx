import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CrmProvider } from "./lib/crm";
import { CrmWorkspace } from "./components/CrmWorkspace";
import { CustomerRegistrationPortal } from "./components/CustomerRegistrationPortal";
import { PartnerRegistrationPortal } from "./components/PartnerRegistrationPortal";
import "./workspace.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {window.location.pathname.replace(/\/$/, "") ===
    "/customer-registration" ? (
      <CustomerRegistrationPortal />
    ) : window.location.pathname.replace(/\/$/, "") ===
      "/partner-registration" ? (
      <PartnerRegistrationPortal />
    ) : (
      <CrmProvider>
        <CrmWorkspace />
      </CrmProvider>
    )}
  </StrictMode>,
);
