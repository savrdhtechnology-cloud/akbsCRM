import React, { useState } from "react";
import { AkbsLogo } from "./AkbsLogo";
import broilerHeroImg from "../assets/images/broiler_farmer_hero_1790287489096.jpg";

type Mode = "login" | "signup" | "forgot";

type StaffUser = {
  name: string;
  must_change_password: boolean;
};

type Props = {
  user: StaffUser | null;
  busy: boolean;
  error: string;
  onLogin: (login: string, password: string) => Promise<void>;
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<void>;
  onSignupRequest: (data: {
    name: string;
    phone: string;
    email: string;
    department: string;
    role: string;
  }) => Promise<void>;
  onResetRequest: (data: {
    login: string;
    email: string;
    phone: string;
  }) => Promise<void>;
};

export function AuthPortal({
  user,
  busy,
  error,
  onLogin,
  onPasswordChange,
  onSignupRequest,
  onResetRequest,
}: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [notice, setNotice] = useState("");

  const switchMode = (next: Mode) => {
    setNotice("");
    setMode(next);
  };

  return (
    <div className="crm-login">
      <div className="crm-login-shell">
        <section
          className="crm-login-visual"
          aria-label="AKBS CRM overview"
          style={{
            backgroundImage:
              `linear-gradient(90deg,rgba(247,251,248,.98) 0%,rgba(247,251,248,.90) 38%,rgba(247,251,248,.26) 72%,rgba(5,50,34,.12) 100%),url(${broilerHeroImg})`,
          }}
        >
          <div className="crm-login-brand">
            <AkbsLogo size="lg" />
          </div>

          <div className="crm-login-visual-copy">
            <span className="crm-login-kicker">AKBS POULTRY FARMING</span>
            <h2>
              Empowering Poultry Entrepreneurs
              <span>Across India</span>
            </h2>
            <p>
              A complete CRM to manage inquiries, customers, projects,
              documentation, financing and growth — all in one place.
            </p>
          </div>

          <div className="crm-login-feature-list">
            <div><b>01</b><p><strong>Manage Customers</strong><span>From inquiry to project</span></p></div>
            <div><b>02</b><p><strong>Track Projects</strong><span>DPR, proposals & financing</span></p></div>
            <div><b>03</b><p><strong>Team Productivity</strong><span>Live activity, tasks & reports</span></p></div>
            <div><b>04</b><p><strong>Partner Growth</strong><span>Partner records & business support</span></p></div>
          </div>

          <div className="crm-login-trust">
            <span>Modern Farming Solutions</span>
            <span>Expert Technical Support</span>
            <span>End-to-End Project Assistance</span>
          </div>
        </section>

        <section className="crm-login-panel">
          <div className="crm-login-card">
            <div className="crm-login-mobile-brand"><AkbsLogo size="md" /></div>

            {user ? (
              <form
                className="crm-auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await onPasswordChange(
                    String(f.get("current") || ""),
                    String(f.get("password") || ""),
                  );
                }}
              >
                <div className="crm-login-heading">
                  <span className="crm-eyebrow">SECURE ACCOUNT SETUP</span>
                  <h1>Set your new password</h1>
                  <p>Replace your temporary password before accessing the CRM.</p>
                </div>
                <div className="crm-login-fields">
                  <label><span>Current password</span><input name="current" type="password" required autoComplete="current-password" placeholder="Enter temporary password" /></label>
                  <label><span>New password</span><input name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" placeholder="Create a secure new password" /></label>
                </div>
                {error && <p role="alert" className="crm-error">{error}</p>}
                <button className="primary crm-login-submit" disabled={busy}>{busy ? "Please wait…" : "Save password & continue →"}</button>
              </form>
            ) : mode === "login" ? (
              <form
                className="crm-auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setNotice("");
                  const f = new FormData(e.currentTarget);
                  await onLogin(
                    String(f.get("login") || ""),
                    String(f.get("password") || ""),
                  );
                }}
              >
                <div className="crm-login-heading">
                  <span className="crm-eyebrow">WELCOME TO</span>
                  <h1>AKBS CRM</h1>
                  <p>Sign in with your registered AKBS staff account to access the CRM dashboard.</p>
                </div>

                <div className="crm-login-fields">
                  <label><span>Email / Login ID</span><input name="login" required autoComplete="username" type="text" placeholder="Enter your email or login ID" /></label>
                  <label><span>Password</span><input name="password" required type="password" minLength={1} maxLength={72} autoComplete="current-password" placeholder="Enter your password" /></label>
                </div>

                <div className="crm-auth-row">
                  <span className="crm-auth-helper">Registered staff access only</span>
                  <button type="button" className="crm-text-action" onClick={() => switchMode("forgot")}>Forgot password?</button>
                </div>

                {error && <p role="alert" className="crm-error">{error}</p>}
                {notice && <p role="status" className="crm-success">{notice}</p>}

                <button className="primary crm-login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely →"}</button>

                <div className="crm-login-divider"><span>New to AKBS CRM?</span></div>
                <button type="button" className="crm-signup-link" onClick={() => switchMode("signup")}>Create account / Sign up</button>

                <div className="crm-login-footer-note">
                  CRM access is granted only after AKBS admin approval.
                </div>
              </form>
            ) : mode === "signup" ? (
              <form
                className="crm-auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setNotice("");
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  await onSignupRequest({
                    name: String(f.get("name") || ""),
                    phone: String(f.get("phone") || ""),
                    email: String(f.get("email") || ""),
                    department: String(f.get("department") || ""),
                    role: String(f.get("role") || ""),
                  });
                  setNotice("Sign-up request submitted. An AKBS administrator must approve and create your staff login before you can access the CRM.");
                  form.reset();
                }}
              >
                <div className="crm-login-heading">
                  <span className="crm-eyebrow">NEW STAFF ACCESS</span>
                  <h1>Request an account</h1>
                  <p>Submit your details. Creating this request does not give immediate CRM access.</p>
                </div>

                <div className="crm-login-fields crm-signup-grid">
                  <label><span>Full Name</span><input name="name" required type="text" placeholder="Enter full name" /></label>
                  <label><span>Mobile Number</span><input name="phone" required type="tel" placeholder="+91" /></label>
                  <label className="crm-span-2"><span>Official Email</span><input name="email" required type="email" placeholder="name@akbspoultry.com" /></label>
                  <label><span>Department</span><input name="department" required type="text" placeholder="Sales / Finance / Operations" /></label>
                  <label>
                    <span>Requested Role</span>
                    <select name="role" required defaultValue="">
                      <option value="" disabled>Select role</option>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="FINANCE">Finance</option>
                    </select>
                  </label>
                </div>

                {error && <p role="alert" className="crm-error">{error}</p>}
                {notice && <p role="status" className="crm-success">{notice}</p>}

                <button className="primary crm-login-submit" disabled={busy}>{busy ? "Submitting…" : "Submit sign-up request →"}</button>
                <button type="button" className="crm-back-login" onClick={() => switchMode("login")}>← Already registered? Back to login</button>
              </form>
            ) : (
              <form
                className="crm-auth-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setNotice("");
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  await onResetRequest({
                    login: String(f.get("login") || ""),
                    email: String(f.get("email") || ""),
                    phone: String(f.get("phone") || ""),
                  });
                  setNotice("Password reset request submitted. AKBS admin will verify your account and help reset your access.");
                  form.reset();
                }}
              >
                <div className="crm-login-heading">
                  <span className="crm-eyebrow">ACCOUNT RECOVERY</span>
                  <h1>Forgot password?</h1>
                  <p>Send a verified reset request. Your CRM password is not changed until AKBS admin confirms your account.</p>
                </div>

                <div className="crm-login-fields">
                  <label><span>Email / Login ID</span><input name="login" required type="text" placeholder="Enter registered login ID" /></label>
                  <label><span>Registered Email</span><input name="email" required type="email" placeholder="Enter registered email" /></label>
                  <label><span>Registered Mobile Number</span><input name="phone" required type="tel" placeholder="+91" /></label>
                </div>

                {error && <p role="alert" className="crm-error">{error}</p>}
                {notice && <p role="status" className="crm-success">{notice}</p>}

                <button className="primary crm-login-submit" disabled={busy}>{busy ? "Submitting…" : "Request password reset →"}</button>
                <button type="button" className="crm-back-login" onClick={() => switchMode("login")}>← Back to login</button>
              </form>
            )}

            <div className="crm-security-note">
              Secure staff portal · Valid Login ID and Password are required for CRM access.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
