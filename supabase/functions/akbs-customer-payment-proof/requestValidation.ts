export type PaymentRequestEnvelope = {
  sessionToken?: unknown;
  applicationId?: unknown;
  reference?: unknown;
  file?: unknown;
  [key: string]: unknown;
};

const FORBIDDEN_CLIENT_STATE = [
  "customerId",
  "customer_id",
  "amount",
  "status",
  "paymentStatus",
  "verificationStatus",
  "verified",
  "approved",
  "collectionStatus"
] as const;

export function validatePaymentRequestEnvelope(body: PaymentRequestEnvelope) {
  const forbiddenKey = FORBIDDEN_CLIENT_STATE.find(
    key => Object.prototype.hasOwnProperty.call(body, key)
  );

  if (forbiddenKey) {
    return {
      ok: false as const,
      status: 400,
      code: "CLIENT_STATE_NOT_ALLOWED",
      message: "Payment status and collection state are managed only by AKBS."
    };
  }

  const sessionToken = String(body?.sessionToken || "").trim();
  const applicationHint = String(body?.applicationId || "").trim();
  const reference = String(body?.reference || "").trim();
  const file = body?.file || null;

  if (!sessionToken) {
    return {
      ok: false as const,
      status: 401,
      code: "SESSION_REQUIRED",
      message: "Please sign in again."
    };
  }

  if (!applicationHint) {
    return {
      ok: false as const,
      status: 400,
      code: "APPLICATION_ID_REQUIRED",
      message: "Application number is required."
    };
  }

  if (reference.length < 6 || reference.length > 60) {
    return {
      ok: false as const,
      status: 400,
      code: "INVALID_PAYMENT_REFERENCE",
      message: "Enter a valid UTR / transaction reference."
    };
  }

  if (
    !file ||
    typeof file !== "object" ||
    !("data" in file) ||
    !("name" in file) ||
    !("type" in file)
  ) {
    return {
      ok: false as const,
      status: 400,
      code: "PAYMENT_PROOF_REQUIRED",
      message: "Upload payment proof before submitting."
    };
  }

  return {
    ok: true as const,
    sessionToken,
    applicationHint,
    reference,
    file: file as { data: unknown; name: unknown; type: unknown }
  };
}
