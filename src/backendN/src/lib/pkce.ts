// src/lib/pkce.ts
import crypto from 'crypto';

export function randomUrlSafe(len = 43): string {
  return crypto.randomBytes(len).toString('base64url');
}

export function sha256base64url(input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest();
  return Buffer.from(hash).toString('base64url');
}

export function makePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomUrlSafe(64);
  const challenge = sha256base64url(verifier);
  return { verifier, challenge };
}
