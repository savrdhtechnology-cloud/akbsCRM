import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePaymentRequestEnvelope } from '../supabase/functions/akbs-customer-payment-proof/requestValidation.ts';

const validFile = {
  name: 'proof.png',
  type: 'image/png',
  data: 'data:image/png;base64,iVBORw0KGgo='
};

test('missing application ID is rejected', () => {
  const out = validatePaymentRequestEnvelope({
    sessionToken: 'session',
    reference: 'UTR123456',
    file: validFile
  });
  assert.equal(out.ok,false);
  if (!out.ok) assert.equal(out.code,'APPLICATION_ID_REQUIRED');
});

test('customer cannot set VERIFIED state', () => {
  const out = validatePaymentRequestEnvelope({
    sessionToken: 'session',
    applicationId: 'AKBS-2026-000015',
    reference: 'UTR123456',
    file: validFile,
    status: 'VERIFIED'
  });
  assert.equal(out.ok,false);
  if (!out.ok) assert.equal(out.code,'CLIENT_STATE_NOT_ALLOWED');
});

test('valid payment request envelope is accepted', () => {
  const out = validatePaymentRequestEnvelope({
    sessionToken: 'session',
    applicationId: 'AKBS-2026-000015',
    reference: 'UTR123456',
    file: validFile
  });
  assert.equal(out.ok,true);
});
