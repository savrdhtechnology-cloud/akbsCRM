import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PAYMENT_PROOF_BYTES,
  validatePaymentProof
} from '../supabase/functions/akbs-customer-payment-proof/validation.ts';

test('payment proof accepts a valid PNG signature', () => {
  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
  const out = validatePaymentProof('proof.png','image/png',png);
  assert.equal(out.ok,true);
});

test('payment proof rejects invalid file type', () => {
  const bytes = new Uint8Array([0x00,0x01,0x02]);
  const out = validatePaymentProof('proof.exe','application/octet-stream',bytes);
  assert.equal(out.ok,false);
  if (!out.ok) assert.equal(out.code,'INVALID_FILE_TYPE');
});

test('payment proof rejects extension and MIME mismatch', () => {
  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
  const out = validatePaymentProof('proof.pdf','image/png',png);
  assert.equal(out.ok,false);
  if (!out.ok) assert.equal(out.code,'INVALID_FILE_TYPE');
});

test('payment proof rejects a file larger than 5 MB', () => {
  const bytes = new Uint8Array(MAX_PAYMENT_PROOF_BYTES + 1);
  bytes.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0);
  const out = validatePaymentProof('proof.png','image/png',bytes);
  assert.equal(out.ok,false);
  if (!out.ok) assert.equal(out.code,'INVALID_FILE_SIZE');
});

test('payment proof rejects spoofed MIME with wrong magic bytes', () => {
  const fakePdf = new Uint8Array([0x50,0x4e,0x47,0x00,0x00,0x00]);
  const out = validatePaymentProof('proof.pdf','application/pdf',fakePdf);
  assert.equal(out.ok,false);
  if (!out.ok) assert.equal(out.code,'INVALID_FILE_SIGNATURE');
});
