// akbs-workforce-reminder
// Sends ONE AKBS reminder email on behalf of the SAVRDH AI Workforce, through the
// same AKBS email settings, template and 60-minute cooldown as the CRM's own
// "Email Registration Reminder" / fee reminder buttons, and records it on the lead
// timeline as "AI Workforce · <agent>". Every call has already been approved by an
// admin in the Workforce. Server-to-server only: requires the workforce token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sendEmail(cfg: { apiKey: string; from: string; replyTo: string }, msg: { to: string; subject: string; html: string }, key: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.apiKey, "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify({ from: cfg.from, reply_to: cfg.replyTo, to: [msg.to], subject: msg.subject, html: msg.html }),
      signal: AbortSignal.timeout(10000),
    });
    const out = await r.json().catch(() => ({}));
    if (r.ok && typeof out.id === "string") return out.id as string;
    if (attempt === 0 && (r.status === 429 || r.status >= 500)) { await new Promise((s) => setTimeout(s, 500)); continue; }
    throw Object.assign(new Error("Email service did not accept the message (HTTP " + r.status + ")."), { permanent: r.status < 500 && r.status !== 429 });
  }
  throw new Error("Unable to send email.");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const token = (req.headers.get("x-workforce-token") || "").trim();
  const ok = await sb.rpc("akbs_workforce_token_ok", { p_token: token });
  if (ok.error || ok.data !== true) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const purpose = String(body.purpose || "");
  const agent = String(body.agent || "").slice(0, 60);
  const requestId = String(body.request_id || "").slice(0, 80);
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) || !["registration", "payment"].includes(purpose) || !requestId)
    return json({ error: "Invalid request" }, 422);

  const claim = await sb.rpc("akbs_workforce_reminder_claim", { p_email: email, p_purpose: purpose });
  if (claim.error) return json({ error: "Unable to prepare this reminder." }, 400);
  if (claim.data?.error) return json(claim.data, claim.data.status || 400);
  const c = claim.data;

  try {
    const cfgOut = await sb.rpc("akbs_collection_delivery_config");
    if (cfgOut.error) throw new Error("AKBS email configuration is unavailable.");
    const cfg = { ...cfgOut.data, apiKey: Deno.env.get("AKBS_RESEND_API_KEY") || cfgOut.data?.apiKey };
    if (!cfg.apiKey) throw new Error("AKBS email service is not configured.");

    const portal = "https://crm.akbspoultry.com/customer-registration";
    const row = c.row || {};
    const due = Number(row.payable ?? row.amount ?? 0);
    const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(due);
    const a = c.paymentAccount;
    const bank = a
      ? '<div style="background:#f3f8f5;padding:16px;border-radius:10px"><b>Official AKBS Company Payment Account</b>' +
        [["Account Name", a.accountHolder], ["Bank", a.bankName], ["Account Number", a.accountNumber], ["IFSC", a.ifsc], ["UPI", a.upiId]]
          .filter(([, v]) => v).map(([l, v]) => "<div>" + esc(l) + ": " + esc(v) + "</div>").join("") + "</div>"
      : "";
    const content = purpose === "registration"
      ? "<p>Thank you for contacting AKBS Poultry Farming Pvt. Ltd. Please complete and submit your customer registration to start your application.</p><p>Your saved registration details will be available after signing in with your registered email.</p><p>कृपया अपना ग्राहक रजिस्ट्रेशन पूरा करके आवेदन जमा करें।</p>"
      : "<p>Your <b>" + esc(row.serviceType) + "</b> is pending for application <b>" + esc(c.applicationId) + '</b>.</p><p style="font-size:28px;font-weight:bold;color:#075c3e">' + esc(amount) + "</p>" + bank + "<p>After payment, submit the UTR / transaction reference and payment proof in your Customer Portal.</p>";
    const html = '<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#18382d;line-height:1.6"><div style="background:#073b29;color:white;padding:24px"><h2>AKBS Poultry Farming Pvt. Ltd.</h2><p>' +
      (purpose === "registration" ? "Customer Registration Reminder" : "Fee Payment Reminder") +
      '</p></div><div style="padding:24px;border:1px solid #dce8e1"><p>Dear ' + esc(c.customerName) + ",</p>" + content +
      '<p><a href="' + portal + '" style="display:inline-block;background:#075c3e;color:white;text-decoration:none;padding:12px 20px;border-radius:8px">' +
      (purpose === "registration" ? "Complete Registration" : "Open Customer Portal") + "</a></p><p>www.akbspoultry.com · support@akbspoultry.com</p></div></div>";
    const subject = purpose === "registration" ? "AKBS Customer Registration Reminder" : "AKBS Fee Payment Reminder - " + c.applicationId;

    const emailId = await sendEmail(cfg, { to: c.email, subject, html }, "akbs-workforce-" + c.deliveryId);
    const fin = await sb.rpc("akbs_workforce_reminder_finish", { p_delivery_id: c.deliveryId, p_email_id: emailId, p_agent: agent });
    return json({ ok: true, email_id: emailId, subject, purpose, lead_id: c.leadId, request_id: requestId, retry_at: fin.data?.retryAt || null });
  } catch (error) {
    await sb.rpc("akbs_workforce_reminder_finish", { p_delivery_id: c.deliveryId, p_email_id: null, p_agent: agent, p_permanent_failure: Boolean((error as { permanent?: boolean }).permanent) });
    console.warn(JSON.stringify({ event: "WORKFORCE_REMINDER_FAILED", message: error instanceof Error ? error.message : "unknown" }));
    return json({ error: error instanceof Error ? error.message : "Unable to send this reminder." }, 502);
  }
});
